const CONFIG = window.APP_CONFIG || {};
const DATA = window.FOOD_DATA;
const META = window.DATA_META || {};
const APP_SLUG = CONFIG.appSlug || 'replace-me-eats';
const state = {
  period: '全部', search: '', type: '', flag: '', pork: '', area: '',
  selected: DATA[0], route: [], favorites: new Set(JSON.parse(localStorage.getItem(`${APP_SLUG}-favs`) || '[]')),
  currentCoords: null, view: 'list', listScrollY: 0
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const cards = $('#cards');
const tpl = $('#cardTpl');
const layout = $('.layout');
const THEMES = {
  classic:{label:'經典黑綠',color:'#0b0c0f'},
  cream:{label:'奶油橘',color:'#6a3519'},
  ocean:{label:'深海藍',color:'#082f43'},
  berry:{label:'莓果粉',color:'#5b1730'}
};
const GROUPS = CONFIG.groups || {};
function groupDef(unit){
  const first=unit.children?.[0]||{};
  return GROUPS[unit.key]||{
    key:unit.key,
    label:first.groupLabel||unit.key||'店家群組',
    emoji:'🏪',
    hint:'展開後選分店'
  };
}
function groupKey(item){
  return item.group||'';
}
function groupBrand(item){
  return item.brand||item.groupLabel||GROUPS[groupKey(item)]?.label||'分店';
}
function displayUnits(list){
  const units=[]; const grouped=new Map();
  list.forEach(item=>{
    const key=groupKey(item);
    if(!key){units.push({type:'item',item});return;}
    if(!grouped.has(key)){
      const unit={type:'group',key,children:[]};
      grouped.set(key,unit); units.push(unit);
    }
    grouped.get(key).children.push(item);
  });
  return units;
}
function applyTheme(theme){
  if(!THEMES[theme]) theme='classic';
  document.body.dataset.theme=theme;
  localStorage.setItem(`${APP_SLUG}-theme`,theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',THEMES[theme].color);
  $$('.theme-option').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===theme));
}

function localAppKeys(){
  return Object.keys(localStorage).filter(key=>key.startsWith(APP_SLUG+'-')).sort();
}
function collectBackupData(){
  const data={};
  localAppKeys().forEach(key=>{data[key]=localStorage.getItem(key)});
  return {
    app:APP_SLUG,
    version:1,
    exportedAt:new Date().toISOString(),
    data
  };
}
function updateBackupStatus(){
  const favs=JSON.parse(localStorage.getItem(`${APP_SLUG}-favs`)||'[]');
  const visits=JSON.parse(localStorage.getItem(`${APP_SLUG}-visits`)||'[]');
  const fc=$('#backupFavoriteCount'), vc=$('#backupVisitCount'), kc=$('#backupKeyCount');
  if(fc) fc.textContent=Array.isArray(favs)?favs.length:0;
  if(vc) vc.textContent=Array.isArray(visits)?visits.length:0;
  if(kc) kc.textContent=localAppKeys().length;
}
function setBackupMessage(message,isError=false){
  const el=$('#backupMessage'); if(!el)return;
  el.textContent=message; el.style.color=isError?'#b42318':'var(--eyebrow-dark)';
}
function exportBackup(){
  const backup=collectBackupData();
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const d=new Date();
  const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  a.href=url;a.download=`${APP_SLUG}-backup-${stamp}.json`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  setBackupMessage('備份檔已匯出。請把檔案保存到你找得到的位置。');
}
async function importBackupFile(file){
  if(!file)return;
  try{
    const raw=await file.text();
    const backup=JSON.parse(raw);
    if(!backup||backup.app!==APP_SLUG||typeof backup.version!=='number'||!backup.data||typeof backup.data!=='object'){
      throw new Error('這不是有效的 中心地點 Eats 備份檔。');
    }
    const entries=Object.entries(backup.data).filter(([key,value])=>key.startsWith(APP_SLUG+'-')&&typeof value==='string');
    if(!entries.length) throw new Error('備份檔裡沒有可還原的 中心地點 Eats 資料。');
    const ok=confirm(`將匯入 ${entries.length} 項本機資料，會覆蓋這個瀏覽器裡同名的 中心地點 Eats 資料。要繼續嗎？`);
    if(!ok){setBackupMessage('已取消匯入。');return;}
    entries.forEach(([key,value])=>localStorage.setItem(key,value));
    setBackupMessage('匯入完成，正在重新載入…');
    setTimeout(()=>location.reload(),450);
  }catch(err){
    setBackupMessage(err?.message||'匯入失敗，請確認檔案格式。',true);
  }
}

function escapeHtml(v='') { return v.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function matches(item) {
  if (state.period !== '全部' && !item.periods.includes(state.period)) return false;
  const hay = [item.name, ...(item.aliases||[]), ...item.foods, ...item.types, item.area, item.note||''].join(' ').toLowerCase();
  if (state.search && !hay.includes(state.search.toLowerCase())) return false;
  if (state.type && !item.types.includes(state.type) && !(item.flags||[]).includes(state.type)) return false;
  if (state.flag && !(item.flags||[]).includes(state.flag)) return false;
  if (state.pork && item.pork !== state.pork) return false;
  if (state.area && item.area !== state.area) return false;
  return true;
}
function filtered() { return DATA.filter(matches); }
function activeAdvancedFilters(){
  const items=[];
  if(state.flag) items.push({key:'flag',label:state.flag==='不可能沒吃過'?'🔥 不可能沒吃過':'📍 '+state.flag});
  if(state.type){
    const icon=state.type==='辣'?'🌶️ ':state.type==='省錢'?'💸 ':state.type==='蔬食'?'🥬 ':'';
    const label=state.type==='辣'?'想吃辣':state.type;
    items.push({key:'type',label:icon+label});
  }
  if(state.pork) items.push({key:'pork',label:'🚫🐷 可選非豬推薦'});
  if(state.area) items.push({key:'area',label:'📍 '+state.area});
  return items;
}
function syncFilterControls(){
  document.querySelectorAll('.tagchip').forEach(b=>{
    const on=(b.dataset.type&&state.type===b.dataset.type)||(b.dataset.flag&&state.flag===b.dataset.flag)||(b.dataset.pork&&state.pork===b.dataset.pork);
    b.classList.toggle('active',!!on);
  });
  const area=$('#areaSelect'); if(area) area.value=state.area||'';
}
function updateFilterUI(){
  const active=activeAdvancedFilters();
  const btn=$('#moreFiltersBtn');
  if(btn) btn.textContent=active.length?'篩選 '+active.length:'篩選';
  const summary=$('#activeFilterSummary');
  if(!summary)return;
  summary.hidden=!active.length;
  summary.innerHTML=active.map(x=>'<button class="active-filter-chip" type="button" data-filter-key="'+x.key+'">'+escapeHtml(x.label)+' <span>×</span></button>').join('');
  document.querySelectorAll('.active-filter-chip').forEach(b=>b.addEventListener('click',()=>{
    const key=b.dataset.filterKey;
    if(key==='flag') state.flag='';
    if(key==='type') state.type='';
    if(key==='pork') state.pork='';
    if(key==='area') state.area='';
    syncFilterControls();
    render();
  }));
}
function currentPeriod() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return '早餐';
  if (h >= 10 && h < 21) return '午晚餐';
  if (h >= 21 || h < 2) return '宵夜';
  return '早餐';
}
function setPeriod(period) {
  state.period = period;
  $$('.chip').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
  render();
}
function badges(item) {
  const arr = [];
  item.periods.slice(0,2).forEach(p=>arr.push(`<span class="badge">${escapeHtml(p)}</span>`));
  (item.flags||[]).forEach(f=>arr.push(`<span class="badge flag">${escapeHtml(f)}</span>`));
  if(item.types.includes('辣')) arr.push('<span class="badge hot">🌶️ 辣</span>');
  if(item.status) arr.push(`<span class="badge status">${escapeHtml(item.status)}</span>`);
  return arr.join('');
}
function porkLabel(v){return v==='avoid-ok'?'可選非豬推薦':v==='contains'?'推薦含豬':'食材需確認'}

function renderItemCard(item){
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.id=item.id;
  node.querySelector('.badges').innerHTML=badges(item);
  node.querySelector('.food-name').textContent=item.name;
  node.querySelector('.food-rec').textContent='推薦：'+item.foods.join('、');
  const note=node.querySelector('.food-note'); note.textContent=item.note||''; note.hidden=!item.note;
  node.querySelector('.meta-row').innerHTML=`<span class="meta-pill">📍 ${escapeHtml(item.area)}</span>${item.address?`<span class="meta-pill">${escapeHtml(item.address)}</span>`:''}`;
  const heart=node.querySelector('.heart'); heart.classList.toggle('active',state.favorites.has(item.id)); heart.textContent=state.favorites.has(item.id)?'♥':'♡';
  heart.addEventListener('click',()=>toggleFavorite(item.id));
  node.querySelector('.map-btn').addEventListener('click',()=>selectOnMap(item,true));
  node.querySelector('.nav-btn').addEventListener('click',()=>openRoute(item));
  const add=node.querySelector('.route-add'); add.textContent=state.route.some(x=>x.id===item.id)?'✓ 已加入':'＋ 路線';
  add.addEventListener('click',()=>toggleRoute(item));
  cards.appendChild(node);
}
function renderGroupCard(unit){
  const def=groupDef(unit);
  const node=document.createElement('article');
  node.className='food-card group-card';
  node.dataset.group=unit.key;
  node.innerHTML=`
    <div class="group-card-head">
      <div class="group-icon" aria-hidden="true">${def.emoji}</div>
      <div class="group-copy">
        <div class="badges"><span class="badge flag">分類</span><span class="badge">${unit.children.length} 間分店</span></div>
        <h3 class="food-name">${escapeHtml(def.label)}</h3>
        <p class="food-rec">${escapeHtml(def.hint)}；隨機抽店時這一整組只算 1 張籤。</p>
      </div>
      <button class="group-toggle secondary" type="button" aria-expanded="false">展開分店 ↓</button>
    </div>
    <div class="group-children" hidden></div>
  `;
  const childBox=node.querySelector('.group-children');
  const brands=new Map();
  unit.children.forEach(item=>{
    const brand=groupBrand(item);
    if(!brands.has(brand)) brands.set(brand,[]);
    brands.get(brand).push(item);
  });
  brands.forEach((items,brand)=>{
    const section=document.createElement('section');
    section.className='branch-brand';
    if(brands.size>1){
      const h=document.createElement('h4'); h.textContent=brand; section.appendChild(h);
    }
    items.forEach(item=>{
      const row=document.createElement('div');
      row.className='branch-row';
      row.innerHTML=`
        <div class="branch-main">
          <b>${escapeHtml(item.name)}</b>
          <span>${escapeHtml(item.address||item.area||'')}</span>
        </div>
        <div class="branch-actions">
          <button class="branch-heart" type="button" aria-label="收藏">${state.favorites.has(item.id)?'♥':'♡'}</button>
          <button class="branch-map secondary" type="button">地圖</button>
          <button class="branch-route secondary" type="button">${state.route.some(x=>x.id===item.id)?'✓':'＋路線'}</button>
          <button class="branch-nav primary" type="button">導航</button>
        </div>`;
      row.querySelector('.branch-heart').classList.toggle('active',state.favorites.has(item.id));
      row.querySelector('.branch-heart').addEventListener('click',()=>toggleFavorite(item.id));
      row.querySelector('.branch-map').addEventListener('click',()=>selectOnMap(item,true));
      row.querySelector('.branch-route').addEventListener('click',()=>toggleRoute(item));
      row.querySelector('.branch-nav').addEventListener('click',()=>openRoute(item));
      section.appendChild(row);
    });
    childBox.appendChild(section);
  });
  const toggle=node.querySelector('.group-toggle');
  toggle.addEventListener('click',()=>{
    const open=childBox.hidden;
    childBox.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent=open?'收合分店 ↑':'展開分店 ↓';
    node.classList.toggle('open',open);
  });
  cards.appendChild(node);
}
function render() {
  const list = filtered();
  const units = displayUnits(list);
  const expandedGroups=new Set($$('.group-card.open').map(node=>node.dataset.group));
  cards.innerHTML='';
  units.forEach(unit=>{
    if(unit.type==='group') renderGroupCard(unit);
    else renderItemCard(unit.item);
  });
  $$('.group-card').forEach(node=>{
    if(expandedGroups.has(node.dataset.group)) node.querySelector('.group-toggle').click();
  });
  $('#countAll').textContent=displayUnits(DATA).length;
  $('#countVisible').textContent=units.length;
  $('#emptyState').hidden=units.length!==0;
  $('#listTitle').textContent=state.period==='全部'?'全部店家':state.period;
  renderRoute();
  updateFilterUI();
  if(state.view==='map') syncMapChoices();
}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  localStorage.setItem(`${APP_SLUG}-favs`,JSON.stringify([...state.favorites])); render();
}
function randomPick(){
  let pool=filtered().filter(x=>!x.status || x.status==='營業中');
  if(!pool.length) pool=DATA.filter(x=>!x.status || x.status==='營業中');
  const units=displayUnits(pool);
  const unit=units[Math.floor(Math.random()*units.length)];
  const item=unit.type==='group'
    ? unit.children[Math.floor(Math.random()*unit.children.length)]
    : unit.item;
  const group=unit.type==='group'?groupDef(unit):null;
  state.selected=item;
  $('#randomName').textContent=group?`${group.label} → ${item.name}`:item.name;
  $('#randomFood').textContent=item.foods.join('、');
  $('#randomMeta').innerHTML=`${group?`<span class="badge flag">${escapeHtml(group.label)}・分店隨機</span>`:''}<span class="badge">${escapeHtml(item.area)}</span>${(item.flags||[]).map(f=>`<span class="badge flag">${escapeHtml(f)}</span>`).join('')}`;
  $('#randomEmoji').textContent=group?group.emoji:item.types.includes('飲料')?'🧋':item.types.includes('甜點')?'🍰':item.types.includes('火鍋')?'🍲':item.types.includes('漢堡')?'🍔':item.types.includes('麵')?'🍜':'🍛';
  $('#randomDialog').showModal();
  if(state.view==='map') selectOnMap(item);
}
function shopMapQuery(item){return item.mapQuery||item.address||[item.name,CONFIG.centerName].filter(Boolean).join(' ');}
function mapEmbed(query){return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;}
function selectOnMap(item, reveal=false){
  if(reveal) setView('map');
  state.selected=item;
  if(state.view==='map') syncMapChoices(true);
  else updateMapTarget(shopMapQuery(item));
}
let mapResizeFrame;
function mapMessage(message=''){
  $('#mapMessage').textContent=message;
  $('#mapMessage').hidden=!message;
}
function resizeMap(){
  cancelAnimationFrame(mapResizeFrame);
  mapResizeFrame=requestAnimationFrame(()=>{
    const nav=$('.mobile-bottom-bar');
    const reserve=getComputedStyle(nav).display==='none'?0:innerHeight-nav.getBoundingClientRect().top;
    document.body.style.setProperty('--map-nav-space',`${reserve}px`);
  });
}
function setView(view){
  if(!['list','map'].includes(view)||state.view===view)return;
  if(view==='map') state.listScrollY=window.scrollY;
  state.view=view;
  const mapOn=view==='map';
  document.body.dataset.view=view;
  $('#mapView').hidden=!mapOn;
  layout.hidden=mapOn;
  $('#viewToggle').textContent=mapOn?'☰ 清單':'🗺️ 地圖';
  $('#viewToggle').setAttribute('aria-expanded',String(mapOn));
  for(const [id,active] of [['mobileListBtn',!mapOn],['mobileMapBtn',mapOn]]){
    $(`#${id}`).classList.toggle('active',active);
    $(`#${id}`).setAttribute('aria-pressed',String(active));
  }
  const routeHost=mapOn?$('#mapRouteDrawer'):$('#mapPanel');
  routeHost.append($('.route-box'),$('.route-list-box'));
  // Reuse the existing Google iframe and route controls in either view.
  (mapOn?$('#foodMap'):$('.mapframe-wrap')).append($('#mapFrame'));
  if(mapOn){
    window.scrollTo({top:0,behavior:'instant'});
    syncMapChoices();
    resizeMap();
  }else{
    requestAnimationFrame(()=>{
      if(state.view==='list') window.scrollTo({top:state.listScrollY,behavior:'instant'});
    });
  }
}
function updateMapTarget(query){
  const src=mapEmbed(query);
  if($('#mapFrame').getAttribute('src')!==src) $('#mapFrame').src=src;
  $('#openGoogleMap').href='https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query});
}
function syncMapChoices(keepSelection=false){
  const list=filtered();
  if(!keepSelection&&!list.some(x=>x.id===state.selected?.id)) state.selected=list[0]||null;
  const select=$('#mapShopSelect');
  select.replaceChildren(new Option(CONFIG.centerName||'中心地點',''));
  for(const item of list) select.add(new Option(item.name,item.id));
  const item=state.selected;
  const outside=item&&!list.some(x=>x.id===item.id);
  if(outside) select.add(new Option(item.name+'（抽選結果・篩選外）',item.id));
  select.value=item?.id||'';
  $('#mapCoverage').textContent=list.length
    ?`符合 ${list.length} 間・選一間查看 Google Maps${outside?'・抽選結果不在目前篩選內':''}`
    :`這組條件沒有結果${outside?'，目前顯示抽選結果。':'，請調整搜尋或篩選。'}`;
  $('#mapSelection').hidden=!item;
  if(item){
    $('#mapShopAddress').textContent=item.address||item.area;
    $('#mapShopFood').textContent=`推薦：${item.foods.join('、')}`;
    $('#mapShopInfo').title=$('#mapShopInfo').textContent;
    $('#mapFavoriteBtn').textContent=state.favorites.has(item.id)?'♥ 已收藏':'♡ 收藏';
    $('#mapFavoriteBtn').setAttribute('aria-pressed',String(state.favorites.has(item.id)));
    $('#mapAddRouteBtn').textContent=state.route.some(x=>x.id===item.id)?'✓ 已加入':'＋ 路線';
  }
  $('#routeSelected').disabled=!item;
  updateMapTarget(item?shopMapQuery(item):(CONFIG.centerMapQuery||CONFIG.centerName||'中心地點'));
}
function setMapRouteOpen(open){
  $('#mapRouteDrawer').hidden=!open;
  $('#mapRouteBtn').setAttribute('aria-expanded',String(open));
}
function originValue(){
  if(state.currentCoords) return `${state.currentCoords.latitude},${state.currentCoords.longitude}`;
  return $('#originSelect').value;
}
function routeUrl(item){
  const origin=originValue(); const dest=item.mapQuery||item.address||[item.name,CONFIG.centerName].filter(Boolean).join(' '); const mode=$('#travelMode').value;
  const p=new URLSearchParams({api:'1',destination:dest,travelmode:mode,dir_action:'navigate'}); if(origin)p.set('origin',origin);
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
function openRoute(item){state.selected=item;window.open(routeUrl(item),'_blank','noopener');}
function toggleRoute(item){
  const i=state.route.findIndex(x=>x.id===item.id); if(i>=0) state.route.splice(i,1); else if(state.route.length<5) state.route.push(item); else alert('美食路線最多先排 5 家，避免 Google Maps 路線太亂。'); render();
}
function renderRoute(){
  const ol=$('#routeList'); ol.innerHTML=''; state.route.forEach((x,i)=>{const li=document.createElement('li');li.innerHTML=`${escapeHtml(x.name)} <button class="route-remove" data-i="${i}">×</button>`;ol.appendChild(li)});
  $$('.route-remove').forEach(b=>b.addEventListener('click',()=>{state.route.splice(+b.dataset.i,1);render()}));
  $('#openMultiRoute').disabled=state.route.length<2;
}
function openMultiRoute(){
  if(state.route.length<2)return; const origin=originValue(); const mode=$('#travelMode').value;
  const destination=state.route[state.route.length-1].mapQuery||state.route[state.route.length-1].name;
  const waypoints=state.route.slice(0,-1).map(x=>x.mapQuery||x.name).join('|');
  const p=new URLSearchParams({api:'1',destination,waypoints,travelmode:mode}); if(origin)p.set('origin',origin);
  window.open(`https://www.google.com/maps/dir/?${p.toString()}`,'_blank','noopener');
}
function useLocation(){
  if(!navigator.geolocation){alert('這個瀏覽器不支援定位。');return}
  $('#nearbyBtn').textContent='📍 取得位置中…';
  $('#mapLocationBtn').textContent='定位中…';
  $('#nearbyBtn').disabled=$('#mapLocationBtn').disabled=true;
  const finish=()=>{
    $('#nearbyBtn').disabled=$('#mapLocationBtn').disabled=false;
    $('#mapLocationBtn').textContent='📍 定位起點';
  };
  navigator.geolocation.getCurrentPosition(pos=>{
    finish();
    state.currentCoords={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
    $('#originSelect').value=''; $('#nearbyBtn').textContent='✓ 已使用目前位置';
    setView('map');
    mapMessage('已使用目前位置作為導航起點；按「導航」在 Google Maps 規劃路線。');
  },()=>{finish();$('#nearbyBtn').textContent='📍 用目前位置規劃';
    const message=`無法取得位置或未允許定位。仍可從 ${CONFIG.centerName||'中心地點'} 或自選起點規劃。`;
    if(state.view==='map') mapMessage(message); else alert(message);
  },{enableHighAccuracy:false,timeout:8000});
}

function initIdentity(){
  const siteName=CONFIG.siteName||'示範地點今天吃什麼';
  const shortName=CONFIG.shortName||'LOCATION EATS';
  const lead=CONFIG.heroLead||'依時段、口味、區域挑；真的選不出來就抽一家，抽完直接導航。';
  document.title=siteName+'｜Location Eats';
  $('#brandName').textContent=siteName;
  $('#shortName').textContent=shortName;
  $('#heroLead').textContent=lead;
  $('.brand').setAttribute('aria-label',siteName+'首頁');
  $('#campusBtn').textContent='⌂ 回'+(CONFIG.centerShortName||'中心點');
  const meta=$('#metaDescription');
  if(meta) meta.setAttribute('content',(CONFIG.metaDescription||siteName+'：依時段、口味、區域挑餐廳，隨機抽店並直接規劃路線。'));
}
function initOrigins(){
  const select=$('#originSelect');
  const current=select.options[0];
  select.replaceChildren(current);
  const origins=Array.isArray(CONFIG.origins)?CONFIG.origins:[];
  origins.forEach(origin=>{
    if(!origin)return;
    const value=typeof origin==='string'?origin:(origin.value||origin.label||'');
    const label=typeof origin==='string'?origin:(origin.label||origin.value||'');
    if(value) select.add(new Option(label,value));
  });
}
function renderQuickFilters(){
  const host=$('#quickFilters');
  host.innerHTML='';
  const filters=Array.isArray(CONFIG.quickFilters)?CONFIG.quickFilters:[];
  filters.forEach(filter=>{
    if(!filter||!filter.value)return;
    const button=document.createElement('button');
    button.className='tagchip';
    button.type='button';
    button.textContent=filter.label||filter.value;
    const kind=filter.kind||'type';
    if(kind==='flag') button.dataset.flag=filter.value;
    else if(kind==='pork') button.dataset.pork=filter.value;
    else button.dataset.type=filter.value;
    host.appendChild(button);
  });
}

function initFilters(){
  renderQuickFilters();
  const filterDialog=$('#filterDialog');
  $$('.chip').forEach(b=>b.addEventListener('click',()=>setPeriod(b.dataset.period)));
  $('#searchInput').addEventListener('input',e=>{state.search=e.target.value.trim();render()});
  $('#moreFiltersBtn').addEventListener('click',()=>{syncFilterControls();filterDialog.showModal()});
  $('#filterDialogClose').addEventListener('click',()=>filterDialog.close());
  $('#applyFilters').addEventListener('click',()=>filterDialog.close());

  $$('.tagchip').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.type){
      state.type=state.type===b.dataset.type?'':b.dataset.type;
      $$('[data-type].tagchip').filter(x=>x!==b).forEach(x=>x.classList.remove('active'));
    }
    if(b.dataset.flag){
      state.flag=state.flag===b.dataset.flag?'':b.dataset.flag;
      $$('[data-flag].tagchip').filter(x=>x!==b).forEach(x=>x.classList.remove('active'));
    }
    if(b.dataset.pork) state.pork=state.pork===b.dataset.pork?'':b.dataset.pork;
    syncFilterControls();
    render();
  }));

  const areas=[...new Set(DATA.map(x=>x.area))].sort();
  areas.forEach(a=>{$('#areaSelect').insertAdjacentHTML('beforeend','<option>'+escapeHtml(a)+'</option>')});
  $('#areaSelect').addEventListener('change',e=>{state.area=e.target.value;render()});

  const clearAdvanced=()=>{
    state.type=state.flag=state.pork=state.area='';
    syncFilterControls();
    render();
  };
  const clearAll=()=>{
    state.period='全部';state.search=state.type=state.flag=state.pork=state.area='';
    $('#searchInput').value='';
    syncFilterControls();
    setPeriod('全部');
  };
  $('#clearFilters').addEventListener('click',clearAdvanced);
  $('#emptyClear').addEventListener('click',clearAll);
  updateFilterUI();
}
function goHome(){
  state.listScrollY=0;
  setView('list');
  state.search=state.type=state.flag=state.pork=state.area='';
  $('#searchInput').value='';
  syncFilterControls();
  setPeriod('全部');
  setMapRouteOpen(false);
  mapMessage();
  if(location.hash) history.replaceState(null,'',location.pathname+location.search);
  window.scrollTo({top:0,behavior:'instant'});
}
function init(){
  initIdentity();
  initOrigins();
  $('.brand').addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    goHome();
  });
  initFilters(); const cp=currentPeriod(); $('#nowHint').textContent=`現在適合：${cp}`;
  const updateHint=$('#dataUpdateHint');
  if(updateHint){updateHint.textContent=`資料更新：${META.updatedLabel||'—'}${META.cadence?'｜'+META.cadence:''}`;updateHint.title=META.scope||'';}
  $('#randomHero').addEventListener('click',randomPick);$('#randomList').addEventListener('click',randomPick);$('#rerollBtn').addEventListener('click',randomPick);
  $('#randomMapBtn').addEventListener('click',()=>{$('#randomDialog').close();selectOnMap(state.selected,true)});
  $('#randomNavBtn').addEventListener('click',()=>openRoute(state.selected));
  $('#routeSelected').addEventListener('click',()=>state.selected&&openRoute(state.selected));
  $('#nearbyBtn').addEventListener('click',useLocation);$('#clearRoute').addEventListener('click',()=>{state.route=[];render()});$('#openMultiRoute').addEventListener('click',openMultiRoute);
  $('#viewToggle').addEventListener('click',()=>setView(state.view==='list'?'map':'list'));
  $('#mapRandomBtn').addEventListener('click',randomPick);
  $('#mapLocationBtn').addEventListener('click',useLocation);
  $('#campusBtn').addEventListener('click',()=>{state.selected=null;syncMapChoices(true);});
  $('#mapShopSelect').addEventListener('change',e=>{
    state.selected=DATA.find(item=>item.id===e.target.value)||null;
    syncMapChoices(true);
  });
  $('#mapFavoriteBtn').addEventListener('click',()=>state.selected&&toggleFavorite(state.selected.id));
  $('#mapAddRouteBtn').addEventListener('click',()=>state.selected&&toggleRoute(state.selected));
  $('#mapNavigateBtn').addEventListener('click',()=>state.selected&&openRoute(state.selected));
  $('#mapRouteBtn').addEventListener('click',()=>setMapRouteOpen($('#mapRouteDrawer').hidden));
  $('#closeMapRoute').addEventListener('click',()=>setMapRouteOpen(false));
  window.addEventListener('resize',resizeMap);
  $('#originSelect').addEventListener('change',()=>{state.currentCoords=null;$('#nearbyBtn').textContent='📍 用目前位置規劃';});

  const mobileListBtn=$('#mobileListBtn'), mobileRandomBtn=$('#mobileRandomBtn'), mobileMapBtn=$('#mobileMapBtn');
  if(mobileListBtn) mobileListBtn.addEventListener('click',()=>setView('list'));
  if(mobileRandomBtn) mobileRandomBtn.addEventListener('click',randomPick);
  if(mobileMapBtn) mobileMapBtn.addEventListener('click',()=>setView('map'));
  const dataDialog=$('#dataDialog');
  $('#dataBtn').addEventListener('click',()=>{updateBackupStatus();setBackupMessage('');dataDialog.showModal()});
  $('#dataDialogClose').addEventListener('click',()=>dataDialog.close());
  $('#exportDataBtn').addEventListener('click',exportBackup);
  $('#importDataBtn').addEventListener('click',()=>$('#importDataInput').click());
  $('#importDataInput').addEventListener('change',async e=>{
    await importBackupFile(e.target.files?.[0]);
    e.target.value='';
  });

  const themeDialog=$('#themeDialog');
  applyTheme(localStorage.getItem(`${APP_SLUG}-theme`)||'classic');
  $('#themeBtn').addEventListener('click',()=>themeDialog.showModal());
  $$('.theme-option').forEach(b=>b.addEventListener('click',()=>{
    applyTheme(b.dataset.themeChoice);
    setTimeout(()=>themeDialog.close(),120);
  }));
  selectOnMap(DATA[0]); render();
}
init();
