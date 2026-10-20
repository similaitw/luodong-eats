# 羅東食刻：每週商家自動更新

## 執行時間與範圍
- 每週一上午 09:17（臺灣時間）。GitHub Actions cron：17 1 * * 1（UTC）。
- 範圍：羅東、五結、冬山、三星、蘇澳、南方澳。
- 官方資料：https://data.gov.tw/dataset/7779（交通部觀光署餐飲資訊，每日更新的開放資料）。
- 備援來源：https://www.openstreetmap.org/copyright（© OpenStreetMap contributors；ODbL 授權），透過 Overpass API 擷取。
- GitHub 排程：https://github.com/similaitw/luodong-eats/actions/workflows/weekly-restaurants.yml

## 自動更新
1. GitHub Actions 下載官方 ZIP/JSON；遇連線遭阻擋則改從 OpenStreetMap 查詢。
2. 嚴格限制在宜蘭縣指定鄉鎮、可辨識的店名與明確地址。
3. 與既有店家去重，每週最多新增 80 家；儲存來源、檢查日期、店家 ID。
4. 店家變更地址／名稱不自動覆寫；缺席也不等於歇業，另列待確認清單。
5. 產生 data-auto.js、data/update-status.json、data/update-review.json、shared/legacy-data.js。
6. 測試通過後更新 GitHub，Vercel 新站部署，舊站經 Rewrite 讀同一份資料。
7. 來源全數失敗時，保留原名單並開啟 GitHub Issue，不發布錯誤或空白資料。

## 資料安全
- 新收錄店家不宣稱即時營業，也不推測價格、評分、時段。
- 只從公開資料取得店家資訊，不使用需要付費的 API。
- OpenStreetMap 來源店家保留授權與出處，公開 GitHub 資料可查。
- 不會刪除使用者收藏 ID；兩站共享名單，但兩個網域的瀏覽器收藏不跨域同步。

## 查看每次更新
- 掃描摘要：data/update-status.json
- 待複核清單：data/update-review.json
- 本次新增店家：data-auto.js
- 兩站同步設定：docs/TWO_SITE_SYNC.md

GitHub Actions 排程可能因平台負載延後，公開 Repository 長時間無提交時排程可能自動停用；可到 Actions 頁檢查和重新啟用。

## 手動驗證
python -m unittest discover -s tests -p 'test_weekly_updater.py' -v
node scripts/validate.mjs
可從 GitHub Actions → Weekly Luodong Restaurant Update → Run workflow 提前執行。
