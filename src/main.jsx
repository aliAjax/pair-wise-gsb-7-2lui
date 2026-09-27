import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const seed=[{id:1,title:'潮汐之后',room:'A01 · 主展厅',type:'装置',desc:'一件记录海岸线变化的沉浸式影像装置。',audio:'https://example.com/audio.mp3',status:'已发布',color:'#e6b45d'},{id:2,title:'未寄出的信',room:'B02 · 纸上时间',type:'档案',desc:'来自三代人的手写信件与声音档案。',audio:'',status:'草稿',color:'#ef8f84'},{id:3,title:'柔软的边界',room:'C01 · 新媒介',type:'互动',desc:'观众的移动会改变墙面上的光影。',audio:'',status:'已发布',color:'#83b9b1'}];
const seedRoutes=[{id:'r1',name:'团体导览 · 主路线',owner:'陈默',stations:[{exhibitId:1,locked:true},{exhibitId:2,locked:false},{exhibitId:3,locked:false}]}];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const pad=(n,w=2)=>String(n).padStart(w,'0');
const isPub=x=>x&&x.status==='已发布';
// 锁定站点是不可跨越的锚点：拖入位置会被夹在该站点所属的锁定区间内，
// 因此锁定站点的下标和前后关系都不变。
function clampAt(stations,from,at){
  let lo=-1,hi=stations.length;
  stations.forEach((s,i)=>{if(!s.locked)return;if(i<from)lo=Math.max(lo,i);else if(i>from)hi=Math.min(hi,i);});
  return Math.min(Math.max(at,lo+1),hi);
}
function moveStation(stations,from,at){
  const to=clampAt(stations,from,at);
  const next=stations.slice();
  const [it]=next.splice(from,1);
  next.splice(to>from?to-1:to,0,it);
  return next;
}
function App(){const [exhibits,setExhibits]=useState(()=>load('guide-exhibits',seed));const [routes,setRoutes]=useState(()=>load('guide-routes',seedRoutes));const [selected,setSelected]=useState(1);const [view,setView]=useState('edit');const [tab,setTab]=useState('content');const [filter,setFilter]=useState('全部');const [form,setForm]=useState({title:'',room:'',type:'装置',desc:'',audio:''});const [notice,setNotice]=useState('');
 const [routeId,setRouteId]=useState(seedRoutes[0].id);
 const [routeCtx,setRouteCtx]=useState(null); // 路线页：{id,rehearsal}
 const [detailCtx,setDetailCtx]=useState(null); // 从路线进入详情：{id,rehearsal,ids,index}
 const [drag,setDrag]=useState({from:null,at:null});
 useEffect(()=>localStorage.setItem('guide-exhibits',JSON.stringify(exhibits)),[exhibits]);
 useEffect(()=>localStorage.setItem('guide-routes',JSON.stringify(routes)),[routes]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2600);return ()=>clearTimeout(t);},[notice]);
 const visible=useMemo(()=>filter==='全部'?exhibits:exhibits.filter(x=>x.status===filter),[exhibits,filter]); const current=exhibits.find(x=>x.id===selected)||exhibits[0];
 const route=routes.find(r=>r.id===routeId)||routes[0];
 const pubs=r=>r?r.stations.filter(s=>isPub(exhibits.find(x=>x.id===s.exhibitId))):[];
 const add=()=>{if(!form.title.trim())return;const item={...form,id:Date.now(),status:'草稿',color:['#e6b45d','#ef8f84','#83b9b1','#9ba7dc'][exhibits.length%4]};setExhibits([...exhibits,item]);setSelected(item.id);setForm({title:'',room:'',type:'装置',desc:'',audio:''});setNotice('展项已保存为草稿');};
 const update=(k,v)=>setExhibits(exhibits.map(x=>x.id===current.id?{...x,[k]:v}:x));
 const publish=()=>{update('status',current.status==='已发布'?'草稿':'已发布');setNotice(current.status==='已发布'?'已撤回发布':'已发布，访客预览已更新');};
 const exportData=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({exhibits,routes},null,2)],{type:'application/json'}));a.download='exhibition-guide.json';a.click();setNotice('已导出展项与路线数据');};
 // —— 路线编排 ——
 const mutRoute=(id,fn)=>setRoutes(rs=>rs.map(r=>r.id===id?fn(r):r));
 const addRoute=()=>{const r={id:'r'+Date.now(),name:'新参观路线 '+(routes.length+1),owner:'',stations:[]};setRoutes([...routes,r]);setRouteId(r.id);};
 const delRoute=(id)=>{if(!window.confirm('删除这条路线？展项本身及其在其他路线中的顺序不受影响。'))return;const rest=routes.filter(r=>r.id!==id);setRoutes(rest);if(routeId===id)setRouteId(rest[0]&&rest[0].id);};
 const addStation=(rid,exId)=>mutRoute(rid,r=>({...r,stations:[...r.stations,{exhibitId:exId,locked:false}]}));
 const dropStation=(rid,from,at)=>mutRoute(rid,r=>({...r,stations:moveStation(r.stations,from,at)}));
 const nudgeStation=(rid,i,dir)=>mutRoute(rid,r=>({...r,stations:moveStation(r.stations,i,dir<0?i-1:i+2)}));
 const toggleLock=(rid,i)=>mutRoute(rid,r=>({...r,stations:r.stations.map((s,j)=>j===i?{...s,locked:!s.locked}:s)}));
 const removeStation=(rid,i)=>mutRoute(rid,r=>({...r,stations:r.stations.filter((_,j)=>j!==i)}));
 const onDragOverRow=(e,i)=>{if(drag.from===null||!route)return;e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();const at=clampAt(route.stations,drag.from,i+(e.clientY>rect.top+rect.height/2?1:0));if(at!==drag.at)setDrag({from:drag.from,at});};
 const endDrag=()=>setDrag({from:null,at:null});
 const dropList=e=>{e.preventDefault();const{from,at}=drag;if(from!==null&&at!==null&&at!==from&&at!==from+1){dropStation(route.id,from,at);setNotice('讲解顺序已更新，锁定站点的位置保持不变');}endDrag();};
 // —— 预览 / 访客流程 ——
 const goVisitor=()=>{setDetailCtx(null);setRouteCtx(null);setView('visitor');};
 const openRoute=(id,rehearsal)=>{setRouteCtx({id,rehearsal});setView('route');};
 const rc=routeCtx?routes.find(r=>r.id===routeCtx.id):null;
 const vStops=rc?(routeCtx.rehearsal?rc.stations:pubs(rc)):[];
 const openStop=i=>{const ids=vStops.map(s=>s.exhibitId);setDetailCtx({id:rc.id,rehearsal:routeCtx.rehearsal,ids,index:i});setSelected(ids[i]);setView('detail');};
 const openCard=id=>{setDetailCtx(null);setSelected(id);setView('detail');};
 const goStop=d=>{if(!detailCtx)return;const i=detailCtx.index+d;if(i<0||i>=detailCtx.ids.length)return;setDetailCtx({...detailCtx,index:i});setSelected(detailCtx.ids[i]);};

 if(view==='visitor') return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆</span></div><button className="ghost" onClick={()=>setView('edit')}>返回编辑</button></header><main className="visitor-main"><span className="eyebrow">VISITOR GUIDE / 2024</span><h1>沿着作品，<em>走进</em>另一种时间。</h1><p className="lead">当你靠近一件作品，它的故事就开始流动。团体观众可沿讲解路线参观，也可以选择任意展项自由浏览。</p>{routes.some(r=>pubs(r).length>0)&&<section className="visitor-routes"><span className="eyebrow">GROUP TOUR / 团体参观</span><h2>沿讲解顺序参观</h2><div className="route-cards">{routes.filter(r=>pubs(r).length>0).map(r=><button className="route-card" key={r.id} onClick={()=>openRoute(r.id,false)}><span className="route-card-ic">⌁</span><span className="route-card-copy"><strong>{r.name}</strong><small>{pubs(r).length} 个站点{r.owner?` · 负责人 ${r.owner}`:''}</small></span><span className="route-go">开始 →</span></button>)}</div></section>}<h2 className="browse-title">或按作品卡片浏览</h2><div className="visitor-grid">{exhibits.filter(x=>x.status==='已发布').map(x=><article className="visitor-card" key={x.id} onClick={()=>openCard(x.id)}><div className="art" style={{background:x.color}}><span>{pad(x.id)}</span><i>↗</i></div><div className="card-meta"><small>{x.room}</small><h3>{x.title}</h3><p>{x.desc}</p></div></article>)}</div></main></div>;
 if(view==='route'&&rc){const hidden=rc.stations.length-vStops.length;return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览路线</span></div><button className="ghost" onClick={()=>routeCtx.rehearsal?setView('edit'):goVisitor()}>← {routeCtx.rehearsal?'返回工作台':'全部展项'}</button></header>{routeCtx.rehearsal&&<div className="rehearse-banner">内部演练预览 · 含 {hidden} 个草稿站点；访客打开时草稿自动隐藏，其余站点按原顺序顺延编号</div>}<main className="route-page"><span className="eyebrow">TOUR ROUTE{routeCtx.rehearsal?' / REHEARSAL':''}</span><h1>{rc.name}</h1><p className="lead">共 {vStops.length} 站{rc.owner?` · 路线负责人 ${rc.owner}`:''}{routeCtx.rehearsal&&hidden?` · 另有 ${hidden} 个草稿站点仅内部可见`:''}</p>{vStops.length>0
  ?<button className="audio start-route" onClick={()=>openStop(0)}>开始参观 <span>→</span></button>
  :<p className="empty-note">这条路线还没有可展示的已发布站点，先去编排里发布或调整站点。</p>}
 <ol className="timeline">{vStops.map((s,i)=>{const x=exhibits.find(e=>e.id===s.exhibitId);if(!x)return null;const draft=x.status!=='已发布';return <li key={s.exhibitId}><button className={'stop'+(draft?' is-draft':'')} onClick={()=>openStop(i)}><span className="stop-no">{pad(i+1)}</span><span className="stop-art" style={{background:x.color}}>{pad(x.id)}</span><span className="stop-copy"><small>{x.room} · {x.type}{routeCtx.rehearsal&&s.locked?' · 🔒 已锁定':''}</small><strong>{x.title}</strong><em>{x.desc}</em></span>{draft&&<span className="status draft">草稿 · 访客不可见</span>}<span className="chev">›</span></button></li>;})}</ol></main>{notice&&<div className="toast">{notice}</div>}</div>;}
 if(view==='detail'&&current){const inRoute=!!detailCtx;return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览</span></div><button className="ghost" onClick={()=>inRoute?setView('route'):goVisitor()}>← {inRoute?'返回路线':'全部展项'}</button></header><main className="detail"><div className="detail-art" style={{background:current.color}}><span>{pad(current.id)}</span></div><div className="detail-copy"><span className="eyebrow">{current.room} / {current.type}{inRoute&&detailCtx.rehearsal?' / REHEARSAL':''}</span>{inRoute&&current.status!=='已发布'&&<span className="status draft detail-draft">草稿 · 内部演练</span>}<h1>{current.title}</h1><p>{current.desc}</p>{current.audio&&<button className="audio" onClick={()=>setNotice('正在播放导览音频…')}>▶ 播放语音导览</button>}{inRoute&&<div className="stop-nav"><button className="nav-btn" disabled={detailCtx.index===0} onClick={()=>goStop(-1)}>← 上一站</button><span>第 {detailCtx.index+1} / {detailCtx.ids.length} 站 · {routes.find(r=>r.id===detailCtx.id)?.name}</span><button className="nav-btn" disabled={detailCtx.index===detailCtx.ids.length-1} onClick={()=>goStop(1)}>下一站 →</button></div>}<div className="qr"><div className="qr-box">▦</div><div><strong>分享这个展项</strong><small>扫描二维码，在手机上继续阅读</small></div></div></div></main>{notice&&<div className="toast">{notice}</div>}</div>;}
 return <div className="app"><aside><div className="brand"><span className="mark">M</span><span>展览工作台</span></div><div className="side-label">当前项目</div><div className="project"><span className="project-dot"></span><div><strong>潮汐之后</strong><small>2024 春季展</small></div><span>⌄</span></div><nav><button className={tab==='content'?'active':''} onClick={()=>setTab('content')}>▧ <span>展项内容</span><b>{exhibits.length}</b></button><button className={tab==='routes'?'active':''} onClick={()=>setTab('routes')}>⌁ <span>展厅动线</span><b>{routes.length}</b></button><button>◉ <span>二维码</span></button></nav><div className="side-foot"><button>⚙ 设置</button><small>已自动保存 · 刚刚</small></div></aside><main className="workspace"><header className="topbar"><div><span className="eyebrow">EXHIBITION BUILDER</span><h1>{tab==='content'?'展项内容':'展厅动线'}</h1></div><div className="top-actions"><button className="secondary" onClick={exportData}>↓ 导出 JSON</button><button className="secondary" onClick={goVisitor}>◉ 访客预览</button>{tab==='content'&&<button className="primary" onClick={publish}>{current?.status==='已发布'?'撤回发布':'发布更新'} <span>↗</span></button>}</div></header>
 {tab==='routes'?
 <div className="content"><section className="list-pane"><div className="list-head"><div><h2>参观路线</h2><span>{routes.length} 条路线</span></div><button className="add-btn" onClick={addRoute}>＋ 新建路线</button></div><div className="exhibit-list route-list">{routes.map(r=>{const n=pubs(r).length;return <button className={'exhibit-row '+(route&&r.id===route.id?'chosen':'')} key={r.id} onClick={()=>setRouteId(r.id)}><span className="route-ic">⌁</span><span className="row-copy"><strong>{r.name||'未命名路线'}</strong><small>{r.stations.length} 站 · {n} 站已发布</small></span><span className="row-del" title="删除路线" onClick={e=>{e.stopPropagation();delRoute(r.id);}}>×</span><span className="chev">›</span></button>;})}{routes.length===0&&<p className="empty-note">还没有参观路线，点击「新建路线」开始编排。</p>}</div></section>
 <section className="form-panel route-panel">{route?<div className="route-builder">
 <div className="panel-title"><div><span className="eyebrow">TOUR ROUTE</span><h2>编排讲解顺序</h2></div><div className="route-actions"><button className="secondary" onClick={()=>openRoute(route.id,true)}>内部演练</button><button className="secondary" onClick={()=>openRoute(route.id,false)}>访客视角</button><button className="secondary danger" onClick={()=>delRoute(route.id)}>删除路线</button></div></div>
 <input className="route-title-input" value={route.name} placeholder="路线名称" onChange={e=>mutRoute(route.id,r=>({...r,name:e.target.value}))}/>
 <label className="owner-field">路线负责人<input value={route.owner||''} placeholder="未指定，如：陈默" onChange={e=>mutRoute(route.id,r=>({...r,owner:e.target.value}))}/></label>
 <div className="route-stat">{(()=>{const d=route.stations.filter(s=>!isPub(exhibits.find(x=>x.id===s.exhibitId))).length;const l=route.stations.filter(s=>s.locked).length;return <span>共 {route.stations.length} 站 · 已发布 {route.stations.length-d} · 草稿 {d} · 锁定 {l}</span>;})()}<small>草稿站点可排入内部演练；访客只看到已发布站点，编号自动顺延</small></div>
 <div className="stations-head"><strong>讲解顺序</strong><small>拖动手柄调整；锁定站点是不可跨越的锚点</small></div>
 <div className="station-list" onDragOver={e=>e.preventDefault()} onDrop={dropList}>
 {(()=>{const willMove=drag.from!==null&&drag.at!==drag.from&&drag.at!==drag.from+1;
 return <>{route.stations.map((s,i)=>{const x=exhibits.find(e=>e.id===s.exhibitId);if(!x)return null;const draft=x.status!=='已发布';const upOff=s.locked||i===0||route.stations[i-1].locked;const downOff=s.locked||i===route.stations.length-1||route.stations[i+1].locked;return <div key={s.exhibitId} className={'station'+(s.locked?' locked':'')+(willMove&&drag.at===i?' line-before':'')} draggable={!s.locked} onDragStart={()=>setDrag({from:i,at:null})} onDragOver={e=>onDragOverRow(e,i)} onDragEnd={endDrag}>
 <span className="drag-handle" title={s.locked?'站点已锁定，位置和前后关系固定':'拖动调整顺序'}>{s.locked?'🔒':'⋮⋮'}</span>
 <span className="station-no">{pad(i+1)}</span>
 <span className="thumb" style={{background:x.color}}>{pad(x.id)}</span>
 <span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span>
 {draft&&<span className="status draft">草稿</span>}
 <span className="station-tools"><button title="上移一站" disabled={upOff} onClick={()=>nudgeStation(route.id,i,-1)}>↑</button><button title="下移一站" disabled={downOff} onClick={()=>nudgeStation(route.id,i,1)}>↓</button><button className={s.locked?'is-locked':''} title={s.locked?'取消锁定':'锁定该站点位置'} onClick={()=>{toggleLock(route.id,i);setNotice(s.locked?'已取消锁定':'站点已锁定，拖动其他站点时不会越过它');}}>{s.locked?'解锁':'锁定'}</button><button title="移出路线" onClick={()=>removeStation(route.id,i)}>×</button></span>
 </div>;})}
 {willMove&&drag.at===route.stations.length&&route.stations.length>0&&<div className="drop-line tail"/>}
 {route.stations.length===0&&<p className="empty-note">还没有站点，从下方展项中挑选。</p>}
 </>;})()}
 </div>
 <div className="stations-head second"><strong>从现有展项挑选站点</strong><small>同一展项可出现在不同路线，各路线顺序独立保存、互不覆盖</small></div>
 <div className="add-grid">{exhibits.filter(x=>!route.stations.some(s=>s.exhibitId===x.id)).map(x=><div className="add-row" key={x.id}><span className="thumb" style={{background:x.color}}>{pad(x.id)}</span><span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span>{x.status!=='已发布'&&<span className="status draft">草稿</span>}<button className="add-stop-btn" onClick={()=>{addStation(route.id,x.id);setNotice(x.status==='已发布'?'已加入路线末尾':'草稿站点已加入，仅内部演练可见');}}>＋ 设为站点</button></div>)}{exhibits.length>0&&exhibits.every(x=>route.stations.some(s=>s.exhibitId===x.id))&&<p className="empty-note">所有展项都已在这条路线中。</p>}</div>
 </div>:<p className="empty-note">还没有参观路线，点击左侧「新建路线」开始编排。</p>}</section></div>
 :
 <div className="content"><section className="list-pane"><div className="list-head"><div><h2>全部展项</h2><span>{exhibits.length} 个展项</span></div><button className="add-btn" onClick={()=>document.querySelector('.form-panel').scrollIntoView({behavior:'smooth'})}>＋ 添加展项</button></div><div className="filters">{['全部','已发布','草稿'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><div className="exhibit-list">{visible.map(x=><button className={'exhibit-row '+(selected===x.id?'chosen':'')} key={x.id} onClick={()=>setSelected(x.id)}><span className="thumb" style={{background:x.color}}>{pad(x.id)}</span><span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span><span className={'status '+(x.status==='已发布'?'live':'draft')}>{x.status}</span><span className="chev">›</span></button>)}</div></section><section className="form-panel"><div className="panel-title"><div><span className="eyebrow">EDIT EXHIBIT</span><h2>编辑展项</h2></div><span className={'status '+(current?.status==='已发布'?'live':'draft')}>{current?.status}</span></div>{current&&<div className="editor"><label>展项标题<input value={current.title} onChange={e=>update('title',e.target.value)}/></label><div className="two"><label>所在展厅<input value={current.room} onChange={e=>update('room',e.target.value)}/></label><label>内容类型<select value={current.type} onChange={e=>update('type',e.target.value)}><option>装置</option><option>档案</option><option>互动</option><option>绘画</option></select></label></div><label>展项介绍<textarea rows="5" value={current.desc} onChange={e=>update('desc',e.target.value)}/></label><label>语音导览 URL<input value={current.audio} placeholder="https://…" onChange={e=>update('audio',e.target.value)}/><small className="hint">访客扫描二维码后可播放</small></label><div className="preview-block"><div className="preview-heading"><span>二维码预览</span><button onClick={()=>setNotice('二维码链接已复制')}>复制链接</button></div><div className="qr-preview"><div className="qr-box big">▦</div><div><strong>展项-{pad(current.id,3)}</strong><small>/guide/{current.id}</small></div></div></div></div>}<div className="new-form"><div className="panel-title"><div><span className="eyebrow">NEW ENTRY</span><h2>快速添加展项</h2></div></div><div className="two"><input placeholder="展项标题" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="展厅编号" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div><textarea placeholder="一句话介绍…" rows="2" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/><button className="primary full" onClick={add}>保存新展项</button></div></section></div>}
 </main>{notice&&<div className="toast">{notice}</div>}</div>;}
createRoot(document.getElementById('root')).render(<App/>);
