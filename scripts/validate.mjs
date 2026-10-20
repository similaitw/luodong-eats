import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

for (const file of ["index.html", "style.css", "data.js", "app.js", "icon.svg", "manifest.webmanifest"]) {
  assert.ok(existsSync(file), "找不到網站必要檔案：" + file);
}
const context = { window: {} };
vm.runInNewContext(readFileSync("data.js", "utf8"), context, { filename: "data.js" });
const shops = context.window.LUODONG_RESTAURANTS;
assert.ok(Array.isArray(shops) && shops.length >= 47, "店家名單應有 47 家以上");
const ids = new Set();
const categories = new Set(["小吃", "夜市", "正餐", "異國", "咖啡甜點"]);
const areas = new Set(["羅東夜市", "羅東市區", "羅東林場", "羅東運動公園", "五結", "冬山"]);
const meals = new Set(["早餐", "午餐", "下午茶", "晚餐", "宵夜"]);
for (const shop of shops) {
  assert.ok(/^ld\d+$/.test(shop.id), "店家 ID 格式不符：" + shop.id);
  assert.ok(!ids.has(shop.id), "重複 ID：" + shop.id);
  ids.add(shop.id);
  assert.ok(typeof shop.n === "string" && shop.n.trim(), "缺少店名：" + shop.id);
  assert.ok(categories.has(shop.c), "未知分類：" + shop.id);
  assert.ok(areas.has(shop.a), "未知地區：" + shop.id);
  assert.ok(Number.isInteger(shop.b) && shop.b >= 1 && shop.b <= 3, "預算標籤異常：" + shop.id);
  assert.ok(shop.m.split(",").every(x => meals.has(x)), "時段標籤異常：" + shop.id);
  assert.ok(typeof shop.s === "string" && typeof shop.addr === "string", "店家資料不完整：" + shop.id);
}
const html = readFileSync("index.html", "utf8");
for (const file of ["app.js", "data.js", "style.css", "icon.svg"]) {
  assert.ok(html.includes("./" + file), "首頁未引用：" + file);
}
assert.equal(JSON.parse(readFileSync("manifest.webmanifest", "utf8")).lang, "zh-Hant");
console.log("✓ " + shops.length + " 家店家資料有效，網站引用檢查通過");
