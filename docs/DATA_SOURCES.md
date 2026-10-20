# 羅東食刻｜公開資料與校對原則

資料蒐集日期：**2026-10-20**。資料共 245 家，原始店家 47 筆，從網路資料補充並去重 198 筆。
查到的「店家名稱／地址」可以當作探索線索，但**不是歇業或現場營業的即時證明**。

## 來源分組（優先權）
| 組別 | 網址 | 使用方式 |
| --- | --- | --- |
| 羅東觀光旅遊網 | https://www.luodongtravel.tw/food/1 | 羅東美食名錄多頁，依來源當時列出的店名與地址 |
| 羅東美食100間（2026-10-02） | https://bjsmile.tw/post-40195732/ | 補充夜市、在地店與咖啡廳 |
| 五結美食16間（2026-05-09） | https://bjsmile.tw/wujie-food/ | 補五結餐廳、麵食、甜點 |
| 冬山美食25間（2026-07-06） | https://curly.com.tw/dongshanfood/ | 補冬山舊街、廣興、甜點 |
| 蘇澳美食 TOP20 | https://supertaste.tvbs.com.tw/esg/354636 | 補蘇澳與南方澳海鮮、小吃、咖啡 |
| 三星蔥油餅餐廳整理 | https://ifoodie.tw/explore/%E5%AE%9C%E8%98%AD%E7%B8%A3/list/%E4%B8%89%E6%98%9F%E8%94%A5%E6%B2%B9%E9%A4%85 | 補三星卜肉、蔥油餅 |

其他查詢參考（未逐筆自動匯入）：
- https://www.luodongtravel.tw/food.html
- https://house.ilantravel.com.tw/food_guide/wujie-food.php
- https://house.ilantravel.com.tw/food_guide/dongshan-food.php
- https://marsfood.tw/luodong-food-guide/

## 初始店家與待查項目
首批 47 家為專案初始名單，包含先前人工整理資料；地址／餐期／概略預算未全數二次查證。
本次 198 筆來源擴充的紀錄會帶 `sourceUrl`、`sourceLabel`、`sourceCheckedAt`。
每筆新增商家的 `m` 設為空字串、`b` 設為 0；前台因此標示「價格待確認」，時段篩選不作營業聲明。

**需要人工核對：**
1. 店家是否遷址、改名、暫停或永久歇業。
2. 地址是否完整（缺地址時只以店名＋區域搜尋地圖）。
3. 早／午／晚餐、下午茶、宵夜是否真的有供餐，不可以把推薦時段當營業時間。
4. 正確價格與菜色更新，勿使用網路歷史價格當現價。
5. 同名不同分店與異名同店的重複資料，應採用店址及官方社群人工校對。

## 程式資料路徑
首頁：`data.js` → `data-extra.js` → `app.js`。
進階模式：`../data.js` → `../data-extra.js` → `adapter.js` → `app.js`。
所有商家 ID 均要保持穩定，不可隨便重編，以免既有使用者的收藏錯亂。
