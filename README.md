# 🍚 羅東食刻｜今天吃什麼？

為羅東、五結、冬山打造的在地美食選擇器。零後端、零付費 API、手機友善。GitHub 上的程式碼可直接發布為靜態網站。

## 目前功能

- **隨機抽店**：依目前篩選條件一鍵抽選，盡可能不連續抽到同一家。
- **47 家初始店家**：羅東夜市、羅東市區、林場、運動公園、五結、冬山。
- **多條件篩選**：店名／餐點／地點搜尋、地區、時段、預算參考、料理分類。
- **快速入口**：銅板解決、好好吃飯、夜市走走、喝點甜的。
- **收藏清單**：存於使用者瀏覽器 \`localStorage\`，無須登入，也不會跨裝置同步。
- **地圖查詢**：每家店可開啟 Google Maps 搜尋，使用者可確認地址、營業資訊及路線。
- **RWD 響應式版型**：手機、平板、桌機皆可使用；使用原生 HTML、CSS、JavaScript。

## 技術結構

| 檔案 | 說明 |
| --- | --- |
| \`index.html\` | 網站結構、搜尋及抽選視窗 |
| \`style.css\` | 版型及 RWD |
| \`data.js\` | 初始店家名單，編輯這裡即可增修資料 |
| \`app.js\` | 隨機抽選、篩選、收藏與 Google Maps 連結 |
| \`icon.svg\`、\`manifest.webmanifest\` | 圖示與基本 PWA 中繼資料 |

不用建置（build）、不用資料庫、不使用 Google Maps API 金鑰。

## 在本機啟動

建議用靜態伺服器，避免用 \`file://\` 方式直接開檔：

\`\`\`powershell
git clone https://github.com/similaitw/luodong-eats.git
cd luodong-eats
python -m http.server 8000
\`\`\`

打開 http://localhost:8000 。

## 免費部署

**Vercel / Cloudflare Pages**：把 GitHub Repository 匯入為靜態網站，不指定 framework，根目錄為 \`/\`，不需要安裝指令或 build 指令，也不需要環境變數。Git push 更新後即可自動部署。

**GitHub Pages**：Settings → Pages → Build and deployment → Deploy from a branch → 選 \`main\` 和 \`/ (root)\` → Save。網址通常為 \`https://similaitw.github.io/luodong-eats/\`，實際以 GitHub Pages 顯示為準。

> 在本專案中，免費指的是程式本身不需要付費 API / 運算服務，不保證第三方託管平台未來政策與帳號額度。

## 編輯店家資料

在 \`data.js\` 的 \`window.LUODONG_RESTAURANTS\` 陣列新增物件：

\`\`\`js
{id:"ld048",n:"店名",a:"羅東市區",c:"小吃",m:"早餐,午餐",b:1,
 s:"簡單特色說明。",addr:"宜蘭縣羅東鎮…",e:"🥟",t:"yellow"}
\`\`\`

- \`id\`：唯一且固定，避免破壞舊收藏
- \`a\`：羅東夜市／羅東市區／羅東林場／羅東運動公園／五結／冬山
- \`c\`：小吃／夜市／正餐／異國／咖啡甜點
- \`m\`：早餐、午餐、下午茶、晚餐、宵夜，**僅為推薦使用時段，不是營業時間**
- \`b\`：1 平價優先／2 一般消費／3 聚餐選擇，**編輯概估而非真實價格**
- \`addr\`：不確定時請留白，Google 地圖會以店名和區域搜尋
- \`t\`：orange／yellow／pink／green／blue／lilac

改完 commit、push 即可更新網站。

## 初始清單來源與資料限制

依 2026 年 10 月查到的地方觀光、店家資訊及旅遊報導整理，主要包括：

- [羅東觀光旅遊網—張秀雄米苔目](https://www.luodongtravel.tw/food-detail/394)
- [羅東美食 2026 綜合指南（馬鈴薯大哥）](https://marsfood.tw/luodong-food-guide/)
- [羅東夜市美食地圖（波比看世界）](https://bobbytravel.tw/luodong-night-market/)
- [羅東夜市小吃（FunTime）](https://www.funtime.com.tw/blog/funtime/luodong-night-market)
- [五結美食（紫色微笑）](https://bjsmile.tw/wujie-food/)
- [五結餐廳（愛食記）](https://ifoodie.tw/explore/%E5%AE%9C%E8%98%AD%E7%B8%A3/list/%E4%BA%94%E7%B5%90)
- 公開地圖店家資訊交叉核對。

**重要**：這不是即時餐廳資料庫。不保證每家持續營業、地址／菜單未變、特定日期有營業。網站不展示「營業中」、即時評分、Google Review 數字或精確人均價格。餐期及價格分級為網站編輯的探索性標籤，請到店前向業者或地圖確認。

## 隱私

本站無帳號、無後端、無廣告追蹤程式；收藏僅儲存於目前瀏覽器。按地圖連結後會離開本站，第三方服務適用其各自隱私權規範。

## 下一步可擴充

- 社群推薦店家、審核、照片授權和定期更新機制。
- 按地圖位置或步行距離篩選（須額外提供座標和使用者定位授權）。
- 依每週休息日與營業時段排除店家（前提：資料可持續維護）。
- 可分享篩選條件、投票決定今晚吃哪家、週末美食行程。

專案：[similaitw/luodong-eats](https://github.com/similaitw/luodong-eats)。
