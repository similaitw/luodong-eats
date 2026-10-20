# 🍚 羅東食刻｜今天吃什麼？
2026-10-20 · 羅東、五結、冬山、三星、蘇澳、南方澳

以 [Location Eats Starter](https://github.com/similaitw/location-eats-starter) 的地圖與路線引擎為基礎，整合「羅東食刻」新版首頁，並從公開名錄及 2026 年美食文章擴充店家。

## 網站
- **正式 GitHub 連動新版**：https://luodong-eats-github.vercel.app
- **快速探索首頁**：https://luodong-eats-github.vercel.app/
- **進階地圖及多站路線**：https://luodong-eats-github.vercel.app/advanced/
- **原有 Vercel 站**：https://luodong-eats.vercel.app （獨立保留，未覆寫）
- **GitHub**：https://github.com/similaitw/luodong-eats

## 完成功能
| 頁面 | 功能 |
| --- | --- |
| `/` | 手機優先的首頁、隨機抽店、搜尋、地區／餐期／分類／編輯預算篩選、收藏、資料來源連結及 Google 地圖搜尋 |
| `/advanced/` | 地圖與清單切換、依時段／區域／口味篩選、地圖中心點／出發點、依定位導航、最多五站路線、4 套主題、JSON 本機備份／還原 |
| 共用 | **單一店家資料集**：`data.js` 47 家原始名單 + `data-extra.js` 198 家依公開來源補充且去重的店家，共 **245 家** |

**注意**：新增來源名單僅表示「文章或名錄有收錄」，**不代表目前營業中**。沒有查證的價格與餐期會保留「待確認」，不能當作營業時間、即時價目表或 Google 評分。

## 店家資料來源
請見 [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)。

主要來源：
1. [羅東觀光旅遊網的美食名錄](https://www.luodongtravel.tw/food/1)（多頁）
2. [2026 羅東美食100間整理](https://bjsmile.tw/post-40195732/)
3. [2026 五結美食16間整理](https://bjsmile.tw/wujie-food/)
4. [2026 冬山美食25間整理](https://curly.com.tw/dongshanfood/)
5. [蘇澳美食TOP20，食尚玩家](https://supertaste.tvbs.com.tw/esg/354636)
6. [三星美食（愛食記）](https://ifoodie.tw/explore/%E5%AE%9C%E8%98%AD%E7%B8%A3/list/%E4%B8%89%E6%98%9F%E8%94%A5%E6%B2%B9%E9%A4%85)

## 專案結構
- `index.html`, `app.js`, `style.css`, `extra.css`：快速首頁
- `data.js`：原始 47 家，保留穩定 ID
- `data-extra.js`：網路新增來源與逐筆去重（執行時合併）
- `advanced/index.html`：進階地圖＋路線介面
- `advanced/app.js`, `advanced/styles.css`：成熟版功能引擎
- `advanced/config.js`：羅東中心點、出發點與篩選設定
- `advanced/adapter.js`：把共用店家轉為進階模式需要的資料格式，**不另外建立重複清單**
- `scripts/validate.mjs`：店家欄位、唯一性、來源、兩模式共用數量等自動檢查
- `.github/workflows/validate.yml`：push / PR 自動驗證

## 執行與部署
本專案為原生 HTML、CSS、JavaScript，**不使用資料庫，也不需要 Google Maps API Key**。

```powershell
git clone https://github.com/similaitw/luodong-eats.git
cd luodong-eats
node scripts/validate.mjs
python -m http.server 8000
```
瀏覽 http://localhost:8000 ，進階模式為 http://localhost:8000/advanced/ 。

Vercel / Cloudflare Pages 可選純靜態網站，根目錄 `/`，無需 build 指令、安裝指令或環境變數。GitHub 連動新版已接 `main` 分支，自動部署。

## 收藏／備份
- 兩種介面使用同一組店家 ID；收藏寫入瀏覽器 localStorage，不涉及雲端帳號。
- 進階模式支援匯出／匯入屬於 `luodong-eats` 的 JSON 備份。
- 不會主動上傳使用者定位；「使用目前位置」須取得瀏覽器定位授權；Google Maps 為第三方服務。
- 由於資料未持續即時核查，出發前仍須確認地址、營業狀態、休息日與實際價錢。

## 後續資料維護
新增店家時需要至少一個可以查閱的公開來源；若有可信的實際地址可填入，否則留空由 Google Maps 搜尋店名。
可在 `data-extra.js` 補來源區塊，但請不要用虛構評分、精確座標、價錢或「營業中」填滿未知欄位。
遇到同品牌不同分店，請明確區分名稱與位置。若歇業，移至歇業名單並顯示清楚原因，避免直接刪掉收藏 ID。
