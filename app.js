// ============ STATE MANAGEMENT ============
const State = {
  characters: [],
  apis: [],
  activeApiId: null,
  worldBooks: [],
  messages: {},
  moments: [],
  emojis: [],
  currentCharacterId: null,
  profile: {
    name: 'AI 玩家',
    wxId: 'ai_player_01',
    avatar: null, // data URL or null
    gender: '未设置', // 男 / 女 / 未设置
    signature: '',
    role: '' // 人设（玩家角色设定）
  },

  save(){
    try{
      localStorage.setItem('aiPhoneState', JSON.stringify({
        characters: this.characters,
        apis: this.apis,
        activeApiId: this.activeApiId,
        worldBooks: this.worldBooks,
        messages: this.messages,
        moments: this.moments,
        emojis: this.emojis,
        profile: this.profile
      }));
    }catch(e){}
  },

  load(){
    try{
      const data = JSON.parse(localStorage.getItem('aiPhoneState'));
      if(data){
        this.characters = data.characters || [];
        this.apis = data.apis || [];
        this.activeApiId = data.activeApiId || null;
        this.worldBooks = data.worldBooks || [];
        this.messages = data.messages || {};
        this.moments = data.moments || [];
        this.emojis = data.emojis || [];
        if(data.profile) Object.assign(this.profile, data.profile);
      }
    }catch(e){}
    this.initDefaults();
  },

  initDefaults(){
    if(this.apis.length === 0){
      this.apis.push({
        id: 'api_default', name: '默认 API', url: '', key: '',
        model: '', active: true
      });
      this.activeApiId = 'api_default';
    }
    if(this.worldBooks.length === 0){
      this.worldBooks.push(
        {id:'wb_1', title:'故事世界观', desc:'这是一个充满魔法与奇思妙想的世界，各种种族共存。', group:'默认', isGlobal:true, selectedByDefault:true},
        {id:'wb_2', title:'角色行为准则', desc:'回复必须符合角色设定，保持人格一致性，不说超出角色认知的话。', group:'默认', isGlobal:true, selectedByDefault:true}
      );
    }
    if(this.characters.length === 0){
      this.characters.push({id:'char_1', name:'林月', remark:'月公子的侍女', role:'温柔的古代侍女，善于诗词歌赋，说话优雅含蓄，常以古语回应。', avatar:'moon', worldBookIds:['wb_1','wb_2'], createdAt:Date.now()});
      this.messages['char_1'] = [
        {id:Date.now(), role:'assistant', content:'公子安好，月在此恭候多时了。今日天色正好，可有兴致与月共赏一景？'}
      ];
    }
    this.save();
  },

  getActiveApi(){ return this.apis.find(a=>a.id===this.activeApiId) || this.apis.find(a=>a.active); },
  getCharacterMessages(id){ return this.messages[id] || []; },
  setCharacterMessages(id, msgs){ this.messages[id]=msgs; this.save(); },

  getWorldBooksForCharacter(charId){
    const char = this.characters.find(c=>c.id===charId);
    if(!char) return [];
    const selectedIds = char.worldBookIds || [];
    const globalBooks = this.worldBooks.filter(wb=>wb.isGlobal && wb.selectedByDefault);
    const selectedBooks = this.worldBooks.filter(wb=>selectedIds.includes(wb.id));
    const selectedNonGlobal = selectedBooks.filter(wb=>!wb.isGlobal);
    return [...globalBooks, ...selectedNonGlobal];
  }
};

// ============ UTILITIES ============
function pad(n){return n<10?'0'+n:n;}
function now(){return Date.now();}
function formatTime(t){
  const d = new Date(t);
  const h = d.getHours(), m = d.getMinutes();
  const cur = new Date();
  if(d.toDateString()===cur.toDateString()) return pad(h)+':'+pad(m);
  return (d.getMonth()+1)+'/'+d.getDate();
}
function formatMTime(t){
  const d = new Date(t);
  return pad(d.getHours())+':'+pad(d.getMinutes());
}
function showToast(msg){
  let t = document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.getElementById('screen').appendChild(t);}
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2000);
}

// ============ CLOCK ============
function updateTime(){
  const n = new Date();
  const t = pad(n.getHours())+':'+pad(n.getMinutes());
  document.querySelectorAll('.status-bar span:first-child, .lock-time, #home-time, #lock-time-bar').forEach(el=>{
    if(el.textContent.length<=5) el.textContent = t;
  });
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  document.querySelectorAll('.lock-date').forEach(el=>{
    el.textContent = (n.getMonth()+1)+'月'+n.getDate()+'日 '+weekdays[n.getDay()];
  });
}

// ============ LOCK SCREEN ============
function initLockScreen(){
  const screen = document.getElementById('lock-screen');
  const bar = document.getElementById('unlock-bar');
  if(!screen || !bar) return;
  let startY = 0, startX = 0, dragging = false, lastY = 0;

  const getPoint = (e)=>{
    if(e.touches && e.touches.length>0) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
    if(e.changedTouches && e.changedTouches.length>0) return {x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY};
    return {x:e.clientX, y:e.clientY};
  };

  const onStart = (e)=>{
    if(screen.classList.contains('unlocking')) return;
    dragging = true;
    const p = getPoint(e);
    startY = p.y;
    startX = p.x;
    lastY = startY;
    if(e.type !== 'touchstart') e.preventDefault();
  };
  const onMove = (e)=>{
    if(!dragging || screen.classList.contains('unlocking')) return;
    const p = getPoint(e);
    lastY = p.y;
    const y = p.y - startY;
    if(y < 0){
      screen.style.transform = `translateY(${y}px)`;
      screen.style.opacity = 1 - Math.min(Math.abs(y)/600, 0.7);
      screen.style.transition = 'none';
    }
    if(e.type === 'touchmove' && e.cancelable) e.preventDefault();
  };
  const onEnd = (e)=>{
    if(!dragging) return;
    dragging = false;
    const y = lastY - startY;
    const absY = Math.abs(y);
    if(y < -80){
      unlockPhone();
    }else{
      screen.style.transition = '';
      screen.style.transform = '';
      screen.style.opacity = '';
    }
  };

  // Mouse events
  bar.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  // Also allow dragging on whole lock screen
  screen.addEventListener('mousedown', onStart);

  // Touch events
  bar.addEventListener('touchstart', onStart, {passive:false});
  screen.addEventListener('touchstart', onStart, {passive:false});
  document.addEventListener('touchmove', onMove, {passive:false});
  document.addEventListener('touchend', onEnd, {passive:false});
  document.addEventListener('touchcancel', onEnd, {passive:false});

  screen.addEventListener('transitionend', (e)=>{
    if(e.propertyName !== 'transform') return;
    if(screen.classList.contains('unlocking')){
      screen.style.transform = '';
      screen.style.opacity = '';
      screen.style.visibility = 'hidden';
      document.getElementById('home-screen').classList.add('active');
    }
  });
  renderLockNotifications();
}

function unlockPhone(){
  const screen = document.getElementById('lock-screen');
  if(!screen || screen.classList.contains('unlocking')) return;
  screen.classList.add('unlocking');
  screen.style.transition = '';
}

function renderLockNotifications(){
  const container = document.getElementById('lock-notifications');
  const chars = State.characters.slice(0,3);
  if(chars.length===0){container.style.display='none';return;}
  container.style.display='flex';
  container.innerHTML = chars.map(c=>{
    const msgs = State.getCharacterMessages(c.id);
    const last = msgs.filter(m=>m.role!=='system').pop();
    if(!last) return '';
    return `<div class="lock-notif">
      <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#8B7E74" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"/></svg></div>
      <div class="content">
        <div class="title"><span>${c.name}</span><span>刚刚</span></div>
        <div class="body">${last.content||'新消息'}</div>
      </div>
    </div>`;
  }).filter(Boolean).join('');
}

// ============ HOME SCREEN ============
const APPS = [
  {id:'wechat-app', name:'微信', icon:'wechat', dock:true},
  {id:'settings-app', name:'设置', icon:'settings', dock:true},
  {id:'worldbook-app', name:'世界书', icon:'book', dock:true},
  {id:'memo-app', name:'备忘录', icon:'memo', dock:false},
  {id:'calc-app', name:'计算器', icon:'calc', dock:false},
  {id:'gallery-app', name:'相册', icon:'gallery', dock:false},
  {id:'music-app', name:'音乐', icon:'music', dock:false},
  {id:'weather-app', name:'天气', icon:'weather', dock:false},
];

const ICONS = {
  wechat:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  memo:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  calc:'<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>',
  gallery:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  music:'<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  weather:'<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 100-9h-1.8A7 7 0 104 15.5"/><circle cx="7" cy="8" r="2"/></svg>',
};

function renderHomeScreen(){
  const grid = document.getElementById('home-grid');
  const dock = document.getElementById('home-dock');
  const dockApps = APPS.filter(a=>a.dock);
  const gridApps = APPS.filter(a=>!a.dock);
  grid.innerHTML = gridApps.map(a=>`<div class="app-icon" onclick="openApp('${a.id}')"><div class="icon-wrap">${ICONS[a.icon]}</div><span class="label">${a.name}</span></div>`).join('');
  dock.innerHTML = dockApps.map(a=>`<div class="app-icon" onclick="openApp('${a.id}')"><div class="icon-wrap">${ICONS[a.icon]}</div><span class="label">${a.name}</span></div>`).join('');
}

function openApp(id){
  const existing = document.getElementById(id);
  if(existing){ existing.classList.add('open'); if(id==='settings-app') renderSettingsApp(); if(id==='worldbook-app') renderWorldBookApp(); if(id==='wechat-app') renderWeChatApp(); return; }
  let html = '';
  if(id==='settings-app') html = buildSettingsApp();
  else if(id==='worldbook-app') html = buildWorldBookApp();
  else if(id==='wechat-app') html = buildWeChatApp();
  else html = `<div style="display:flex;flex-direction:column;height:100%;"><div class="app-header"><div class="title">${APPS.find(a=>a.id===id)?.name||'应用'}</div></div><div class="app-body" style="display:flex;align-items:center;justify-content:center;color:var(--text-hint);font-size:14px;">此功能开发中</div></div>`;
  const c = document.createElement('div');
  c.className = 'app-container'; c.id = id; c.innerHTML = html;
  document.getElementById('screen').appendChild(c);
  requestAnimationFrame(()=>c.classList.add('open'));
  if(id==='settings-app') renderSettingsApp();
  if(id==='worldbook-app') renderWorldBookApp();
  if(id==='wechat-app') renderWeChatApp();
}
function closeApp(id){ const el=document.getElementById(id); if(el){el.classList.remove('open'); setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},350);}}

// ============ MODAL SYSTEM ============
function createModal({title, body, footer, onMount}){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet">
    <div class="modal-sheet-header"><h3>${title}</h3><div class="close-btn" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>
    <div class="modal-sheet-body">${body}</div>
    <div class="modal-sheet-footer">${footer}</div>
  </div>`;
  if(onMount) setTimeout(onMount,0);
  overlay.addEventListener('click',(e)=>{if(e.target===overlay) closeModal();});
  return overlay;
}
function showModal(modal){
  closeModal();
  document.getElementById('screen').appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add('active'));
  window._currentModal = modal;
}
function closeModal(){
  const m = window._currentModal;
  if(m){ m.classList.remove('active'); setTimeout(()=>{if(m.parentNode)m.parentNode.removeChild(m);},300); }
  window._currentModal = null;
}

// ============ SETTINGS APP ============
function buildSettingsApp(){
  return `<div style="display:flex;flex-direction:column;height:100%;">
    <div class="app-header">
      <div class="back-btn" onclick="closeApp('settings-app')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></div>
      <div class="title">设置</div>
      <div class="right-actions"></div>
    </div>
    <div class="app-body" id="settings-body"></div>
  </div>`;
}

function renderSettingsApp(){
  const body = document.getElementById('settings-body');
  if(!body) return;
  const activeApi = State.getActiveApi();
  body.innerHTML = `
    <div class="settings-section">
      <h3>API 配置</h3>
      <div id="api-list"></div>
      <div style="margin-top:12px;">
        <button class="btn-secondary" onclick="showApiModal(null)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加新 API
        </button>
      </div>
    </div>
    <div class="settings-section">
      <h3>当前激活</h3>
      <div class="settings-card">
        <div class="settings-item" onclick="showApiModal('${activeApi?activeApi.id:''}')">
          <div class="si-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          <div class="si-label">${activeApi?activeApi.name:'无'}</div>
          <div class="si-value">${activeApi?(activeApi.model||'未选择模型'):'请添加 API'}</div>
        </div>
      </div>
    </div>`;
  renderApiList();
}

function renderApiList(){
  const list = document.getElementById('api-list');
  if(!list) return;
  if(State.apis.length===0){ list.innerHTML='<div style="text-align:center;color:var(--text-hint);padding:20px;font-size:13px;">暂无 API 配置</div>'; return; }
  list.innerHTML = State.apis.map(api=>{
    const isActive = api.id===State.activeApiId;
    return `<div class="api-card ${isActive?'active':''}">
      <div class="api-name"><span class="dot"></span>${api.name}</div>
      <div class="api-info">${api.url||'未设置 URL'}</div>
      ${api.model?`<span class="api-model">${api.model}</span>`:''}
      <div class="api-actions">
        <button onclick="showApiModal('${api.id}')">编辑</button>
        <button onclick="setActiveApi('${api.id}')">${isActive?'使用中':'设为当前'}</button>
      </div>
      <div class="api-delete" onclick="deleteApi('${api.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></div>
    </div>`;
  }).join('');
}

function setActiveApi(id){
  State.activeApiId = id;
  State.apis.forEach(a=>a.active=a.id===id);
  State.save();
  renderApiList();
  renderSettingsApp();
  showToast('已切换 API');
}
function deleteApi(id){
  if(!confirm('确定删除此 API 配置？')) return;
  State.apis = State.apis.filter(a=>a.id!==id);
  if(State.activeApiId===id) State.activeApiId = State.apis[0]?.id||null;
  State.save();
  renderApiList();
  renderSettingsApp();
}

function showApiModal(id){
  const api = id?State.apis.find(a=>a.id===id):{name:'',url:'',key:'',model:''};
  window._currentEditApiId = id;
  const modal = createModal({
    title: id?'编辑 API':'添加 API',
    body: `
      <div class="form-group"><label>名称</label><input id="api-name" placeholder="例如: My API" value="${api.name||''}"></div>
      <div class="form-group"><label>URL</label><input id="api-url" placeholder="https://api.example.com" value="${api.url||''}"></div>
      <div class="form-group"><label>API Key</label><input id="api-key" type="password" placeholder="sk-..." value="${api.key||''}"></div>
      <div class="form-group">
        <label>模型</label>
        <div style="display:flex;gap:10px;">
          <input id="api-model" placeholder="模型名称" value="${api.model||''}" style="flex:1;">
          <button class="btn-secondary" style="width:auto;padding:12px 16px;white-space:nowrap;" onclick="fetchModels()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            拉取模型
          </button>
        </div>
        <div id="model-list" style="margin-top:10px;"></div>
      </div>`,
    footer: `<button class="btn-primary" onclick="saveApi()">保存</button>`
  });
  showModal(modal);
}

async function fetchModels(){
  const url = document.getElementById('api-url').value.trim();
  const key = document.getElementById('api-key').value.trim();
  const ml = document.getElementById('model-list');
  if(!url||!key){showToast('请先填写 URL 和 Key');return;}
  ml.innerHTML = '<div class="loading-dots" style="text-align:center;padding:10px;"><span></span><span></span><span></span></div>';
  try{
    const resp = await fetch(`${url.replace(/\/$/,'')}/v1/models`,{headers:{'Authorization':`Bearer ${key}`}});
    if(!resp.ok) throw new Error('请求失败 '+resp.status);
    const data = await resp.json();
    const models = (data.data||[]).map(m=>m.id);
    if(models.length===0){ml.innerHTML='<div style="text-align:center;color:var(--text-hint);padding:10px;font-size:13px;">未找到模型</div>';return;}
    ml.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;">${models.map(m=>`<div onclick="document.getElementById('api-model').value='${m}';this.style.background='var(--accent)';this.style.color='#fff';" style="padding:6px 12px;border-radius:12px;background:var(--bg-card);font-size:12px;cursor:pointer;border:1px solid var(--divider);">${m}</div>`).join('')}</div>`;
  }catch(e){ ml.innerHTML='<div style="text-align:center;color:var(--text-hint);padding:10px;font-size:13px;">无法获取模型列表</div>'; }
}

function saveApi(){
  const id = window._currentEditApiId;
  const name = document.getElementById('api-name').value.trim();
  const url = document.getElementById('api-url').value.trim();
  const key = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim();
  if(!name||!url){showToast('请填写完整信息');return;}
  if(id){
    const api = State.apis.find(a=>a.id===id);
    Object.assign(api,{name,url,key,model});
  }else{
    const na = {id:'api_'+Date.now(),name,url,key,model,active:false};
    State.apis.push(na);
    if(!State.activeApiId) State.activeApiId = na.id;
  }
  State.save();
  closeModal();
  renderSettingsApp();
  showToast('保存成功');
}

// ============ WORLD BOOK APP ============
function buildWorldBookApp(){
  return `<div style="display:flex;flex-direction:column;height:100%;position:relative;">
    <div class="app-header">
      <div class="back-btn" onclick="closeApp('worldbook-app')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></div>
      <div class="title">世界书</div>
      <div class="right-actions"></div>
    </div>
    <div class="app-body" id="wb-body"></div>
    <div class="wb-add-btn" onclick="showWorldBookModal()">
      <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>
  </div>`;
}

function renderWorldBookApp(){
  const body = document.getElementById('wb-body');
  if(!body) return;
  const groups = {};
  State.worldBooks.forEach(wb=>{const g=wb.group||'默认';if(!groups[g])groups[g]=[];groups[g].push(wb);});
  body.innerHTML = Object.keys(groups).sort().map(g=>`
    <div class="wb-group">
      <div class="wb-group-header"><span>${g}</span><span class="wb-count">${groups[g].length}</span></div>
      ${groups[g].map(wb=>`
        <div class="wb-card">
          <div class="wb-checkbox ${wb.selectedByDefault?'checked':''}" onclick="toggleWbSelection('${wb.id}')">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="wb-content">
            <div class="wb-title">${wb.title}${wb.isGlobal?'<span class="tag global">全局</span>':'<span class="tag">局部</span>'}</div>
            <div class="wb-desc">${wb.desc||'暂无描述'}</div>
          </div>
          <div class="wb-delete" onclick="deleteWorldBook('${wb.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </div>
        </div>`).join('')}
    </div>`).join('') || '<div style="text-align:center;color:var(--text-hint);padding:60px 20px;font-size:14px;">点击右下角添加世界书</div>';
}

function toggleWbSelection(id){
  const wb = State.worldBooks.find(w=>w.id===id);
  if(wb){ wb.selectedByDefault=!wb.selectedByDefault; State.save(); renderWorldBookApp(); }
}
function deleteWorldBook(id){
  if(!confirm('确定删除此世界书？')) return;
  State.worldBooks = State.worldBooks.filter(w=>w.id!==id);
  State.characters.forEach(c=>{if(c.worldBookIds)c.worldBookIds=c.worldBookIds.filter(w=>w.id!==id);});
  State.save();
  renderWorldBookApp();
}

function showWorldBookModal(){
  const modal = createModal({
    title: '添加世界书',
    body: `
      <div class="form-group"><label>标题</label><input id="wb-title" placeholder="世界书名称"></div>
      <div class="form-group"><label>描述 / 内容</label><textarea id="wb-desc" placeholder="描述这个世界的规则、背景、设定..."></textarea></div>
      <div class="form-group"><label>分组</label><input id="wb-group" placeholder="例如：世界观、人设守则" value="默认"></div>
      <div class="form-group">
        <label>生效范围</label>
        <div style="display:flex;gap:10px;">
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:1px solid var(--divider);border-radius:10px;cursor:pointer;font-size:14px;">
            <input type="radio" name="wb-scope" value="global" checked style="accent-color:var(--accent);"> 全局默认生效
          </label>
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:1px solid var(--divider);border-radius:10px;cursor:pointer;font-size:14px;">
            <input type="radio" name="wb-scope" value="local" style="accent-color:var(--accent);"> 局部手动勾选
          </label>
        </div>
      </div>`,
    footer: `<button class="btn-primary" onclick="saveWorldBook()">保存</button>`
  });
  showModal(modal);
}
function saveWorldBook(){
  const title = document.getElementById('wb-title').value.trim();
  const desc = document.getElementById('wb-desc').value.trim();
  const group = document.getElementById('wb-group').value.trim()||'默认';
  const scope = document.querySelector('input[name="wb-scope"]:checked').value;
  if(!title){showToast('请填写标题');return;}
  State.worldBooks.push({id:'wb_'+Date.now(),title,desc,group,isGlobal:scope==='global',selectedByDefault:scope==='global'});
  State.save();
  closeModal();
  renderWorldBookApp();
  showToast('添加成功');
}

// ============ WECHAT APP ============
function buildWeChatApp(){
  return `<div style="display:flex;flex-direction:column;height:100%;">
    <!-- WeChat Top Header with back button -->
    <div class="app-header" style="padding:10px 14px 8px;">
      <div class="back-btn" onclick="closeApp('wechat-app')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></div>
      <div class="title" id="wx-page-title">微信</div>
      <div class="right-actions"></div>
    </div>
    <div id="wx-screens" style="flex:1;overflow:hidden;position:relative;">
      <!-- Chat Tab -->
      <div class="wx-tab-content active" id="wx-tab-chat" style="position:absolute;inset:0;">
        <div class="wx-search">
          <div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><span>搜索</span></div>
          <div class="plus-btn" onclick="showCharacterModal(null)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
        </div>
        <div id="chat-list-container" style="flex:1;overflow-y:auto;background:var(--bg-warm);"></div>
      </div>
      <!-- Contacts Tab -->
      <div class="wx-tab-content" id="wx-tab-contacts" style="position:absolute;inset:0;">
        <div style="padding:12px 16px;background:var(--bg-card);display:flex;gap:12px;align-items:center;border-bottom:0.5px solid var(--divider);">
          <div style="width:30px;height:30px;border-radius:8px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <span style="font-size:15px;">新的朋友</span>
        </div>
        <div id="contacts-list-container" style="flex:1;overflow-y:auto;background:var(--bg-warm);"></div>
      </div>
      <!-- Discover Tab -->
      <div class="wx-tab-content" id="wx-tab-discover" style="position:absolute;inset:0;overflow-y:auto;background:var(--bg-warm);padding-top:10px;">
        <div class="discover-group">
          <div class="discover-item" onclick="openMoments()">
            <div class="d-icon" style="background:rgba(7,193,96,0.12);"><svg viewBox="0 0 24 24" stroke="#07C160" fill="none"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>
            <span class="d-label">朋友圈</span>
            <div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div>
          </div>
        </div>
        <div class="discover-group">
          <div class="discover-item"><div class="d-icon" style="background:rgba(255,149,0,0.12);"><svg viewBox="0 0 24 24" stroke="#FF9500" fill="none"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div><span class="d-label">视频号</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div>
          <div class="discover-item"><div class="d-icon" style="background:rgba(255,59,48,0.12);"><svg viewBox="0 0 24 24" stroke="#FF3B30" fill="none"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div><span class="d-label">直播</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div>
        </div>
        <div class="discover-group">
          <div class="discover-item"><div class="d-icon" style="background:rgba(52,199,89,0.12);"><svg viewBox="0 0 24 24" stroke="#34C759" fill="none"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l6 4"/></svg></div><span class="d-label">附近</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div>
        </div>
      </div>
      <!-- Profile Tab -->
      <div class="wx-tab-content" id="wx-tab-profile" style="position:absolute;inset:0;overflow-y:auto;background:var(--bg-warm);">
        <div class="profile-hero" id="profile-hero" onclick="showProfileEditModal()">
          <div class="p-avatar" id="profile-avatar">小</div>
          <div class="p-info">
            <div class="p-name" id="profile-name">AI 玩家</div>
            <div class="p-id" id="profile-wxid">微信号: ai_player_01</div>
          </div>
          <div class="d-arrow" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
        <div id="profile-info-list"></div>
        <div style="height:12px;"></div>
        <div class="discover-group"><div class="discover-item"><div class="d-icon" style="background:rgba(255,149,0,0.12);"><svg viewBox="0 0 24 24" stroke="#FF9500" fill="none"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div><span class="d-label">支付</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div></div>
        <div style="height:12px;"></div>
        <div class="discover-group">
          <div class="discover-item"><div class="d-icon" style="background:rgba(139,126,116,0.12);"><svg viewBox="0 0 24 24" stroke="#8B7E74" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></div><span class="d-label">收藏</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div>
          <div class="discover-item" onclick="openApp('settings-app')"><div class="d-icon" style="background:rgba(139,126,116,0.12);"><svg viewBox="0 0 24 24" stroke="#8B7E74" fill="none"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/></svg></div><span class="d-label">设置</span><div class="d-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></div></div>
        </div>
      </div>
    </div>
    <!-- Tab Bar -->
    <div class="wx-tabbar" id="wx-tabbar">
      <div class="wx-tab active" data-tab="chat" onclick="switchWxTab('chat')"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>微信</span></div>
      <div class="wx-tab" data-tab="contacts" onclick="switchWxTab('contacts')"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg><span>通讯录</span></div>
      <div class="wx-tab" data-tab="discover" onclick="switchWxTab('discover')"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg><span>发现</span></div>
      <div class="wx-tab" data-tab="profile" onclick="switchWxTab('profile')"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我</span></div>
    </div>
    <!-- Chat Detail -->
    <div id="chat-detail">
      <div class="chat-header">
        <div class="back" onclick="closeChatDetail()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div class="chat-title" id="chat-title">角色对话</div>
        <div class="chat-actions" onclick="showCharacterDetail()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></div>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-panel" id="chat-panel"></div>
      <div class="chat-input-bar">
        <div class="action-btn" onclick="toggleFeaturePanel()" title="功能">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <div class="action-btn response" id="response-btn" style="display:flex;" onclick="sendChatMessage()" title="点击发送/响应">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </div>
        <textarea id="chat-input" placeholder="输入消息..." rows="1" oninput="handleInput()"></textarea>
        <button class="send-btn" id="send-btn" onclick="sendChatMessage()" style="display:none;">发送</button>
      </div>
    </div>
  </div>`;
}

function renderWeChatApp(){
  renderChatList();
  renderContactsList();
  renderProfileTab();
}

function renderProfileTab(){
  const p = State.profile;
  const nameEl = document.getElementById('profile-name');
  const wxidEl = document.getElementById('profile-wxid');
  const avatarEl = document.getElementById('profile-avatar');
  if(nameEl) nameEl.textContent = p.name;
  if(wxidEl) wxidEl.textContent = '微信号: ' + p.wxId;
  if(avatarEl){
    if(p.avatar){
      avatarEl.innerHTML = `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }else{
      avatarEl.textContent = (p.name||'我')[0];
    }
  }
  const list = document.getElementById('profile-info-list');
  if(list){
    list.innerHTML = `
      <div class="discover-group" style="margin-top:12px;">
        <div class="discover-item" onclick="showProfileEditModal()">
          <span class="d-label">昵称</span>
          <span class="d-arrow" style="color:var(--text-secondary);margin-right:0;gap:4px;">${escapeHtml(p.name)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
        <div class="discover-item" onclick="showProfileEditModal()">
          <span class="d-label">性别</span>
          <span class="d-arrow" style="color:var(--text-secondary);margin-right:0;gap:4px;">${p.gender}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
        <div class="discover-item" onclick="showProfileEditModal()">
          <span class="d-label">个性签名</span>
          <span class="d-arrow" style="color:var(--text-secondary);margin-right:0;gap:4px;max-width:140px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.signature||'未设置'}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
        <div class="discover-item" onclick="showProfileEditModal()">
          <span class="d-label">人设</span>
          <span class="d-arrow" style="color:var(--text-secondary);margin-right:0;gap:4px;max-width:140px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.role?'已设置':'未设置'}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>`;
  }
}

function showProfileEditModal(){
  const p = State.profile;
  const avatarPreview = p.avatar
    ? `<img id="preview-avatar" src="${p.avatar}" style="width:84px;height:84px;border-radius:12px;object-fit:cover;cursor:pointer;" onclick="document.getElementById('profile-avatar-file').click()">`
    : `<div id="preview-avatar" style="width:84px;height:84px;border-radius:12px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:500;cursor:pointer;" onclick="document.getElementById('profile-avatar-file').click()">${(p.name||'我')[0]}</div>`;

  const modal = createModal({
    title: '个人信息',
    body: `
      <div class="form-group" style="display:flex;align-items:center;gap:14px;">
        <label style="min-width:60px;">头像</label>
        <div style="position:relative;">
          ${avatarPreview}
          <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:var(--wechat);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="document.getElementById('profile-avatar-file').click()" title="更换头像">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <input type="file" id="profile-avatar-file" accept="image/*" style="display:none;" onchange="handleProfileAvatar(event)">
        </div>
      </div>
      <div class="form-group"><label>昵称</label><input id="prof-name" placeholder="请输入昵称" value="${escapeHtml(p.name)}"></div>
      <div class="form-group">
        <label>性别</label>
        <div style="display:flex;gap:10px;">
          <label style="flex:1;padding:10px 12px;border:0.5px solid var(--divider);border-radius:8px;cursor:pointer;background:var(--bg-card);display:flex;align-items:center;gap:8px;"><input type="radio" name="prof-gender" value="男" ${p.gender==='男'?'checked':''}> 男</label>
          <label style="flex:1;padding:10px 12px;border:0.5px solid var(--divider);border-radius:8px;cursor:pointer;background:var(--bg-card);display:flex;align-items:center;gap:8px;"><input type="radio" name="prof-gender" value="女" ${p.gender==='女'?'checked':''}> 女</label>
          <label style="flex:1;padding:10px 12px;border:0.5px solid var(--divider);border-radius:8px;cursor:pointer;background:var(--bg-card);display:flex;align-items:center;gap:8px;"><input type="radio" name="prof-gender" value="未设置" ${p.gender!=='男'&&p.gender!=='女'?'checked':''}> 保密</label>
        </div>
      </div>
      <div class="form-group"><label>个性签名</label><textarea id="prof-signature" placeholder="写一句话介绍自己..." rows="2">${escapeHtml(p.signature||'')}</textarea></div>
      <div class="form-group"><label>人设（玩家角色设定）</label><textarea id="prof-role" placeholder="描述你自己的性格、身份、世界观等..." rows="3">${escapeHtml(p.role||'')}</textarea></div>`,
    footer: `<button class="btn-primary" onclick="saveProfile()">保存</button>`
  });
  showModal(modal);
}

function handleProfileAvatar(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ showToast('图片大小不能超过5MB'); return; }
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const dataUrl = ev.target.result;
    State.profile.avatar = dataUrl;
    const prev = document.getElementById('preview-avatar');
    if(prev){
      prev.outerHTML = `<img id="preview-avatar" src="${dataUrl}" style="width:84px;height:84px;border-radius:12px;object-fit:cover;cursor:pointer;" onclick="document.getElementById('profile-avatar-file').click()">`;
    }
    showToast('头像已更新');
  };
  reader.readAsDataURL(file);
}

function saveProfile(){
  const name = document.getElementById('prof-name').value.trim();
  const signature = document.getElementById('prof-signature').value.trim();
  const role = document.getElementById('prof-role').value.trim();
  const genderR = document.querySelector('input[name="prof-gender"]:checked');
  const gender = genderR ? genderR.value : '未设置';
  if(!name){ showToast('请填写昵称'); return; }
  Object.assign(State.profile, {name, gender, signature, role});
  State.save();
  closeModal();
  renderProfileTab();
  // Also update moments/profile hero text
  const heroAvatar = document.getElementById('profile-avatar');
  if(heroAvatar){
    if(State.profile.avatar){
      heroAvatar.innerHTML = `<img src="${State.profile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }else{
      heroAvatar.innerHTML = (State.profile.name||'我')[0];
    }
  }
  showToast('保存成功');
}

function switchWxTab(tab){
  document.querySelectorAll('.wx-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  document.querySelectorAll('.wx-tab-content').forEach(c=>c.classList.toggle('active',c.id==='wx-tab-'+tab));
  const titles = {chat:'微信',contacts:'通讯录',discover:'发现',profile:'我'};
  const t = document.getElementById('wx-page-title');
  if(t) t.textContent = titles[tab] || '微信';
}

function renderChatList(){
  const c = document.getElementById('chat-list-container');
  if(!c) return;
  if(State.characters.length===0){ c.innerHTML='<div style="text-align:center;color:var(--text-hint);padding:60px 20px;font-size:14px;">点击右上角 + 创建 AI 角色</div>'; return; }
  c.innerHTML = State.characters.map(ch=>{
    const msgs = State.getCharacterMessages(ch.id);
    const last = [...msgs].reverse().find(m=>m.role!=='system');
    const time = last?formatTime(last.time||Date.now()):'';
    const preview = last?(last.content||'[语音]'):'开始对话吧';
    const unread = ch.unread || 0;
    const avatarHtml = renderAvatarHtml(ch.avatar, 'avatar');
    return `<div class="wx-chat-item" onclick="openChat('${ch.id}')">
      ${avatarHtml}
      <div class="info"><div class="info-top"><span class="name">${ch.name}</span><span class="time">${time}</span></div><div class="preview">${preview}</div></div>
      ${unread>0?`<div class="unread">${unread>99?'99+':unread}</div>`:''}
    </div>`;
  }).join('');
}

function renderContactsList(){
  const c = document.getElementById('contacts-list-container');
  if(!c) return;
  const sorted = [...State.characters].sort((a,b)=>a.name.localeCompare(b.name,'zh'));
  const groups = {};
  sorted.forEach(ch=>{const l=getFirstLetter(ch.name);if(!groups[l])groups[l]=[];groups[l].push(ch);});
  c.innerHTML = Object.keys(groups).sort().map(l=>`<div><div class="wx-section-header">${l}</div>${groups[l].map(ch=>`<div class="wx-contact-item" onclick="openChat('${ch.id}')">${renderAvatarHtml(ch.avatar, 'avatar')}<div><div class="c-name">${ch.name}</div><div class="c-role">${(ch.role||'暂无角色设定').substring(0,22)}${ch.role&&ch.role.length>22?'...':''}</div></div></div>`).join('')}</div>`).join('') || '<div style="text-align:center;color:var(--text-hint);padding:60px 20px;font-size:14px;">暂无联系人</div>';
}

function getFirstLetter(str){
  if(!str) return '#';
  const s = str[0];
  if(/[a-zA-Z]/.test(s)) return s.toUpperCase();
  return '#';
}

// ============ CHAT DETAIL ============
function openChat(charId){
  State.currentCharacterId = charId;
  const ch = State.characters.find(c=>c.id===charId);
  if(!ch) return;
  ch.unread = 0;
  State.save();
  document.getElementById('chat-title').textContent = ch.name;
  document.getElementById('chat-detail').classList.add('active');
  document.getElementById('wx-screens').style.display='none';
  renderChatMessages();
}
function closeChatDetail(){
  document.getElementById('chat-detail').classList.remove('active');
  document.getElementById('wx-screens').style.display='block';
  State.currentCharacterId = null;
  renderChatList();
}

function renderChatMessages(){
  const charId = State.currentCharacterId;
  if(!charId) return;
  const container = document.getElementById('chat-messages');
  const msgs = State.getCharacterMessages(charId);
  const api = State.getActiveApi();
  let warningHtml = '';
  if(!api || !api.url || !api.key || !api.model){
    warningHtml = `<div style="text-align:center;padding:10px 12px;margin:8px 0;background:#FFF3CD;border-radius:8px;font-size:12px;color:#856404;border:0.5px solid #FFEAA7;">⚠️ 尚未配置API，AI将无法回复。请前往「设置」添加API配置。</div>`;
  }
  container.innerHTML = warningHtml + msgs.map(m=>renderMessage(m)).join('');
  container.scrollTop = container.scrollHeight;
}

function renderMessage(m){
  const avatarContent = m.role==='user' ? '<div class="msg-avatar" style="background:#A8C5DA;">我</div>' : renderAvatarHtml(getCurrentCharAvatar(), 'msg-avatar');
  if(m.type==='system') return `<div class="msg-system">${m.content}</div>`;
  if(m.type==='time') return `<div class="msg-time">${m.content}</div>`;
  if(m.type==='voice'){
    const text = m.voiceText || '语音消息';
    return `<div class="msg-row ${m.role==='user'?'mine':'their'}">
      ${avatarContent}
      <div>
        <div class="msg-bubble msg-voice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          <div class="wave"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <div class="msg-voice-text">${text}</div>
      </div>
    </div>`;
  }
  if(m.type==='emoji'){
    return `<div class="msg-row ${m.role==='user'?'mine':'their'}">
      ${avatarContent}
      <div class="msg-bubble msg-emoji"><img class="emoji-img" src="${m.emojiUrl}" alt="emoji"></div>
    </div>`;
  }
  return `<div class="msg-row ${m.role==='user'?'mine':'their'}">
    ${avatarContent}
    <div class="msg-bubble">${escapeHtml(m.content)}</div>
  </div>`;
}

function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

const AVATAR_ICONS = {
  moon:'<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
  star:'<polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/>',
  wind:'<line x1="9" y1="5" x2="21" y2="5"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="19" x2="21" y2="19"/>',
  cloud:'<path d="M18 10a6 6 0 00-11.6-1.5A5 5 0 007 18h11a4 4 0 000-8z"/>',
  snow:'<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>',
  flower:'<circle cx="12" cy="12" r="3"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>',
  sword:'<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>',
  mask:'<path d="M3 7c4-3 14-3 18 0v6c0 4-3 7-9 7s-9-3-9-7V7z"/>',
  feather:'<path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/>',
  lamp:'<path d="M12 2a7 7 0 017 7c0 3-2 4-2 7H7c0-3-2-4-2-7a7 7 0 017-7z"/><line x1="9" y1="18" x2="15" y2="18"/>',
};
function renderAvatarHtml(avatarId, cls){
  const id = (avatarId||'moon');
  const svg = AVATAR_ICONS[id];
  if(svg) return `<div class="${cls||'avatar'}" style="display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="22" height="22" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">${svg}</svg></div>`;
  return `<div class="${cls||'avatar'}">${escapeHtml(id[0]||'?')}</div>`;
}
function getCurrentCharAvatar(){
  const ch = State.characters.find(c=>c.id===State.currentCharacterId);
  return ch ? (ch.avatar||'moon') : 'moon';
}

function handleInput(){
  const ta = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const respBtn = document.getElementById('response-btn');
  if(!sendBtn || !respBtn) return;
  if(ta.value.trim()){
    respBtn.style.display='none';
    sendBtn.style.display='block';
  }else{
    respBtn.style.display='flex';
    sendBtn.style.display='none';
  }
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 80) + 'px';
}

function sendChatMessage(){
  const charId = State.currentCharacterId;
  if(!charId) return;
  const ta = document.getElementById('chat-input');
  const text = ta.value.trim();
  if(!text){
    triggerAIResponse();
    return;
  }
  const msgs = State.getCharacterMessages(charId);
  msgs.push({id:now(),role:'user',content:text,time:now()});
  State.setCharacterMessages(charId, msgs);
  ta.value = '';
  handleInput();
  renderChatMessages();
  triggerAIResponse();
}

async function triggerAIResponse(){
  const charId = State.currentCharacterId;
  if(!charId) return;
  const api = State.getActiveApi();
  if(!api || !api.url || !api.key || !api.model){
    showToast('⚠️ 请先在设置中配置API，AI才能回复');
    return;
  }
  await callAIAPI(charId);
}

async function callAIAPI(charId){
  const ch = State.characters.find(c=>c.id===charId);
  const api = State.getActiveApi();
  if(!ch || !api) return;
  const wbs = State.getWorldBooksForCharacter(charId);
  const systemPrompt = buildSystemPrompt(ch, wbs);
  const msgs = State.getCharacterMessages(charId);
  const apiMsgs = [{role:'system',content:systemPrompt}, ...msgs.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:m.content}))];

  msgs.push({id:now(),role:'assistant',content:'...思考中...',time:now(),loading:true});
  State.setCharacterMessages(charId, msgs);
  renderChatMessages();

  try{
    const resp = await fetch(`${api.url.replace(/\/$/,'')}/chat/completions`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${api.key}`},
      body: JSON.stringify({model:api.model,messages:apiMsgs,stream:false})
    });
    if(!resp.ok) throw new Error('API错误 '+resp.status);
    const data = await resp.json();
    let reply = data.choices?.[0]?.message?.content || '...';
    msgs.pop();
    msgs.push({id:now(),role:'assistant',content:reply,time:now()});
  }catch(e){
    msgs.pop();
    showToast('⚠️ API请求失败：' + (e.message||'未知错误'));
    renderChatMessages();
    return;
  }
  const ch2 = State.characters.find(c=>c.id===charId);
  if(ch2) ch2.unread = (ch2.unread||0)+1;
  State.setCharacterMessages(charId, msgs);
  renderChatMessages();
  renderChatList();
}

function buildSystemPrompt(ch, wbs){
  let prompt = `你是一个名为"${ch.name}"的AI角色。`;
  if(ch.remark) prompt += `别人可能这样称呼你：${ch.remark}。`;
  if(ch.role) prompt += `\n\n你的角色设定：\n${ch.role}`;
  if(wbs.length>0){
    prompt += '\n\n你必须遵守以下世界书设定：\n';
    wbs.forEach((wb,i)=>{prompt += `${i+1}. ${wb.title}：${wb.desc}\n`;});
  }
  prompt += '\n请以该角色的身份和语气自然地回应对话，保持角色的一致性。回复使用简体中文。';
  return prompt;
}

// ============ VOICE / EMOJI PANEL ============
function toggleFeaturePanel(){
  const panel = document.getElementById('chat-panel');
  if(State.activePanel==='feature'){panel.classList.remove('active');State.activePanel=null;return;}
  panel.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:10px;border-bottom:0.5px solid var(--divider);padding-bottom:8px;">
      <div class="fp-tab active" data-tab="voice" onclick="switchFeatureTab('voice')" style="flex:1;padding:8px;border-radius:8px;font-size:13px;text-align:center;cursor:pointer;background:var(--accent);color:#fff;font-weight:500;">发语音</div>
      <div class="fp-tab" data-tab="emoji" onclick="switchFeatureTab('emoji')" style="flex:1;padding:8px;border-radius:8px;font-size:13px;text-align:center;cursor:pointer;background:var(--bg-card);color:var(--text-secondary);border:0.5px solid var(--divider);">表情包</div>
    </div>
    <div id="fp-content"></div>`;
  renderFeatureTab('voice');
  panel.classList.add('active');
  State.activePanel = 'feature';
}
function switchFeatureTab(tab){
  document.querySelectorAll('.fp-tab').forEach(el=>{
    if(el.dataset.tab===tab){el.style.background='var(--accent)';el.style.color='#fff';el.style.border='';el.style.fontWeight='500';}
    else{el.style.background='var(--bg-card)';el.style.color='var(--text-secondary)';el.style.border='0.5px solid var(--divider)';el.style.fontWeight='400';}
  });
  renderFeatureTab(tab);
}
function renderFeatureTab(tab){
  const c = document.getElementById('fp-content');
  if(!c) return;
  if(tab==='voice'){
    c.innerHTML = `<div class="voice-record-btn" id="voice-record" onclick="recordVoice()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg><div class="hint">点击模拟发送语音</div></div>`;
  }else{
    const emojis = State.emojis;
    let emojiHtml = '';
    if(emojis.length===0){
      emojiHtml = '<div class="emoji-empty" style="grid-column:1/-1;text-align:center;">尚未导入表情包<br><span style="cursor:pointer;color:var(--accent);" onclick="importEmojis()">点击批量导入</span></div>';
    }else{
      emojiHtml = emojis.map((e,i)=>`<div class="emoji-item" onclick="sendEmoji(${i})" title="${e.name}"><img src="${e.url}" alt="${e.name}"></div>`).join('');
    }
    c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-size:13px;color:var(--text-secondary);">表情包 (${emojis.length})</span><span style="font-size:12px;color:var(--accent);cursor:pointer;" onclick="importEmojis()">+ 批量导入</span></div><div class="emoji-grid">${emojiHtml}</div>`;
  }
}
function togglePanel(type){
  toggleFeaturePanel();
}

function recordVoice(){
  const btn = document.getElementById('voice-record');
  if(btn.classList.contains('recording')){
    btn.classList.remove('recording');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg><div class="hint">点击模拟发送语音</div>`;
    sendVoiceMessage('这是一段模拟语音内容');
    return;
  }
  btn.classList.add('recording');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg><div class="hint">录制中...再次点击发送</div>`;
}

function sendVoiceMessage(text){
  const charId = State.currentCharacterId;
  if(!charId) return;
  const msgs = State.getCharacterMessages(charId);
  msgs.push({id:now(),role:'user',type:'voice',voiceText:text,time:now()});
  State.setCharacterMessages(charId, msgs);
  document.getElementById('chat-panel').classList.remove('active');
  State.activePanel = null;
  renderChatMessages();
  setTimeout(()=>triggerAIResponse(), 1000);
}

function sendEmoji(index){
  const charId = State.currentCharacterId;
  if(!charId) return;
  const emoji = State.emojis[index];
  if(!emoji) return;
  const msgs = State.getCharacterMessages(charId);
  msgs.push({id:now(),role:'user',type:'emoji',emojiUrl:emoji.url,time:now()});
  State.setCharacterMessages(charId, msgs);
  document.getElementById('chat-panel').classList.remove('active');
  State.activePanel = null;
  renderChatMessages();
  setTimeout(()=>triggerAIResponse(), 1500);
}

function importEmojis(){
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*';
  input.onchange = (e)=>{
    const files = e.target.files;
    if(!files || files.length===0) return;
    Array.from(files).forEach(file=>{
      const reader = new FileReader();
      reader.onload = (ev)=>{
        const url = ev.target.result;
        const name = file.name.replace(/\.[^.]+$/,'');
        State.emojis.push({name,url});
        State.save();
      };
      reader.readAsDataURL(file);
    });
    setTimeout(()=>{togglePanel('emoji');showToast(`已导入 ${files.length} 个表情`);}, 500);
  };
  input.click();
}

// ============ CHARACTER MODAL ============
function showAddCharacterModal(){ showCharacterModal(null); }

function showCharacterModal(id){
  const ch = id?State.characters.find(c=>c.id===id):{name:'',remark:'',role:'',avatar:'',worldBookIds:[]};
  window._currentEditCharId = id;
  const avatarIcons = [
    {id:'moon', svg:'<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'},
    {id:'star', svg:'<polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/>'},
    {id:'wind', svg:'<line x1="9" y1="5" x2="21" y2="5"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="19" x2="21" y2="19"/>'},
    {id:'cloud', svg:'<path d="M18 10a6 6 0 00-11.6-1.5A5 5 0 007 18h11a4 4 0 000-8z"/>'},
    {id:'snow', svg:'<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/>'},
    {id:'flower', svg:'<circle cx="12" cy="12" r="3"/><path d="M12 2a3 3 0 000 6M12 16a3 3 0 000 6M2 12a3 3 0 006 0M16 12a3 3 0 006 0"/>'},
    {id:'book', svg:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>'},
    {id:'music', svg:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},
    {id:'sword', svg:'<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>'},
    {id:'mask', svg:'<path d="M3 7c4-3 14-3 18 0v6c0 4-3 7-9 7s-9-3-9-7V7z"/><circle cx="8.5" cy="11" r="1"/><circle cx="15.5" cy="11" r="1"/>'},
    {id:'feather', svg:'<path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>'},
    {id:'lamp', svg:'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 017 7c0 3-2 4-2 7H7c0-3-2-4-2-7a7 7 0 017-7z"/>'},
  ];
  const avatars = avatarIcons.map(a=>a.id);
  const wbOptions = State.worldBooks.map(wb=>{
    const selected = ch.worldBookIds&&ch.worldBookIds.includes(wb.id);
    return `<div class="wb-select-item ${selected?'selected':''}" onclick="toggleCharWb('${wb.id}',this)">
      <div class="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="ws-title">${wb.title}${wb.isGlobal?' <span style="color:var(--accent);font-size:11px;">[全局]</span>':''}</div>
    </div>`;
  }).join('') || '<div style="text-align:center;color:var(--text-hint);padding:20px;font-size:13px;">请先在世界书中添加内容</div>';

  const modal = createModal({
    title: id?'编辑人设':'创建人设',
    body: `
      <div class="form-group"><label>姓名</label><input id="char-name" placeholder="角色姓名" value="${ch.name||''}"></div>
      <div class="form-group"><label>备注 (可选)</label><input id="char-remark" placeholder="备注" value="${ch.remark||''}"></div>
      <div class="form-group"><label>角色设定</label><textarea id="char-role" placeholder="描述角色的性格、说话方式、背景故事等..." rows="4">${ch.role||''}</textarea></div>
      <div class="form-group">
        <label>头像 (简约线条图标)</label>
        <div class="avatar-select-grid">
          ${avatarIcons.map(a=>`<div class="avatar-opt ${ch.avatar===a.id?'selected':''}" data-avatar="${a.id}" onclick="selectCharAvatar('${a.id}',this)" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);"><svg viewBox="0 0 24 24" width="22" height="22" stroke="#8B7E74" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">${a.svg}</svg></div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>世界书绑定</label>
        <div id="char-wb-list">${wbOptions}</div>
      </div>`,
    footer: `<button class="btn-primary" onclick="saveCharacter()">保存</button>`
  });
  window._charWbSelections = [...(ch.worldBookIds||[])];
  showModal(modal);
}

function toggleCharWb(wbId, el){
  const sel = window._charWbSelections;
  const idx = sel.indexOf(wbId);
  if(idx>=0) sel.splice(idx,1); else sel.push(wbId);
  el.classList.toggle('selected');
}

function selectCharAvatar(a, el){
  document.querySelectorAll('.avatar-opt').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected');
  window._charAvatar = a;
}

function saveCharacter(){
  const id = window._currentEditCharId;
  const name = document.getElementById('char-name').value.trim();
  const remark = document.getElementById('char-remark').value.trim();
  const role = document.getElementById('char-role').value.trim();
  const avatar = window._charAvatar || (State.characters.find(c=>c.id===id)?.avatar) || '月';
  const wbIds = window._charWbSelections || [];
  if(!name){showToast('请填写姓名');return;}

  if(id){
    const ch = State.characters.find(c=>c.id===id);
    Object.assign(ch,{name,remark,role,avatar,worldBookIds:wbIds});
  }else{
    const newChar = {id:'char_'+Date.now(),name,remark,role,avatar,worldBookIds:wbIds,createdAt:Date.now()};
    State.characters.push(newChar);
    State.messages[newChar.id] = [];
  }
  State.save();
  closeModal();
  renderChatList();
  renderContactsList();
  showToast('保存成功');
}

function showCharacterDetail(){
  const charId = State.currentCharacterId;
  const ch = State.characters.find(c=>c.id===charId);
  if(!ch) return;
  const wbs = State.getWorldBooksForCharacter(charId);
  const avatarHtml = renderAvatarHtml(ch.avatar, '');
  const modal = createModal({
    title: '角色详情',
    body: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:72px;height:72px;border-radius:12px;background:var(--accent-soft);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:500;margin:0 auto 12px;">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">${AVATAR_ICONS[ch.avatar]||AVATAR_ICONS.moon}</svg>
        </div>
        <div style="font-size:18px;font-weight:600;">${ch.name}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${ch.remark||'无备注'}</div>
      </div>
      <div style="padding:12px 14px;background:var(--bg-card);border-radius:12px;margin-bottom:12px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">角色设定</div>
        <div style="font-size:14px;line-height:1.6;">${ch.role||'暂无设定'}</div>
      </div>
      <div style="padding:12px 14px;background:var(--bg-card);border-radius:12px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">已绑定世界书 (${wbs.length})</div>
        ${wbs.length===0?'<div style="font-size:13px;color:var(--text-hint);">暂无</div>':wbs.map(w=>`<div style="font-size:13px;margin-bottom:4px;">· ${w.title}</div>`).join('')}
      </div>`,
    footer: `<button class="btn-primary" onclick="showCharacterModal('${ch.id}')">编辑人设</button>`
  });
  showModal(modal);
}

// ============ MOMENTS / 朋友圈 ============
function openMoments(){
  const container = document.getElementById('chat-detail');
  if(!container) return;
  container.style.display = 'none';
  const screens = document.getElementById('wx-screens');
  if(screens) screens.style.display = 'none';

  const existing = document.getElementById('moments-view');
  if(existing){existing.style.display='flex';renderMoments();return;}

  const view = document.createElement('div');
  view.id = 'moments-view';
  view.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:var(--bg-warm);z-index:400;';
  view.innerHTML = `
    <div style="display:flex;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);position:absolute;top:0;left:0;right:0;z-index:10;">
      <div class="back" onclick="closeMoments()" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <span style="flex:1;text-align:center;color:#fff;font-size:17px;font-weight:500;">朋友圈</span>
      <div onclick="showPublishModal()" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
    </div>
    <div class="moments-hero">
      <div class="m-avatar" id="m-hero-avatar"></div>
      <span class="m-hero-name" style="position:absolute;right:96px;bottom:0;color:#fff;font-size:17px;font-weight:500;text-shadow:0 1px 4px rgba(0,0,0,0.2);">${State.profile.name||'我'}</span>
    </div>
    <div class="moments-list" id="moments-list"></div>
  `;
  document.getElementById('screen').appendChild(view);
  // Update avatar in moments hero
  const heroA = document.getElementById('m-hero-avatar');
  if(heroA){
    if(State.profile.avatar){
      heroA.innerHTML = `<img src="${State.profile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }else{
      heroA.textContent = (State.profile.name||'我')[0];
    }
  }
  renderMoments();
}

function closeMoments(){
  const view = document.getElementById('moments-view');
  if(view) view.style.display = 'none';
  const container = document.getElementById('chat-detail');
  if(container) container.style.display = 'none';
  const screens = document.getElementById('wx-screens');
  if(screens) screens.style.display = 'block';
}

function renderMoments(){
  const list = document.getElementById('moments-list');
  if(!list) return;
  if(State.moments.length===0){
    list.innerHTML = '<div style="text-align:center;color:var(--text-hint);padding:60px 20px;font-size:14px;">还没有朋友圈内容<br>点击右上角相机发布</div>';
    return;
  }
  list.innerHTML = State.moments.map(m=>renderMomentCard(m)).join('');
  list.querySelectorAll('.moment-more').forEach(el=>{
    el.addEventListener('click',()=>{
      const comments = el.previousElementSibling;
      if(comments){
        const all = comments.querySelectorAll('.moment-comment');
        const hidden = comments.querySelectorAll('.moment-comment:nth-child(n+4)');
        if(hidden.length>0){hidden.forEach(h=>h.style.display='none');el.textContent='展开全部';}
        else{all.forEach(a=>a.style.display='');el.textContent='收起';}
      }
    });
  });
}

function renderMomentCard(m){
  const char = State.characters.find(c=>c.id===m.charId);
  const charName = char?char.name:State.profile.name||'我';
  const isPlayer = !char;
  const charAvatarId = char?(char.avatar||'moon'):null;
  const avatarSvg = charAvatarId?(AVATAR_ICONS[charAvatarId]||AVATAR_ICONS.moon):null;
  let avatarHtml;
  if(isPlayer && State.profile.avatar){
    avatarHtml = `<img src="${State.profile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
  }else if(isPlayer){
    avatarHtml = (State.profile.name||'我')[0];
  }else{
    avatarHtml = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">${avatarSvg}</svg>`;
  }

  let imagesHtml = '';
  if(m.images && m.images.length>0){
    const cls = m.images.length===1?'g1':m.images.length===2?'g2':'g3';
    imagesHtml = `<div class="moment-images ${cls}">${m.images.map(src=>`<div class="m-img"><img src="${src}" alt=""></div>`).join('')}</div>`;
  }

  let likesHtml = '';
  if(m.likes && m.likes.length>0){
    likesHtml = `<div class="moment-likes">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)" stroke="var(--accent)" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      ${m.likes.map(l=>`<span>${l}</span>`).join('，')}
    </div>`;
  }

  let commentsHtml = '';
  if(m.comments && m.comments.length>0){
    const showCount = Math.min(m.comments.length, 3);
    const showComments = m.comments.slice(0, showCount);
    const hiddenCount = m.comments.length - showCount;
    commentsHtml = `<div class="moment-comments">
      ${showComments.map(c=>`<div class="moment-comment"><span class="c-name">${c.name}：</span><span class="c-text">${c.text}</span></div>`).join('')}
      ${hiddenCount>0?`<div class="moment-more">共 ${m.comments.length} 条评论</div>`:''}
    </div>`;
  }

  return `<div class="moment-card">
    <div class="moment-header">
      <div class="avatar" style="display:flex;align-items:center;justify-content:center;background:var(--accent-soft);">
        ${avatarHtml}
      </div>
      <div>
        <div class="m-name">${charName}</div>
      </div>
      <div class="m-time">${formatMTime(m.time)}</div>
    </div>
    ${m.text?`<div class="moment-text">${escapeHtml(m.text)}</div>`:''}
    ${imagesHtml}
    <div class="moment-actions">
      <div class="action" onclick="toggleMomentActions(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
      </div>
      <div class="action" onclick="likeMoment('${m.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span>赞</span>
      </div>
      <div class="action" onclick="commentMoment('${m.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>评论</span>
      </div>
    </div>
    ${likesHtml}
    ${commentsHtml}
  </div>`;
}

function likeMoment(id){
  const m = State.moments.find(x=>x.id===id);
  if(!m) return;
  if(!m.likes) m.likes = [];
  const me = State.profile.name || '我';
  if(m.likes.includes(me)){
    m.likes = m.likes.filter(l=>l!==me);
  }else{
    m.likes.push(me);
  }
  State.save();
  renderMoments();
}

function commentMoment(id){
  const m = State.moments.find(x=>x.id===id);
  if(!m) return;
  const modal = createModal({
    title: '评论',
    body: `<textarea id="comment-text" class="publish-textarea" placeholder="写下你的评论..." rows="2"></textarea>`,
    footer: `<button class="btn-primary" onclick="submitMomentComment('${id}')">发送</button>`
  });
  showModal(modal);
}

function submitMomentComment(id){
  const text = document.getElementById('comment-text').value.trim();
  if(!text){closeModal();return;}
  const m = State.moments.find(x=>x.id===id);
  if(!m){closeModal();return;}
  if(!m.comments) m.comments = [];
  m.comments.push({name:State.profile.name||'我',text:text});
  State.save();
  closeModal();
  renderMoments();
}

function showPublishModal(){
  const modal = createModal({
    title: '发表',
    body: `
      <textarea id="publish-text" class="publish-textarea" placeholder="这一刻的想法..."></textarea>
      <div class="publish-images" id="publish-images"></div>
      <div style="padding:0 16px;">
        <div class="publish-add" onclick="document.getElementById('publish-file').click()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>添加图片</span>
        </div>
        <input type="file" id="publish-file" accept="image/*" multiple style="display:none;" onchange="handlePublishImages(event)">
      </div>`,
    footer: `<button class="btn-primary" onclick="publishMoment()">发表</button>`
  });
  window._publishImages = [];
  showModal(modal);
}

function handlePublishImages(e){
  const files = e.target.files;
  if(!files || files.length===0) return;
  Array.from(files).forEach(file=>{
    const reader = new FileReader();
    reader.onload = (ev)=>{
      window._publishImages.push(ev.target.result);
      renderPublishImages();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderPublishImages(){
  const container = document.getElementById('publish-images');
  if(!container) return;
  container.innerHTML = window._publishImages.map((src,i)=>`
    <div class="p-img">
      <img src="${src}" alt="">
      <div class="remove" onclick="removePublishImage(${i})">
        <svg viewBox="0 0 24 24" stroke="#fff" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>`).join('');
}

function removePublishImage(i){
  window._publishImages.splice(i,1);
  renderPublishImages();
}

function publishMoment(){
  const text = document.getElementById('publish-text').value.trim();
  const images = window._publishImages || [];
  if(!text && images.length===0){showToast('请输入文字或添加图片');return;}

  const moment = {
    id: 'mom_'+Date.now(),
    charId: 'player',
    text,
    images: [...images],
    likes: [State.profile.name || '我'],
    comments: [],
    time: Date.now()
  };
  State.moments.unshift(moment);

  // AI auto comments
  generateAIComments(moment);

  State.save();
  closeModal();
  showToast('发布成功');
  setTimeout(()=>renderMoments(), 500);
}

async function generateAIComments(moment){
  const api = State.getActiveApi();
  if(!api || !api.url || !api.key || !api.model){
    showToast('⚠️ 未配置API，AI好友无法评论');
    return;
  }
  const chars = State.characters.slice(0,3);
  if(chars.length===0) return;
  const content = moment.text || '一条朋友圈';
  chars.forEach((ch,i)=>{
    setTimeout(async ()=>{
      const wbs = State.getWorldBooksForCharacter(ch.id);
      let systemPrompt = `你是"${ch.name}"，正在刷微信朋友圈。`;
      if(ch.role) systemPrompt += `\n你的角色设定：${ch.role}`;
      if(wbs.length>0){
        systemPrompt += '\n你必须遵守以下世界书：\n';
        wbs.forEach((wb,idx)=>{systemPrompt += `${idx+1}. ${wb.title}：${wb.desc}\n`;});
      }
      systemPrompt += '\n请以该角色的口吻，为这条朋友圈写一条简短的评论（1-2句话）。直接输出评论内容，不要加引号或其他标记。';
      const userPrompt = `朋友圈内容：「${content}」${moment.images && moment.images.length>0 ? '（附带'+moment.images.length+'张图片）' : ''}`;
      try{
        const resp = await fetch(`${api.url.replace(/\/$/,'')}/chat/completions`,{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${api.key}`},
          body: JSON.stringify({model:api.model,messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],stream:false})
        });
        if(!resp.ok) throw new Error('API错误');
        const data = await resp.json();
        let reply = data.choices?.[0]?.message?.content || '...';
        reply = reply.replace(/^["""']|["""']$/g,'').trim();
        moment.comments.push({name:ch.name,text:reply});
      }catch(e){
        moment.comments.push({name:ch.name,text:'...'});
      }
      State.save();
      const list = document.getElementById('moments-list');
      if(list){renderMoments();}
    }, 800+i*1200);
  });
}

// ============ INITIALIZATION ============
function toggleMomentActions(el){
  const actions = el.parentElement;
  const likes = actions.nextElementSibling;
  const comments = likes ? likes.nextElementSibling : null;
  if(likes){
    if(likes.style.display==='none'){likes.style.display='';}
    else{likes.style.display='none';}
  }
  if(comments){
    if(comments.style.display==='none'){comments.style.display='';}
    else{comments.style.display='none';}
  }
}

function buildInitialDOM(){
  const screen = document.getElementById('screen');
  // Lock Screen
  screen.insertAdjacentHTML('beforeend', `
    <div id="lock-screen">
      <div class="aurora a1"></div>
      <div class="aurora a2"></div>
      <div class="aurora a3"></div>
      <div class="status-bar dark">
        <span id="lock-time-bar">9:41</span>
        <div class="right">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2C4.5 2 1.5 4 .5 6.5l1.5.5C3 5 5.5 3.5 8 3.5S13 5 14 7l1.5-.5C14.5 4 11.5 2 8 2zm0 3c-2 0-3.7 1-4.5 2.5l1.5.5C5.5 7 7 6 8 6s2.5 1 3 2l1.5-.5C11.7 6 10 5 8 5zm0 3c-1 0-1.8.5-2.3 1.3L8 14l2.3-4.7C9.8 8.5 9 8 8 8z"/></svg>
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="5" width="12" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="2.5" y="6.5" width="9" height="3" rx="0.5"/><path d="M14 7v2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="lock-quick" onclick="unlockPhone()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </div>
      <div class="lock-time" id="lock-time">9:41</div>
      <div class="lock-date" id="lock-date">8月16日 星期日</div>
      <div class="lock-notifications" id="lock-notifications"></div>
      <div class="lock-footer">
        <div class="lock-unlock-hint">上滑解锁</div>
        <div class="lock-slide-bar" id="unlock-bar"></div>
      </div>
      <div class="lock-corners">
        <div class="corner-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 6v6l4 2"/></svg></div>
        <div class="corner-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><path d="M12 19v4"/></svg></div>
      </div>
    </div>
  `);
  // Home Screen
  screen.insertAdjacentHTML('beforeend', `
    <div id="home-screen">
      <div class="status-bar">
        <span id="home-time">9:41</span>
        <div class="right">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2C4.5 2 1.5 4 .5 6.5l1.5.5C3 5 5.5 3.5 8 3.5S13 5 14 7l1.5-.5C14.5 4 11.5 2 8 2zm0 3c-2 0-3.7 1-4.5 2.5l1.5.5C5.5 7 7 6 8 6s2.5 1 3 2l1.5-.5C11.7 6 10 5 8 5zm0 3c-1 0-1.8.5-2.3 1.3L8 14l2.3-4.7C9.8 8.5 9 8 8 8z"/></svg>
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="5" width="12" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="2.5" y="6.5" width="9" height="3" rx="0.5"/><path d="M14 7v2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="home-grid" id="home-grid"></div>
      <div class="dock" id="home-dock"></div>
    </div>
  `);
}

function init(){
  buildInitialDOM();
  State.load();
  updateTime();
  setInterval(updateTime, 1000);
  renderHomeScreen();
  initLockScreen();
}

document.addEventListener('DOMContentLoaded', init);

// Expose all functions to window for global access
(function expose(){
  const fnNames = [
    'unlockPhone','openApp','closeApp','showToast','closeModal','showModal','createModal',
    'switchWxTab','openChat','closeChatDetail','renderChatList','renderContactsList',
    'toggleFeaturePanel','switchFeatureTab','sendChatMessage','handleInput','recordVoice',
    'sendEmoji','importEmojis','showCharacterModal','showCharacterDetail','saveCharacter',
    'toggleCharWb','selectCharAvatar','showAddCharacterModal','togglePanel','renderChatMessages',
    'renderWeChatApp','renderMoments','openMoments','closeMoments','showPublishModal',
    'toggleMomentActions','likeMoment','commentMoment','publishMoment','handlePublishImages',
    'renderPublishImages','removePublishImage','callAIAPI','buildSystemPrompt',
    'showApiModal','saveApiConfig','pullModels','selectActiveApi','renderSettingsApp',
    'renderWorldBookApp','showWorldBookModal','saveWorldBook','toggleWorldBookGlobal',
    'deleteWorldBook','buildWeChatApp','buildSettingsApp','buildWorldBookApp',
    'renderMessage','renderAvatarHtml','escapeHtml','getCurrentCharAvatar','formatMTime',
    'renderFeatureTab','renderMomentCard','generateAIComments',
    'renderProfileTab','showProfileEditModal','handleProfileAvatar','saveProfile',
    'submitMomentComment'
  ];
  fnNames.forEach(n=>{ if(typeof window[n]==='function') window[n]=window[n]; });
})();
