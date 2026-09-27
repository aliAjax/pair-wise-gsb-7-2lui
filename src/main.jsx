import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const seed=[{id:1,title:'潮汐之后',room:'A01 · 主展厅',type:'装置',desc:'一件记录海岸线变化的沉浸式影像装置。',audio:'https://example.com/audio.mp3',status:'已发布',color:'#e6b45d'},{id:2,title:'未寄出的信',room:'B02 · 纸上时间',type:'档案',desc:'来自三代人的手写信件与声音档案。',audio:'',status:'草稿',color:'#ef8f84'},{id:3,title:'柔软的边界',room:'C01 · 新媒介',type:'互动',desc:'观众的移动会改变墙面上的光影。',audio:'',status:'已发布',color:'#83b9b1'}];
const seedRoutes=[
  {id:1001,name:'团体主线 · 潮汐之声',owner:'林馆员',desc:'约 40 分钟的讲解路线，适合 15 人以内的预约团体。',
   stations:[{exhibitId:1,locked:false},{exhibitId:2,locked:true},{exhibitId:3,locked:false}]}
];
const load=(k,fb)=>{try{return JSON.parse(localStorage.getItem(k))??fb}catch{return fb}};
const pad=n=>String(n).padStart(2,'0');
// 站点 = 路线里对展项的一次引用；顺序由各自路线的 stations 数组独立维护
const allStops=(r,exhibits)=>r.stations.map(s=>({...s,ex:exhibits.find(e=>e.id===s.exhibitId)})).filter(s=>s.ex);
// 访客视角：只保留已发布站点，相对顺序不变，编号自然靠拢
const liveStops=(r,exhibits)=>allStops(r,exhibits).filter(s=>s.ex.status==='已发布');

function App(){
 const [exhibits,setExhibits]=useState(()=>load('guide-exhibits',seed));
 const [routes,setRoutes]=useState(()=>load('guide-routes',seedRoutes));
 const [selected,setSelected]=useState(1);
 const [view,setView]=useState('edit'); // edit | routes | visitor | routeView | detail
 const [filter,setFilter]=useState('全部');
 const [form,setForm]=useState({title:'',room:'',type:'装置',desc:'',audio:''});
 const [notice,setNotice]=useState('');
 const [routeSel,setRouteSel]=useState(()=>seedRoutes[0].id);
 const [tourId,setTourId]=useState(null); // 访客正在查看的路线
 const [rehearse,setRehearse]=useState(null); // 内部演练弹窗的路线 id
 const [rehearseMode,setRehearseMode]=useState('internal'); // internal | visitor
 const dragId=useRef(null);
 const [over,setOver]=useState(null);

 useEffect(()=>localStorage.setItem('guide-exhibits',JSON.stringify(exhibits)),[exhibits]);
 useEffect(()=>localStorage.setItem('guide-routes',JSON.stringify(routes)),[routes]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2600);return ()=>clearTimeout(t)},[notice]);

 const visible=useMemo(()=>filter==='全部'?exhibits:exhibits.filter(x=>x.status===filter),[exhibits,filter]);
 const current=exhibits.find(x=>x.id===selected)||exhibits[0];
 const curRoute=routes.find(r=>r.id===routeSel)||routes[0];
 const publicRoutes=useMemo(()=>routes.map(r=>({r,stops:liveStops(r,exhibits)})).filter(x=>x.stops.length>0),[routes,exhibits]);
 const tourRoute=routes.find(r=>r.id===tourId);
 const tourStops=tourRoute?liveStops(tourRoute,exhibits):[];

 // ---- 展项 ----
 const add=()=>{if(!form.title.trim())return;const item={...form,id:Date.now(),status:'草稿',color:['#e6b45d','#ef8f84','#83b9b1','#9ba7dc'][exhibits.length%4]};setExhibits([...exhibits,item]);setSelected(item.id);setForm({title:'',room:'',type:'装置',desc:'',audio:''});setNotice('展项已保存为草稿');};
 const update=(k,v)=>setExhibits(exhibits.map(x=>x.id===current.id?{...x,[k]:v}:x));
 const publish=()=>{update('status',current.status==='已发布'?'草稿':'已发布');setNotice(current.status==='已发布'?'已撤回发布':'已发布，访客预览已更新');};
 const exportData=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({exhibits,routes},null,2)],{type:'application/json'}));a.download='exhibition-guide.json';a.click();setNotice('已导出展项与路线数据');};

 // ---- 路线 ----
 const addRoute=()=>{const r={id:Date.now(),name:'未命名路线',owner:'',desc:'',stations:[]};setRoutes([...routes,r]);setRouteSel(r.id);};
 const patchRoute=(k,v)=>setRoutes(routes.map(r=>r.id===curRoute.id?{...r,[k]:v}:r));
 const removeRoute=(id)=>{const r=routes.find(x=>x.id===id);if(!window.confirm(`删除路线「${r.name}」？各展项本身不受影响。`))return;const next=routes.filter(x=>x.id!==id);setRoutes(next);if(rehearse===id)setRehearse(null);if(routeSel===id)setRouteSel(next[0]?.id??null);setNotice('路线已删除');};
 const inRoute=(exId,r=curRoute)=>r.stations.some(s=>s.exhibitId===exId);
 const addStation=(exId)=>{if(!curRoute)return;if(inRoute(exId)){setNotice('该展项已在本路线中');return;}setRoutes(routes.map(r=>r.id===curRoute.id?{...r,stations:[...r.stations,{exhibitId:exId,locked:false}]}:r));setNotice('站点已加入路线末尾');};
 const removeStation=(exId)=>setRoutes(routes.map(r=>r.id===curRoute.id?{...r,stations:r.stations.filter(s=>s.exhibitId!==exId)}:r));
 const toggleLock=(exId)=>{
   const st=curRoute?.stations.find(s=>s.exhibitId===exId);
   if(!st)return;
   setNotice(st.locked?'已解锁，该站点可以自由拖动':'已锁定：拖动其他站点时，本站的位置与前后关系保持不变');
   setRoutes(routes.map(r=>r.id===curRoute.id?{...r,stations:r.stations.map(s=>s.exhibitId===exId?{...s,locked:!s.locked}:s)}:r));
 };
 // 拖动排序：锁定站点是锚点，把路线切成若干区间；站点只能在自己原来的区间内移动，
 // 无法跨过任何锁定站点 —— 锁定站的下标、以及“谁在它之前/之后”因此都不变。
 const moveStation=(rid,dragExId,targetId,pos)=>{
   setRoutes(rs=>rs.map(r=>{
     if(r.id!==rid)return r;
     const st=[...r.stations];
     const from=st.findIndex(s=>s.exhibitId===dragExId);
     if(from<0||st[from].locked)return r;
     let before=null,after=null;
     for(let i=from-1;i>=0&&before===null;i--)if(st[i].locked)before=st[i].exhibitId;
     for(let i=from+1;i<st.length&&after===null;i++)if(st[i].locked)after=st[i].exhibitId;
     const dragged=st[from];
     const rest=st.filter(s=>s.exhibitId!==dragExId);
     let idx;
     if(targetId==='END'){idx=rest.length;}
     else{const ti=rest.findIndex(s=>s.exhibitId===targetId);if(ti<0)return r;idx=pos==='before'?ti:ti+1;}
     const bi=before?rest.findIndex(s=>s.exhibitId===before):-1;
     const ai=after?rest.findIndex(s=>s.exhibitId===after):rest.length;
     idx=Math.max(bi+1,Math.min(idx,ai)); // 夹回本区间
     rest.splice(idx,0,dragged);
     return {...r,stations:rest};
   }));
 };
 const rowOver=(e,id)=>{e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();setOver({id,pos:e.clientY<rect.top+rect.height/2?'before':'after'});};
 const rowDrop=(e,rid,id)=>{e.preventDefault();e.stopPropagation();if(dragId.current==null)return;const rect=e.currentTarget.getBoundingClientRect();const pos=e.clientY<rect.top+rect.height/2?'before':'after';moveStation(rid,Number(dragId.current),id,pos);dragId.current=null;setOver(null);};

 // ================= 访客：路线总览 =================
 if(view==='routeView'&&tourRoute){
  const n=tourStops.length;
  return <div className="visitor">
   <header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 团体导览</span></div><button className="ghost" onClick={()=>{setTourId(null);setView('visitor')}}>← 全部路线</button></header>
   <main className="visitor-main route-page">
    <span className="eyebrow">GROUP ROUTE / 讲解顺序</span>
    <h1>{tourRoute.name}</h1>
    <p className="lead">{tourRoute.desc||'跟着馆员的讲解顺序，一站一站走进展厅。'}</p>
    <p className="route-meta">{tourRoute.owner&&<span>负责人 · {tourRoute.owner}</span>}<span>{n} 站 · 仅显示已发布展项</span></p>
    <ol className="timeline">
     {tourStops.map((s,i)=>(
      <li key={s.exhibitId}>
       <div className="stop-rail"><span className="stop-no">{pad(i+1)}</span>{i<n-1&&<i className="rail-line"/>}</div>
       <div className="stop-card" role="button" tabIndex={0}
        onClick={()=>{setSelected(s.ex.id);setView('detail')}}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(s.ex.id);setView('detail')}}}>
        <span className="thumb" style={{background:s.ex.color}}>{pad(s.ex.id)}</span>
        <span className="row-copy"><small>{s.ex.room} · {s.ex.type}</small><strong>{s.ex.title}</strong><small>{s.ex.desc}</small></span>
        {s.ex.audio&&<button className="stop-audio" title="播放导览音频" onClick={e=>{e.stopPropagation();setNotice('正在播放导览音频…')}}>▶</button>}
        <span className="chev">›</span>
       </div>
      </li>))}
    </ol>
    <small className="hint">未发布的站点已按馆员编排的先后顺序自动收拢，不对外显示。</small>
   </main>
   {notice&&<div className="toast">{notice}</div>}
  </div>;
 }

 // ================= 访客：展项详情（可带路线上下文） =================
 if(view==='detail'&&current){
  const stopIdx=tourRoute?tourStops.findIndex(s=>s.ex.id===current.id):-1;
  return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览</span></div><button className="ghost" onClick={()=>setView(tourRoute?'routeView':'visitor')}>{tourRoute?'← 返回路线':'← 全部展项'}</button></header><main className="detail"><div className="detail-art" style={{background:current.color}}><span>{pad(current.id)}</span></div><div className="detail-copy"><span className="eyebrow">{current.room} / {current.type}</span><h1>{current.title}</h1><p>{current.desc}</p>{current.audio&&<button className="audio" onClick={()=>setNotice('正在播放导览音频…')}>▶ 播放语音导览</button>}
   {tourRoute&&stopIdx>=0&&<div className="route-step-nav">
     <button disabled={stopIdx===0} onClick={()=>setSelected(tourStops[stopIdx-1].ex.id)}>← 上一站</button>
     <small>{tourRoute.name} · 第 {stopIdx+1} / {tourStops.length} 站</small>
     <button disabled={stopIdx===tourStops.length-1} onClick={()=>setSelected(tourStops[stopIdx+1].ex.id)}>下一站 →</button>
   </div>}
   <div className="qr"><div className="qr-box">▦</div><div><strong>分享这个展项</strong><small>扫描二维码，在手机上继续阅读</small></div></div></div></main>{notice&&<div className="toast">{notice}</div>}</div>;
 }

 // ================= 访客：首页 =================
 if(view==='visitor') return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆</span></div><button className="ghost" onClick={()=>setView('edit')}>返回编辑</button></header><main className="visitor-main"><span className="eyebrow">VISITOR GUIDE / 2024</span><h1>沿着作品，<em>走进</em>另一种时间。</h1><p className="lead">当你靠近一件作品，它的故事就开始流动。选择一条团体路线，或从单件展项开始探索。</p>
 {publicRoutes.length>0&&<section className="visitor-routes"><span className="eyebrow">GROUP TOURS · 团体参观路线</span><div className="route-cards">{publicRoutes.map(({r,stops})=><button className="route-card" key={r.id} onClick={()=>{setTourId(r.id);setView('routeView')}}><span className="route-card-no">{pad(stops.length)} 站</span><h3>{r.name}</h3><p>{r.desc}</p><span className="route-go">按讲解顺序查看 →</span></button>)}</div></section>}
 <section className="visitor-exhibits"><span className="eyebrow">ALL WORKS · 全部展项</span><div className="visitor-grid">{exhibits.filter(x=>x.status==='已发布').map(x=><article className="visitor-card" key={x.id} onClick={()=>{setTourId(null);setSelected(x.id);setView('detail')}}><div className="art" style={{background:x.color}}><span>{pad(x.id)}</span><i>↗</i></div><div className="card-meta"><small>{x.room}</small><h3>{x.title}</h3><p>{x.desc}</p></div></article>)}</div></section>
 </main></div>;

 // ================= 馆员：路线编排工作台 =================
 if(view==='routes'){
  const r=curRoute;
  const stops=r?allStops(r,exhibits):[];
  const rehearsalStops=rehearseMode==='internal'?allStops(routes.find(x=>x.id===rehearse)||r,exhibits):liveStops(routes.find(x=>x.id===rehearse)||r,exhibits);
  return <div className="app"><aside>
    <div className="brand"><span className="mark">M</span><span>展览工作台</span></div>
    <div className="side-label">当前项目</div>
    <div className="project"><span className="project-dot"></span><div><strong>潮汐之后</strong><small>2024 春季展</small></div><span>⌄</span></div>
    <nav>
     <button onClick={()=>setView('edit')}>▧ <span>展项内容</span><b>{exhibits.length}</b></button>
     <button className="active">⌁ <span>展厅动线</span><b>{routes.length}</b></button>
     <button>◉ <span>二维码</span></button>
    </nav>
    <div className="side-foot"><button>⚙ 设置</button><small>已自动保存 · 刚刚</small></div>
   </aside>
   <main className="workspace">
    <header className="topbar"><div><span className="eyebrow">TOUR BUILDER</span><h1>展厅动线</h1></div><div className="top-actions"><button className="secondary" onClick={exportData}>↓ 导出 JSON</button><button className="secondary" onClick={()=>{setTourId(null);setView('visitor')}}>◉ 访客预览</button>{r&&<button className="primary" onClick={()=>{setRehearse(r.id);setRehearseMode('internal')}}>▶ 内部演练 <span>↗</span></button>}</div></header>
    <div className="content">
     <section className="list-pane">
      <div className="list-head"><div><h2>全部路线</h2><span>{routes.length} 条路线</span></div><button className="add-btn" onClick={addRoute}>＋ 新建路线</button></div>
      <div className="exhibit-list route-side-list">
       {routes.map(x=>{const n=liveStops(x,exhibits).length;return <div className={'exhibit-row route-side '+(r&&r.id===x.id?'chosen':'')} key={x.id} onClick={()=>setRouteSel(x.id)}>
        <span className="thumb route-thumb">⌁</span>
        <span className="row-copy"><strong>{x.name}</strong><small>共 {x.stations.length} 站 · 对外 {n} 站</small></span>
        <button className="row-del" title="删除路线" onClick={e=>{e.stopPropagation();removeRoute(x.id)}}>×</button>
       </div>;})}
       {routes.length===0&&<p className="empty-tip">还没有路线，点击「新建路线」开始编排。</p>}
      </div>
     </section>
     <section className="form-panel">
      {!r?<div className="panel-title"><div><span className="eyebrow">NO ROUTE</span><h2>请先新建一条路线</h2></div></div>:<>
      <div className="panel-title"><div><span className="eyebrow">EDIT ROUTE</span><h2>路线编排</h2></div><span className={'status '+(liveStops(r,exhibits).length?'live':'draft')}>对外 {liveStops(r,exhibits).length} 站</span></div>
      <div className="editor">
       <label>路线名称<input value={r.name} onChange={e=>patchRoute('name',e.target.value)}/></label>
       <div className="two">
        <label>负责人<input value={r.owner} placeholder="负责讲解的馆员" onChange={e=>patchRoute('owner',e.target.value)}/></label>
        <label>团体规模 / 时长<input value={r.desc} placeholder="如：15 人 · 约 40 分钟" onChange={e=>patchRoute('desc',e.target.value)}/></label>
       </div>
       <div className="station-block">
        <div className="preview-heading"><span>讲解站点（{stops.length}）· 拖动调整顺序</span><button onClick={()=>{setRehearse(r.id);setRehearseMode('internal')}}>▶ 内部演练</button></div>
        <p className="hint lock-hint">草稿展项可以加入路线供内部演练；锁定站点后，拖动其他站点无法跨过它，其位置与前后关系保持不变。</p>
        <div className="station-list">
         {stops.map((s,i)=>{
          const isLive=s.ex.status==='已发布';
          return <div key={s.exhibitId}
           draggable={!s.locked}
           onDragStart={e=>{dragId.current=s.exhibitId;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(s.exhibitId))}catch{}}}
           onDragEnd={()=>{dragId.current=null;setOver(null)}}
           onDragOver={e=>rowOver(e,s.exhibitId)}
           onDrop={e=>rowDrop(e,r.id,s.exhibitId)}
           className={'station-row '+(s.locked?'locked ':'')+(dragId.current===s.exhibitId?'dragging ':'')+(over?.id===s.exhibitId?'drop-'+over.pos+' ':'')+(isLive?'':'is-draft')}>
           <span className="drag-handle" title={s.locked?'已锁定，不可拖动':'按住拖动'}>{s.locked?'🔒':'⠿'}</span>
           <span className="station-no">{pad(i+1)}</span>
           <span className="thumb" style={{background:s.ex.color}}>{pad(s.ex.id)}</span>
           <span className="row-copy"><strong>{s.ex.title}</strong><small>{s.ex.room} · {s.ex.type}</small></span>
           <span className={'status '+(isLive?'live':'draft')}>{s.ex.status}</span>
           <button className="mini" title={s.locked?'解锁':'锁定该站点'} onClick={()=>toggleLock(s.exhibitId)}>{s.locked?'解锁':'锁定'}</button>
           <button className="mini danger" title="移出路线" onClick={()=>removeStation(s.exhibitId)}>移除</button>
          </div>;
         })}
         {stops.length===0&&<p className="empty-tip">还没有站点，从下方候选展项中挑选。</p>}
         <div className={'route-end-zone '+(over?.id==='END'?'over':'')}
           onDragOver={e=>{e.preventDefault();setOver({id:'END'})}}
           onDrop={e=>{e.preventDefault();if(dragId.current!=null)moveStation(r.id,Number(dragId.current),'END');dragId.current=null;setOver(null)}}>{stops.length===0?'把站点拖到这里':'放到末尾'}</div>
        </div>
       </div>
       <div className="new-form candidate-block">
        <div className="panel-title"><div><span className="eyebrow">PICK STATIONS</span><h2>从现有展项挑选站点</h2></div></div>
        <p className="hint">列表包含全部展项（含草稿）。同一展项可以加入多条路线，各路线的顺序互不影响。</p>
        {exhibits.map(x=>{const added=inRoute(x.id);return <div className={'exhibit-row candidate '+(added?'added':'')} key={x.id}>
         <span className="thumb" style={{background:x.color}}>{pad(x.id)}</span>
         <span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span>
         <span className={'status '+(x.status==='已发布'?'live':'draft')}>{x.status}</span>
         <button className="mini" disabled={added} onClick={()=>addStation(x.id)}>{added?'已在路线中':'＋ 加入'}</button>
        </div>;})}
       </div>
      </div></>}
     </section>
    </div>
   </main>
   {rehearse!=null&&r&&<div className="modal-mask" onMouseDown={e=>{if(e.target===e.currentTarget)setRehearse(null)}}>
    <div className="modal">
     <div className="modal-head">
      <div><span className="eyebrow">ROUTE PREVIEW</span><h2>{r.name}</h2></div>
      <button className="modal-close" onClick={()=>setRehearse(null)}>×</button>
     </div>
     <div className="mode-toggle">
      <button className={rehearseMode==='internal'?'selected':''} onClick={()=>setRehearseMode('internal')}>内部演练 · 全部站点</button>
      <button className={rehearseMode==='visitor'?'selected':''} onClick={()=>setRehearseMode('visitor')}>访客视角 · 仅已发布</button>
     </div>
     <ol className="rehearse-list">
      {rehearsalStops.map((s,i)=><li key={s.exhibitId} className={s.ex.status==='已发布'?'':'draft-stop'}>
       <span className="stop-no">{pad(i+1)}</span>
       <span className="thumb" style={{background:s.ex.color}}>{pad(s.ex.id)}</span>
       <span className="row-copy"><strong>{s.ex.title}{s.locked&&<em className="lock-tag">🔒 锁定</em>}</strong><small>{s.ex.room} · {s.ex.type}</small></span>
       {s.ex.status!=='已发布'&&<span className="status draft">草稿 · 仅内部可见</span>}
      </li>)}
      {rehearsalStops.length===0&&<li className="empty-tip">访客视角下没有可展示的已发布站点。</li>}
     </ol>
     <p className="hint">{rehearseMode==='internal'?'草稿站点仅供馆员内部演练，访客打开路线时不会看到。':'未发布站点已隐藏，其余站点按原有先后顺序重新编号靠拢。'}</p>
     <div className="modal-foot"><button className="secondary" onClick={()=>setRehearse(null)}>关闭</button><button className="primary" onClick={()=>{setRehearse(null);setTourId(r.id);setView('routeView')}}>以访客视角打开 <span>↗</span></button></div>
    </div>
   </div>}
   {notice&&<div className="toast">{notice}</div>}
  </div>;
 }

 // ================= 馆员：展项内容工作台 =================
 return <div className="app"><aside><div className="brand"><span className="mark">M</span><span>展览工作台</span></div><div className="side-label">当前项目</div><div className="project"><span className="project-dot"></span><div><strong>潮汐之后</strong><small>2024 春季展</small></div><span>⌄</span></div><nav><button className="active">▧ <span>展项内容</span><b>{exhibits.length}</b></button><button onClick={()=>setView('routes')}>⌁ <span>展厅动线</span><b>{routes.length}</b></button><button>◉ <span>二维码</span></button></nav><div className="side-foot"><button>⚙ 设置</button><small>已自动保存 · 刚刚</small></div></aside><main className="workspace"><header className="topbar"><div><span className="eyebrow">EXHIBITION BUILDER</span><h1>展项内容</h1></div><div className="top-actions"><button className="secondary" onClick={exportData}>↓ 导出 JSON</button><button className="secondary" onClick={()=>setView('visitor')}>◉ 访客预览</button><button className="primary" onClick={publish}>{current?.status==='已发布'?'撤回发布':'发布更新'} <span>↗</span></button></div></header><div className="content"><section className="list-pane"><div className="list-head"><div><h2>全部展项</h2><span>{exhibits.length} 个展项</span></div><button className="add-btn" onClick={()=>document.querySelector('.form-panel').scrollIntoView({behavior:'smooth'})}>＋ 添加展项</button></div><div className="filters">{['全部','已发布','草稿'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><div className="exhibit-list">{visible.map(x=><button className={'exhibit-row '+(selected===x.id?'chosen':'')} key={x.id} onClick={()=>setSelected(x.id)}><span className="thumb" style={{background:x.color}}>{pad(x.id)}</span><span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span><span className={'status '+(x.status==='已发布'?'live':'draft')}>{x.status}</span><span className="chev">›</span></button>)}</div></section><section className="form-panel"><div className="panel-title"><div><span className="eyebrow">EDIT EXHIBIT</span><h2>编辑展项</h2></div><span className={'status '+(current?.status==='已发布'?'live':'draft')}>{current?.status}</span></div>{current&&<div className="editor"><label>展项标题<input value={current.title} onChange={e=>update('title',e.target.value)}/></label><div className="two"><label>所在展厅<input value={current.room} onChange={e=>update('room',e.target.value)}/></label><label>内容类型<select value={current.type} onChange={e=>update('type',e.target.value)}><option>装置</option><option>档案</option><option>互动</option><option>绘画</option></select></label></div><label>展项介绍<textarea rows="5" value={current.desc} onChange={e=>update('desc',e.target.value)}/></label><label>语音导览 URL<input value={current.audio} placeholder="https://…" onChange={e=>update('audio',e.target.value)}/><small className="hint">访客扫描二维码后可播放</small></label><div className="preview-block"><div className="preview-heading"><span>二维码预览</span><button onClick={()=>setNotice('二维码链接已复制')}>复制链接</button></div><div className="qr-preview"><div className="qr-box big">▦</div><div><strong>展项-{pad(current.id)}</strong><small>/guide/{current.id}</small></div></div></div></div>}<div className="new-form"><div className="panel-title"><div><span className="eyebrow">NEW ENTRY</span><h2>快速添加展项</h2></div></div><div className="two"><input placeholder="展项标题" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="展厅编号" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div><textarea placeholder="一句话介绍…" rows="2" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/><button className="primary full" onClick={add}>保存新展项</button></div></section></div></main>{notice&&<div className="toast">{notice}</div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
