/* ════════════════════════════════════════════════
   FSD DASHBOARD  ·  app.js
   ════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────
// 👉 Replace with your Google Apps Script Web App URL after deployment
const GAS_URL = '/api/public/gas';
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
  {id:'users',    label:'User Management',     icon:'fa-users-cog',      visible:true},
  {id:'customize',label:'Customize',           icon:'fa-sliders-h',      visible:true},
];
let staffMenuItems = [
  {id:'dash',    label:'Dashboard',         icon:'fa-tachometer-alt', visible:true},
  {id:'docs',    label:'All Documents',     icon:'fa-file-alt',       visible:true},
  {id:'track',   label:'Document Tracking', icon:'fa-route',          visible:true},
  {id:'profile', label:'Edit Profile',      icon:'fa-user-edit',      visible:true},
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
function saveSheets(){lsSet(LS.sheets,{sheetPages:sheetPages.map(s=>({id:s.id,name:s.name,rawUrl:s.rawUrl,url:s.url})),shNid});}
function loadSheets(){const x=lsGet(LS.sheets);if(x&&Array.isArray(x.sheetPages)){sheetPages=x.sheetPages.map(s=>({...s,data:null,loading:true,error:null,lastFetch:null}));if(x.shNid)shNid=x.shNid;}}
function saveCustom(){lsSet(LS.custom,{customPages,cpNid});}
function loadCustom(){const x=lsGet(LS.custom);if(x&&Array.isArray(x.customPages)){customPages=x.customPages;if(x.cpNid)cpNid=x.cpNid;}}

// ════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════
function doLogin(){
  const u=document.getElementById('lu').value.trim();
  const p=document.getElementById('lp').value.trim();
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
        owner:d.owner,files:d.files||[],uid:Number(d.uid)||1,fiscal:d.fiscal||String(new Date().getFullYear())
      }));
    }
  }catch(e){console.warn('GAS load failed, using demo data',e);}
  hideSpin(); showApp();
}

// ════════════════════════════════════════════════
//  APP INIT
// ════════════════════════════════════════════════
function showApp(){
  document.getElementById('LP').style.display='none';
  document.getElementById('AP').style.display='block';
  const ini=initials(CU.name);
  ['sbAva','tAva'].forEach(id=>document.getElementById(id).textContent=ini);
  document.getElementById('sbName').textContent=CU.name;
  document.getElementById('sbRole').textContent=CU.role==='admin'?'Admin':'Staff';
  document.getElementById('tDate').textContent=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  buildNav();
  const saved=lsGet(LS.page);
  if(saved&&saved.key){restorePage(saved);} else goPage('dash');
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
async function autoRefresh(){
  if(GAS_URL){
    try{
      const res=await fetch(`${GAS_URL}?action=getDocuments`);
      const json=await res.json();
      if(json.docs){
        DB.docs=json.docs.map(d=>({id:Number(d.id),dcalNo:d.dcalNo,dcalDate:d.dcalDate,fsdNo:d.fsdNo,fsdDate:d.fsdDate,docNo:d.docNo,docDate:d.docDate,subject:d.subject,status:d.status,statusNote:d.statusNote,owner:d.owner,files:d.files||[],uid:Number(d.uid)||1,fiscal:d.fiscal||String(new Date().getFullYear())}));
      }
    }catch(e){}
  }
  reRenderCurrent();
}
function initials(n){const a=(n||'').split(' ');return((a[0]?.[0]||'')+(a[1]?.[0]||'')).toUpperCase()||'?';}

// ════════════════════════════════════════════════
//  NAV
// ════════════════════════════════════════════════
const TITLES={dash:'Dashboard',docs:'All Documents',track:'Document Tracking',stats:'Statistics FSD',
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
        <button onclick="event.stopPropagation();rmSheet(${s.id})" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:11px;padding:2px 5px"><i class="fas fa-times"></i></button>
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
function deleteCustomPage(id){customPages=customPages.filter(x=>x.id!==id);buildNav();goPage(CU.role==='admin'?'dash':'sdash');}

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
      <td><div style="display:flex;gap:3px">
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
      const fyl=Object.keys(fyMap).map(be=>`${be} (CE ${parseInt(be)-543})`);
      new Chart(fc,{type:'bar',data:{labels:fyl,datasets:[{label:'Docs',data:Object.values(fyMap),
        backgroundColor:fyl.map((_,i)=>pal[i%pal.length]+'CC'),borderColor:fyl.map((_,i)=>pal[i%pal.length]),borderWidth:2,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,
          onClick:(e,els)=>{if(els.length){const be=Object.keys(fyMap)[els[0].index];showQF('fy_'+be,'Year '+be);}},
          plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{family:'Kanit'}}},x:{ticks:{font:{family:'Kanit',size:10}}}}}});
    }
    fixDG();
  },80);
}

function showQF(filter,label){
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
    <td><div style="display:flex;gap:3px">
      <button class="btn btn-ol btn-sm btn-ico" onclick="openDet(${d.id})"><i class="fas fa-eye"></i></button>
      <button class="btn btn-c btn-sm btn-ico"  onclick="openStMo(${d.id})"><i class="fas fa-exchange-alt"></i></button>
      <button class="btn btn-ol btn-sm btn-ico" onclick="openEditDoc(${d.id})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-d btn-sm btn-ico"  onclick="delDoc(${d.id})"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
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
    <div class="pipe" style="background:var(--g50);padding:12px;border-radius:var(--r);margin-bottom:16px">${buildTL(d.status)}</div>
    <div style="font-size:11px;font-weight:600;color:var(--g500);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Attachments (${d.files.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${d.files.length?d.files.map(f=>`<div class="fi2" style="cursor:pointer" onclick="viewFile('${f.name}','${encodeURIComponent(f.url||'')}','${f.type||''}')">
        ${ficon(f.type)}<span class="fn" style="max-width:160px">${f.name}</span><i class="fas fa-eye" style="font-size:11px;color:var(--g400)"></i>
      </div>`).join(''):`<span style="color:var(--g400);font-size:13px">No attachments</span>`}
    </div>`;
  document.getElementById('detStBtn').onclick=()=>{closeMo('moDet');openStMo(id);};
  openMo('moDet');
}
function buildTL(cur){
  const pg=['pel','ops','air'];const is=pg.includes(cur);const midSm=is?SM[cur]:null;
  const steps=[{sm:SM.head},{sm:midSm,label:midSm?midSm.label:'Pel / Ops / Air',icon:midSm?midSm.icon:'fa-users-cog'},{sm:SM.dg},{sm:SM.done}];
  const ord={head:0,pel:1,ops:1,air:1,dg:2,done:3};const ci=ord[cur]??0;
  return steps.map((st,i)=>{
    const cls=i<ci?'done':i===ci?'active':'pending';
    const icon=st.sm?st.sm.icon:st.icon; const lbl=st.sm?st.sm.label:st.label;
    return`<div class="ps ${cls}"><div class="pd"><i class="fas ${icon}"></i></div><div class="pl">${lbl}</div>${i===ci?'<div style="font-size:9px;color:var(--p);margin-top:2px">▲ Current</div>':''}</div>`;
  }).join('');
}

// ════════════════════════════════════════════════
//  STATUS
// ════════════════════════════════════════════════
function openStMo(id){eSid=id;const d=DB.docs.find(x=>x.id===id);if(!d)return;document.getElementById('stSel').value=d.status;document.getElementById('stNote').value=d.statusNote||'';openMo('moSt');}
function saveStatus(){
  const d=DB.docs.find(x=>x.id===eSid);if(!d)return;
  showSpin();
  setTimeout(async()=>{
    d.status=document.getElementById('stSel').value;
    d.statusNote=document.getElementById('stNote').value.trim();
    if(GAS_URL) await gasPost({action:'saveDocument',doc:d});
    hideSpin();closeMo('moSt');
    Swal.fire({icon:'success',title:'Status Updated',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
    autoRefresh();
  },300);
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
        <div class="pipe" style="background:var(--g50);padding:10px;border-radius:var(--r)">${buildTL(d.status)}</div>
        ${d.statusNote?`<div style="background:#FFFDE7;border:1px solid #FBC02D;border-radius:var(--r);padding:9px 13px;font-size:12.5px;margin-top:8px"><i class="fas fa-sticky-note" style="color:var(--yw);margin-right:6px"></i>${d.statusNote}</div>`:''}
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
    <div class="cb"><div class="tw"><table><thead><tr><th>#</th><th>Username</th><th>Full Name</th><th>Department</th><th>Role</th><th>Manage</th></tr></thead><tbody id="userTb"></tbody></table></div></div></div>`;
  refUsers();
}
function refUsers(){
  const tb=document.getElementById('userTb');if(!tb)return;
  tb.innerHTML=DB.users.map((u,i)=>`<tr><td>${i+1}</td><td><strong>${u.u}</strong></td><td>${u.name}</td><td>${u.dept}</td>
    <td><span class="badge ${u.role==='admin'?'bp':'bc'}">${u.role==='admin'?'<i class="fas fa-shield-alt"></i> Admin':'<i class="fas fa-user"></i> Staff'}</span></td>
    <td><div style="display:flex;gap:4px">
      <button class="btn btn-ol btn-sm btn-ico" onclick="openEditUser(${u.id})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-d btn-sm btn-ico"  onclick="delUser(${u.id})"><i class="fas fa-trash"></i></button>
    </div></td></tr>`).join('');
}
function openAddUser(){eUid=null;document.getElementById('moUT').textContent='Add User';['fu','fp','fn','fd'].forEach(id=>document.getElementById(id).value='');document.getElementById('frl').value='staff';openMo('moUser');}
function openEditUser(id){const u=DB.users.find(x=>x.id===id);if(!u)return;eUid=id;document.getElementById('moUT').textContent='Edit User';document.getElementById('fu').value=u.u;document.getElementById('fp').value=u.p;document.getElementById('fn').value=u.name;document.getElementById('fd').value=u.dept;document.getElementById('frl').value=u.role;openMo('moUser');}
function saveUser(){
  const u=document.getElementById('fu').value.trim(),p=document.getElementById('fp').value.trim(),n=document.getElementById('fn').value.trim(),d=document.getElementById('fd').value.trim(),r=document.getElementById('frl').value;
  if(!u||!p||!n||!d){Swal.fire({icon:'warning',title:'Please fill all required fields'});return;}
  if(eUid){const usr=DB.users.find(x=>x.id===eUid);if(usr)Object.assign(usr,{u,p,name:n,dept:d,role:r});}
  else DB.users.push({id:DB.nid.u++,u,p,name:n,dept:d,role:r});
  saveUsers();
  closeMo('moUser');
  Swal.fire({icon:'success',title:'Saved',toast:true,position:'top-end',showConfirmButton:false,timer:1500});
  autoRefresh();
}
function delUser(id){Swal.fire({title:'Delete user?',icon:'warning',showCancelButton:true,confirmButtonText:'Delete',cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'}).then(r=>{if(r.isConfirmed){DB.users=DB.users.filter(x=>x.id!==id);saveUsers();autoRefresh();}});}

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

  hideSpin();setUplProg(0);refDocs();refMyDocs();
  Swal.fire({icon:'success',title:GAS_URL?'Saved to Google Sheets & Drive!':'Document saved (Demo Mode)',toast:true,position:'top-end',showConfirmButton:false,timer:2500});
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
  .then(async r=>{if(r.isConfirmed){DB.docs=DB.docs.filter(x=>x.id!==id);if(GAS_URL)await gasPost({action:'deleteDocument',id});refDocs();refMyDocs();}});
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
  el.innerHTML=`<div class="card" style="max-width:460px"><div class="ch"><h3><i class="fas fa-user-edit" style="color:var(--cy)"></i> Edit Profile</h3></div><div class="cb">
    <div class="fr"><div class="ff"><label>Username</label><input id="pu" value="${CU.u}"></div></div>
    <div class="fr"><div class="ff"><label>New Password <span style="font-weight:400;color:var(--g400)">(leave blank to keep)</span></label><input type="password" id="pp" placeholder="New password"></div></div>
    <div class="fr"><div class="ff"><label>Full Name</label><input id="pn" value="${CU.name}"></div></div>
    <div class="fr"><div class="ff"><label>Department</label><input id="pdpt" value="${DB.users.find(u=>u.id===CU.id)?.dept||''}"></div></div>
    <button class="btn btn-p" onclick="saveProfile()"><i class="fas fa-save"></i> Save Changes</button>
  </div></div>`;
}
function saveProfile(){
  const u=v('pu'),p=v('pp'),n=v('pn'),dpt=v('pdpt');
  if(!u||!n){Swal.fire({icon:'warning',title:'Username and name required'});return;}
  const usr=DB.users.find(x=>x.id===CU.id);if(usr){usr.u=u;usr.name=n;usr.dept=dpt;if(p)usr.p=p;}
  CU.u=u;CU.name=n;const ini=initials(n);['sbAva','tAva'].forEach(id=>document.getElementById(id).textContent=ini);document.getElementById('sbName').textContent=n;
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
  buildNav();closeMo('moAddPage');
  const custEl=document.getElementById('pg-customize');if(custEl&&custEl.classList.contains('active'))renderCustomize(custEl);
  Swal.fire({icon:'success',title:`Page "${name}" added!`,toast:true,position:'top-end',showConfirmButton:false,timer:2000});
}

function addSheetFromCustomize(){
  const name=v('shN'),rawUrl=v('shU');
  if(!name||!rawUrl){Swal.fire({icon:'warning',title:'Please enter name and URL'});return;}
  const csvUrl=normSheetUrl(rawUrl);const id=shNid++;
  sheetPages.push({id,name,url:csvUrl,rawUrl,data:null,loading:true,error:null,lastFetch:null});
  buildNav();fetchSheet(id);
  setTimeout(()=>goSheetPage(id),150);
}

document.getElementById('cpType').addEventListener('change',function(){
  document.getElementById('cpUrlField').style.display=this.value==='iframe'?'block':'none';
});

// ════════════════════════════════════════════════
//  GOOGLE SHEETS VIEWER
// ════════════════════════════════════════════════
function addSheetConfirm(){
  const name=v('shN'),rawUrl=v('shU');
  if(!name||!rawUrl){Swal.fire({icon:'warning',title:'Please enter name and URL'});return;}
  const csvUrl=normSheetUrl(rawUrl);const id=shNid++;
  sheetPages.push({id,name,url:csvUrl,rawUrl,data:null,loading:true,error:null,lastFetch:null});
  closeMo('moSheet');buildNav();fetchSheet(id);
  setTimeout(()=>goSheetPage(id),100);
}
function normSheetUrl(url){
  if(url.includes('output=csv')||url.includes('format=csv'))return url;
  const m=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(m){const gm=url.match(/[#&?]gid=(\d+)/);return`https://docs.google.com/spreadsheets/d/${m[1]}/pub?output=csv${gm?'&gid='+gm[1]:''}`;}
  return url;
}
function fetchSheet(id){
  const s=sheetPages.find(x=>x.id===id);if(!s)return;
  s.loading=true;s.error=null;
  const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),12000);
  fetch(s.url,{signal:ctrl.signal})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
    .then(csv=>{s.data=csvParse(csv);s.loading=false;s.lastFetch=Date.now();updSheet(id);})
    .catch(e=>{s.loading=false;s.error=e.name==='AbortError'?'Timed out.':'Failed: '+e.message+'. Make sure sheet is published (File→Publish to web→CSV).';updSheet(id);});
}
function updSheet(id){const el=document.getElementById('shpg-'+id);if(el&&el.classList.contains('active')){const s=sheetPages.find(x=>x.id===id);if(s)renderSheetPage(s,el);}}
function renderSheetPage(s,el){
  const last=s.lastFetch?new Date(s.lastFetch).toLocaleTimeString():'—';
  el.innerHTML=`<div class="card"><div class="ch">
    <h3><i class="fas fa-table" style="color:var(--gn)"></i> ${s.name}</h3>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--g400)">Updated: <strong id="sht-${s.id}">${last}</strong></span>
      <button class="btn btn-g btn-sm" onclick="refreshSh(${s.id})"><i class="fas fa-sync"></i> Refresh</button>
      <button class="btn btn-d btn-sm" onclick="rmSheet(${s.id})"><i class="fas fa-trash"></i> Remove</button>
    </div>
  </div>
  <div class="cb">
    <div class="sh-info"><i class="fas fa-link" style="color:var(--cy)"></i> <strong>Source:</strong> ${s.rawUrl||s.url}</div>
    <div id="shd-${s.id}">${buildSheetData(s)}</div>
  </div></div>`;
}
function buildSheetData(s){
  if(s.loading)return`<div style="text-align:center;padding:32px;color:var(--g400)"><div class="spin" style="display:inline-block;width:28px;height:28px;border-width:3px;margin-bottom:12px"></div><p>Loading…</p></div>`;
  if(s.error)return`<div class="empty"><i class="fas fa-exclamation-triangle" style="color:var(--rd)"></i><p style="color:var(--rd)">${s.error}</p></div>`;
  if(!s.data||!s.data.length)return`<div class="empty"><i class="fas fa-table"></i><p>No data</p></div>`;
  return`<div class="sh-tbl-wrap"><table style="min-width:auto"><thead><tr>${s.data[0].map(h=>`<th>${h||'-'}</th>`).join('')}</tr></thead><tbody>${s.data.slice(1).map(row=>`<tr>${row.map(c=>`<td>${c||''}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div style="font-size:11px;color:var(--g400);margin-top:8px">${s.data.length-1} rows · ${s.data[0]?.length||0} cols</div>`;
}
function refreshSh(id){const s=sheetPages.find(x=>x.id===id);if(!s)return;s.loading=true;s.data=null;const da=document.getElementById('shd-'+id);if(da)da.innerHTML=buildSheetData(s);fetchSheet(id);}
function rmSheet(id){Swal.fire({title:'Remove Sheet?',icon:'warning',showCancelButton:true,confirmButtonText:'Remove',cancelButtonText:'Cancel',confirmButtonColor:'var(--rd)'}).then(r=>{if(r.isConfirmed){sheetPages=sheetPages.filter(x=>x.id!==id);const old=document.getElementById('shpg-'+id);if(old)old.remove();buildNav();goPage(CU.role==='admin'?'dash':'sdash');}});}
function csvParse(text){const rows=[];for(const line of text.split('\n')){if(!line.trim())continue;const cells=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){c+='"';i++;}else q=!q;}else if(ch===','&&!q){cells.push(c.trim());c='';}else c+=ch;}cells.push(c.trim());rows.push(cells);}return rows.filter(r=>r.some(c=>c));}

// ════════════════════════════════════════════════
//  FILE DRAG & DROP
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  const dz=document.getElementById('dz'),dzIn=document.getElementById('dzIn');
  if(!dz||!dzIn)return;
  dz.addEventListener('click',()=>dzIn.click());
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');addFiles(e.dataTransfer.files);});
  dzIn.addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});
  // close modals on overlay
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
function toFY(d){if(!d)return'2568';return String(parseInt(d.split('-')[0])+543);}
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
