// 觀光署官方資料的自動收錄名單；由每週 GitHub Actions 維護，請勿直接手改。
window.LUODONG_OFFICIAL_DATA = [];
(function () {
  "use strict";
  const shops = Array.isArray(window.LUODONG_RESTAURANTS) ? window.LUODONG_RESTAURANTS : [];
  const additions = Array.isArray(window.LUODONG_OFFICIAL_DATA) ? window.LUODONG_OFFICIAL_DATA : [];
  const ids = new Set(shops.map(x => x.id));
  const names = new Set(shops.map(x => String(x.n || "").normalize("NFKC").toLowerCase().replace(/[\\s　()（）．·-]/g, "")));
  let count = 0;
  for (const row of additions) {
    const name = String(row.n || "").normalize("NFKC").toLowerCase().replace(/[\\s　()（）．·-]/g, "");
    if (!row.id || !row.n || !row.addr || ids.has(row.id) || names.has(name)) continue;
    shops.push(row);
    ids.add(row.id); names.add(name); count++;
  }
  window.LUODONG_RESTAURANTS = shops;
  const stats = window.LUODONG_DATA_STATS || {};
  stats.officialAdded = count;
  stats.total = shops.length;
  window.LUODONG_DATA_STATS = stats;
})();
