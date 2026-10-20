# 羅東食刻｜兩個網站共用店家

最後設定：2026-10-20。保留舊站程式，使用 Vercel 路由同步店家。

## 正式網址與資料來源
- 舊版：https://luodong-eats.vercel.app/
- 新版：https://luodong-eats-github.vercel.app/
- GitHub：https://github.com/similaitw/luodong-eats
- 共用 245 家：data.js（47 家）＋ data-extra.js（198 家）。advanced/adapter.js 轉成舊站需要的 FOOD_DATA 格式。

## 舊版 Vercel 專案的兩條正式 Rewrite Rules
Vercel project: luodong-eats（prj_x09TS7l1mvTkLDHdJnVAoEEhSz0f）

| 舊站請求 | 實際使用 |
| --- | --- |
| /data.js | https://luodong-eats-github.vercel.app/shared/legacy-data.js |
| /src/data.js | https://luodong-eats-github.vercel.app/shared/legacy-data.js |

兩條 rewrite 規則為 production live，version ID：ffb5a91c-31d9-4c00-ac81-dcc072d40c68。規則只改寫店家資料請求，不重建舊站 HTML、CSS 或 app.js。

## 未來自動同步
1. 只要修改 data.js、data-extra.js 或 advanced/adapter.js，並提交到 main。
2. GitHub Actions 的 .github/workflows/sync-classic.yml 會自動執行 node scripts/build-legacy-data.mjs。
3. 系統產生 shared/legacy-data.js，相容舊站的 window.FOOD_DATA、window.DATA_META。
4. GitHub Actions 產生新 commit 觸發新版 Vercel 重新部署。舊站之後透過 rewrite 讀取最新版 JS。
5. 2026-10-20 已成功驗證自動產生提交 7f1a6d32336fadeac5ef2eddbbfa0088340bb81a 與新 Vercel READY。

不要直接手動編輯 shared/legacy-data.js。新增店家需維持唯一且穩定的 ID。

## 限制與復原
- 店家資料共用，但不同網域的 localStorage 收藏或自訂備份不會同步。
- GitHub 測試與 Vercel READY 只驗證程式及部署，尚未證實外部瀏覽器端的實際顯示效果。
- 新增店家未必仍營業；未知價格、時段不得冒充即時資料。
- 如需暫停同步，於舊版 Vercel 專案停用或移除以上兩條 Routing Rules；請先確認舊版原始部署可以正常回退。

## 維護權責
- 新站專案：luodong-eats-github（prj_0TraNMG7ONrByq2ZjkXgZnjY54pw）連動同名 GitHub Repo。
- 舊站專案：luodong-eats 保留原部署，透過 Vercel 路由讀取新站生成檔。
- 應以正式網站域名驗收，不以帶舊部署 hash 的網址取代正式網址。
