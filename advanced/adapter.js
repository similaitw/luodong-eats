// 由首頁共同店家資料轉換供地圖與路線功能使用，無獨立名單。
(function () {
"use strict";
const source = window.LUODONG_RESTAURANTS || [];
const periodMap = {"早餐":"早餐","午餐":"午晚餐","晚餐":"午晚餐","下午茶":"飲料甜點","宵夜":"宵夜"};
window.FOOD_DATA = source.map(shop => {
  const periods = [...new Set((shop.m || "").split(",").filter(Boolean).map(x=>periodMap[x]).filter(Boolean))];
  // 無營業時段來源者不排除於抽店；這是探索選擇而非「營業中」保證。
  if (!periods.length) periods.push("早餐","午晚餐","飲料甜點","宵夜");
  const foodName = String(shop.s||"").replace(/^店家特色：/,"").split("（")[0].trim();
  const foods = [foodName || shop.c];
  const types = [...new Set([shop.c,shop.c==="小吃"?"台式":shop.c])];
  if(shop.c==="咖啡甜點") types.push("甜點");
  if(shop.b===1) types.push("省錢");
  return {
    id:shop.id,
    name:shop.n, aliases:[], periods, foods, types,
    area:shop.a, address:shop.addr||"", mapQuery:[shop.n,"宜蘭縣",shop.a].join(" "),
    lat:null,lng:null,flags:[],status:"",
    note:shop.sourceUrl ? "來源：" +(shop.sourceLabel||"網路名錄")+"；營業時間及價格未即時確認。" :
      "初始收錄店家；價格及營業時間請以店家公告為準。",
    sourceUrl:shop.sourceUrl||"", sourceCheckedAt:shop.sourceCheckedAt||""
  };
});
window.DATA_META = {
  updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(window.LUODONG_LAST_OFFICIAL_CHECK || "") ? window.LUODONG_LAST_OFFICIAL_CHECK+"T09:00:00+08:00" : "2026-10-20T19:00:00+08:00",
  updatedLabel: "每週公開資料掃描（營業狀態未即時查核）",
  cadence: "每週一早上自動檢查",
  scope: "羅東／五結／冬山／三星／蘇澳／南方澳"
};
})();
