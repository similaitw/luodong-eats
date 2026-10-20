/* 羅東食刻：純前端程式，不需後端或 API 金鑰。 */
(function () {
  "use strict";
  const items = Array.isArray(window.LUODONG_RESTAURANTS) ? window.LUODONG_RESTAURANTS : [];
  const byId = new Map(items.map(item => [item.id, item]));
  const favoriteKey = "luodong-eats:favorites:v1";
  const categories = ["全部", "小吃", "夜市", "正餐", "異國", "咖啡甜點"];
  const budgetNames = { 1: "平價優先", 2: "一般消費", 3: "聚餐選擇" };
  const state = { query: "", area: "", meal: "", budget: "", category: "全部", favoritesOnly: false, lastId: null };
  let favorites = new Set();
  let currentPick = null;
  let choosing = false;
  let toastTimer;
  const el = (id) => document.getElementById(id);

  try {
    const stored = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
    if (Array.isArray(stored)) favorites = new Set(stored.filter(id => typeof id === "string" && byId.has(id)));
  } catch (_) { favorites = new Set(); }

  const areaSelect = el("areaFilter");
  const mealSelect = el("mealFilter");
  const budgetSelect = el("budgetFilter");
  const searchInput = el("search");
  const dialog = el("pickDialog");
  const grid = el("restaurantGrid");
  const tabBar = el("categoryTabs");

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showToast(message) {
    const node = el("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2300);
  }

  function updateFavoriteBadge() {
    el("favoriteCount").textContent = String(favorites.size);
    el("favoritesToggle").setAttribute("aria-pressed", String(state.favoritesOnly));
    el("favoritesToggle").setAttribute("aria-label", "只看收藏，已收藏 " + favorites.size + " 家");
  }

  function saveFavorites() {
    try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); }
    catch (_) { showToast("瀏覽器無法儲存收藏，請檢查隱私設定"); }
    updateFavoriteBadge();
  }

  function toggleFavorite(id) {
    if (!byId.has(id)) return;
    if (favorites.has(id)) {
      favorites.delete(id);
      showToast("已從收藏移除");
    } else {
      favorites.add(id);
      showToast("已加入我的收藏 ♡");
    }
    saveFavorites();
    render();
    if (currentPick && currentPick.id === id) updateDialogFavorite();
  }

  function mealMatches(item) {
    return !state.meal || item.m.split(",").includes(state.meal);
  }

  function filteredItems() {
    const needle = state.query.trim().toLocaleLowerCase("zh-Hant");
    return items.filter(item => {
      if (state.favoritesOnly && !favorites.has(item.id)) return false;
      if (state.area && item.a !== state.area) return false;
      if (state.category !== "全部" && item.c !== state.category) return false;
      if (!mealMatches(item)) return false;
      if (state.budget && Number(state.budget) !== item.b) return false;
      if (!needle) return true;
      return [item.n, item.a, item.c, item.s, item.addr].join(" ").toLocaleLowerCase("zh-Hant").includes(needle);
    });
  }

  function mapUrl(item) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.n + " 宜蘭" + (item.addr ? " " + item.addr : " " + item.a));
  }

  function getRandomIndex(n) {
    if (n <= 1) return 0;
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const values = new Uint32Array(1);
      const ceiling = Math.floor(4294967296 / n) * n;
      do { window.crypto.getRandomValues(values); } while (values[0] >= ceiling);
      return values[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  function getNextPick(list) {
    if (!list.length) return null;
    const candidates = list.length > 1 ? list.filter(item => item.id !== state.lastId) : list;
    return candidates[getRandomIndex(candidates.length)];
  }

  function updateDialogFavorite() {
    if (!currentPick) return;
    const liked = favorites.has(currentPick.id);
    el("dialogFavorite").textContent = liked ? "♥ 已收藏，點擊可取消" : "♡ 加入我的收藏";
    el("dialogFavorite").setAttribute("aria-pressed", String(liked));
  }

  function openPick(item) {
    if (!item) return;
    currentPick = item;
    state.lastId = item.id;
    el("dialogEmoji").textContent = item.e;
    el("dialogHeading").textContent = item.n;
    el("dialogDesc").textContent = item.s;
    const tags = el("dialogTags");
    tags.replaceChildren();
    [item.a, item.c, budgetNames[item.b]].forEach(name => tags.appendChild(make("span", "", name)));
    el("dialogMap").href = mapUrl(item);
    updateDialogFavorite();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("dialog-open");
  }

  function randomPick() {
    if (choosing) return;
    const list = filteredItems();
    if (!list.length) {
      showToast("目前沒有符合條件的店家，換個篩選再試試！");
      el("explore").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    choosing = true;
    const buttons = [el("heroRandom"), el("surpriseButton"), el("dialogAgain")];
    buttons.forEach(button => { button.disabled = true; });
    let count = 0;
    // 少量動畫讓抽選有驚喜，但結果始終來自目前的篩選清單。
    const interval = setInterval(() => {
      const trial = list[getRandomIndex(list.length)];
      if (dialog.open) {
        el("dialogEmoji").textContent = trial.e;
        el("dialogHeading").textContent = "正在挑選好味道…";
      } else {
        el("heroRandom").textContent = trial.e + " 好料搜尋中…";
      }
      count += 1;
      if (count >= 9) {
        clearInterval(interval);
        const winner = getNextPick(list);
        el("heroRandom").textContent = "✦ 幫我決定！ ↗";
        openPick(winner);
        buttons.forEach(button => { button.disabled = false; });
        choosing = false;
      }
    }, 65);
  }

  function renderCard(item) {
    const card = make("article", "restaurant-card");
    const art = make("div", "card-art tone-" + item.t);
    art.appendChild(make("span", "card-area", item.a));
    const food = make("span", "food-emoji", item.e);
    food.setAttribute("aria-hidden", "true");
    art.appendChild(food);
    const heart = make("button", "card-heart" + (favorites.has(item.id) ? " is-favorite" : ""), favorites.has(item.id) ? "♥" : "♡");
    heart.type = "button";
    heart.setAttribute("aria-label", favorites.has(item.id) ? "取消收藏 " + item.n : "收藏 " + item.n);
    heart.setAttribute("aria-pressed", String(favorites.has(item.id)));
    heart.addEventListener("click", () => toggleFavorite(item.id));
    art.appendChild(heart);
    card.appendChild(art);

    const body = make("div", "card-body");
    const meta = make("div", "card-meta");
    meta.appendChild(make("span", "card-tag tag-type", item.c));
    meta.appendChild(make("span", "card-tag", budgetNames[item.b]));
    body.appendChild(meta);
    body.appendChild(make("h3", "card-title", item.n));
    body.appendChild(make("p", "card-description", item.s));
    const actions = make("div", "card-actions");
    const map = make("a", "card-map", "地圖與路線 ↗");
    map.href = mapUrl(item);
    map.target = "_blank";
    map.rel = "noopener noreferrer";
    map.setAttribute("aria-label", "開啟 " + item.n + " 的 Google 地圖搜尋");
    const detail = make("button", "card-detail", "就吃這家 ↗");
    detail.type = "button";
    detail.setAttribute("aria-label", "選擇 " + item.n);
    detail.addEventListener("click", () => openPick(item));
    actions.append(map, detail);
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function renderCategories() {
    tabBar.replaceChildren();
    categories.forEach(category => {
      const button = make("button", "category-tab", category === "全部" ? "🍽 全部" : category);
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.category === category));
      button.addEventListener("click", () => {
        state.category = category;
        render();
      });
      tabBar.appendChild(button);
    });
  }

  function render() {
    renderCategories();
    updateFavoriteBadge();
    const found = filteredItems();
    el("resultLabel").textContent = state.favoritesOnly ? "我的收藏 · 共 " + found.length + " 家店" : "找到 " + found.length + " 家美味選擇";
    el("emptyState").hidden = found.length !== 0;
    grid.hidden = found.length === 0;
    const fragment = document.createDocumentFragment();
    found.forEach(item => fragment.appendChild(renderCard(item)));
    grid.replaceChildren(fragment);
    searchInput.value = state.query;
    el("clearSearch").hidden = !state.query;
    areaSelect.value = state.area;
    mealSelect.value = state.meal;
    budgetSelect.value = state.budget;
  }

  function reset() {
    state.query = "";
    state.area = "";
    state.meal = "";
    state.budget = "";
    state.category = "全部";
    state.favoritesOnly = false;
    render();
  }

  function setQuick(mode) {
    reset();
    if (mode === "cheap") state.budget = "1";
    else if (mode === "dinner") state.meal = "晚餐";
    else if (mode === "night") state.area = "羅東夜市";
    else if (mode === "coffee") state.category = "咖啡甜點";
    render();
    el("explore").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const areaOrder = ["羅東夜市", "羅東市區", "羅東林場", "羅東運動公園", "五結", "冬山"];
  areaOrder.filter(area => items.some(item => item.a === area)).forEach(area => {
    const option = make("option", "", area);
    option.value = area;
    areaSelect.appendChild(option);
  });

  el("heroCount").textContent = String(items.length);
  el("heroRandom").addEventListener("click", randomPick);
  el("surpriseButton").addEventListener("click", randomPick);
  el("dialogAgain").addEventListener("click", randomPick);
  el("dialogFavorite").addEventListener("click", () => { if (currentPick) toggleFavorite(currentPick.id); });
  el("dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  el("favoritesToggle").addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    render();
    el("explore").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelectorAll("[data-quick]").forEach(button => button.addEventListener("click", () => setQuick(button.dataset.quick)));
  searchInput.addEventListener("input", () => { state.query = searchInput.value; render(); });
  el("clearSearch").addEventListener("click", () => { state.query = ""; render(); searchInput.focus(); });
  areaSelect.addEventListener("change", () => { state.area = areaSelect.value; render(); });
  mealSelect.addEventListener("change", () => { state.meal = mealSelect.value; render(); });
  budgetSelect.addEventListener("change", () => { state.budget = budgetSelect.value; render(); });
  el("resetFilters").addEventListener("click", reset);
  el("emptyReset").addEventListener("click", reset);
  render();
})();
