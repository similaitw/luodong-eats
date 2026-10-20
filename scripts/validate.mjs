import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import vm from "node:vm";
const files=["index.html","app.js","data.js","data-extra.js","style.css","extra.css",
 "advanced/index.html","advanced/config.js","advanced/adapter.js",
 "advanced/app.js","advanced/styles.css","icon.svg","manifest.webmanifest"];
for(const file of files) assert.ok(existsSync(file),"必要檔案不存在："+file);
const ctx=vm.createContext({window:{}});
for(const path of ["data.js","data-extra.js","advanced/config.js","advanced/adapter.js"]){
 vm.runInContext(readFileSync(path,"utf8"),ctx,{filename:path,timeout:10000});
}
const data=ctx.window.LUODONG_RESTAURANTS;
const stats=ctx.window.LUODONG_DATA_STATS;
const advanced=ctx.window.FOOD_DATA;
assert.ok(Array.isArray(data)&&data.length>=200,"總店數應至少200家");
assert.equal(stats.total,data.length,"資料統計與清單不一致");
assert.ok(stats.onlineAdded>150,"網路擴充筆數不足");
assert.equal(advanced.length,data.length,"進階地圖和首頁應使用相同資料筆數");
const allIds=new Set(),allNames=new Set();
const categories=new Set(["小吃","夜市","正餐","異國","咖啡甜點"]);
const areas=new Set(["羅東市區","羅東夜市","羅東林場","羅東運動公園","五結","冬山","三星","蘇澳","南方澳"]);
const periods=new Set(["早餐","午餐","下午茶","晚餐","宵夜"]);
for(const shop of data){
 assert.ok(shop.id&&!allIds.has(shop.id),"店家ID重複："+shop.id);allIds.add(shop.id);
 assert.ok(shop.n&&!allNames.has(shop.n),"店名重複："+shop.n);allNames.add(shop.n);
 assert.ok(areas.has(shop.a),"地區無效："+shop.a);
 assert.ok(categories.has(shop.c),"分類無效："+shop.c);
 assert.ok(Number.isInteger(shop.b)&&shop.b>=0&&shop.b<=3,"預算分級無效");
 assert.ok(shop.m.split(",").filter(Boolean).every(x=>periods.has(x)),"時段標籤無效");
 assert.ok(typeof shop.addr==="string"&&typeof shop.s==="string","店家資料缺欄位");
 if(shop.id.startsWith("web")){
   assert.equal(shop.m,"","擴充店家不可冒充已核實營業時段");
   assert.equal(shop.b,0,"擴充店家不可冒充已核實價格");
   assert.ok(shop.sourceLabel&&/^https:\/\//.test(shop.sourceUrl),"擴充店家缺資料來源");
 }
}
for(const shop of advanced){
 assert.ok(allIds.has(shop.id),"地圖名單出現額外資料");
 assert.ok(Array.isArray(shop.periods)&&shop.periods.length,"進階時段標籤不可空白");
 assert.notEqual(shop.status,"營業中","未查證狀態不可假設正在營業");
}
const html=readFileSync("index.html","utf8");
for(const name of ["data.js","data-extra.js","app.js","style.css","extra.css"])
 assert.ok(html.includes("./"+name),"首頁未引用："+name);
assert.ok(html.includes("./advanced/"),"首頁缺進階地圖入口");
const html2=readFileSync("advanced/index.html","utf8");
for(const name of ['../data.js','../data-extra.js','adapter.js','app.js'])
 assert.ok(html2.includes('src="'+name+'"'),"進階頁面未引用："+name);
assert.equal(JSON.parse(readFileSync("manifest.webmanifest","utf8")).lang,"zh-Hant");
console.log("✓ 羅東食刻 "+data.length+" 家（既有 "+stats.base+" + 網路新增 "+stats.onlineAdded+"）");
console.log("✓ 資料來源、唯一性、區域、時段、價格保護與共用名單全部通過");
