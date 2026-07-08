/* ════════════════════════════════════════════════
   FSD DASHBOARD  ·  app.js
   ════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────
// Use same-origin /api/public/gas on Lovable preview & published. When deployed
// to a different host (e.g. Netlify), point at the published Lovable backend
// so Google Drive uploads + Supabase persistence keep working.
const LOVABLE_BACKEND = 'https://fsddashboard.lovable.app/api/public/gas';
const _h = location.hostname;
const GAS_URL = (_h.endsWith('lovable.app') || _h === 'localhost' || _h === '127.0.0.1')
  ? '/api/public/gas'
  : LOVABLE_BACKEND;
const FOLDER_ID  = '17QN_wUJlISQNbT3a8Wr-9bcS-aGi04Er';
const SHEET_ID   = '1RfYWZ-u0pBtHe9IFiNso4ogK1uwpZjvx6_rit6ANjbo';
const SHEET_NAME = 'sheet1';

// ─── STATUS MAP ───────────────────────────────────
const SM = {
  head:{ label:'Head FSD',  cls:'s-head', icon:'fa-user-tie',     color:'#2E7D32' },
  pel: { label:'Pel',       cls:'s-pel',  icon:'fa-user-tag',     color:'#1565C0' },
  ops: { label:'Ops',       cls:'s-ops',  icon:'fa-cogs',         color:'#E65100' },
  air: { label:'Air',       cls:'s-air',  icon:'fa-plane',        color:'#4A148C' },
  dg:  { label:'DG',        cls:'s-dg',   icon:'fa-stamp',        color:'#311B92' },
  done:{ label:'Completed', cls:'s-done', icon:'fa-check-circle', color:'#00695C' },
};
const ST_ALL = ['head','pel','ops','air','dg','done'];

// ─── GLOBAL STATE ─────────────────────────────────
let CU=null, eDid=null, eUid=null, eSid=null, selFiles=[];
let sheetPages=[], shNid=1;
let activeTrackTab = 'all';

let dashStats = [
  {id:'total',label:'Total Documents',icon:'fa-file-alt',    color:'b',filter:null},
  {id:'pel',  label:'Pel',            icon:'fa-user-tag',   color:'c',filter:'pel'},
  {id:'ops',  label:'Ops',            icon:'fa-cogs',       color:'o',filter:'ops'},
  {id:'air',  label:'Air',            icon:'fa-plane',      color:'p',filter:'air'},
  {id:'done', label:'Completed',      icon:'fa-check-circle',color:'g',filter:'done'},
  {id:'users',label:'Total Users',    icon:'fa-users',      color:'y',filter:'users'},
];

let adminMenuItems = [
  {id:'dash',     label:'Dashboard',          icon:'fa-tachometer-alt', visible:true},
  {id:'docs',     label:'All Documents',       icon:'fa-file-alt',       visible:true},
  {id:'track',    label:'Document Tracking',   icon:'fa-route',          visible:true},
  {id:'aoc',      label:'AOC Tracking',        icon:'fa-plane-departure',visible:true},
  {id:'hr',       label:'HR Management',       icon:'fa-id-badge',       visible:true},
  {id:'users',    label:'User Management',     icon:'fa-users-cog',      visible:true},
  {id:'customize',label:'Customize',           icon:'fa-sliders-h',      visible:true},
];
let staffMenuItems = [
  {id:'dash',    label:'Dashboard',         icon:'fa-tachometer-alt', visible:true},
  {id:'docs',    label:'All Documents',     icon:'fa-file-alt',       visible:true},
  {id:'track',   label:'Document Tracking', icon:'fa-route',          visible:true},
  {id:'aoc',     label:'AOC Tracking',      icon:'fa-plane-departure',visible:true},
  {id:'hr',      label:'HR Management',     icon:'fa-id-badge',       visible:true},
];

let customPages=[], cpNid=1;
let currentPageKey=null, currentPageType=null; // for restore + auto refresh

// ─── LOCAL DEMO DATA ──────────────────────────────
const DB = {
  users:[
    {id:1,u:'admin', p:'1234',name:'John Admin',  dept:'IT Department',    role:'admin'},
    {id:2,u:'staff', p:'1234',name:'Jane Staff',  dept:'Finance Division', role:'staff'},
    {id:3,u:'staff2',p:'1234',name:'Michael Ops', dept:'Strategy Division',role:'staff'},
  ],
  docs:[
    {id:1,dcalNo:'DCAL-001',dcalDate:'2026-01-10',fsdNo:'FSD-2026-001',fsdDate:'2026-01-12',docNo:'DOC/001',docDate:'2026-01-08',subject:'IT System Development Budget Approval',status:'done',statusNote:'Approved',files:[{name:'IT_Budget.pdf',type:'pdf',url:'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'}],uid:1,fiscal:'2026'},
    {id:2,dcalNo:'DCAL-002',dcalDate:'2026-01-15',fsdNo:'FSD-2026-002',fsdDate:'2026-01-17',docNo:'DOC/002',docDate:'2026-01-14',subject:'Management Committee Meeting Report No.1/2026',status:'pel',statusNote:'',files:[{name:'Meeting.pdf',type:'pdf',url:'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'}],uid:2,fiscal:'2026'},
    {id:3,dcalNo:'DCAL-003',dcalDate:'2026-02-05',fsdNo:'FSD-2026-003',fsdDate:'2026-02-07',docNo:'DOC/003',docDate:'2026-02-03',subject:'MOU Academic Cooperation Agreement',status:'dg',statusNote:'Waiting for DG signature',files:[{name:'MOU.pdf',type:'pdf',url:'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'}],uid:3,fiscal:'2026'},
    {id:4,dcalNo:'DCAL-004',dcalDate:'2026-02-20',fsdNo:'FSD-2026-004',fsdDate:'2026-02-22',docNo:'DOC/004',docDate:'2026-02-18',subject:'Digital Taskforce Appointment Order',status:'head',statusNote:'Pending review',files:[{name:'Order.pdf',type:'pdf',url:'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'}],uid:1,fiscal:'2026'},
    {id:5,dcalNo:'DCAL-005',dcalDate:'2026-03-10',fsdNo:'FSD-2026-005',fsdDate:'2026-03-12',docNo:'DOC/005',docDate:'2026-03-08',subject:'Strategic Development Plan 2026-2030',status:'ops',statusNote:'',files:[{name:'Plan.pdf',type:'pdf',url:'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'}],uid:2,fiscal:'2026'},
  ],
  nid:{u:4,d:6},
};

// ─── SPREADSHEET STATE ────────────────────────────
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let ssPages=[{id:1,name:'Sheet 1',data:mkData(30,12),links:{},styles:{}}];
let ssNid=2, activeSS=1, activeCell=null;
function mkData(r,c){const d=[];for(let i=0;i<r;i++)d.push(Array(c).fill(''));return d;}

// ════════════════════════════════════════════════
//  PERSISTENCE (localStorage)
// ════════════════════════════════════════════════
const LS = {
  users:'fsd_users', session:'fsd_session', page:'fsd_page',
  sheets:'fsd_sheets', custom:'fsd_custom'
};
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}
function saveUsers(){lsSet(LS.users,{users:DB.users,nidU:DB.nid.u});}
function loadUsers(){const x=lsGet(LS.users);if(x&&Array.isArray(x.users)&&x.users.length){DB.users=x.users;if(x.nidU)DB.nid.u=x.nidU;}}
function saveSheets(){lsSet(LS.sheets,{sheetPages:sheetPages.map(s=>({id:s.id,name:s.name,rawUrl:s.rawUrl,embedUrl:s.embedUrl})),shNid});}
function loadSheets(){const x=lsGet(LS.sheets);if(x&&Array.isArray(x.sheetPages)){sheetPages=x.sheetPages.map(s=>({...s,embedUrl:s.embedUrl||toEmbedUrl(s.rawUrl||''),lastFetch:null}));if(x.shNid)shNid=x.shNid;}}
function saveCustom(){lsSet(LS.custom,{customPages,cpNid});}
function loadCustom(){const x=lsGet(LS.custom);if(x&&Array.isArray(x.customPages)){customPages=x.customPages;if(x.cpNid)cpNid=x.cpNid;}}

// ════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════
async function doLogin(){
  const u=document.getElementById('lu').value.trim();
  const p=document.getElementById('lp').value.trim();
  // Always pull latest users from backend so a user created/edited on another device works immediately
  if(GAS_URL){
    try{
      const ur=await fetch(`${GAS_URL}?action=getUsers`);
      const uj=await ur.json();
      if(Array.isArray(uj.users)&&uj.users.length){
        DB.users=uj.users;
        DB.nid.u=Math.max(...uj.users.map(x=>x.id))+1;
        saveUsers();
      }
    }catch(_){}
  }
  const usr=DB.users.find(x=>x.u===u&&x.p===p);
  if(!usr){Swal.fire({icon:'error',title:'Login Failed',text:'Invalid username or password',confirmButtonColor:'var(--p)'});return;}
  CU=usr;
  lsSet(LS.session,{u:usr.u});
  if(GAS_URL) loadFromSheet(); else showApp();
}

document.getElementById('lp').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

function doLogout(){
  Swal.fire({title:'Sign Out?',icon:'question',showCancelButton:true,confirmButtonText:'Sign Out',
    cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'})
  .then(r=>{if(r.isConfirmed){CU=null;lsDel(LS.session);lsDel(LS.page);document.getElementById('LP').style.display='flex';document.getElementById('AP').style.display='none';}});
}

// ─── Load from GAS on login ───────────────────────
async function loadFromSheet(){
  showSpin('Loading documents from Google Sheets...');
  try{
    const res=await fetch(`${GAS_URL}?action=getDocuments`);
    const json=await res.json();
    if(json.docs&&json.docs.length){
      DB.docs=json.docs.map(d=>({
        id:Number(d.id),dcalNo:d.dcalNo,dcalDate:d.dcalDate,fsdNo:d.fsdNo,fsdDate:d.fsdDate,
        docNo:d.docNo,docDate:d.docDate,subject:d.subject,status:d.status,statusNote:d.statusNote,
        statusNotes:Array.isArray(d.statusNotes)?d.statusNotes:[],
        owner:d.owner,files:d.files||[],uid:Number(d.uid)||1,fiscal:toCE(d.fiscal)||String(new Date().getFullYear())
      }));
    }
    // also sync users + sheets from backend (cross-device) — backend is source of truth
    try{
      const [uRes,sRes]=await Promise.all([fetch(`${GAS_URL}?action=getUsers`),fetch(`${GAS_URL}?action=getSheets`)]);
      const uJ=await uRes.json();const sJ=await sRes.json();
      if(Array.isArray(uJ.users)){
        if(uJ.users.length===0 && DB.users.length){
          // First boot: seed backend with local default users so every device shares them
          for(const u of DB.users){
            try{const r=await gasPost({action:'saveUser',user:{u:u.u,p:u.p,name:u.name,dept:u.dept,role:u.role,email:u.email||''}});if(r?.id)u.id=Number(r.id);}catch(_){}
          }
        } else {
          DB.users=uJ.users;
        }
        DB.nid.u=(DB.users.length?Math.max(...DB.users.map(x=>x.id)):0)+1;
        saveUsers();
      }
      if(Array.isArray(sJ.sheets)){sheetPages=sJ.sheets.map(s=>({...s,embedUrl:s.embedUrl||toEmbedUrl(s.rawUrl||''),lastFetch:null}));if(sheetPages.length)shNid=Math.max(...sheetPages.map(x=>x.id))+1;saveSheets();}
    }catch(e){console.warn('sync users/sheets failed',e);}
  }catch(e){console.warn('GAS load failed, using demo data',e);}
  hideSpin(); showApp();
}

// ════════════════════════════════════════════════
//  APP INIT
// ════════════════════════════════════════════════
function showApp(){
  document.getElementById('LP').style.display='none';
  document.getElementById('AP').style.display='block';
  applyUserAvatar(CU);
  document.getElementById('sbName').textContent=CU.name;
  document.getElementById('tDate').textContent=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  buildNav();
  const saved=lsGet(LS.page);
  if(saved&&saved.key){restorePage(saved);} else goPage('dash');
  startLiveSync();
}
function applyUserAvatar(u){
  const ini=initials(u?.name||'');
  ['sbAva','tAva'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    if(u&&u.photo){el.innerHTML=`<img src="${u.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;el.style.padding='0';}
    else {el.textContent=ini;el.innerHTML=ini;}
  });
}
function restorePage(s){
  if(s.type==='sheet'){const sp=sheetPages.find(x=>String(x.id)===String(s.key));if(sp){goSheetPage(sp.id);return;}}
  if(s.type==='custom'){const cp=customPages.find(x=>String(x.id)===String(s.key));if(cp){goCustomPage(cp.id);return;}}
  // hide menus that staff no longer has
  const allowed=(CU.role==='admin'?adminMenuItems:staffMenuItems).map(m=>m.id);
  if(allowed.includes(s.key)) goPage(s.key); else goPage('dash');
}
function reRenderCurrent(){
  if(!currentPageKey)return;
  if(currentPageType==='sheet'){const sp=sheetPages.find(x=>String(x.id)===String(currentPageKey));if(sp){goSheetPage(sp.id);return;}}
  if(currentPageType==='custom'){const cp=customPages.find(x=>String(x.id)===String(currentPageKey));if(cp){goCustomPage(cp.id);return;}}
  goPage(currentPageKey);
}
let _lastDataHash='';
function _hashState(){
  try{return JSON.stringify({
    d:DB.docs.map(d=>[d.id,d.status,d.statusNote,(d.statusNotes||[]).length,(d.files||[]).length,d.subject,d.fsdDate]),
    u:DB.users.map(u=>[u.id,u.u,u.name,u.role,u.dept,u.photo?1:0]),
    s:sheetPages.map(s=>[s.id,s.name,s.embedUrl]),
  });}catch(e){return Math.random()+'';}
}
async function autoRefresh(force){
  if(!GAS_URL){if(force)reRenderCurrent();return;}
  try{
    const [dRes,uRes,sRes]=await Promise.all([
      fetch(`${GAS_URL}?action=getDocuments`),
      fetch(`${GAS_URL}?action=getUsers`),
      fetch(`${GAS_URL}?action=getSheets`),
    ]);
    const json=await dRes.json();
    const uJ=await uRes.json();
    const sJ=await sRes.json();
    if(json.docs){
      DB.docs=json.docs.map(d=>({id:Number(d.id),dcalNo:d.dcalNo,dcalDate:d.dcalDate,fsdNo:d.fsdNo,fsdDate:d.fsdDate,docNo:d.docNo,docDate:d.docDate,subject:d.subject,status:d.status,statusNote:d.statusNote,statusNotes:Array.isArray(d.statusNotes)?d.statusNotes:[],owner:d.owner,files:d.files||[],uid:Number(d.uid)||1,fiscal:toCE(d.fiscal)||String(new Date().getFullYear())}));
    }
    let navChanged=false;
    if(Array.isArray(uJ.users)&&uJ.users.length){
      DB.users=uJ.users;DB.nid.u=Math.max(...uJ.users.map(x=>x.id))+1;saveUsers();
      if(CU){const me=DB.users.find(x=>x.u===CU.u);if(me){Object.assign(CU,me);applyUserAvatar(CU);const nm=document.getElementById('sbName');if(nm)nm.textContent=CU.name;}}
    }
    if(Array.isArray(sJ.sheets)){
      const old=JSON.stringify(sheetPages.map(s=>s.id));
      sheetPages=sJ.sheets.map(s=>({...s,embedUrl:s.embedUrl||toEmbedUrl(s.rawUrl||''),lastFetch:null}));
      if(sheetPages.length)shNid=Math.max(...sheetPages.map(x=>x.id))+1;
      saveSheets();
      if(JSON.stringify(sheetPages.map(s=>s.id))!==old){buildNav();navChanged=true;}
    }
  }catch(e){}
  const h=_hashState();
  if(force || h!==_lastDataHash){_lastDataHash=h;reRenderCurrent();}
}
let liveSyncTimer=null;
function startLiveSync(){
  _lastDataHash=_hashState();
  if(liveSyncTimer)clearInterval(liveSyncTimer);
  liveSyncTimer=setInterval(()=>{
    // silent poll — only re-renders if backend data actually changed
    if(document.visibilityState==='visible'&&CU)autoRefresh(false);
  },15000);
}
function initials(n){const a=(n||'').split(' ');return((a[0]?.[0]||'')+(a[1]?.[0]||'')).toUpperCase()||'?';}


// ════════════════════════════════════════════════
//  NAV
// ════════════════════════════════════════════════
const TITLES={dash:'Dashboard',docs:'All Documents',track:'Document Tracking',stats:'Statistics FSD',
  aoc:'AOC Tracking',hr:'HR Management',
  users:'User Management',customize:'Customize',sdash:'Dashboard',mydocs:'My Documents',
  mytrack:'Track My Docs',profile:'Edit Profile'};

function buildNav(){
  const nav=document.getElementById('sbNav');
  const items=CU.role==='admin'?adminMenuItems:staffMenuItems;
  let h=`<div class="ns">Menu</div>`;
  items.filter(m=>m.visible).forEach(m=>{
    h+=`<button class="ni" id="ni-${m.id}" onclick="goPage('${m.id}')"><span class="nic"><i class="fas ${m.icon}"></i></span>${m.label}</button>`;
  });
  if(sheetPages.length){
    h+=`<div class="ns">Google Sheets</div>`;
    sheetPages.forEach(s=>{
      h+=`<button class="ni" id="sni-${s.id}" onclick="goSheetPage(${s.id})">
        <span class="nic"><i class="fas fa-table" style="color:#FBC02D"></i></span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;max-width:130px">${s.name}</span>
        ${CU&&CU.role==='admin'?`<button onclick="event.stopPropagation();rmSheet(${s.id})" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:11px;padding:2px 5px"><i class="fas fa-times"></i></button>`:''}
      </button>`;
    });
  }
  if(customPages.length){
    h+=`<div class="ns">Custom</div>`;
    customPages.forEach(cp=>{
      h+=`<button class="ni" id="ni-cp-${cp.id}" onclick="goCustomPage('${cp.id}')"><span class="nic"><i class="fas ${cp.icon||'fa-file'}"></i></span>${cp.label}</button>`;
    });
  }
  nav.innerHTML=h;
}

function deactivateAll(){
  document.querySelectorAll('.ni').forEach(i=>i.classList.remove('active'));
  document.querySelectorAll('.pg,[id^="shpg-"],[id^="cppg-"]').forEach(x=>{x.classList.remove('active');x.innerHTML='';});
}

function goPage(p){
  deactivateAll();
  const ni=document.getElementById('ni-'+p); if(ni) ni.classList.add('active');
  document.getElementById('tTitle').textContent=TITLES[p]||p;
  currentPageKey=p; currentPageType='page'; lsSet(LS.page,{key:p,type:'page'});
  let el=document.getElementById('pg-'+p);
  if(!el){el=document.createElement('div');el.className='pg';el.id='pg-'+p;document.getElementById('contentArea').appendChild(el);}
  el.classList.add('active'); renderPage(p,el);
  if(window.innerWidth<=768) closeMobSb();
}

function renderPage(p,el){
  const R={
    dash:renderDash, docs:renderDocs, track:e=>renderTrack(e,'all',false),
    users:renderUsers, customize:renderCustomize,
    aoc:renderAoc, hr:renderHr,
    sdash:renderDash, mydocs:renderDocs, mytrack:e=>renderTrack(e,'all',false), profile:renderProfile,
  };
  if(R[p]) R[p](el);
}


function goSheetPage(id){
  deactivateAll();
  const ni=document.getElementById('sni-'+id); if(ni) ni.classList.add('active');
  const s=sheetPages.find(x=>x.id===id); if(!s) return;
  document.getElementById('tTitle').textContent='📊 '+s.name;
  currentPageKey=id; currentPageType='sheet'; lsSet(LS.page,{key:id,type:'sheet'});
  let el=document.getElementById('shpg-'+id);
  if(!el){el=document.createElement('div');el.className='pg';el.id='shpg-'+id;document.getElementById('contentArea').appendChild(el);}
  el.classList.add('active'); renderSheetPage(s,el);
  if(window.innerWidth<=768) closeMobSb();
}

function goCustomPage(id){
  deactivateAll();
  const ni=document.getElementById('ni-cp-'+id); if(ni) ni.classList.add('active');
  const cp=customPages.find(x=>x.id===id); if(!cp) return;
  document.getElementById('tTitle').textContent=cp.label;
  currentPageKey=id; currentPageType='custom'; lsSet(LS.page,{key:id,type:'custom'});
  let el=document.getElementById('cppg-'+id);
  if(!el){el=document.createElement('div');el.className='pg';el.id='cppg-'+id;document.getElementById('contentArea').appendChild(el);}
  el.classList.add('active');
  renderCustomPageContent(cp,el);
  if(window.innerWidth<=768) closeMobSb();
}

function renderCustomPageContent(cp,el){
  if(cp.type==='sheet'){
    el.innerHTML=`<div class="card"><div class="ch"><h3><i class="fas ${cp.icon}"></i> ${cp.label}</h3>
      <button class="btn btn-d btn-sm" onclick="deleteCustomPage('${cp.id}')"><i class="fas fa-trash"></i> Remove</button></div></div>`;
    // Reuse spreadsheet in the card
    const wrap=document.createElement('div');wrap.id='cps-'+cp.id;el.appendChild(wrap);
    renderSSInContainer(cp.ssData||(cp.ssData=mkData(20,10)),cp.ssLinks||(cp.ssLinks={}),wrap,false);
  } else if(cp.type==='iframe'&&cp.url){
    el.innerHTML=`<div class="card"><div class="ch"><h3><i class="fas ${cp.icon}"></i> ${cp.label}</h3>
      <button class="btn btn-d btn-sm" onclick="deleteCustomPage('${cp.id}')"><i class="fas fa-trash"></i> Remove</button></div>
      <iframe src="${cp.url}" style="width:100%;height:80vh;border:none;display:block"></iframe></div>`;
  } else {
    el.innerHTML=`<div class="card"><div class="ch"><h3><i class="fas ${cp.icon}"></i> ${cp.label}</h3>
      <button class="btn btn-d btn-sm" onclick="deleteCustomPage('${cp.id}')"><i class="fas fa-trash"></i> Remove</button></div>
      <div class="cb">
        <div contenteditable="true" id="cpe-${cp.id}" style="min-height:300px;border:1.5px dashed var(--g300);border-radius:var(--r);padding:16px;font-size:13px;outline:none;color:var(--g900);line-height:1.7" onblur="cp_save('${cp.id}',this.innerHTML)">${cp.content||'<p>Click here to start typing…</p>'}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="cp_bold('${cp.id}')"><b>B</b></button>
          <button class="btn btn-ol btn-sm" onclick="cp_italic('${cp.id}')"><i>I</i></button>
          <button class="btn btn-ol btn-sm" onclick="cp_link('${cp.id}')"><i class="fas fa-link"></i> Link</button>
          <button class="btn btn-g btn-sm" onclick="cp_save('${cp.id}',document.getElementById('cpe-${cp.id}')?.innerHTML)"><i class="fas fa-save"></i> Save</button>
        </div>
      </div></div>`;
  }
}
function cp_bold(id){document.execCommand('bold');}
function cp_italic(id){document.execCommand('italic');}
function cp_link(id){Swal.fire({title:'Insert Link',input:'url',inputPlaceholder:'https://...',confirmButtonText:'Insert',confirmButtonColor:'var(--p)'}).then(r=>{if(r.isConfirmed&&r.value)document.execCommand('createLink',false,r.value);});}
function cp_save(id,html){const cp=customPages.find(x=>x.id===id);if(cp)cp.content=html;}
function deleteCustomPage(id){customPages=customPages.filter(x=>x.id!==id);saveCustom();buildNav();goPage('dash');}

// ════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════
function renderDash(el){
  const bySt={};ST_ALL.forEach(k=>{bySt[k]=0;});DB.docs.forEach(d=>{bySt[d.status]=(bySt[d.status]||0)+1;});
  const fyMap={};DB.docs.forEach(d=>{fyMap[d.fiscal]=(fyMap[d.fiscal]||0)+1;});
  const cmap={b:'b',p:'p',o:'o',c:'c',g:'g',r:'r',y:'y',t:'t'};

  const cards=dashStats.map(s=>{
    const v=s.filter===null?DB.docs.length:s.filter==='users'?DB.users.length:(bySt[s.filter]||0);
    const ft=s.filter===null?'all':s.filter;
    return`<div class="sc" onclick="showQF('${ft}','${s.label}')">
      <div class="sci ${cmap[s.color]||'b'}"><i class="fas ${s.icon}"></i></div>
      <div><div class="sc-v">${v}</div><div class="sc-l">${s.label}</div></div>
    </div>`;
  }).join('');

  el.innerHTML=`
  <div class="sg">${cards}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px" id="dGrid">
    <div class="card"><div class="ch"><h3><i class="fas fa-chart-pie" style="color:var(--pu)"></i> Status Distribution</h3></div>
      <div class="cb"><div class="cw"><canvas id="dnut"></canvas></div></div></div>
    <div class="card"><div class="ch"><h3><i class="fas fa-calendar-alt" style="color:var(--p)"></i> Year</h3></div>
      <div class="cb"><div class="cw"><canvas id="fyBar"></canvas></div></div></div>
  </div>
  <div class="card"><div class="ch">
    <h3><i class="fas fa-clock" style="color:var(--og)"></i> Recent Documents</h3>
    <button class="btn btn-p btn-sm" onclick="openAddDoc()"><i class="fas fa-plus"></i> Add Document</button>
  </div>
  <div class="cb"><div class="tw"><table>
    <thead><tr><th>DCAL No</th><th>DCAL Date</th><th>FSD No</th><th>FSD Date</th><th>Doc No</th><th>Doc Date</th><th style="min-width:190px">Subject</th><th>Status</th><th>Files</th><th>Manage</th></tr></thead>
    <tbody>${[...DB.docs].reverse().slice(0,10).map(d=>`<tr>
      <td><code style="font-size:11px">${d.dcalNo}</code></td>
      <td style="white-space:nowrap">${fmtDate(d.dcalDate)}</td>
      <td><code style="font-size:11px">${d.fsdNo}</code></td>
      <td style="white-space:nowrap">${fmtDate(d.fsdDate)}</td>
      <td style="font-size:11px">${d.docNo||'-'}</td>
      <td style="white-space:nowrap">${fmtDate(d.docDate)}</td>
      <td class="tdl" style="max-width:210px;white-space:normal" onclick="openDet(${d.id})">${d.subject}</td>
      <td>${sbadge(d.status)}</td>
      <td><div style="display:flex;gap:3px;flex-wrap:wrap">${d.files.map(f=>`<span onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')" style="cursor:pointer" title="${f.name}">${ficon(f.type)}</span>`).join('')}</div></td>
      <td><div style="display:flex;gap:3px;flex-wrap:wrap">
        <button class="btn btn-ol btn-sm btn-ico" onclick="openDet(${d.id})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-c btn-sm btn-ico"  onclick="openStMo(${d.id})"><i class="fas fa-exchange-alt"></i></button>
        <button class="btn btn-ol btn-sm btn-ico" onclick="openEditDoc(${d.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-d btn-sm btn-ico"  onclick="delDoc(${d.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('')||`<tr><td colspan="10"><div class="empty"><i class="fas fa-inbox"></i><p>No documents</p></div></td></tr>`}</tbody>
  </table></div></div></div>`;

  const stClr={head:'#2E7D32',pel:'#1565C0',ops:'#F57C00',air:'#7B1FA2',dg:'#311B92',done:'#00695C'};
  const pal=['#1565C0','#4A2C6D','#F57C00','#2E7D32','#D32F2F','#0288D1'];
  setTimeout(()=>{
    const dc=document.getElementById('dnut');
    if(dc) new Chart(dc,{type:'doughnut',data:{labels:ST_ALL.map(k=>SM[k].label),datasets:[{data:ST_ALL.map(k=>bySt[k]),backgroundColor:ST_ALL.map(k=>stClr[k]),borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,onClick:(e,els)=>{if(els.length)showQF(ST_ALL[els[0].index],SM[ST_ALL[els[0].index]].label);},
        plugins:{legend:{position:'bottom',labels:{font:{family:'Kanit',size:10},padding:8}}}}});
    const fc=document.getElementById('fyBar');
    if(fc){
      const fyKeys=Object.keys(fyMap);
      const fyl=fyKeys.slice();
      new Chart(fc,{type:'bar',data:{labels:fyl,datasets:[{label:'Docs',data:fyKeys.map(k=>fyMap[k]),
        backgroundColor:fyl.map((_,i)=>pal[i%pal.length]+'CC'),borderColor:fyl.map((_,i)=>pal[i%pal.length]),borderWidth:2,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,
          onClick:(e,els)=>{if(els.length){const be=fyKeys[els[0].index];showYearMonths(be);}},
          plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{family:'Kanit'}}},x:{ticks:{font:{family:'Kanit',size:10}}}}}});
    }
    fixDG();
  },80);
}

function _restoreQuickHead(){const tb=document.getElementById('quickTb');if(!tb)return;const h=tb.parentElement.querySelector('thead');if(h)h.innerHTML='<tr><th>FSD No</th><th>Subject</th><th>Status</th><th>Date</th></tr>';}

function showQF(filter,label){
  _restoreQuickHead();
  document.getElementById('quickTitle').innerHTML=`<i class="fas fa-filter" style="color:var(--p)"></i> ${label}`;
  let docs;
  if(filter==='all') docs=[...DB.docs];
  else if(filter==='users'){
    document.getElementById('quickTitle').innerHTML=`<i class="fas fa-users" style="color:var(--p)"></i> All Users`;
    document.getElementById('quickTb').innerHTML=DB.users.map(u=>`<tr><td>${u.name}</td><td>${u.dept}</td><td><span class="badge ${u.role==='admin'?'bp':'bc'}">${u.role}</span></td><td>${u.u}</td></tr>`).join('');
    openMo('moQuick');return;
  } else if(filter.startsWith('fy_')){
    docs=DB.docs.filter(d=>d.fiscal===filter.replace('fy_',''));
  } else docs=DB.docs.filter(d=>d.status===filter);
  document.getElementById('quickTb').innerHTML=[...docs].reverse().map(d=>`<tr>
    <td><code style="font-size:11px">${d.fsdNo}</code></td>
    <td class="tdl" onclick="closeMo('moQuick');openDet(${d.id})" style="max-width:240px">${d.subject}</td>
    <td>${sbadge(d.status)}</td><td style="white-space:nowrap">${fmtDate(d.fsdDate)}</td>
  </tr>`).join('')||`<tr><td colspan="4"><div class="empty" style="padding:20px"><p>No documents</p></div></td></tr>`;
  openMo('moQuick');
}

function showYearMonths(year){
  const docs=DB.docs.filter(d=>d.fiscal===year);
  const months=Array(12).fill(0);
  docs.forEach(d=>{const dt=d.fsdDate||d.dcalDate||d.docDate;if(dt){const m=parseInt(String(dt).split('-')[1])-1;if(m>=0&&m<12)months[m]++;}});
  const mN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('quickTitle').innerHTML=`<i class="fas fa-calendar-alt" style="color:var(--p)"></i> Year ${year} · Monthly Summary`;
  const tb=document.getElementById('quickTb');
  const thead=tb.parentElement.querySelector('thead');
  if(thead)thead.innerHTML='<tr><th>Month</th><th>Documents</th><th colspan="2">Distribution</th></tr>';
  const max=Math.max(...months,1);
  tb.innerHTML=months.map((c,i)=>`<tr>
    <td><strong>${mN[i]} ${year}</strong></td>
    <td><span class="badge ${c>0?'bp':'bc'}">${c}</span></td>
    <td colspan="2"><div style="background:var(--g100);border-radius:10px;height:10px;overflow:hidden;width:100%;max-width:220px"><div style="background:var(--p);height:100%;width:${(c/max*100).toFixed(1)}%"></div></div></td>
  </tr>`).join('')+`<tr style="background:var(--g50);font-weight:700"><td>Total ${year}</td><td>${docs.length}</td><td colspan="2"></td></tr>`;
  openMo('moQuick');
}

// ════════════════════════════════════════════════
//  ALL DOCUMENTS
// ════════════════════════════════════════════════
function renderDocs(el){
  el.innerHTML=`
  <div class="card" style="margin-bottom:14px"><div class="cb" style="padding:14px 18px">
    <div class="fb">
      <div class="fg2"><label>From</label><input type="date" class="fi" id="fFrom" onchange="refDocs()"></div>
      <div class="fg2"><label>To</label><input type="date" class="fi" id="fTo" onchange="refDocs()"></div>
      <div class="fg2"><label>Status</label><select class="fi" id="fSt" onchange="refDocs()"><option value="">All</option>${ST_ALL.map(k=>`<option value="${k}">${SM[k].label}</option>`).join('')}</select></div>
      <div class="fg2"><label>Search</label><input type="text" class="fi" id="fSrch" placeholder="Subject / FSD No…" oninput="refDocs()"></div>
      <button class="btn btn-ol btn-sm" style="margin-top:22px" onclick="clrF()"><i class="fas fa-times"></i> Clear</button>
    </div>
  </div></div>
  <div class="card"><div class="ch">
    <h3><i class="fas fa-file-alt" style="color:var(--p)"></i> All Documents</h3>
    <button class="btn btn-p btn-sm" onclick="openAddDoc()"><i class="fas fa-plus"></i> Add Document</button>
  </div>
  <div class="cb"><div class="tw"><table>
    <thead><tr><th>DCAL No</th><th>DCAL Date</th><th>FSD No</th><th>FSD Date</th><th>Doc No</th><th>Doc Date</th><th style="min-width:190px">Subject</th><th>Status</th><th>Files</th><th>Manage</th></tr></thead>
    <tbody id="docTb"></tbody>
  </table></div></div></div>`;
  refDocs();
}
function getFilt(mine=false){
  let docs=mine?DB.docs.filter(d=>d.uid===CU.id):[...DB.docs];
  const from=v('fFrom'),to=v('fTo'),st=v('fSt'),srch=(v('fSrch')||'').toLowerCase();
  if(from) docs=docs.filter(d=>d.fsdDate>=from);
  if(to)   docs=docs.filter(d=>d.fsdDate<=to);
  if(st)   docs=docs.filter(d=>d.status===st);
  if(srch) docs=docs.filter(d=>d.subject.toLowerCase().includes(srch)||(d.fsdNo||'').toLowerCase().includes(srch));
  return docs.reverse();
}
function v(id){const e=document.getElementById(id);return e?e.value:'';}
function refDocs(){
  const tb=document.getElementById('docTb');if(!tb)return;
  const docs=getFilt();
  if(!docs.length){tb.innerHTML=`<tr><td colspan="10"><div class="empty"><i class="fas fa-inbox"></i><p>No documents found</p></div></td></tr>`;return;}
  tb.innerHTML=docs.map(d=>`<tr>
    <td><code style="font-size:11px">${d.dcalNo}</code></td>
    <td style="white-space:nowrap">${fmtDate(d.dcalDate)}</td>
    <td><code style="font-size:11px">${d.fsdNo}</code></td>
    <td style="white-space:nowrap">${fmtDate(d.fsdDate)}</td>
    <td style="font-size:11px">${d.docNo||'-'}</td>
    <td style="white-space:nowrap">${fmtDate(d.docDate)}</td>
    <td class="tdl" style="max-width:210px;white-space:normal" onclick="openDet(${d.id})">${d.subject}</td>
    <td>${sbadge(d.status)}</td>
    <td><div style="display:flex;gap:3px;flex-wrap:wrap">${d.files.map(f=>`<span onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')" style="cursor:pointer" title="${f.name}">${ficon(f.type)}</span>`).join('')}</div></td>
    <td><div style="display:flex;gap:3px;flex-wrap:wrap">
      ${noteToggleBtn(d)}
      <button class="btn btn-ol btn-sm btn-ico" onclick="openDet(${d.id})"><i class="fas fa-eye"></i></button>
      <button class="btn btn-c btn-sm btn-ico"  onclick="openStMo(${d.id})"><i class="fas fa-exchange-alt"></i></button>
      <button class="btn btn-ol btn-sm btn-ico" onclick="openEditDoc(${d.id})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-d btn-sm btn-ico"  onclick="delDoc(${d.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>${noteHistoryRow(d,10)}`).join('');
}
function clrF(){['fFrom','fTo','fSrch'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});const s=document.getElementById('fSt');if(s)s.value='';refDocs();}

// ════════════════════════════════════════════════
//  DOCUMENT DETAIL
// ════════════════════════════════════════════════
function openDet(id){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  const s=SM[d.status]||SM.head;
  document.getElementById('detBody').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 16px;background:var(--g50);border-radius:var(--r);margin-bottom:16px">
      <span class="badge ${s.cls}"><i class="fas ${s.icon}"></i> ${s.label}</span>
      ${d.statusNote?`<span style="font-size:12px;color:var(--g500)">· ${d.statusNote}</span>`:''}
    </div>
    <div class="det-grid">
      <div class="det-item"><div class="det-lbl">DCAL No</div><div class="det-val">${d.dcalNo}</div></div>
      <div class="det-item"><div class="det-lbl">DCAL Date</div><div class="det-val">${fmtDate(d.dcalDate)}</div></div>
      <div class="det-item"><div class="det-lbl">FSD No</div><div class="det-val">${d.fsdNo}</div></div>
      <div class="det-item"><div class="det-lbl">FSD Date</div><div class="det-val">${fmtDate(d.fsdDate)}</div></div>
      <div class="det-item"><div class="det-lbl">Document No</div><div class="det-val">${d.docNo||'-'}</div></div>
      <div class="det-item"><div class="det-lbl">Document Date</div><div class="det-val">${fmtDate(d.docDate)}</div></div>
      <div class="det-item" style="grid-column:1/-1"><div class="det-lbl">Subject</div><div class="det-val" style="font-size:14px;font-weight:600">${d.subject}</div></div>
      <div class="det-item"><div class="det-lbl">Year</div><div class="det-val">${d.fiscal}</div></div>
      <div class="det-item"><div class="det-lbl">Uploaded By</div><div class="det-val">${DB.users.find(u=>u.id===d.uid)?.name||'-'}</div></div>
    </div>
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Status Timeline</div>
    <div class="pipe" style="background:var(--g50);padding:12px;border-radius:var(--r);margin-bottom:16px">${buildTL(d.status,d)}</div>
    ${trackNoteHistory(d)}

    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Attachments (${d.files.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${d.files.length?d.files.map(f=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')">
        ${ficon(f.type)}<span class="fn" style="max-width:160px">${f.name}</span><i class="fas fa-eye" style="font-size:11px;color:var(--g400)"></i>
      </div>`).join(''):`<span style="color:var(--g400);font-size:13px">No attachments</span>`}
    </div>`;
  document.getElementById('detStBtn').onclick=()=>{closeMo('moDet');openStMo(id);};
  openMo('moDet');
}
function buildTL(cur,d){
  const pg=['pel','ops','air'];const is=pg.includes(cur);const midSm=is?SM[cur]:null;
  const steps=[
    {key:'head',sm:SM.head,match:['head']},
    {key:'mid', sm:midSm,label:midSm?midSm.label:'Pel / Ops / Air',icon:midSm?midSm.icon:'fa-users-cog',match:['pel','ops','air']},
    {key:'dg',  sm:SM.dg,match:['dg']},
    {key:'done',sm:SM.done,match:['done']},
  ];
  const ord={head:0,pel:1,ops:1,air:1,dg:2,done:3};const ci=ord[cur]??0;
  return steps.map((st,i)=>{
    const cls=i<ci?'done':i===ci?'active':'pending';
    const icon=st.sm?st.sm.icon:st.icon; const lbl=st.sm?st.sm.label:st.label;
    return`<div class="ps ${cls}"><div class="pd"><i class="fas ${icon}"></i></div><div class="pl">${lbl}</div>${i===ci?'<div style="font-size:9px;color:var(--p);margin-top:2px">▲ Current</div>':''}</div>`;
  }).join('');
}

function escHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function addStepNote(docId,stepKey){
  const d=DB.docs.find(x=>x.id===docId);if(!d)return;
  const stepLabel={head:'Head FSD',mid:'Pel / Ops / Air',dg:'DG',done:'Completed'}[stepKey]||stepKey;
  const defStatus=stepKey==='mid'?(['pel','ops','air'].includes(d.status)?d.status:'pel'):stepKey;
  const midSel=stepKey==='mid'?`<select id="snStatus" class="swal2-input" style="margin-bottom:8px"><option value="pel"${defStatus==='pel'?' selected':''}>Pel</option><option value="ops"${defStatus==='ops'?' selected':''}>Ops</option><option value="air"${defStatus==='air'?' selected':''}>Air</option></select>`:'';
  const r=await Swal.fire({
    title:`Add Note · ${stepLabel}`,
    html:`${midSel}<textarea id="snNote" class="swal2-textarea" placeholder="Type note..."></textarea>`,
    showCancelButton:true,confirmButtonText:'Save',confirmButtonColor:'var(--p)',
    preConfirm:()=>{
      const note=(document.getElementById('snNote').value||'').trim();
      if(!note){Swal.showValidationMessage('Note is required');return false;}
      const st=document.getElementById('snStatus');
      return {note,status:st?st.value:defStatus};
    }
  });
  if(!r.isConfirmed||!r.value)return;
  if(!Array.isArray(d.statusNotes))d.statusNotes=[];
  d.statusNotes.push({at:new Date().toISOString(),by:(CU&&CU.name)||'',status:r.value.status,note:r.value.note});
  if(GAS_URL)await gasPost({action:'saveDocument',doc:d});
  Swal.fire({icon:'success',title:'Note saved',toast:true,position:'top-end',showConfirmButton:false,timer:1300});
  if(document.getElementById('moDet')?.classList.contains('open'))openDet(docId);
  autoRefresh(true);
}

// ════════════════════════════════════════════════
//  STATUS
// ════════════════════════════════════════════════
function openStMo(id){eSid=id;const d=DB.docs.find(x=>x.id===id);if(!d)return;document.getElementById('stSel').value=d.status;document.getElementById('stNote').value=d.statusNote||'';openMo('moSt');}
function saveStatus(){
  const d=DB.docs.find(x=>x.id===eSid);if(!d)return;
  showSpin();
  setTimeout(async()=>{
    const newStatus=document.getElementById('stSel').value;
    const newNote=document.getElementById('stNote').value.trim();
    if(!Array.isArray(d.statusNotes)) d.statusNotes=[];
    if(newNote || newStatus!==d.status){
      d.statusNotes.push({at:new Date().toISOString(),by:(CU&&CU.name)||'',status:newStatus,note:newNote});
    }
    d.status=newStatus;
    d.statusNote=newNote;
    if(GAS_URL) await gasPost({action:'saveDocument',doc:d});
    hideSpin();closeMo('moSt');
    Swal.fire({icon:'success',title:'Status Updated',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
    autoRefresh(true);
  },300);
}
function toggleNotes(id){
  const r=document.getElementById('nh-'+id);if(!r)return;
  r.style.display=r.style.display==='table-row'?'none':'table-row';
}
function noteHistoryRow(d,colspan){
  const list=Array.isArray(d.statusNotes)?d.statusNotes:[];
  if(!list.length) return '';
  const rows=[...list].reverse().map(n=>{
    const sm=SM[n.status]||SM.head;
    const when=n.at?new Date(n.at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-left:3px solid ${sm.color};background:#fff;border-radius:6px;margin-bottom:6px">
      <span class="badge ${sm.cls}" style="flex-shrink:0"><i class="fas ${sm.icon}"></i> ${sm.label}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;color:var(--g900);white-space:pre-wrap;word-break:break-word">${n.note||'<em style="color:var(--g400)">(no note)</em>'}</div>
        <div style="font-size:10.5px;color:var(--g500);margin-top:2px"><i class="far fa-clock"></i> ${when}${n.by?' · '+n.by:''}</div>
      </div>
    </div>`;
  }).join('');
  return `<tr id="nh-${d.id}" style="display:none"><td colspan="${colspan}" style="background:var(--g50);padding:10px 14px">
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px"><i class="fas fa-history"></i> Note History (${list.length})</div>
    ${rows}
  </td></tr>`;
}
function trackNoteHistory(d){
  const list=Array.isArray(d.statusNotes)?d.statusNotes:[];
  if(!list.length) return '';
  const rows=[...list].reverse().map(n=>{
    const sm=SM[n.status]||SM.head;
    const when=n.at?new Date(n.at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-left:3px solid ${sm.color};background:#fff;border-radius:6px;margin-bottom:6px">
      <span class="badge ${sm.cls}" style="flex-shrink:0"><i class="fas ${sm.icon}"></i> ${sm.label}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;color:var(--g900);white-space:pre-wrap;word-break:break-word">${n.note||'<em style="color:var(--g400)">(no note)</em>'}</div>
        <div style="font-size:10.5px;color:var(--g500);margin-top:2px"><i class="far fa-clock"></i> ${when}${n.by?' · '+n.by:''}</div>
      </div>
    </div>`;
  }).join('');
  return `<div style="margin-top:10px;background:var(--g50);padding:10px;border-radius:var(--r)">
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px"><i class="fas fa-history"></i> Note History (${list.length})</div>
    ${rows}
  </div>`;
}
function noteToggleBtn(d){
  const n=(Array.isArray(d.statusNotes)?d.statusNotes.length:0);
  if(!n) return '';
  return `<button class="btn btn-ol btn-sm btn-ico" title="Note history (${n})" onclick="toggleNotes(${d.id})"><i class="fas fa-history"></i></button>`;
}

// ════════════════════════════════════════════════
//  FILE VIEWER
// ════════════════════════════════════════════════
function viewFile(name,encUrl,type){
  const url=decodeURIComponent(encUrl||'');
  const isPDF=(type==='pdf'||name.toLowerCase().endsWith('.pdf'));
  if(isPDF&&url&&url!=='#'){
    document.getElementById('pdfTit').textContent=name;
    // Convert Google Drive links to embeddable /preview form
    let src=url;
    const m=url.match(/\/file\/d\/([^/]+)/)||url.match(/[?&]id=([^&]+)/);
    if(m){
      src=`https://drive.google.com/file/d/${m[1]}/preview`;
    }
    document.getElementById('pdfFrame').src=src;
    document.getElementById('pdfOpenBtn').onclick=()=>window.open(url,'_blank');
    openMo('moPDF');
  } else if(isPDF){
    Swal.fire({icon:'info',title:name,text:'PDF is stored in Google Drive. No preview URL yet.',confirmButtonColor:'var(--p)'});
  } else {
    Swal.fire({title:name,html:`<div style="padding:16px;text-align:center">${ficon(type)}<p style="color:var(--g500);font-size:13px;margin-top:12px">Use Download to access this file.</p></div>`,
      showCancelButton:true,confirmButtonText:'<i class="fas fa-download"></i> Download',cancelButtonText:'Close',confirmButtonColor:'var(--p)'})
    .then(r=>{if(r.isConfirmed&&url&&url!=='#')window.open(url,'_blank');});
  }
}


// ════════════════════════════════════════════════
//  TRACKING
// ════════════════════════════════════════════════
function renderTrack(el,tab='all',myOnly=false){
  activeTrackTab=tab;
  const all=myOnly?DB.docs.filter(d=>d.uid===CU.id):DB.docs;
  const cnt={all:all.length};ST_ALL.forEach(k=>{cnt[k]=all.filter(d=>d.status===k).length;});
  const tabs=[
    {key:'all', label:'All',       icon:'fa-list',         cls:'tt-all'},
    {key:'head',label:'Head FSD',  icon:'fa-user-tie',     cls:'tt-head'},
    {key:'pel', label:'Pel',       icon:'fa-user-tag',     cls:'tt-pel'},
    {key:'ops', label:'Ops',       icon:'fa-cogs',         cls:'tt-ops'},
    {key:'air', label:'Air',       icon:'fa-plane',        cls:'tt-air'},
    {key:'dg',  label:'DG',        icon:'fa-stamp',        cls:'tt-dg'},
    {key:'done',label:'Completed', icon:'fa-check-circle', cls:'tt-done'},
  ];
  el.innerHTML=`
  <div class="track-tabs">${tabs.map(t=>`<button class="track-tab ${t.cls}${activeTrackTab===t.key?' active':''}" onclick="swTk('${t.key}',${myOnly})">
    <i class="fas ${t.icon}"></i> ${t.label}
    <span style="background:rgba(0,0,0,.15);padding:1px 7px;border-radius:20px;font-size:10px">${cnt[t.key]||0}</span>
  </button>`).join('')}</div>
  <div id="tkBody">${buildTkCards(all,tab)}</div>`;
}
function swTk(tab,myOnly){
  activeTrackTab=tab;
  const all=myOnly?DB.docs.filter(d=>d.uid===CU.id):DB.docs;
  document.querySelectorAll('.track-tab').forEach(b=>b.classList.remove('active'));
  const map={all:'tt-all',head:'tt-head',pel:'tt-pel',ops:'tt-ops',air:'tt-air',dg:'tt-dg',done:'tt-done'};
  document.querySelectorAll('.track-tab.'+map[tab]).forEach(b=>b.classList.add('active'));
  const tb=document.getElementById('tkBody');if(tb)tb.innerHTML=buildTkCards(all,tab);
}
function buildTkCards(all,tab){
  const docs=tab==='all'?[...all].reverse():all.filter(d=>d.status===tab).reverse();
  if(!docs.length)return`<div class="empty"><i class="fas fa-route"></i><p>No documents in this category</p></div>`;
  return docs.map(d=>{
    const s=SM[d.status]||SM.head;
    return`<div class="tc">
      <div class="tc-h" onclick="tkTog(this)">
        <div style="min-width:0;flex:1"><div class="tc-dn">${d.fsdNo}</div><div class="tc-ds">${d.subject}</div><div class="tc-dm">${fmtDate(d.fsdDate)}</div></div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="badge ${s.cls}"><i class="fas ${s.icon}"></i> ${s.label}</span>
          <i class="fas fa-chevron-down" style="color:var(--g400);font-size:11px;transition:.2s"></i>
        </div>
      </div>
      <div class="tc-b">
        <div class="pipe" style="background:var(--g50);padding:10px;border-radius:var(--r)">${buildTL(d.status,d)}</div>
        
        ${trackNoteHistory(d)}
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ol btn-sm" onclick="openDet(${d.id})"><i class="fas fa-eye"></i> Detail</button>
          <button class="btn btn-c btn-sm"  onclick="openStMo(${d.id})"><i class="fas fa-exchange-alt"></i> Update</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function tkTog(h){const b=h.nextElementSibling;const ic=h.querySelector('.fa-chevron-down');b.classList.toggle('open');if(ic)ic.style.transform=b.classList.contains('open')?'rotate(180deg)':'';}

// ════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════
function renderUsers(el){
  el.innerHTML=`<div class="card"><div class="ch"><h3><i class="fas fa-users" style="color:var(--p)"></i> User Management</h3>
    <button class="btn btn-p btn-sm" onclick="openAddUser()"><i class="fas fa-plus"></i> Add User</button></div>
    <div class="cb"><div class="tw"><table><thead><tr><th>#</th><th>Username</th><th>Full Name</th><th>Group</th><th>Role</th><th>Manage</th></tr></thead><tbody id="userTb"></tbody></table></div></div></div>`;
  refUsers();
}
function refUsers(){
  const tb=document.getElementById('userTb');if(!tb)return;
  const avatar=u=>u.photo?`<img src="${u.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px">`:`<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:var(--g100);color:var(--g600);align-items:center;justify-content:center;font-size:11px;font-weight:600;vertical-align:middle;margin-right:8px">${initials(u.name)}</span>`;
  tb.innerHTML=DB.users.map((u,i)=>`<tr><td>${i+1}</td><td><strong>${u.u}</strong></td><td>${avatar(u)}${u.name}</td><td>${u.dept}</td>
    <td><span class="badge ${u.role==='admin'?'bp':'bc'}">${u.role==='admin'?'<i class="fas fa-shield-alt"></i> Admin':'<i class="fas fa-user"></i> Staff'}</span></td>
    <td><div style="display:flex;gap:4px">
      <button class="btn btn-ol btn-sm btn-ico" onclick="openEditUser(${u.id})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-d btn-sm btn-ico"  onclick="delUser(${u.id})"><i class="fas fa-trash"></i></button>
    </div></td></tr>`).join('');
}
let _userPhoto='';
function clearUserPhoto(){_userPhoto='';document.getElementById('fph').value='';document.getElementById('fphPrevRow').style.display='none';}
function setUserPhotoPreview(dataUrl){_userPhoto=dataUrl||'';const row=document.getElementById('fphPrevRow');if(!dataUrl){row.style.display='none';return;}document.getElementById('fphPrev').src=dataUrl;row.style.display='';}
function onUserPhoto(e){const f=e.target.files&&e.target.files[0];if(!f)return;resizeImageToDataUrl(f,256).then(setUserPhotoPreview);}
function resizeImageToDataUrl(file,max){return new Promise(res=>{const r=new FileReader();r.onload=ev=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));const w=Math.round(img.width*s),h=Math.round(img.height*s);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',0.85));};img.src=ev.target.result;};r.readAsDataURL(file);});}
function openAddUser(){eUid=null;document.getElementById('moUT').textContent='Add User';['fu','fp','fn','fd'].forEach(id=>document.getElementById(id).value='');document.getElementById('frl').value='staff';clearUserPhoto();openMo('moUser');}
function openEditUser(id){const u=DB.users.find(x=>x.id===id);if(!u)return;eUid=id;document.getElementById('moUT').textContent='Edit User';document.getElementById('fu').value=u.u;document.getElementById('fp').value=u.p;document.getElementById('fn').value=u.name;document.getElementById('fd').value=u.dept;document.getElementById('frl').value=u.role;document.getElementById('fph').value='';if(u.photo){setUserPhotoPreview(u.photo);}else{clearUserPhoto();}openMo('moUser');}
async function saveUser(){
  const u=document.getElementById('fu').value.trim(),p=document.getElementById('fp').value.trim(),n=document.getElementById('fn').value.trim(),d=document.getElementById('fd').value.trim(),r=document.getElementById('frl').value;
  if(!u||!p||!n||!d){Swal.fire({icon:'warning',title:'Please fill all required fields'});return;}
  const photo=_userPhoto||'';
  let usrObj;
  if(eUid){const usr=DB.users.find(x=>x.id===eUid);if(usr){Object.assign(usr,{u,p,name:n,dept:d,role:r,photo});usrObj={...usr};}}
  else {usrObj={u,p,name:n,dept:d,role:r,photo};}
  if(GAS_URL){
    const res=await gasPost({action:'saveUser',user:eUid?{id:eUid,...usrObj}:usrObj});
    if(!eUid){const newId=res?.id||DB.nid.u++;DB.users.push({id:newId,...usrObj});}
    // re-pull from backend so all devices stay in sync
    try{const ur=await fetch(`${GAS_URL}?action=getUsers`);const uj=await ur.json();if(Array.isArray(uj.users)&&uj.users.length){DB.users=uj.users;DB.nid.u=Math.max(...uj.users.map(x=>x.id))+1;}}catch(_){}
  } else if(!eUid){DB.users.push({id:DB.nid.u++,...usrObj});}
  saveUsers();
  closeMo('moUser');
  Swal.fire({icon:'success',title:'Saved',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
  autoRefresh(true);
}
function delUser(id){Swal.fire({title:'Delete user?',icon:'warning',showCancelButton:true,confirmButtonText:'Delete',cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'}).then(async r=>{if(r.isConfirmed){if(GAS_URL)await gasPost({action:'deleteUser',id});DB.users=DB.users.filter(x=>x.id!==id);saveUsers();try{if(GAS_URL){const ur=await fetch(`${GAS_URL}?action=getUsers`);const uj=await ur.json();if(Array.isArray(uj.users)){DB.users=uj.users;DB.nid.u=(DB.users.length?Math.max(...DB.users.map(x=>x.id)):0)+1;saveUsers();}}}catch(_){}autoRefresh(true);}});}

// ════════════════════════════════════════════════
//  ADD / EDIT DOCUMENT + UPLOAD TO DRIVE
// ════════════════════════════════════════════════
function openAddDoc(){eDid=null;document.getElementById('moDT').textContent='Add Document';['dDcal','dDcalD','dFsd','dFsdD','dDocN','dDocD','dSubj'].forEach(id=>document.getElementById(id).value='');document.getElementById('dSt').value='head';selFiles=[];renderFL();openMo('moDoc');}
function openEditDoc(id){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  eDid=id;document.getElementById('moDT').textContent='Edit Document';
  document.getElementById('dDcal').value=d.dcalNo;document.getElementById('dDcalD').value=d.dcalDate;
  document.getElementById('dFsd').value=d.fsdNo;document.getElementById('dFsdD').value=d.fsdDate;
  document.getElementById('dDocN').value=d.docNo||'';document.getElementById('dDocD').value=d.docDate||'';
  document.getElementById('dSubj').value=d.subject;document.getElementById('dSt').value=d.status||'head';
  selFiles=d.files.map(f=>({...f,existing:true,size:0}));renderFL();openMo('moDoc');
}

async function saveDoc(){
  const dcalNo=v('dDcal'),dcalDate=v('dDcalD'),fsdNo=v('dFsd'),fsdDate=v('dFsdD'),subject=v('dSubj');
  if(!dcalNo||!dcalDate||!fsdNo||!fsdDate||!subject){Swal.fire({icon:'warning',title:'Please fill all required fields'});return;}
  closeMo('moDoc');
  showSpin('Saving…');

  const uploaded=[];
  const newFiles=selFiles.filter(f=>!f.existing);
  for(let i=0;i<newFiles.length;i++){
    const f=newFiles[i];
    setSpinTx(`Uploading ${i+1}/${newFiles.length}: ${f.name}…`);
    setUplProg(Math.round((i/newFiles.length)*100));
    if(GAS_URL&&f.fileObj){
      const res=await uploadToDrive(f.fileObj);
      uploaded.push({name:f.name,type:f.type,url:res?.viewUrl||'#',previewUrl:res?.previewUrl||'',driveId:res?.id||''});
    } else {
      uploaded.push({name:f.name,type:f.type,url:f.url||'#'});
    }
  }
  setUplProg(100);

  const files=[...selFiles.filter(f=>f.existing).map(f=>({name:f.name,type:f.type,url:f.url})),...uploaded];
  const doc={dcalNo,dcalDate,fsdNo,fsdDate,docNo:v('dDocN'),docDate:v('dDocD'),subject,
    status:v('dSt'),statusNote:'',files,uid:CU.id,fiscal:toFY(fsdDate),owner:CU.name};

  let savedId=eDid;
  if(eDid){
    const d=DB.docs.find(x=>x.id===eDid);if(d)Object.assign(d,doc);
    if(GAS_URL){const res=await gasPost({action:'saveDocument',doc:{id:eDid,...doc}});if(res?.id)savedId=res.id;}
  } else {
    if(GAS_URL){
      const res=await gasPost({action:'saveDocument',doc});
      savedId=res?.id||DB.nid.d++;
      DB.docs.push({id:savedId,...doc});
    } else {
      savedId=DB.nid.d++;
      DB.docs.push({id:savedId,...doc});
    }
  }

  hideSpin();setUplProg(0);
  Swal.fire({icon:'success',title:GAS_URL?'Saved to Google Sheets & Drive!':'Document saved (Demo Mode)',toast:true,position:'top-end',showConfirmButton:false,timer:1800});
  autoRefresh(true);
}

async function uploadToDrive(file){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=async e=>{
      const b64=e.target.result.split(',')[1];
      try{
        const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'uploadFile',fileName:file.name,mimeType:file.type||'application/octet-stream',fileData:b64})});
        resolve(await res.json());
      }catch(err){console.warn('Upload failed',err);resolve(null);}
    };
    reader.readAsDataURL(file);
  });
}

function delDoc(id){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  Swal.fire({title:'Delete document?',text:d.subject,icon:'warning',showCancelButton:true,confirmButtonText:'Delete',cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'})
  .then(async r=>{if(r.isConfirmed){DB.docs=DB.docs.filter(x=>x.id!==id);if(GAS_URL)await gasPost({action:'deleteDocument',id});autoRefresh(true);}});
}

// ════════════════════════════════════════════════
//  STAFF PAGES
// ════════════════════════════════════════════════
function renderSDash(el){
  const mine=DB.docs.filter(d=>d.uid===CU.id);
  const cnt={};ST_ALL.forEach(k=>{cnt[k]=mine.filter(d=>d.status===k).length;});
  el.innerHTML=`
  <div class="sg" style="max-width:760px">
    <div class="sc" onclick="showQF('all','All Documents')"><div class="sci b"><i class="fas fa-file-alt"></i></div><div><div class="sc-v">${DB.docs.length}</div><div class="sc-l">Total Docs</div></div></div>
    <div class="sc"><div class="sci o"><i class="fas fa-folder-open"></i></div><div><div class="sc-v">${mine.length}</div><div class="sc-l">My Documents</div></div></div>
    <div class="sc"><div class="sci g"><i class="fas fa-check-circle"></i></div><div><div class="sc-v">${cnt.done||0}</div><div class="sc-l">Completed</div></div></div>
  </div>
  <div class="card"><div class="ch"><h3><i class="fas fa-clock" style="color:var(--og)"></i> My Recent Documents</h3></div>
  <div class="cb"><div class="tw"><table>
    <thead><tr><th>FSD No</th><th>Subject</th><th>Status</th><th>Date</th><th>Files</th></tr></thead>
    <tbody>${[...mine].reverse().slice(0,5).map(d=>`<tr>
      <td><code style="font-size:11px">${d.fsdNo}</code></td>
      <td class="tdl" onclick="openDet(${d.id})" style="max-width:220px">${d.subject}</td>
      <td>${sbadge(d.status)}</td><td style="white-space:nowrap">${fmtDate(d.fsdDate)}</td>
      <td><div style="display:flex;gap:3px">${d.files.map(f=>`<span onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')" style="cursor:pointer">${ficon(f.type)}</span>`).join('')}</div></td>
    </tr>`).join('')||`<tr><td colspan="5"><div class="empty" style="padding:20px"><p>No documents yet</p></div></td></tr>`}
    </tbody>
  </table></div></div></div>`;
}
function renderMyDocs(el){
  el.innerHTML=`<div class="card"><div class="ch"><h3><i class="fas fa-folder-open" style="color:var(--og)"></i> My Documents</h3>
    <button class="btn btn-p btn-sm" onclick="openAddDoc()"><i class="fas fa-plus"></i> Add Document</button></div>
    <div class="cb"><div class="tw"><table>
      <thead><tr><th>FSD No</th><th>FSD Date</th><th style="min-width:180px">Subject</th><th>Status</th><th>Files</th><th>Manage</th></tr></thead>
      <tbody id="myDocTb"></tbody>
    </table></div></div></div>`;
  refMyDocs();
}
function refMyDocs(){
  const tb=document.getElementById('myDocTb');if(!tb)return;
  const docs=[...DB.docs.filter(d=>d.uid===CU.id)].reverse();
  if(!docs.length){tb.innerHTML=`<tr><td colspan="6"><div class="empty"><i class="fas fa-inbox"></i><p>No documents yet</p></div></td></tr>`;return;}
  tb.innerHTML=docs.map(d=>`<tr>
    <td><code style="font-size:11px">${d.fsdNo}</code></td>
    <td style="white-space:nowrap">${fmtDate(d.fsdDate)}</td>
    <td class="tdl" style="max-width:200px;white-space:normal" onclick="openDet(${d.id})">${d.subject}</td>
    <td>${sbadge(d.status)}</td>
    <td><div style="display:flex;gap:3px;flex-wrap:wrap">${d.files.map(f=>`<span onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')" style="cursor:pointer" title="${f.name}">${ficon(f.type)}</span>`).join('')}</div></td>
    <td><div style="display:flex;gap:3px">
      <button class="btn btn-ol btn-sm btn-ico" onclick="openDet(${d.id})"><i class="fas fa-eye"></i></button>
      <button class="btn btn-g btn-sm btn-ico" onclick="dlDoc(${d.id})" title="Download"><i class="fas fa-download"></i></button>
      <button class="btn btn-ol btn-sm btn-ico" onclick="openEditDoc(${d.id})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-d btn-sm btn-ico" onclick="delDoc(${d.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}
function dlDoc(id){const d=DB.docs.find(x=>x.id===id);if(!d||!d.files.length){Swal.fire({icon:'info',title:'No files attached'});return;}d.files.forEach(f=>{if(f.url&&f.url!=='#')window.open(f.url,'_blank');});}
function renderProfile(el){
  const me=DB.users.find(u=>u.id===CU.id)||CU;
  _profilePhoto=me.photo||'';
  el.innerHTML=`<div class="card" style="max-width:460px"><div class="ch"><h3><i class="fas fa-user-edit" style="color:var(--cy)"></i> Edit Profile</h3></div><div class="cb">
    <div class="fr"><div class="ff"><label>Profile Photo</label>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><img id="ppPrev" src="${me.photo||''}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:1px solid var(--g200);background:var(--g50);${me.photo?'':'display:none'}"><div style="display:flex;flex-direction:column;gap:6px"><input type="file" id="pph" accept="image/*" onchange="onProfilePhoto(event)"><button type="button" class="btn btn-ol btn-sm" onclick="_profilePhoto='';document.getElementById('ppPrev').style.display='none';document.getElementById('pph').value='';"><i class="fas fa-times"></i> Remove Photo</button></div></div>
    </div></div>
    <div class="fr"><div class="ff"><label>Username</label><input id="pu" value="${CU.u}"></div></div>
    <div class="fr"><div class="ff"><label>New Password <span style="font-weight:400;color:var(--g400)">(leave blank to keep)</span></label><input type="password" id="pp" placeholder="New password"></div></div>
    <div class="fr"><div class="ff"><label>Full Name</label><input id="pn" value="${CU.name}"></div></div>
    <div class="fr"><div class="ff"><label>Group</label><input id="pdpt" value="${me.dept||''}"></div></div>
    <button class="btn btn-p" onclick="saveProfile()"><i class="fas fa-save"></i> Save Changes</button>
  </div></div>`;
}
let _profilePhoto='';
function onProfilePhoto(e){const f=e.target.files&&e.target.files[0];if(!f)return;resizeImageToDataUrl(f,256).then(d=>{_profilePhoto=d;const im=document.getElementById('ppPrev');im.src=d;im.style.display='';});}
async function saveProfile(){
  const u=v('pu'),p=v('pp'),n=v('pn'),dpt=v('pdpt');
  if(!u||!n){Swal.fire({icon:'warning',title:'Username and name required'});return;}
  const usr=DB.users.find(x=>x.id===CU.id);if(usr){usr.u=u;usr.name=n;usr.dept=dpt;usr.photo=_profilePhoto;if(p)usr.p=p;}
  CU.u=u;CU.name=n;CU.photo=_profilePhoto;if(p)CU.p=p;
  if(GAS_URL){try{await gasPost({action:'saveUser',user:{id:CU.id,u,p:p||CU.p,name:n,dept:dpt,role:CU.role,email:CU.email||'',photo:_profilePhoto}});}catch(_){}}
  saveUsers();
  applyUserAvatar(CU);
  document.getElementById('sbName').textContent=n;
  Swal.fire({icon:'success',title:'Profile updated',toast:true,position:'top-end',showConfirmButton:false,timer:1800});
}

// ════════════════════════════════════════════════
//  STATISTICS FSD  (Spreadsheet)
// ════════════════════════════════════════════════
function goStats(){
  deactivateAll();
  const ni=document.getElementById('ni-stats');if(ni)ni.classList.add('active');
  document.getElementById('tTitle').textContent='📊 Statistics FSD';
  let el=document.getElementById('pg-stats');
  if(!el){el=document.createElement('div');el.className='pg';el.id='pg-stats';document.getElementById('contentArea').appendChild(el);}
  el.classList.add('active');
  renderSSFull(el);
  if(window.innerWidth<=768)closeMobSb();
}

function renderSSFull(container){
  const pg=ssPages.find(p=>p.id===activeSS)||ssPages[0];
  const ro=CU.role==='staff';
  container.innerHTML=`<div class="ss-wrap" id="ssWrap">${buildSSToolbar(ro)}${buildSSFormulaBar()}${buildSSGrid(pg,ro)}${buildSSTabs(ro)}</div>`;
  if(!ro) setTimeout(()=>focusCell(0,0),80);
}

function buildSSToolbar(ro){
  if(ro) return`<div class="ss-toolbar"><span style="font-size:12px;color:var(--g500)"><i class="fas fa-lock" style="color:var(--og)"></i>&nbsp; View Only — Staff cannot edit Statistics FSD</span></div>`;
  return`<div class="ss-toolbar">
    <div class="tb-grp">
      <button class="tb-btn" onclick="execCmd('bold')" title="Bold"><b>B</b></button>
      <button class="tb-btn" onclick="execCmd('italic')" title="Italic"><em>I</em></button>
      <button class="tb-btn" onclick="execCmd('underline')" title="Underline"><u>U</u></button>
    </div>
    <div class="tb-grp">
      <select class="tb-sel" onchange="ssFontSize(this.value)" title="Font size">
        <option>10</option><option selected>12</option><option>14</option><option>16</option><option>18</option>
      </select>
    </div>
    <div class="tb-grp">
      <button class="tb-btn" onclick="ssAddRow()" title="Add Row"><i class="fas fa-plus"></i> Row</button>
      <button class="tb-btn" onclick="ssAddCol()" title="Add Col"><i class="fas fa-plus"></i> Col</button>
      <button class="tb-btn" onclick="ssDelRow()" title="Delete Row"><i class="fas fa-minus"></i> Row</button>
      <button class="tb-btn" onclick="ssDelCol()" title="Delete Col"><i class="fas fa-minus"></i> Col</button>
    </div>
    <div class="tb-grp">
      <button class="tb-btn" onclick="openMo('moLink')" title="Insert Link"><i class="fas fa-link"></i> Link</button>
      <button class="tb-btn" onclick="ssClearLink()" title="Remove Link"><i class="fas fa-unlink"></i></button>
    </div>
    <div class="tb-grp">
      <button class="tb-btn" onclick="ssExportCSV()" title="Export CSV"><i class="fas fa-download"></i> CSV</button>
      <button class="tb-btn" onclick="document.getElementById('csvFile').click()" title="Import CSV"><i class="fas fa-upload"></i> CSV</button>
      <input type="file" id="csvFile" accept=".csv" style="display:none" onchange="ssImportCSV(this)">
    </div>
    <div class="tb-grp">
      <button class="tb-btn" onclick="openMo('moSheet')" title="Add Google Sheet Viewer"><i class="fas fa-table" style="color:var(--gn)"></i> Sheet</button>
    </div>
  </div>`;
}

function buildSSFormulaBar(){
  return`<div class="formula-bar">
    <div class="cell-ref" id="cellRef">A1</div>
    <div style="width:1px;height:18px;background:var(--g300)"></div>
    <input class="f-input" id="fBar" placeholder="Cell value / formula…" oninput="fBarInput()" onchange="fBarChange()">
  </div>`;
}

function buildSSGrid(pg,ro){
  const rows=pg.data.length, cols=pg.data[0]?.length||12;
  let h=`<div class="ss-grid-wrap"><table class="ss-table" id="ssT"><thead><tr><th class="rh">&nbsp;</th>`;
  for(let c=0;c<cols;c++) h+=`<th class="ch" id="ch-${c}">${COLS[c]||c+1}</th>`;
  h+=`</tr></thead><tbody>`;
  for(let r=0;r<rows;r++){
    h+=`<tr><td class="rn" id="rh-${r}">${r+1}</td>`;
    for(let c=0;c<cols;c++){
      const val=(pg.data[r]?.[c]||'').replace(/"/g,'&quot;');
      const lnk=pg.links?.[r+','+c];
      h+=lnk
        ? `<td id="td-${r}-${c}" class="lnk" onclick="cellClick(${r},${c})"><a href="${lnk}" target="_blank" style="display:block;height:26px;line-height:26px;padding:0 5px;color:var(--p);text-decoration:underline;font-size:12.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="${lnk}">${val||lnk}</a></td>`
        : `<td id="td-${r}-${c}" onclick="cellClick(${r},${c})" ondblclick="cellDbl(${r},${c})"><input class="ci" id="ci-${r}-${c}" value="${val}" ${ro?'readonly':''} onchange="ciChange(${r},${c},this.value)" onkeydown="ciKey(event,${r},${c})" onfocus="ciF(${r},${c})"></td>`;
    }
    h+=`</tr>`;
  }
  return h+`</tbody></table></div>`;
}

function buildSSTabs(ro){
  let h=`<div class="ss-tabs">`;
  ssPages.forEach(p=>{
    h+=`<div class="ss-tab${p.id===activeSS?' active':''}" onclick="swSS(${p.id})" ondblclick="renSS(${p.id})">
      ${p.name}
      ${(!ro&&ssPages.length>1)?`<button class="tdl2" onclick="event.stopPropagation();delSS(${p.id})" title="Delete"><i class="fas fa-times"></i></button>`:''}
    </div>`;
  });
  if(!ro) h+=`<div class="ss-add-tab" onclick="addSS()" title="Add sheet"><i class="fas fa-plus"></i></div>`;
  return h+`</div>`;
}

// Cell interactions
function cellClick(r,c){
  const inp=document.getElementById('ci-'+r+'-'+c);
  if(inp){inp.focus();ciF(r,c);}
  else{// link cell — just select
    document.querySelectorAll('.ss-table td').forEach(t=>t.classList.remove('ac'));
    const td=document.getElementById('td-'+r+'-'+c);if(td)td.classList.add('ac');
    activeCell={r,c};
    const fb=document.getElementById('fBar');const pg=ssPages.find(p=>p.id===activeSS);
    if(fb&&pg) fb.value=pg.data[r]?.[c]||'';
    const ref=document.getElementById('cellRef');if(ref) ref.textContent=(COLS[c]||c+1)+(r+1);
  }
}
function cellDbl(r,c){const inp=document.getElementById('ci-'+r+'-'+c);if(inp)inp.select();}
function ciF(r,c){
  activeCell={r,c};
  document.querySelectorAll('.ss-table td').forEach(t=>t.classList.remove('ac'));
  const td=document.getElementById('td-'+r+'-'+c);if(td)td.classList.add('ac');
  const fb=document.getElementById('fBar');const pg=ssPages.find(p=>p.id===activeSS);
  if(fb&&pg) fb.value=pg.data[r]?.[c]||'';
  const ref=document.getElementById('cellRef');if(ref) ref.textContent=(COLS[c]||c+1)+(r+1);
}
function focusCell(r,c){const inp=document.getElementById('ci-'+r+'-'+c);if(inp){inp.focus();ciF(r,c);}}
function ciChange(r,c,val){const pg=ssPages.find(p=>p.id===activeSS);if(pg&&pg.data[r])pg.data[r][c]=val;}
function fBarInput(){if(!activeCell)return;const fb=document.getElementById('fBar');const inp=document.getElementById('ci-'+activeCell.r+'-'+activeCell.c);if(inp&&fb)inp.value=fb.value;}
function fBarChange(){if(!activeCell)return;ciChange(activeCell.r,activeCell.c,document.getElementById('fBar')?.value||'');}
function ciKey(e,r,c){
  const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;
  const rows=pg.data.length,cols=pg.data[0]?.length||12;
  if(e.key==='Enter'||e.key==='ArrowDown'){e.preventDefault();if(r+1<rows)focusCell(r+1,c);}
  else if(e.key==='ArrowUp'){e.preventDefault();if(r>0)focusCell(r-1,c);}
  else if(e.key==='Tab'){e.preventDefault();if(c+1<cols)focusCell(r,c+1);}
  else if(e.key==='ArrowRight'&&!e.shiftKey){if(c+1<cols){e.preventDefault();focusCell(r,c+1);}}
  else if(e.key==='ArrowLeft'&&!e.shiftKey){if(c>0){e.preventDefault();focusCell(r,c-1);}}
}

// Spreadsheet toolbar actions
function execCmd(cmd){document.execCommand(cmd);}
function ssFontSize(sz){/* placeholder */}
function ssAddRow(){const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;const r=activeCell?activeCell.r+1:pg.data.length;pg.data.splice(r,0,Array(pg.data[0]?.length||12).fill(''));goStats();}
function ssAddCol(){const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;pg.data.forEach(row=>row.push(''));goStats();}
function ssDelRow(){const pg=ssPages.find(p=>p.id===activeSS);if(!pg||pg.data.length<=1)return;const r=activeCell?activeCell.r:pg.data.length-1;pg.data.splice(r,1);goStats();}
function ssDelCol(){const pg=ssPages.find(p=>p.id===activeSS);if(!pg||(pg.data[0]?.length||1)<=1)return;pg.data.forEach(row=>row.pop());goStats();}
function swSS(id){activeSS=id;goStats();}
function addSS(){ssPages.push({id:ssNid,name:'Sheet '+ssNid,data:mkData(30,12),links:{},styles:{}});activeSS=ssNid;ssNid++;goStats();}
function delSS(id){if(ssPages.length<=1)return;ssPages=ssPages.filter(p=>p.id!==id);if(activeSS===id)activeSS=ssPages[0].id;goStats();}
function renSS(id){const p=ssPages.find(x=>x.id===id);if(!p)return;Swal.fire({title:'Rename Sheet',input:'text',inputValue:p.name,confirmButtonText:'Rename',confirmButtonColor:'var(--p)'}).then(r=>{if(r.isConfirmed&&r.value.trim()){p.name=r.value.trim();goStats();}});}
function ssExportCSV(){const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;const csv=pg.data.map(row=>row.map(c=>(c||'').includes(',')?`"${c}"`:c||'').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=pg.name+'.csv';a.click();}
function ssImportCSV(inp){if(!inp.files[0])return;const r=new FileReader();r.onload=e=>{const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;const rows=e.target.result.split('\n').filter(l=>l.trim()).map(l=>l.split(',').map(c=>c.replace(/^"|"$/g,'').trim()));pg.data=rows;goStats();};r.readAsText(inp.files[0]);inp.value='';}

// Insert Link
function insertLink(){
  if(!activeCell){Swal.fire({icon:'info',title:'Click a cell first'});return;}
  const pg=ssPages.find(p=>p.id===activeSS);if(!pg)return;
  const txt=v('lnkText'),url=v('lnkUrl');
  if(!url){Swal.fire({icon:'warning',title:'Please enter a URL'});return;}
  if(!pg.links)pg.links={};
  pg.links[activeCell.r+','+activeCell.c]=url;
  pg.data[activeCell.r][activeCell.c]=txt||url;
  closeMo('moLink');goStats();
}
function ssClearLink(){
  if(!activeCell)return;
  const pg=ssPages.find(p=>p.id===activeSS);if(!pg||!pg.links)return;
  delete pg.links[activeCell.r+','+activeCell.c];goStats();
}

function renderSSInContainer(data,links,container,ro){
  const tmpSS={data,links};
  let h=`<div class="ss-grid-wrap"><table class="ss-table"><thead><tr><th class="rh">&nbsp;</th>`;
  const cols=data[0]?.length||10;
  for(let c=0;c<cols;c++) h+=`<th class="ch">${COLS[c]||c+1}</th>`;
  h+=`</tr></thead><tbody>`;
  data.forEach((row,r)=>{
    h+=`<tr><td class="rn">${r+1}</td>`;
    row.forEach((val,c)=>{
      h+=`<td><input class="ci" value="${(val||'').replace(/"/g,'&quot;')}" ${ro?'readonly':''}></td>`;
    });
    h+=`</tr>`;
  });
  h+=`</tbody></table></div>`;
  container.innerHTML=h;
}

// ════════════════════════════════════════════════
//  CUSTOMIZE
// ════════════════════════════════════════════════
function renderCustomize(el){
  const items=CU.role==='admin'?adminMenuItems:staffMenuItems;
  el.innerHTML=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px" id="custGrid">
    <!-- Menu customizer -->
    <div class="card"><div class="ch"><h3><i class="fas fa-bars" style="color:var(--pu)"></i> Sidebar Menu</h3></div>
    <div class="cb">
      <p style="font-size:12px;color:var(--g500);margin-bottom:14px">Show / hide menu items.</p>
      ${items.map((m,i)=>`<div class="cust-item">
        <i class="fas ${m.icon}" style="color:var(--p);width:18px;text-align:center"></i>
        <span style="flex:1;font-size:13px">${m.label}</span>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--g500);cursor:pointer;white-space:nowrap">
          <input type="checkbox" ${m.visible?'checked':''} onchange="${CU.role==='admin'?'adminMenuItems':'staffMenuItems'}[${i}].visible=this.checked">
          Show
        </label>
      </div>`).join('')}
      <button class="btn btn-pu btn-sm" style="margin-top:10px" onclick="applyMenu()"><i class="fas fa-check"></i> Apply</button>
    </div></div>
    <!-- Dashboard stats -->
    <div class="card"><div class="ch"><h3><i class="fas fa-tachometer-alt" style="color:var(--p)"></i> Dashboard Stat Cards</h3></div>
    <div class="cb">
      <p style="font-size:12px;color:var(--g500);margin-bottom:14px">Choose which stat cards to show.</p>
      ${dashStats.map((s,i)=>`<div class="cust-item">
        <i class="fas ${s.icon}" style="color:var(--p);width:18px;text-align:center"></i>
        <span style="flex:1;font-size:13px">${s.label}</span>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--g500);cursor:pointer;white-space:nowrap">
          <input type="checkbox" ${!s.hidden?'checked':''} onchange="dashStats[${i}].hidden=!this.checked">
          Show
        </label>
      </div>`).join('')}
      <button class="btn btn-p btn-sm" style="margin-top:10px" onclick="applyStats()"><i class="fas fa-check"></i> Apply</button>
    </div></div>
  </div>

  <!-- Add Custom Page -->
  <div class="card"><div class="ch"><h3><i class="fas fa-plus-circle" style="color:var(--gn)"></i> Add &amp; Manage Custom Pages</h3>
    <button class="btn btn-g btn-sm" onclick="openMo('moAddPage')"><i class="fas fa-plus"></i> New Page</button></div>
  <div class="cb">
    <p style="font-size:12px;color:var(--g500);margin-bottom:14px">Create custom pages with rich text, spreadsheet, or embedded URL.</p>
    ${customPages.length?`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">${customPages.map(cp=>`
      <div style="display:flex;align-items:center;gap:8px;background:var(--g50);border:1px solid var(--g200);border-radius:var(--r);padding:8px 12px">
        <i class="fas ${cp.icon||'fa-file'}" style="color:var(--p)"></i>
        <span style="font-size:13px">${cp.label}</span>
        <button class="btn btn-p btn-xs" onclick="goCustomPage('${cp.id}')"><i class="fas fa-external-link-alt"></i></button>
        <button class="btn btn-d btn-xs" onclick="deleteCustomPage('${cp.id}')"><i class="fas fa-trash"></i></button>
      </div>`).join('')}</div>`:
      `<p style="font-size:13px;color:var(--g400);margin-bottom:16px">No custom pages yet.</p>`}

    <!-- Add Google Sheet Viewer section -->
    <div style="padding-top:16px;border-top:1px solid var(--g200)">
      <h4 style="font-size:13px;font-weight:600;color:var(--g700);margin-bottom:12px"><i class="fas fa-table" style="color:var(--gn)"></i> Add Google Sheet Viewer</h4>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="fg2" style="min-width:160px"><label>Sheet Name</label><input type="text" class="fi" id="shN" placeholder="e.g. Budget 2568"></div>
        <div class="fg2" style="min-width:220px"><label>Google Sheet URL</label><input type="text" class="fi" id="shU" placeholder="Paste any Google Sheets link…"></div>
        <button class="btn btn-g btn-sm" style="margin-top:22px" onclick="addSheetFromCustomize()"><i class="fas fa-plus"></i> Add</button>
      </div>
      ${sheetPages.length?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${sheetPages.map(s=>`
        <div style="display:flex;align-items:center;gap:8px;background:var(--g50);border:1px solid var(--g200);border-radius:var(--r);padding:8px 12px">
          <i class="fas fa-table" style="color:var(--gn)"></i>
          <span style="font-size:13px">${s.name}</span>
          <button class="btn btn-p btn-xs" onclick="goSheetPage(${s.id})"><i class="fas fa-eye"></i></button>
          <button class="btn btn-d btn-xs" onclick="rmSheet(${s.id})"><i class="fas fa-trash"></i></button>
        </div>`).join('')}</div>`:''}
    </div>
  </div></div>`;
  setTimeout(()=>{const g=document.getElementById('custGrid');if(g&&window.innerWidth<700)g.style.gridTemplateColumns='1fr';},50);
}

function applyMenu(){buildNav();Swal.fire({icon:'success',title:'Menu updated',toast:true,position:'top-end',showConfirmButton:false,timer:1800});}
function applyStats(){Swal.fire({icon:'success',title:'Stats updated — reload Dashboard to see changes',toast:true,position:'top-end',showConfirmButton:false,timer:2200});}

function addCustomPage(){
  const name=v('cpName'),icon=v('cpIcon')||'fa-file',type=v('cpType'),url=v('cpUrl');
  if(!name){Swal.fire({icon:'warning',title:'Please enter a page name'});return;}
  const id='cp'+(cpNid++);
  customPages.push({id,label:name,icon,type,url:type==='iframe'?url:'',content:'',ssData:null,ssLinks:null});
  saveCustom();buildNav();closeMo('moAddPage');
  const custEl=document.getElementById('pg-customize');if(custEl&&custEl.classList.contains('active'))renderCustomize(custEl);
  Swal.fire({icon:'success',title:`Page "${name}" added!`,toast:true,position:'top-end',showConfirmButton:false,timer:2000});
}

async function addSheetFromCustomize(){
  const name=v('shN'),rawUrl=v('shU');
  if(!name||!rawUrl){Swal.fire({icon:'warning',title:'Please enter name and URL'});return;}
  const embedUrl=toEmbedUrl(rawUrl);
  let id=shNid++;
  if(GAS_URL){const res=await gasPost({action:'saveSheet',sheet:{name,rawUrl,embedUrl}});if(res?.id)id=Number(res.id);}
  sheetPages.push({id,name,rawUrl,embedUrl,lastFetch:Date.now()});
  saveSheets();buildNav();
  const sN=document.getElementById('shN');if(sN)sN.value='';
  const sU=document.getElementById('shU');if(sU)sU.value='';
  const custEl=document.getElementById('pg-customize');if(custEl&&custEl.classList.contains('active'))renderCustomize(custEl);
  Swal.fire({icon:'success',title:`Sheet "${name}" saved!`,toast:true,position:'top-end',showConfirmButton:false,timer:1800});
  setTimeout(()=>goSheetPage(id),300);
}

document.getElementById('cpType').addEventListener('change',function(){
  document.getElementById('cpUrlField').style.display=this.value==='iframe'?'block':'none';
});

// ════════════════════════════════════════════════
//  GOOGLE SHEETS VIEWER (native iframe embed)
// ════════════════════════════════════════════════
async function addSheetConfirm(){
  const name=v('shN'),rawUrl=v('shU');
  if(!name||!rawUrl){Swal.fire({icon:'warning',title:'Please enter name and URL'});return;}
  const embedUrl=toEmbedUrl(rawUrl);
  let id=shNid++;
  if(GAS_URL){const res=await gasPost({action:'saveSheet',sheet:{name,rawUrl,embedUrl}});if(res?.id)id=Number(res.id);}
  sheetPages.push({id,name,rawUrl,embedUrl,lastFetch:Date.now()});
  saveSheets();closeMo('moSheet');buildNav();
  setTimeout(()=>goSheetPage(id),100);
}
function toEmbedUrl(url){
  // Try to convert any Google Sheets URL into an embeddable view that preserves
  // native Google Sheets look (colors, formatting, clickable HYPERLINK links).
  const m=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(m){
    const gm=url.match(/[#&?]gid=(\d+)/);
    const gid=gm?gm[1]:'0';
    // /preview keeps the full Google Sheets toolbar-less grid, with colors,
    // formulas, and clickable HYPERLINK cells preserved. widget=true&headers=false
    // hides the chrome and shows only the grid like Google's own embed.
    return `https://docs.google.com/spreadsheets/d/${m[1]}/preview?gid=${gid}&widget=true&headers=true&chrome=false&rm=minimal`;
  }
  return url;
}
let shTimers={};
function renderSheetPage(s,el){
  // Google Sheets embed already streams changes from Google — no need to
  // forcibly reload the iframe (that causes a visible flicker).
  if(shTimers[s.id])clearInterval(shTimers[s.id]);
  el.innerHTML=`<div class="card sheet-fullscreen"><div class="ch">
    <h3><i class="fas fa-table" style="color:var(--gn)"></i> ${s.name}</h3>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--g400)">Live · Updated <strong id="sht-${s.id}">${new Date(s.lastFetch||Date.now()).toLocaleTimeString()}</strong></span>
      <button class="btn btn-g btn-sm" onclick="refreshSh(${s.id})"><i class="fas fa-sync"></i> Refresh</button>
      <a class="btn btn-ol btn-sm" href="${s.rawUrl}" target="_blank"><i class="fas fa-external-link-alt"></i> Open</a>
      ${CU&&CU.role==='admin'?`<button class="btn btn-d btn-sm" onclick="rmSheet(${s.id})"><i class="fas fa-trash"></i> Remove</button>`:''}
    </div>
  </div>
  <div class="cb" style="flex:1;padding:0;overflow:hidden;min-height:0">
    <iframe id="shf-${s.id}" src="${s.embedUrl}" style="width:100%;height:100%;border:none;display:block" allow="clipboard-write"></iframe>
  </div></div>`;
}
function refreshSh(id){
  const s=sheetPages.find(x=>x.id===id);if(!s)return;
  const f=document.getElementById('shf-'+id);
  if(f){const u=new URL(s.embedUrl);u.searchParams.set('_t',Date.now());f.src=u.toString();}
  s.lastFetch=Date.now();
  const t=document.getElementById('sht-'+id);if(t)t.textContent=new Date().toLocaleTimeString();
}
function rmSheet(id){Swal.fire({title:'Remove Sheet?',icon:'warning',showCancelButton:true,confirmButtonText:'Remove',cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'}).then(async r=>{if(r.isConfirmed){sheetPages=sheetPages.filter(x=>x.id!==id);if(shTimers[id]){clearInterval(shTimers[id]);delete shTimers[id];}saveSheets();if(GAS_URL)await gasPost({action:'deleteSheet',id});const old=document.getElementById('shpg-'+id);if(old)old.remove();buildNav();goPage('dash');}});}

// ════════════════════════════════════════════════
//  FILE DRAG & DROP
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',async()=>{
  // restore persisted state
  loadUsers();loadSheets();loadCustom();
  // Sync users + sheets from backend BEFORE login, so any device can sign in
  // with the latest accounts without first logging in as admin.
  if(GAS_URL){
    try{
      const [uRes,sRes]=await Promise.all([fetch(`${GAS_URL}?action=getUsers`),fetch(`${GAS_URL}?action=getSheets`)]);
      const uJ=await uRes.json();const sJ=await sRes.json();
      if(Array.isArray(uJ.users)){
        if(uJ.users.length===0 && DB.users.length){
          // First boot ever: seed backend with local default users
          for(const u of DB.users){
            try{const r=await gasPost({action:'saveUser',user:{u:u.u,p:u.p,name:u.name,dept:u.dept,role:u.role,email:u.email||''}});if(r?.id)u.id=Number(r.id);}catch(_){}
          }
        } else {
          DB.users=uJ.users;
        }
        DB.nid.u=(DB.users.length?Math.max(...DB.users.map(x=>x.id)):0)+1;
        saveUsers();
      }
      if(Array.isArray(sJ.sheets)){sheetPages=sJ.sheets.map(s=>({...s,embedUrl:s.embedUrl||toEmbedUrl(s.rawUrl||''),lastFetch:null}));if(sheetPages.length)shNid=Math.max(...sheetPages.map(x=>x.id))+1;saveSheets();}
    }catch(e){console.warn('initial user/sheet sync failed',e);}
  }
  const sess=lsGet(LS.session);
  if(sess&&sess.u){
    const usr=DB.users.find(x=>x.u===sess.u);
    if(usr){CU=usr;if(GAS_URL)loadFromSheet();else showApp();}
  }

  const dz=document.getElementById('dz'),dzIn=document.getElementById('dzIn');
  if(dz&&dzIn){
    dz.addEventListener('click',()=>dzIn.click());
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');addFiles(e.dataTransfer.files);});
    dzIn.addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});
  }
  document.querySelectorAll('.mo').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeMo(o.id);}));
});
function addFiles(files){
  for(const f of files){
    if(!selFiles.find(x=>x.name===f.name)){
      selFiles.push({name:f.name,type:gType(f.name),size:f.size,url:URL.createObjectURL(f),fileObj:f,existing:false});
    }
  }
  renderFL();
}
function renderFL(){
  const el=document.getElementById('fList');if(!el)return;
  el.innerHTML=selFiles.map((f,i)=>`<div class="fi2">
    ${ficon(f.type)}
    <span class="fn">${f.name}</span>
    <span class="fz">${f.size>0?fmtB(f.size):(f.existing?'✓ saved':'')}</span>
    ${(f.type==='pdf'||f.name.toLowerCase().endsWith('.pdf'))?`<button onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','pdf')" style="background:none;border:none;color:var(--p);cursor:pointer;font-size:11px;padding:2px 7px;border-radius:4px;border:1px solid var(--p)"><i class="fas fa-eye"></i></button>`:''}
    <button class="fdel" onclick="rmFile(${i})"><i class="fas fa-times"></i></button>
  </div>`).join('');
}
function rmFile(i){if(selFiles[i]?.url?.startsWith('blob:'))URL.revokeObjectURL(selFiles[i].url);selFiles.splice(i,1);renderFL();}

// ════════════════════════════════════════════════
//  GAS API helper
// ════════════════════════════════════════════════
async function gasPost(payload){
  if(!GAS_URL)return null;
  try{
    const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return await res.json();
  }catch(e){console.warn('GAS error',e);return null;}
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════
function sbadge(st){const s=SM[st]||SM.head;return`<span class="badge ${s.cls}"><i class="fas ${s.icon}"></i> ${s.label}</span>`;}
function ficon(t){
  const m={pdf:'<i class="fas fa-file-pdf" style="color:#D32F2F;font-size:20px"></i>',
    doc:'<i class="fas fa-file-word" style="color:#1565C0;font-size:20px"></i>',
    docx:'<i class="fas fa-file-word" style="color:#1565C0;font-size:20px"></i>',
    xls:'<i class="fas fa-file-excel" style="color:#2E7D32;font-size:20px"></i>',
    xlsx:'<i class="fas fa-file-excel" style="color:#2E7D32;font-size:20px"></i>',
    ppt:'<i class="fas fa-file-powerpoint" style="color:#F57C00;font-size:20px"></i>',
    pptx:'<i class="fas fa-file-powerpoint" style="color:#F57C00;font-size:20px"></i>',
    img:'<i class="fas fa-image" style="color:#0288D1;font-size:20px"></i>',
    jpg:'<i class="fas fa-image" style="color:#0288D1;font-size:20px"></i>',
    png:'<i class="fas fa-image" style="color:#0288D1;font-size:20px"></i>',
    zip:'<i class="fas fa-file-archive" style="color:#795548;font-size:20px"></i>'};
  return m[(t||'').toLowerCase()]||'<i class="fas fa-file" style="color:#94A3B8;font-size:20px"></i>';
}
function gType(n){const e=(n||'').split('.').pop().toLowerCase();return['jpg','jpeg','png','gif','webp','bmp'].includes(e)?'img':e;}
function fmtB(b){if(!b)return'';const k=1024;const s=['B','KB','MB','GB'];const i=Math.floor(Math.log(b)/Math.log(k));return(b/Math.pow(k,i)).toFixed(1)+' '+s[i];}
function toCE(y){const n=parseInt(y,10)||0;return String(n>2500?n-543:n);}
function toFY(d){if(!d)return String(new Date().getFullYear());return toCE(d.split('-')[0]);}
function fmtDate(d){if(!d)return'-';const p=String(d).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d;}
function openMo(id){document.getElementById(id).classList.add('open');}
function closeMo(id){document.getElementById(id).classList.remove('open');if(id==='moPDF')setTimeout(()=>{const f=document.getElementById('pdfFrame');if(f)f.src='about:blank';},300);}
function showSpin(msg='Loading…'){document.getElementById('spinOv').style.display='flex';document.getElementById('spinTx').textContent=msg;}
function setSpinTx(t){const e=document.getElementById('spinTx');if(e)e.textContent=t;}
function hideSpin(){document.getElementById('spinOv').style.display='none';}
function setUplProg(pct){const b=document.getElementById('uplBar');if(b)b.style.width=pct+'%';if(pct>0&&pct<100){const w=document.getElementById('uplProgress');if(w)w.style.display='block';}else if(pct>=100){setTimeout(()=>{const w=document.getElementById('uplProgress');if(w)w.style.display='none';},800);}}
function fixDG(){const g=document.getElementById('dGrid');if(g)g.style.gridTemplateColumns=window.innerWidth<700?'1fr':'1fr 1fr';}
function toggleSb(){const s=document.getElementById('sb');if(window.innerWidth<=768){s.classList.toggle('mob');mobOv.style.display=s.classList.contains('mob')?'block':'none';}else{s.classList.toggle('collapsed');document.getElementById('mainW').classList.toggle('exp');}}
function closeMobSb(){document.getElementById('sb').classList.remove('mob');mobOv.style.display='none';}
window.addEventListener('resize',fixDG);
const mobOv=document.createElement('div');
mobOv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99;display:none';
mobOv.addEventListener('click',closeMobSb);
document.body.appendChild(mobOv);

// ════════════════════════════════════════════════
//  AOC TRACKING
// ════════════════════════════════════════════════
let aocList=[], eAocId=null, _aocDocTarget=null;
const AOC_PHASES=[
  {key:'pre',   label:'Pre-Application Phase',        icon:'fa-clipboard-list', color:'#1565C0'},
  {key:'form',  label:'Formal Application Phase',     icon:'fa-file-signature', color:'#6A1B9A'},
  {key:'eval',  label:'Document Evaluation Phase',    icon:'fa-file-alt',       color:'#EF6C00'},
  {key:'demo',  label:'Demonstration & Evaluation',   icon:'fa-clipboard-check',color:'#00838F'},
  {key:'cert',  label:'Certification Phase',          icon:'fa-award',          color:'#2E7D32'},
];
async function loadAoc(){
  if(!GAS_URL)return;
  try{const r=await fetch(`${GAS_URL}?action=getAoc`);const j=await r.json();if(Array.isArray(j.aoc))aocList=j.aoc;}catch(e){console.warn('aoc load',e);}
}
let _aocView={mode:'list'};
function renderAoc(el){
  _aocView={mode:'list'};
  el.innerHTML=`<div class="card"><div class="ch" id="aocHead">
    <h3><i class="fas fa-plane-departure" style="color:var(--p)"></i> AOC Tracking</h3>
    <button class="btn btn-p btn-sm" onclick="openAddAoc()"><i class="fas fa-plus"></i> Add Company</button>
  </div><div class="cb" id="aocBody"></div></div>`;
  loadAoc().then(()=>refAoc());
}
function refAoc(){
  if(_aocView.mode==='company')return _renderAocCompany(_aocView.id);
  if(_aocView.mode==='phase')return _renderAocPhase(_aocView.id,_aocView.key);
  _renderAocList();
}
function _renderAocList(){
  const head=document.getElementById('aocHead');
  if(head)head.innerHTML=`<h3><i class="fas fa-plane-departure" style="color:var(--p)"></i> AOC Tracking</h3>
    <button class="btn btn-p btn-sm" onclick="openAddAoc()"><i class="fas fa-plus"></i> Add Company</button>`;
  const body=document.getElementById('aocBody');if(!body)return;
  if(!aocList.length){body.innerHTML=`<div class="empty"><i class="fas fa-plane-departure"></i><p>No companies yet — click "Add Company" to start.</p></div>`;return;}
  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">`+aocList.map(a=>{
    const done=AOC_PHASES.filter(p=>a.phases?.[p.key]?.done).length;
    const pct=Math.round(done/AOC_PHASES.length*100);
    return `<div style="border:1px solid var(--g200);border-radius:12px;padding:16px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.05);display:flex;flex-direction:column;gap:10px">
      <div style="cursor:pointer" onclick="showAocCompany(${a.id})">
        <div style="font-size:15px;font-weight:700;color:var(--g900)"><i class="fas fa-plane-departure" style="color:var(--p);margin-right:6px"></i>${escHtml(a.name)}</div>
        <div style="font-size:12px;color:var(--g500);margin-top:2px">${escHtml(a.operator||'')} ${a.contact?'· '+escHtml(a.contact):''}</div>
      </div>
      <div style="background:var(--g100);border-radius:10px;height:8px;overflow:hidden"><div style="background:var(--gn);height:100%;width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--g600)">
        <span class="badge bp">${done}/${AOC_PHASES.length} phases</span>
        <span>${pct}%</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-p btn-sm" style="flex:1" onclick="showAocCompany(${a.id})"><i class="fas fa-eye"></i> Open</button>
        <button class="btn btn-ol btn-sm" onclick="openEditAoc(${a.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-d btn-sm" onclick="delAoc(${a.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('')+`</div>`;
}
function showAocCompany(id){_aocView={mode:'company',id};_renderAocCompany(id);}
function showAocPhase(id,key){_aocView={mode:'phase',id,key};_renderAocPhase(id,key);}
function backToAocList(){_aocView={mode:'list'};_renderAocList();}
function backToAocCompany(){_aocView={mode:'company',id:_aocView.id};_renderAocCompany(_aocView.id);}
// Legacy aliases (in case older UI refers to them)
function openAocWindow(id){showAocCompany(id);}
function openAocPhaseWindow(id,key){showAocPhase(id,key);}

function _renderAocCompany(id){
  const a=aocList.find(x=>x.id===id);if(!a){backToAocList();return;}
  const head=document.getElementById('aocHead');
  if(head)head.innerHTML=`<h3><button class="btn btn-ol btn-sm" onclick="backToAocList()" style="margin-right:8px"><i class="fas fa-arrow-left"></i> Back</button>
    <i class="fas fa-plane-departure" style="color:var(--p)"></i> ${escHtml(a.name)}</h3>
    <button class="btn btn-ol btn-sm" onclick="openEditAoc(${a.id})"><i class="fas fa-edit"></i> Edit Company</button>`;
  const body=document.getElementById('aocBody');if(!body)return;
  const phaseCards=AOC_PHASES.map(p=>{
    const ph=a.phases?.[p.key]||{};
    const fileCount=(ph.files||[]).length+(ph.docIds||[]).length;
    const noteCount=(ph.notes||[]).length;
    return `<div onclick="showAocPhase(${id},'${p.key}')" style="cursor:pointer;border-radius:14px;padding:20px;color:#fff;background:linear-gradient(135deg,${p.color},${p.color}dd);box-shadow:0 6px 18px ${p.color}55;transition:transform .2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <i class="fas ${p.icon}" style="font-size:32px;opacity:.85"></i>
        <span style="background:rgba(255,255,255,.25);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${ph.done?'COMPLETED':'PENDING'}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-top:12px;line-height:1.25">${p.label}</div>
      <div style="display:flex;gap:12px;margin-top:10px;font-size:11.5px;opacity:.9">
        <span><i class="fas fa-paperclip"></i> ${fileCount} files</span>
        <span><i class="fas fa-sticky-note"></i> ${noteCount} notes</span>
      </div>
      <div style="margin-top:10px;font-size:11px;opacity:.85"><i class="fas fa-hand-pointer"></i> Click to open phase</div>
    </div>`;
  }).join('');
  body.innerHTML=`
    <div style="background:linear-gradient(135deg,#1565C0,#4A2C6D);color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="font-size:20px;font-weight:700"><i class="fas fa-plane-departure"></i> ${escHtml(a.name)}</div>
      <div style="opacity:.9;font-size:13px;margin-top:4px">${escHtml(a.operator||'')} ${a.contact?'· '+escHtml(a.contact):''}</div>
      ${a.note?`<div style="opacity:.85;font-size:12.5px;margin-top:6px"><i class="fas fa-sticky-note"></i> ${escHtml(a.note)}</div>`:''}
    </div>
    <h4 style="margin:0 0 12px;font-size:14px;color:var(--g600);text-transform:uppercase;letter-spacing:.5px">Phases</h4>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">${phaseCards}</div>`;
}

function _renderAocPhase(id,key){
  const a=aocList.find(x=>x.id===id);if(!a){backToAocList();return;}
  const p=AOC_PHASES.find(x=>x.key===key);if(!p){backToAocCompany();return;}
  const ph=a.phases?.[key]||{};
  const head=document.getElementById('aocHead');
  if(head)head.innerHTML=`<h3><button class="btn btn-ol btn-sm" onclick="backToAocCompany()" style="margin-right:8px"><i class="fas fa-arrow-left"></i> Back</button>
    <i class="fas ${p.icon}" style="color:${p.color}"></i> ${p.label}</h3>
    <span class="badge ${ph.done?'bg':'bo'}">${ph.done?'COMPLETED':'PENDING'}</span>`;
  const body=document.getElementById('aocBody');if(!body)return;
  const files=(ph.files||[]);
  const filesHtml=files.length?files.map((f,i)=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${escHtml(f.name)}','${encodeURIComponent(f.url||'')}','${f.type||gType(f.name)}')">${ficon(f.type||gType(f.name))}<span class="fn" style="max-width:220px">${escHtml(f.name)}</span><button onclick="event.stopPropagation();aocRemoveFile(${id},'${key}',${i})" style="background:none;border:none;color:var(--rd);cursor:pointer"><i class="fas fa-times"></i></button></div>`).join(''):'<div style="color:var(--g400);font-size:12px">No files yet.</div>';
  const docs=(ph.docIds||[]);
  const docsHtml=docs.length?docs.map(did=>{const d=DB.docs.find(x=>x.id===did);return d?`<div style="padding:8px 12px;background:#f8fafc;border-left:3px solid ${p.color};border-radius:6px;margin-bottom:6px;display:flex;gap:8px;align-items:center"><div style="flex:1"><code style="font-size:11px;color:var(--g600)">${escHtml(d.fsdNo||'')}</code> — <strong>${escHtml(d.subject||'')}</strong></div><button class="btn btn-d btn-xs" onclick="aocRemovePhaseDoc(${id},'${key}',${did})"><i class="fas fa-times"></i></button></div>`:'';}).join(''):'<div style="color:var(--g400);font-size:12px">No attached documents.</div>';
  const notes=(ph.notes||[]).slice().reverse();
  const notesHtml=notes.length?notes.map(n=>`<div style="padding:10px 12px;background:#fff;border-left:3px solid ${p.color};border-radius:6px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,.04)"><div style="white-space:pre-wrap;font-size:13px">${escHtml(n.text||'')}</div><div style="font-size:11px;color:var(--g500);margin-top:4px"><i class="far fa-clock"></i> ${n.at?new Date(n.at).toLocaleString('en-GB'):''}${n.by?' · '+escHtml(n.by):''}</div></div>`).join(''):'<div style="color:var(--g400);font-size:12px">No notes yet.</div>';
  body.innerHTML=`
    <div style="background:linear-gradient(135deg,${p.color},${p.color}cc);color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="font-size:20px;font-weight:700"><i class="fas ${p.icon}"></i> ${p.label}</div>
      <div style="opacity:.9;font-size:13px;margin-top:4px">${escHtml(a.name)}</div>
      <label style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:rgba(255,255,255,.2);padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12.5px">
        <input type="checkbox" ${ph.done?'checked':''} onchange="aocToggleDone(${id},'${key}',this.checked)"> Mark as completed
      </label>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:14px">
      <div style="background:#fff;border:1px solid var(--g200);border-radius:12px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h4 style="margin:0;font-size:13px;color:var(--g700)"><i class="fas fa-paperclip" style="color:${p.color}"></i> Attached Files (${files.length})</h4>
          <label class="btn btn-p btn-sm" style="cursor:pointer;margin:0"><i class="fas fa-upload"></i> Upload
            <input type="file" multiple style="display:none" onchange="aocUploadFiles(${id},'${key}',this.files,this)">
          </label>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${filesHtml}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--g200);border-radius:12px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h4 style="margin:0;font-size:13px;color:var(--g700)"><i class="fas fa-file-alt" style="color:${p.color}"></i> Attached Documents (${docs.length})</h4>
          <button class="btn btn-ol btn-sm" onclick="openAocDocSearch(${id},'${key}')"><i class="fas fa-plus"></i> Attach Document</button>
        </div>
        ${docsHtml}
      </div>
      <div style="background:#fff;border:1px solid var(--g200);border-radius:12px;padding:16px 18px">
        <h4 style="margin:0 0 10px;font-size:13px;color:var(--g700)"><i class="fas fa-edit" style="color:${p.color}"></i> Add Note</h4>
        <textarea id="aocPn-${id}-${key}" rows="3" placeholder="Notes for this phase..." style="width:100%;padding:8px 10px;border:1px solid var(--g200);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical"></textarea>
        <div style="text-align:right;margin-top:8px"><button class="btn btn-p btn-sm" onclick="aocSavePhaseNote(${id},'${key}')"><i class="fas fa-save"></i> Save to Note History</button></div>
      </div>
      <div style="background:#fff;border:1px solid var(--g200);border-radius:12px;padding:16px 18px">
        <h4 style="margin:0 0 10px;font-size:13px;color:var(--g700)"><i class="fas fa-history" style="color:${p.color}"></i> Note History (${(ph.notes||[]).length})</h4>
        ${notesHtml}
      </div>
    </div>`;
}
function openAddAoc(){eAocId=null;document.getElementById('moAocT').textContent='Add Company';['aName','aOperator','aContact','aNote'].forEach(id=>document.getElementById(id).value='');openMo('moAoc');}
function openEditAoc(id){const a=aocList.find(x=>x.id===id);if(!a)return;eAocId=id;document.getElementById('moAocT').textContent='Edit Company';document.getElementById('aName').value=a.name||'';document.getElementById('aOperator').value=a.operator||'';document.getElementById('aContact').value=a.contact||'';document.getElementById('aNote').value=a.note||'';openMo('moAoc');}
async function saveAocCompany(){
  const name=v('aName').trim();if(!name){Swal.fire({icon:'warning',title:'Company name required'});return;}
  const payload={name,operator:v('aOperator').trim(),contact:v('aContact').trim(),note:v('aNote').trim()};
  if(eAocId){const a=aocList.find(x=>x.id===eAocId);if(a){Object.assign(a,payload);await gasPost({action:'saveAoc',aoc:{id:eAocId,...a}});}}
  else {const res=await gasPost({action:'saveAoc',aoc:{...payload,phases:{},files:[],docIds:[]}});const id=res?.id||Date.now();aocList.push({id:Number(id),...payload,phases:{},files:[],docIds:[]});}
  closeMo('moAoc');refAoc();Swal.fire({icon:'success',title:'Saved',toast:true,position:'top-end',showConfirmButton:false,timer:1200});
}
async function delAoc(id){const r=await Swal.fire({title:'Delete company?',icon:'warning',showCancelButton:true,confirmButtonColor:'var(--rd)'});if(!r.isConfirmed)return;await gasPost({action:'deleteAoc',id});aocList=aocList.filter(x=>x.id!==id);refAoc();}
async function aocPersist(a){await gasPost({action:'saveAoc',aoc:a});}
function aocToggleDone(id,key,val){const a=aocList.find(x=>x.id===id);if(!a)return;if(!a.phases)a.phases={};if(!a.phases[key])a.phases[key]={};a.phases[key].done=val;aocPersist(a);refAoc();}
function aocSetPhaseNote(id,key,note){const a=aocList.find(x=>x.id===id);if(!a)return;if(!a.phases)a.phases={};if(!a.phases[key])a.phases[key]={};a.phases[key].note=note;aocPersist(a);}
async function aocUploadFiles(id,key,files,inp){
  const a=aocList.find(x=>x.id===id);if(!a)return;
  if(!a.phases)a.phases={};if(!a.phases[key])a.phases[key]={};if(!Array.isArray(a.phases[key].files))a.phases[key].files=[];
  showSpin('Uploading to Google Drive...');
  for(const f of files){
    try{
      const b64=await fileToB64(f);
      const r=await gasPost({action:'uploadFile',fileName:f.name,mimeType:f.type||'application/octet-stream',fileData:b64,folder:'aoc'});
      if(r&&r.id)a.phases[key].files.push({name:f.name,type:gType(f.name),url:r.viewUrl,previewUrl:r.previewUrl});
      else Swal.fire({icon:'error',title:'Upload failed',text:r?.error||'Unknown error'});
    }catch(e){console.warn(e);}
  }
  hideSpin();inp.value='';aocPersist(a);refAoc();
}
function aocRemoveFile(id,key,idx){const a=aocList.find(x=>x.id===id);if(!a||!a.phases?.[key]?.files)return;a.phases[key].files.splice(idx,1);aocPersist(a);refAoc();}
function aocRemoveDoc(id,did){const a=aocList.find(x=>x.id===id);if(!a)return;a.docIds=(a.docIds||[]).filter(x=>x!==did);aocPersist(a);refAoc();}
function aocRemovePhaseDoc(id,key,did){const a=aocList.find(x=>x.id===id);if(!a?.phases?.[key])return;a.phases[key].docIds=(a.phases[key].docIds||[]).filter(x=>x!==did);aocPersist(a);refAoc();}
function aocSavePhaseNote(id,key){
  const a=aocList.find(x=>x.id===id);if(!a)return;
  const ta=document.getElementById(`aocPn-${id}-${key}`);if(!ta)return;
  const text=(ta.value||'').trim();if(!text){Swal.fire({icon:'info',title:'Note is empty',toast:true,position:'top-end',showConfirmButton:false,timer:1200});return;}
  if(!a.phases)a.phases={};if(!a.phases[key])a.phases[key]={};
  if(!Array.isArray(a.phases[key].notes))a.phases[key].notes=[];
  a.phases[key].notes.push({text,at:Date.now(),by:CU?.name||CU?.u||''});
  a.phases[key].note='';
  aocPersist(a);refAoc();
  Swal.fire({icon:'success',title:'Note saved',toast:true,position:'top-end',showConfirmButton:false,timer:1200});
}
function openAocDocSearch(aocId,phaseKey){_aocDocTarget={aocId,phaseKey};document.getElementById('aocDocSrch').value='';refAocDocSearch();openMo('moAocDoc');}
function refAocDocSearch(){
  const q=(v('aocDocSrch')||'').toLowerCase();
  const tb=document.getElementById('aocDocTb');if(!tb)return;
  const rows=DB.docs.filter(d=>!q||[d.docNo,d.fsdNo,d.dcalNo,d.subject].some(x=>(x||'').toLowerCase().includes(q))).slice(0,50);
  tb.innerHTML=rows.map(d=>`<tr>
    <td><code style="font-size:11px">${d.docNo||'-'}</code></td>
    <td><code style="font-size:11px">${d.fsdNo}</code></td>
    <td style="font-size:12.5px">${escHtml(d.subject)}</td>
    <td><button class="btn btn-p btn-sm" onclick="aocAttachDoc(${d.id})"><i class="fas fa-plus"></i></button></td>
  </tr>`).join('')||`<tr><td colspan="4"><div class="empty" style="padding:16px"><p>No matches</p></div></td></tr>`;
}
function aocAttachDoc(did){
  const t=_aocDocTarget;if(!t)return;
  const aocId=typeof t==='object'?t.aocId:t;
  const phaseKey=typeof t==='object'?t.phaseKey:null;
  const a=aocList.find(x=>x.id===aocId);if(!a)return;
  if(phaseKey){
    if(!a.phases)a.phases={};if(!a.phases[phaseKey])a.phases[phaseKey]={};
    if(!Array.isArray(a.phases[phaseKey].docIds))a.phases[phaseKey].docIds=[];
    if(!a.phases[phaseKey].docIds.includes(did))a.phases[phaseKey].docIds.push(did);
  } else {
    if(!Array.isArray(a.docIds))a.docIds=[];
    if(!a.docIds.includes(did))a.docIds.push(did);
  }
  aocPersist(a);closeMo('moAocDoc');refAoc();
  Swal.fire({icon:'success',title:'Document attached',toast:true,position:'top-end',showConfirmButton:false,timer:1200});
}
function fileToB64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=rej;r.readAsDataURL(f);});}

// ════════════════════════════════════════════════
//  HR MANAGEMENT
// ════════════════════════════════════════════════
let hrList=[], eHrId=null, _hrPhoto='';
async function loadHr(){if(!GAS_URL)return;try{const r=await fetch(`${GAS_URL}?action=getHr`);const j=await r.json();if(Array.isArray(j.hr))hrList=j.hr;}catch(e){console.warn('hr load',e);}}
function renderHr(el){
  el.innerHTML=`<div class="card"><div class="ch">
    <h3><i class="fas fa-id-badge" style="color:var(--p)"></i> HR Management Dashboard</h3>
    <button class="btn btn-p btn-sm" onclick="openAddHr()"><i class="fas fa-user-plus"></i> Add Employee</button>
  </div><div class="cb" id="hrBody"></div></div>`;
  loadHr().then(()=>refHr());
}
let _hrListOpen=false;
function toggleHrList(){_hrListOpen=!_hrListOpen;refHr();}
function _empDeptGroup(h){
  const p=((h.position||'')+' '+(h.department||'')).toUpperCase();
  if(/PEL/.test(p))return 'PEL';
  if(/OPS|OPERATION/.test(p))return 'OPS';
  if(/AIR|AIRWORTH/.test(p))return 'AIR';
  return 'OTHER';
}
function _isHead(h){return /HEAD|CHIEF|DIRECTOR/i.test(h.position||'')&&!/DEPUTY|VICE|ACTING/i.test(h.position||'');}
function _isDeputy(h){return /DEPUTY|VICE|ACTING HEAD/i.test(h.position||'');}
function refHr(){
  const body=document.getElementById('hrBody');if(!body)return;
  const total=hrList.length;
  const gov=hrList.filter(h=>(h.empType||'gov')==='gov').length;
  const con=hrList.filter(h=>h.empType==='contract').length;
  const listRows=hrList.map(h=>{
    const av=h.photo?`<img src="${h.photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`:`<div style="width:36px;height:36px;border-radius:50%;background:var(--g100);color:var(--g600);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">${initials(h.name)}</div>`;
    const typeBadge=h.empType==='contract'?'<span class="badge bo" style="font-size:10px">Contract</span>':'<span class="badge bg" style="font-size:10px">Gov</span>';
    return `<div onclick="openHrDetail(${h.id})" style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--g100);cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--g50)'" onmouseout="this.style.background=''">
      ${av}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${escHtml(h.name)}</div>
        <div style="font-size:11.5px;color:var(--g500)">${escHtml(h.position||'')}${h.department?' · '+escHtml(h.department):''}</div>
      </div>
      ${typeBadge}
      <i class="fas fa-chevron-right" style="color:var(--g400);font-size:11px"></i>
    </div>`;
  }).join('');

  // groups for org structure
  const heads=hrList.filter(_isHead);
  const deputies=hrList.filter(_isDeputy);
  const pel=hrList.filter(h=>_empDeptGroup(h)==='PEL'&&!_isHead(h)&&!_isDeputy(h));
  const ops=hrList.filter(h=>_empDeptGroup(h)==='OPS'&&!_isHead(h)&&!_isDeputy(h));
  const air=hrList.filter(h=>_empDeptGroup(h)==='AIR'&&!_isHead(h)&&!_isDeputy(h));

  const nodeSm=(h)=>{const av=h.photo?`<img src="${h.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`:`<div style="width:34px;height:34px;border-radius:50%;background:var(--g100);color:var(--g600);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">${initials(h.name)}</div>`;
    return `<div onclick="openHrDetail(${h.id})" style="display:flex;gap:8px;align-items:center;padding:6px 8px;border:1px solid var(--g200);border-radius:6px;background:#fff;cursor:pointer;margin-bottom:4px">${av}<div style="min-width:0;flex:1"><div style="font-size:12px;font-weight:600;line-height:1.15">${escHtml(h.name)}</div><div style="font-size:10.5px;color:var(--g500);line-height:1.15">${escHtml(h.position||'')}</div></div></div>`;};
  const nodeLg=(h)=>{const av=h.photo?`<img src="${h.photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--p)">`:`<div style="width:72px;height:72px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;border:3px solid var(--p)">${initials(h.name)}</div>`;
    return `<div onclick="openHrDetail(${h.id})" style="text-align:center;cursor:pointer;padding:10px;border:2px solid var(--p);border-radius:10px;background:linear-gradient(135deg,#fff,#f0f7ff)">${av}<div style="font-size:14px;font-weight:700;margin-top:8px">${escHtml(h.name)}</div><div style="font-size:11.5px;color:var(--g600)">${escHtml(h.position||'')}</div></div>`;};

  body.innerHTML=`
    <!-- Stat Boxes -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px">
      <div onclick="openHrListWindow('all')" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;padding:18px;border-radius:12px;cursor:pointer;box-shadow:0 6px 18px rgba(59,130,246,.25)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.5px">Total Employees</div>
          <div style="font-size:36px;font-weight:800;line-height:1">${total}</div></div>
          <i class="fas fa-users" style="font-size:34px;opacity:.4"></i>
        </div>
        <div style="font-size:11px;margin-top:8px;opacity:.85"><i class="fas fa-external-link-alt"></i> Click to open list</div>
      </div>
      <div onclick="openHrListWindow('gov')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:18px;border-radius:12px;cursor:pointer;box-shadow:0 6px 18px rgba(16,185,129,.25)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.5px">Government Officials</div>
          <div style="font-size:36px;font-weight:800;line-height:1">${gov}</div></div>
          <i class="fas fa-user-tie" style="font-size:34px;opacity:.4"></i>
        </div>
        <div style="font-size:11px;margin-top:8px;opacity:.85"><i class="fas fa-external-link-alt"></i> Click to open list</div>
      </div>
      <div onclick="openHrListWindow('contract')" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:18px;border-radius:12px;cursor:pointer;box-shadow:0 6px 18px rgba(245,158,11,.25)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.5px">Contract Staff</div>
          <div style="font-size:36px;font-weight:800;line-height:1">${con}</div></div>
          <i class="fas fa-file-signature" style="font-size:34px;opacity:.4"></i>
        </div>
        <div style="font-size:11px;margin-top:8px;opacity:.85"><i class="fas fa-external-link-alt"></i> Click to open list</div>
      </div>
    </div>

    <!-- Chart + Org Structure -->
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px" id="hrGridWrap">
      <div class="card"><div class="ch"><h3><i class="fas fa-chart-pie" style="color:var(--pu)"></i> Employee Overview</h3></div>
        <div class="cb"><div class="cw"><canvas id="hrChart"></canvas></div></div>
      </div>
      <div style="border:1px solid var(--g200);border-radius:10px;background:#fff;padding:16px;max-height:640px;overflow:auto">
        <h4 style="margin:0 0 12px 0;font-size:14px;color:var(--g700)"><i class="fas fa-sitemap" style="color:var(--p)"></i> Department Structure</h4>
        ${heads.length?`<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px">${heads.map(nodeLg).join('')}</div>`:'<div style="color:var(--g400);font-size:12px;margin-bottom:12px">No Head assigned</div>'}
        <div style="font-size:11px;color:var(--g500);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:8px 0 6px"><i class="fas fa-user-shield"></i> Deputies (${deputies.length})</div>
        <div style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px">${deputies.length?deputies.map(nodeDeputy).join(''):'<div style="color:var(--g400);font-size:12px">None</div>'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div><div style="text-align:center;background:#dbeafe;color:#1e40af;padding:5px;border-radius:6px;font-weight:700;font-size:11px;margin-bottom:6px">PEL (${pel.length})</div>${pel.map(nodeSm).join('')||'<div style="color:var(--g400);font-size:11px;text-align:center">—</div>'}</div>
          <div><div style="text-align:center;background:#dcfce7;color:#166534;padding:5px;border-radius:6px;font-weight:700;font-size:11px;margin-bottom:6px">OPS (${ops.length})</div>${ops.map(nodeSm).join('')||'<div style="color:var(--g400);font-size:11px;text-align:center">—</div>'}</div>
          <div><div style="text-align:center;background:#fef3c7;color:#92400e;padding:5px;border-radius:6px;font-weight:700;font-size:11px;margin-bottom:6px">AIR (${air.length})</div>${air.map(nodeSm).join('')||'<div style="color:var(--g400);font-size:11px;text-align:center">—</div>'}</div>
        </div>
      </div>
    </div>`;
  // Draw doughnut chart (Status Distribution style)
  setTimeout(()=>{
    const cv=document.getElementById('hrChart');if(!cv||typeof Chart==='undefined')return;
    if(window._hrChart)window._hrChart.destroy();
    const pelAll=hrList.filter(h=>_empDeptGroup(h)==='PEL').length;
    const opsAll=hrList.filter(h=>_empDeptGroup(h)==='OPS').length;
    const airAll=hrList.filter(h=>_empDeptGroup(h)==='AIR').length;
    const other=Math.max(0,total-pelAll-opsAll-airAll);
    window._hrChart=new Chart(cv.getContext('2d'),{type:'doughnut',
      data:{labels:['Government','Contract','PEL','OPS','AIR','Other'],
        datasets:[{data:[gov,con,pelAll,opsAll,airAll,other],
          backgroundColor:['#10b981','#f59e0b','#1565C0','#2E7D32','#7B1FA2','#94A3B8'],borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{font:{family:'Kanit',size:11},padding:8}}}}});
  },50);
}
function nodeDeputy(h){
  const av=h.photo?`<img src="${h.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--p)">`:`<div style="width:56px;height:56px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700">${initials(h.name)}</div>`;
  return `<div onclick="openHrDetail(${h.id})" style="min-width:110px;text-align:center;cursor:pointer;padding:8px;border:1px solid var(--g200);border-radius:8px;background:#fff;flex-shrink:0">${av}<div style="font-size:11.5px;font-weight:600;margin-top:6px;line-height:1.2">${escHtml(h.name)}</div><div style="font-size:10px;color:var(--g500);margin-top:2px;line-height:1.15">${escHtml(h.position||'')}</div></div>`;
}
function openHrListWindow(kind){
  let list=hrList;let title='All Employees';
  if(kind==='gov'){list=hrList.filter(h=>(h.empType||'gov')==='gov');title='Government Officials';}
  else if(kind==='contract'){list=hrList.filter(h=>h.empType==='contract');title='Contract Staff';}
  const rows=list.map(h=>{
    const av=h.photo?`<img src="${h.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">`:`<div style="width:44px;height:44px;border-radius:50%;background:#e2e8f0;color:#334155;display:flex;align-items:center;justify-content:center;font-weight:600">${initials(h.name)}</div>`;
    const type=h.empType==='contract'?'Contract':'Government';
    return `<tr><td style="width:60px">${av}</td><td><strong>${escHtml(h.name)}</strong><div style="font-size:11.5px;color:#64748b">${escHtml(h.position||'')}${h.department?' · '+escHtml(h.department):''}</div></td><td>${escHtml(h.employeeId||'—')}</td><td>${type}</td><td>${escHtml(h.branch||'')}</td><td>${escHtml(h.phone||'')}</td><td>${escHtml(h.email||'')}</td></tr>`;
  }).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8">No employees</td></tr>';
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${title} — FSD</title>
<style>body{font-family:'Kanit',-apple-system,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
.hd{background:linear-gradient(135deg,#1565C0,#4A2C6D);color:#fff;padding:18px 24px}
.hd h1{margin:0;font-size:20px}.hd p{margin:4px 0 0;opacity:.85;font-size:12px}
.wrap{padding:20px 24px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}
th{background:#f1f5f9;text-align:left;padding:10px 12px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:middle}
tr:hover td{background:#f8fafc}</style></head><body>
<div class="hd"><h1><i></i>${title}</h1><p>${list.length} employee(s)</p></div>
<div class="wrap"><table><thead><tr><th></th><th>Name / Position</th><th>Employee ID</th><th>Type</th><th>Branch</th><th>Phone</th><th>Email</th></tr></thead><tbody>${rows}</tbody></table></div>
</body></html>`;
  const w=window.open('','_blank');if(!w){Swal.fire({icon:'warning',title:'Popup blocked',text:'Please allow popups.'});return;}
  w.document.open();w.document.write(html);w.document.close();
}
function clearHrPhoto(){_hrPhoto='';const p=document.getElementById('hPhoto');if(p)p.value='';const r=document.getElementById('hPhotoRow');if(r)r.style.display='none';}
function setHrPhotoPreview(d){_hrPhoto=d||'';const row=document.getElementById('hPhotoRow');if(!d){if(row)row.style.display='none';return;}document.getElementById('hPhotoPrev').src=d;row.style.display='';}
function onHrPhoto(e){const f=e.target.files&&e.target.files[0];if(!f)return;resizeImageToDataUrl(f,256).then(setHrPhotoPreview);}
function _yearsBetween(iso){if(!iso)return '';const b=new Date(iso);if(isNaN(b))return '';const n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m===0&&n.getDate()<b.getDate()))a--;return a>=0?a+' years':'';}
function hrCalcAge(){document.getElementById('hAge').value=_yearsBetween(v('hBirth'));}
function hrCalcTenure(){document.getElementById('hTenure').value=_yearsBetween(v('hStart'));}
let _hrCertFiles=[];
function renderHrCertList(){
  const box=document.getElementById('hCertList');if(!box)return;
  box.innerHTML=_hrCertFiles.map((f,i)=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${escHtml(f.name)}','${encodeURIComponent(f.url||'')}','pdf')">${ficon('pdf')}<span class="fn" style="max-width:180px">${escHtml(f.name)}</span><button onclick="event.stopPropagation();_hrCertFiles.splice(${i},1);renderHrCertList()" style="background:none;border:none;color:var(--rd);cursor:pointer"><i class="fas fa-times"></i></button></div>`).join('');
}
async function onHrCert(e){
  const files=Array.from(e.target.files||[]);e.target.value='';
  if(!files.length)return;
  showSpin('Uploading certificate(s)...');
  for(const f of files){
    try{const b64=await fileToB64(f);const r=await gasPost({action:'uploadFile',fileName:f.name,mimeType:f.type||'application/pdf',fileData:b64,folder:'hr'});
      if(r&&r.id)_hrCertFiles.push({name:f.name,url:r.viewUrl,previewUrl:r.previewUrl});
      else Swal.fire({icon:'error',title:'Upload failed',text:r?.error||'Unknown error'});
    }catch(err){console.warn(err);}
  }
  hideSpin();renderHrCertList();
}
function openAddHr(){
  eHrId=null;_hrCertFiles=[];
  document.getElementById('moHrT').textContent='Add Employee';
  ['hFirst','hLast','hPos','hDept','hBirth','hAge','hPhone','hEmail','hAddr','hStart','hTenure','hEduLvl','hEduYear','hBio','hName','hEmpId','hBranch'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const et=document.getElementById('hEmpType');if(et)et.value='gov';
  const st=document.getElementById('hStatus');if(st)st.value='active';
  clearHrPhoto();renderHrCertList();const _m=document.getElementById('moHr');if(_m)_m.style.zIndex='2000';openMo('moHr');
}
function openEditHr(id){
  const h=hrList.find(x=>x.id===id);if(!h)return;
  eHrId=id;
  document.getElementById('moHrT').textContent='Edit Employee';
  const fn=h.firstName||((h.name||'').split(' ')[0]||'');
  const ln=h.lastName||((h.name||'').split(' ').slice(1).join(' ')||'');
  document.getElementById('hFirst').value=fn;
  document.getElementById('hLast').value=ln;
  document.getElementById('hPos').value=h.position||'';
  document.getElementById('hDept').value=h.department||'';
  document.getElementById('hBirth').value=h.birthDate||'';
  document.getElementById('hPhone').value=h.phone||'';
  document.getElementById('hEmail').value=h.email||'';
  document.getElementById('hAddr').value=h.address||'';
  document.getElementById('hStart').value=h.startDate||'';
  const edu=(Array.isArray(h.education)&&h.education[0])||{};
  document.getElementById('hEduLvl').value=edu.level||'';
  document.getElementById('hEduYear').value=edu.year||'';
  document.getElementById('hBio').value=h.bio||'';
  document.getElementById('hName').value=h.name||'';
  const et=document.getElementById('hEmpType');if(et)et.value=h.empType||'gov';
  const eid=document.getElementById('hEmpId');if(eid)eid.value=h.employeeId||'';
  const br=document.getElementById('hBranch');if(br)br.value=h.branch||'';
  const st=document.getElementById('hStatus');if(st)st.value=h.status||'active';
  _hrCertFiles=Array.isArray(h.certFiles)?[...h.certFiles]:[];
  hrCalcAge();hrCalcTenure();renderHrCertList();
  if(h.photo)setHrPhotoPreview(h.photo);else clearHrPhoto();
  const _m=document.getElementById('moHr');if(_m)_m.style.zIndex='2000';
  openMo('moHr');
}
async function saveHrEmployee(){
  const fn=v('hFirst').trim();const ln=v('hLast').trim();
  if(!fn){Swal.fire({icon:'warning',title:'First name required'});return;}
  const name=(fn+' '+ln).trim();
  const eduLvl=v('hEduLvl').trim();const eduYear=v('hEduYear').trim();
  const education=(eduLvl||eduYear)?[{level:eduLvl,year:eduYear}]:[];
  const existing=eHrId?hrList.find(x=>x.id===eHrId):null;
  const payload={
    name,firstName:fn,lastName:ln,
    position:v('hPos').trim(),department:v('hDept').trim(),
    birthDate:v('hBirth')||'',address:v('hAddr').trim(),
    startDate:v('hStart')||'',
    email:v('hEmail').trim(),phone:v('hPhone').trim(),
    bio:v('hBio').trim(),photo:_hrPhoto||'',
    education,certFiles:_hrCertFiles,
    workHistory:existing?.workHistory||[],
    courses:existing?.courses||[],
    empType:v('hEmpType')||'gov',
    employeeId:v('hEmpId').trim(),
    branch:v('hBranch').trim(),
    status:v('hStatus')||'active',
  };
  if(eHrId){if(existing){Object.assign(existing,payload);await gasPost({action:'saveHr',hr:{id:eHrId,...existing}});}}
  else {const res=await gasPost({action:'saveHr',hr:payload});const id=res?.id||Date.now();hrList.push({id:Number(id),...payload});}
  closeMo('moHr');refHr();Swal.fire({icon:'success',title:'Saved',toast:true,position:'top-end',showConfirmButton:false,timer:1200});
}
async function delHr(id){const r=await Swal.fire({title:'Delete employee?',icon:'warning',showCancelButton:true,confirmButtonColor:'var(--rd)'});if(!r.isConfirmed)return;await gasPost({action:'deleteHr',id});hrList=hrList.filter(x=>x.id!==id);refHr();}
async function hrPersist(h){await gasPost({action:'saveHr',hr:h});}
async function hrAddCourse(id){
  const h=hrList.find(x=>x.id===id);if(!h)return;
  const r=await Swal.fire({title:'Add Course',html:`<input id="cName" class="swal2-input" placeholder="Course name"><input id="cDate" type="date" class="swal2-input">`,showCancelButton:true,preConfirm:()=>({name:(document.getElementById('cName').value||'').trim(),date:document.getElementById('cDate').value||''})});
  if(!r.isConfirmed||!r.value.name)return;
  if(!Array.isArray(h.courses))h.courses=[];
  h.courses.push({name:r.value.name,date:r.value.date,status:'planned',files:[]});
  await hrPersist(h);refHr();
  const openDetail=document.getElementById('moHrDet');if(openDetail&&openDetail.classList.contains('open'))openHrDetail(id);
}
async function hrRemoveCourse(id,idx){const h=hrList.find(x=>x.id===id);if(!h||!h.courses)return;h.courses.splice(idx,1);await hrPersist(h);refHr();const o=document.getElementById('moHrDet');if(o&&o.classList.contains('open'))openHrDetail(id);}
async function hrSetCourseStatus(id,idx,st){const h=hrList.find(x=>x.id===id);if(!h||!h.courses?.[idx])return;h.courses[idx].status=st;await hrPersist(h);refHr();}
async function hrUploadCourseFile(id,idx,inp){
  const h=hrList.find(x=>x.id===id);if(!h||!h.courses?.[idx])return;
  const files=Array.from(inp.files||[]);inp.value='';
  if(!Array.isArray(h.courses[idx].files))h.courses[idx].files=[];
  showSpin('Uploading...');
  for(const f of files){try{const b64=await fileToB64(f);const r=await gasPost({action:'uploadFile',fileName:f.name,mimeType:f.type||'application/pdf',fileData:b64,folder:'hr'});if(r&&r.id)h.courses[idx].files.push({name:f.name,url:r.viewUrl});}catch(e){console.warn(e);}}
  hideSpin();await hrPersist(h);openHrDetail(id);
}
async function hrAddWork(id){
  const h=hrList.find(x=>x.id===id);if(!h)return;
  const r=await Swal.fire({title:'Add Work Experience',html:`<input id="wRole" class="swal2-input" placeholder="Role / Position"><input id="wOrg" class="swal2-input" placeholder="Organization"><input id="wFrom" type="text" class="swal2-input" placeholder="From (e.g. 2560)"><input id="wTo" type="text" class="swal2-input" placeholder="To (e.g. 2565 / Present)">`,showCancelButton:true,preConfirm:()=>({role:document.getElementById('wRole').value.trim(),org:document.getElementById('wOrg').value.trim(),from:document.getElementById('wFrom').value.trim(),to:document.getElementById('wTo').value.trim()})});
  if(!r.isConfirmed||!r.value.role)return;
  if(!Array.isArray(h.workHistory))h.workHistory=[];
  h.workHistory.push(r.value);
  await hrPersist(h);openHrDetail(id);
}
async function hrRemoveWork(id,idx){const h=hrList.find(x=>x.id===id);if(!h?.workHistory)return;h.workHistory.splice(idx,1);await hrPersist(h);openHrDetail(id);}
async function hrAddEducation(id){
  const h=hrList.find(x=>x.id===id);if(!h)return;
  const r=await Swal.fire({title:'Add Education',html:`<input id="eLvl" class="swal2-input" placeholder="Level / Degree"><input id="eInst" class="swal2-input" placeholder="Institution"><input id="eYr" class="swal2-input" placeholder="Graduation Year">`,showCancelButton:true,preConfirm:()=>({level:document.getElementById('eLvl').value.trim(),institution:document.getElementById('eInst').value.trim(),year:document.getElementById('eYr').value.trim()})});
  if(!r.isConfirmed||!r.value.level)return;
  if(!Array.isArray(h.education))h.education=[];
  h.education.push(r.value);
  await hrPersist(h);openHrDetail(id);
}
async function hrRemoveEducation(id,idx){const h=hrList.find(x=>x.id===id);if(!h?.education)return;h.education.splice(idx,1);await hrPersist(h);openHrDetail(id);}
function openHrDetail(id){
  const h=hrList.find(x=>x.id===id);if(!h)return;
  const body=document.getElementById('hrDetBody');if(!body)return;
  const avatar=h.photo?`<img src="${h.photo}" style="width:96px;height:96px;border-radius:50%;object-fit:cover">`:`<div style="width:96px;height:96px;border-radius:50%;background:var(--g100);color:var(--g600);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:28px">${initials(h.name)}</div>`;
  const info=(l,v)=>`<div><div style="font-size:10.5px;color:var(--g500);text-transform:uppercase;letter-spacing:.5px">${l}</div><div style="font-size:13px;color:var(--g900);margin-top:2px">${v||'<span style="color:var(--g400)">—</span>'}</div></div>`;
  const courses=Array.isArray(h.courses)?h.courses:[];
  const edu=Array.isArray(h.education)?h.education:[];
  const work=Array.isArray(h.workHistory)?h.workHistory:[];
  const certs=Array.isArray(h.certFiles)?h.certFiles:[];
  body.innerHTML=`
    <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap">
      ${avatar}
      <div style="flex:1;min-width:260px">
        <div style="font-size:24px;font-weight:700">${escHtml(h.name)}</div>
        <div style="color:var(--g600);font-size:14px;margin-top:2px">${escHtml(h.position||'')} ${h.department?'· '+escHtml(h.department):''}</div>
        <div style="color:var(--g500);font-size:12.5px;margin-top:4px">Employee ID: ${escHtml(h.employeeId||'—')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <span class="badge ${h.status==='active'?'bg':'bo'}">${(h.status||'active').toUpperCase()}</span>
          <span class="badge ${h.empType==='contract'?'bo':'bg'}">${h.empType==='contract'?'Contract':'Government'}</span>
          ${h.branch?`<span class="badge bc"><i class="fas fa-building"></i> ${escHtml(h.branch)}</span>`:''}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-p btn-sm" onclick="openEditHr(${h.id})"><i class="fas fa-edit"></i> Edit Info</button>
        <button class="btn btn-d btn-sm" onclick="delHr(${h.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:12px;background:var(--g50);border-radius:var(--r);margin-bottom:14px">
      ${info('First Name',escHtml(h.firstName||''))}
      ${info('Last Name',escHtml(h.lastName||''))}
      ${info('Date of Birth',h.birthDate||'')}
      ${info('Age',_yearsBetween(h.birthDate))}
      ${info('Phone',escHtml(h.phone||''))}
      ${info('Email',escHtml(h.email||''))}
      ${info('Start Date',h.startDate||'')}
      ${info('Years of Service',_yearsBetween(h.startDate))}
    </div>
    <div style="margin-bottom:14px">${info('Current Address',escHtml(h.address||'').replace(/\n/g,'<br>'))}</div>
    ${h.bio?`<div style="margin-bottom:14px">${info('Bio',escHtml(h.bio).replace(/\n/g,'<br>'))}</div>`:''}

    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="margin:0;font-size:13px;color:var(--g700)"><i class="fas fa-graduation-cap"></i> Education History</h4>
        <button class="btn btn-g btn-xs" onclick="hrAddEducation(${h.id})"><i class="fas fa-plus"></i> Add</button>
      </div>
      ${edu.length?edu.map((e,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--g200);border-radius:6px;margin-bottom:4px">
        <div style="flex:1"><strong>${escHtml(e.level||'')}</strong>${e.institution?' · '+escHtml(e.institution):''}${e.year?' <span style="color:var(--g500)">('+escHtml(e.year)+')</span>':''}</div>
        <button class="btn btn-d btn-xs" onclick="hrRemoveEducation(${h.id},${i})"><i class="fas fa-times"></i></button>
      </div>`).join(''):'<div style="color:var(--g400);font-size:12px">No education records.</div>'}
      ${certs.length?`<div style="margin-top:8px"><div style="font-size:10.5px;color:var(--g500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Certificates</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${certs.map(f=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${escHtml(f.name)}','${encodeURIComponent(f.url||'')}','pdf')">${ficon('pdf')}<span class="fn" style="max-width:200px">${escHtml(f.name)}</span></div>`).join('')}</div></div>`:''}
    </div>

    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="margin:0;font-size:13px;color:var(--g700)"><i class="fas fa-briefcase"></i> Work History</h4>
        <button class="btn btn-g btn-xs" onclick="hrAddWork(${h.id})"><i class="fas fa-plus"></i> Add</button>
      </div>
      ${work.length?work.map((w,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--g200);border-radius:6px;margin-bottom:4px">
        <div style="flex:1"><strong>${escHtml(w.role||'')}</strong>${w.org?' · '+escHtml(w.org):''} <span style="color:var(--g500);font-size:11.5px">${escHtml(w.from||'')}${w.to?' — '+escHtml(w.to):''}</span></div>
        <button class="btn btn-d btn-xs" onclick="hrRemoveWork(${h.id},${i})"><i class="fas fa-times"></i></button>
      </div>`).join(''):'<div style="color:var(--g400);font-size:12px">No work history.</div>'}
    </div>

    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="margin:0;font-size:13px;color:var(--g700)"><i class="fas fa-chalkboard-teacher"></i> Training Courses</h4>
        <button class="btn btn-g btn-xs" onclick="hrAddCourse(${h.id})"><i class="fas fa-plus"></i> Add</button>
      </div>
      ${courses.length?courses.map((c,i)=>{
        const badge=c.status==='passed'?'bg':c.status==='in_progress'?'bc':'bo';
        const cf=Array.isArray(c.files)?c.files:[];
        return `<div style="border:1px solid var(--g200);border-radius:6px;padding:8px 10px;margin-bottom:6px">
          <div style="display:flex;gap:8px;align-items:center">
            <span style="flex:1;font-size:13px"><strong>${escHtml(c.name)}</strong> <span style="color:var(--g500);font-size:11.5px">${escHtml(c.date||'')}</span></span>
            <select onchange="hrSetCourseStatus(${h.id},${i},this.value)" style="font-size:11px;padding:2px 4px">
              <option value="planned" ${c.status==='planned'?'selected':''}>Planned</option>
              <option value="in_progress" ${c.status==='in_progress'?'selected':''}>In Progress</option>
              <option value="passed" ${c.status==='passed'?'selected':''}>Passed</option>
            </select>
            <label class="btn btn-ol btn-xs" style="cursor:pointer;margin:0"><i class="fas fa-paperclip"></i> PDF
              <input type="file" accept="application/pdf" multiple style="display:none" onchange="hrUploadCourseFile(${h.id},${i},this)">
            </label>
            <button class="btn btn-d btn-xs" onclick="hrRemoveCourse(${h.id},${i})"><i class="fas fa-times"></i></button>
          </div>
          ${cf.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${cf.map(f=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${escHtml(f.name)}','${encodeURIComponent(f.url||'')}','pdf')">${ficon('pdf')}<span class="fn" style="max-width:180px">${escHtml(f.name)}</span></div>`).join('')}</div>`:''}
        </div>`;
      }).join(''):'<div style="color:var(--g400);font-size:12px">No courses yet.</div>'}
    </div>
  `;
  openMo('moHrDet');
}

// Trigger Drive folder creation once per session
(function ensureDriveFolders(){try{if(GAS_URL)fetch(`${GAS_URL}?action=ensureFolders`).catch(()=>{});}catch(_){} })();
