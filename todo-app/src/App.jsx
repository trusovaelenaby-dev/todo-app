import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split("T")[0];
const CATS = { work:"Работа", personal:"Личное", other:"Прочее" };
const CAT_COLORS = {
  work:     { bg:"#dce8ff", text:"#2d4fa3" },
  personal: { bg:"#ffe5d8", text:"#8b3a1a" },
  other:    { bg:"#dff2e1", text:"#2e6e3a" },
};
const CONFETTI_COLS = ["#f9a825","#e53935","#1e88e5","#43a047","#8e24aa","#fb8c00","#00acc1","#f06292","#ffeb3b"];

const SAMPLES = [
  { id:"s1", text:"Утренняя зарядка 🏃", category:"personal", type:"permanent", createdAt:todayKey(), paused:false, pauseFrom:null, pauseTo:null, pauseReason:"" },
  { id:"s2", text:"Выпить 8 стаканов воды 💧", category:"personal", type:"permanent", createdAt:todayKey(), paused:false, pauseFrom:null, pauseTo:null, pauseReason:"" },
  { id:"s3", text:"Проверить рабочую почту", category:"work", type:"permanent", createdAt:todayKey(), paused:false, pauseFrom:null, pauseTo:null, pauseReason:"" },
  { id:"s4", text:"Написать квартальный отчёт", category:"work", type:"temporary", createdAt:todayKey(), done:false, doneAt:null, dueDate:todayKey() },
  { id:"s5", text:"Купить подарок другу 🎁", category:"personal", type:"temporary", createdAt:todayKey(), done:false, doneAt:null, dueDate:todayKey() },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn(e); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate()-n);
  return d.toISOString().split("T")[0];
}
function dateRange(from, to) {
  const out=[], cur=new Date(from+"T12:00:00"), end=new Date(to+"T12:00:00");
  while(cur<=end){ out.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate()+1); }
  return out;
}
function fmtDay(s) { return new Date(s+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"}); }
function fmtWeekday(s) { return new Date(s+"T12:00:00").toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"}); }

function isPausedOn(task, date) {
  if (task.type!=="permanent" || !task.paused || !task.pauseFrom || !task.pauseTo) return false;
  return date >= task.pauseFrom && date <= task.pauseTo;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function ConfettiLayer({ trigger }) {
  const cvs = useRef(null), pRef = useRef([]), raf = useRef(null);
  useEffect(()=>{
    const c=cvs.current; if(!c) return;
    const resize=()=>{c.width=window.innerWidth;c.height=window.innerHeight;};
    resize(); window.addEventListener("resize",resize);
    const ctx=c.getContext("2d");
    const tick=()=>{
      ctx.clearRect(0,0,c.width,c.height);
      pRef.current=pRef.current.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+0.45,vx:p.vx*0.98,rot:p.rot+p.rs,alpha:p.alpha-0.016})).filter(p=>p.alpha>0);
      pRef.current.forEach(p=>{
        ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.fillStyle=p.col;
        ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
        if(p.shape==="r") ctx.fillRect(-p.sz/2,-p.sz/2,p.sz,p.sz*0.55);
        else{ctx.beginPath();ctx.ellipse(0,0,p.sz/2,p.sz/3,0,0,Math.PI*2);ctx.fill();}
        ctx.restore();
      });
      raf.current=requestAnimationFrame(tick);
    };
    tick();
    return()=>{cancelAnimationFrame(raf.current);window.removeEventListener("resize",resize);};
  },[]);
  useEffect(()=>{
    if(!trigger) return;
    const{x,y}=trigger;
    pRef.current=[...pRef.current,...Array.from({length:65},(_,i)=>({
      id:Date.now()+i,x,y,vx:(Math.random()-.5)*16,vy:-(Math.random()*13+3),
      col:CONFETTI_COLS[i%CONFETTI_COLS.length],sz:Math.random()*10+4,
      rot:Math.random()*360,rs:(Math.random()-.5)*22,alpha:1,shape:Math.random()>.45?"r":"e",
    }))];
  },[trigger]);
  return <canvas ref={cvs} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",zIndex:9999}}/>;
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, done, paused, onToggle, onDelete, onEdit, index, forDate }) {
  const cc = CAT_COLORS[task.category]||CAT_COLORS.other;
  const date = forDate || todayKey();
  const isOverdue = task.type==="temporary" && !done && task.dueDate && task.dueDate<date;
  const isFuture  = task.type==="temporary" && !done && task.dueDate && task.dueDate>date;
  return (
    <div className={`tr ${done?"tr-done":""} ${isOverdue?"tr-overdue":""} ${paused?"tr-paused":""}`}
      onClick={e=>(!done&&!paused)&&onToggle(task.id,e)}>
      <div className="task-num">{index}</div>
      <div className={`chk ${done?"chk-on":""} ${paused?"chk-pause":""}`}>
        {done?"✓": paused?"⏸":""}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <span className={`tt ${done?"tt-s":""} ${paused?"tt-p":""}`}>{task.text}</span>
        {paused && task.pauseReason && (
          <div style={{fontSize:10,color:"#9c7c00",marginTop:2,fontStyle:"italic"}}>
            ⏸ {task.pauseReason}
          </div>
        )}
        {task.dueDate && !paused && (
          <div style={{marginTop:3}}>
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,display:"inline-flex",alignItems:"center",gap:3,
              background:isOverdue?"#fde8e8":isFuture?"#e8f0ff":done?"#e8f5e9":"#fff3e0",
              color:isOverdue?"#c0392b":isFuture?"#2d4fa3":done?"#2e6e3a":"#8b5a00",
              border:`1px solid ${isOverdue?"#f5c6c6":isFuture?"#b8d0f8":done?"#b8e0bc":"#f0d8a8"}`,
            }}>
              {isOverdue?"⚠ просрочено · ":isFuture?"🗓 запланировано · ":done?"✓ выполнено · ":"📅 "}
              {fmtDay(task.dueDate)}
            </span>
          </div>
        )}
        {paused && task.pauseFrom && task.pauseTo && (
          <div style={{fontSize:10,color:"#9c7c00",marginTop:2}}>
            Пауза: {fmtDay(task.pauseFrom)} — {fmtDay(task.pauseTo)}
          </div>
        )}
      </div>
      <span className="cbadge" style={{background:cc.bg,color:cc.text,flexShrink:0}}>{CATS[task.category]}</span>
      {onEdit && <button className="editbtn" title="Редактировать" onClick={e=>{e.stopPropagation();onEdit(task);}}>✎</button>}
      {onDelete && <button className="delbtn" onClick={e=>{e.stopPropagation();onDelete(task.id);}}>×</button>}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onAdd, onClose }) {
  const [text,setText]     = useState("");
  const [cat,setCat]       = useState("personal");
  const [type,setType]     = useState("temporary");
  const [dueDate,setDueDate] = useState(todayKey());

  const submit = () => {
    if(!text.trim()) return;
    onAdd({ text:text.trim(), category:cat, type, dueDate:type==="temporary"?dueDate:null });
    onClose();
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={S.modalTitle}>Новая задача</h2>
        <input className="minput" autoFocus placeholder="Название задачи..."
          value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <div style={S.mrow}>
          <div style={S.mlabel}>Категория</div>
          <div style={S.bgroup}>{Object.entries(CATS).map(([id,lbl])=>(
            <button key={id} className={`sb ${cat===id?"sb-a":""}`} onClick={()=>setCat(id)}>{lbl}</button>
          ))}</div>
        </div>
        <div style={S.mrow}>
          <div style={S.mlabel}>Подраздел</div>
          <div style={S.bgroup}>
            <button className={`sb wide ${type==="permanent"?"sb-a":""}`} onClick={()=>setType("permanent")}>🔁 Постоянная</button>
            <button className={`sb wide ${type==="temporary"?"sb-a":""}`} onClick={()=>setType("temporary")}>⏳ Временная</button>
          </div>
        </div>
        {type==="temporary" && (
          <div style={S.mrow}>
            <div style={S.mlabel}>Дата выполнения</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="date" className="dinput" style={{fontSize:14,padding:"8px 12px",borderRadius:8}}
                value={dueDate} min={todayKey()} onChange={e=>setDueDate(e.target.value)}/>
              <span style={{fontSize:12,color:"#8b7355"}}>{dueDate===todayKey()?"сегодня":fmtDay(dueDate)}</span>
            </div>
          </div>
        )}
        <div style={S.mhint}>
          {type==="permanent"?"Появляется каждый день заново. Выполнение сбрасывается в полночь."
            :dueDate===todayKey()?"Задача отображается сегодня.":`Задача появится ${fmtDay(dueDate)}.`}
        </div>
        <div style={S.mfooter}>
          <button className="mbtn-cancel" onClick={onClose}>Отмена</button>
          <button className="mbtn-add" onClick={submit}>Добавить →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ task, onSave, onClose }) {
  const [text,setText]           = useState(task.text);
  const [cat,setCat]             = useState(task.category);
  const [type,setType]           = useState(task.type);
  const [dueDate,setDueDate]     = useState(task.dueDate||todayKey());
  const [paused,setPaused]       = useState(task.paused||false);
  const [pauseFrom,setPauseFrom] = useState(task.pauseFrom||todayKey());
  const [pauseTo,setPauseTo]     = useState(task.pauseTo||todayKey());
  const [pauseReason,setPauseReason] = useState(task.pauseReason||"");

  const submit = () => {
    if(!text.trim()) return;
    onSave({
      ...task, text:text.trim(), category:cat, type,
      ...(type==="temporary"
        ? {dueDate, paused:false, pauseFrom:null, pauseTo:null, pauseReason:""}
        : {dueDate:null, paused, pauseFrom:paused?pauseFrom:null, pauseTo:paused?pauseTo:null, pauseReason:paused?pauseReason:""}),
    });
    onClose();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal, maxHeight:"90vh", overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h2 style={S.modalTitle}>Редактировать задачу</h2>
        <input className="minput" autoFocus placeholder="Название задачи..."
          value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <div style={S.mrow}>
          <div style={S.mlabel}>Категория</div>
          <div style={S.bgroup}>{Object.entries(CATS).map(([id,lbl])=>(
            <button key={id} className={`sb ${cat===id?"sb-a":""}`} onClick={()=>setCat(id)}>{lbl}</button>
          ))}</div>
        </div>
        <div style={S.mrow}>
          <div style={S.mlabel}>Подраздел</div>
          <div style={S.bgroup}>
            <button className={`sb wide ${type==="permanent"?"sb-a":""}`} onClick={()=>setType("permanent")}>🔁 Постоянная</button>
            <button className={`sb wide ${type==="temporary"?"sb-a":""}`} onClick={()=>setType("temporary")}>⏳ Временная</button>
          </div>
        </div>
        {type==="temporary" && (
          <div style={S.mrow}>
            <div style={S.mlabel}>Дата выполнения</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="date" className="dinput" style={{fontSize:14,padding:"8px 12px",borderRadius:8}}
                value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
              <span style={{fontSize:12,color:"#8b7355"}}>{dueDate===todayKey()?"сегодня":fmtDay(dueDate)}</span>
            </div>
          </div>
        )}

        {/* ── Pause section (permanent only) ── */}
        {type==="permanent" && (
          <div style={{background:"#fffbf0",border:"1.5px solid #e8ddc8",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#2d1f0f"}}>⏸ Приостановить задачу</div>
                <div style={{fontSize:11,color:"#8b7355",marginTop:2}}>Задача скрывается и не учитывается в прогрессе</div>
              </div>
              <button className={`toggle-btn ${paused?"toggle-on":""}`} onClick={()=>setPaused(v=>!v)}>
                {paused?"Вкл":"Выкл"}
              </button>
            </div>
            {paused && (
              <>
                <div style={S.mrow}>
                  <div style={S.mlabel}>Период паузы</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <input type="date" className="dinput" value={pauseFrom} onChange={e=>setPauseFrom(e.target.value)}/>
                    <span style={{fontSize:12,color:"#8b7355"}}>—</span>
                    <input type="date" className="dinput" value={pauseTo} min={pauseFrom} onChange={e=>setPauseTo(e.target.value)}/>
                  </div>
                </div>
                <div style={S.mrow}>
                  <div style={S.mlabel}>Причина паузы</div>
                  <input className="minput" placeholder="Например: отпуск, болезнь..."
                    value={pauseReason} onChange={e=>setPauseReason(e.target.value)}/>
                </div>
              </>
            )}
          </div>
        )}

        <div style={S.mfooter}>
          <button className="mbtn-cancel" onClick={onClose}>Отмена</button>
          <button className="mbtn-add" onClick={submit}>Сохранить →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats View ───────────────────────────────────────────────────────────────
function StatsView({ tasks, completions }) {
  const [from,setFrom] = useState(daysAgo(13));
  const [to,setTo]     = useState(todayKey());
  const [tf,setTf]     = useState("all");
  const [cf,setCf]     = useState("all");

  const dates  = dateRange(from,to).slice(-30);
  const fTasks = tasks.filter(t=>(tf==="all"||t.type===tf)&&(cf==="all"||t.category===cf));

  const cellStatus = (task,date) => {
    if(date<task.createdAt) return "before";
    if(isPausedOn(task,date)) return "paused";
    if(task.type==="temporary"){
      if(!task.done) return "pending";
      if(task.doneAt===date) return "done";
      return date>task.doneAt?"after":"pending";
    }
    return completions[date]?.[task.id]?"done":"missed";
  };

  const summary = (task) => {
    if(task.type==="temporary")
      return task.done?{txt:`✓ ${fmtDay(task.doneAt)}`,pct:100,color:"#2e6e3a"}:{txt:"В процессе",pct:null,color:"#c07b5a"};
    const valid=dates.filter(d=>d>=task.createdAt&&!isPausedOn(task,d));
    if(!valid.length) return{txt:"—",pct:null,color:"#b8a88a"};
    const done=valid.filter(d=>completions[d]?.[task.id]).length;
    const pct=Math.round(done/valid.length*100);
    return{txt:`${pct}%`,pct,color:pct>=70?"#2e6e3a":pct>=40?"#9c7c00":"#8b3a1a"};
  };

  const cellStyle = (status) => {
    const b={width:26,height:26,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0};
    if(status==="done")   return{...b,background:"#3d2c1e",color:"#f5f0e8"};
    if(status==="missed") return{...b,background:"#f0ebe0",color:"#c4a97d"};
    if(status==="paused") return{...b,background:"#fff8e0",color:"#e6a817"};
    if(status==="pending")return{...b,background:"#f8f4ec",color:"#d9cdb8"};
    if(status==="after")  return{...b,background:"#c8f0ce",color:"#2e6e3a",fontSize:11};
    return{...b,background:"transparent"};
  };

  const permTasks=fTasks.filter(t=>t.type==="permanent");
  const totalSlots=permTasks.reduce((a,t)=>a+dates.filter(d=>d>=t.createdAt&&!isPausedOn(t,d)).length,0);
  const doneSlots=permTasks.reduce((a,t)=>a+dates.filter(d=>d>=t.createdAt&&!isPausedOn(t,d)&&completions[d]?.[t.id]).length,0);
  const overallPct=totalSlots>0?Math.round(doneSlots/totalSlots*100):null;

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={S.slbl}>Период:</span>
          <input type="date" className="dinput" value={from} max={to} onChange={e=>setFrom(e.target.value)}/>
          <span style={S.slbl}>—</span>
          <input type="date" className="dinput" value={to} min={from} max={todayKey()} onChange={e=>setTo(e.target.value)}/>
          {[7,14,30].map(n=>(
            <button key={n} className="sb" style={{fontSize:11,padding:"4px 10px"}}
              onClick={()=>{setFrom(daysAgo(n-1));setTo(todayKey());}}>{n}д</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["all","Все"],["permanent","🔁 Постоянные"],["temporary","⏳ Временные"]].map(([id,lbl])=>(
            <button key={id} className={`sb ${tf===id?"sb-a":""}`} onClick={()=>setTf(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["all","Все категории"],...Object.entries(CATS)].map(([id,lbl])=>(
            <button key={id} className={`sb ${cf===id?"sb-a":""}`} onClick={()=>setCf(id)}>{lbl}</button>
          ))}
        </div>
      </div>
      {overallPct!==null&&(
        <div style={S.banner}>
          <div style={{fontSize:12,color:"#5a4027",marginBottom:4}}>Общий % выполнения (постоянные, без пауз)</div>
          <div style={{fontSize:28,fontFamily:"'Playfair Display',serif",fontWeight:700,
            color:overallPct>=70?"#2e6e3a":overallPct>=40?"#9c7c00":"#8b3a1a"}}>{overallPct}%</div>
          <div style={{height:6,background:"#e8ddc8",borderRadius:3,overflow:"hidden",marginTop:6}}>
            <div style={{height:"100%",width:`${overallPct}%`,borderRadius:3,transition:"width .6s",
              background:overallPct>=70?"#43a047":overallPct>=40?"#f9a825":"#e53935"}}/>
          </div>
        </div>
      )}
      {fTasks.length===0
        ?<div style={{textAlign:"center",padding:"40px 0",color:"#b8a88a",fontSize:13}}>Нет задач для отображения</div>
        :(
          <div style={{overflowX:"auto",borderRadius:10,border:"1.5px solid #d9cdb8"}}>
            <table style={S.stbl}>
              <thead>
                <tr style={{borderBottom:"1px solid #e8ddc8"}}>
                  <th style={{...S.sth,...S.stnm,textAlign:"left",color:"#8b7355",fontWeight:400,paddingLeft:10}}>Задача</th>
                  {dates.map(d=>(
                    <th key={d} style={{...S.sth,width:28,textAlign:"center",padding:"8px 3px 2px",
                      color:d===todayKey()?"#c07b5a":"#b8a88a",fontWeight:d===todayKey()?700:400,fontSize:10}}>
                      {new Date(d+"T12:00:00").getDate()}
                    </th>
                  ))}
                  <th style={{...S.sth,width:96,textAlign:"center",color:"#8b7355",fontWeight:400,paddingRight:10}}>Итог</th>
                </tr>
                <tr style={{borderBottom:"1.5px dashed #e8ddc8"}}>
                  <td style={{paddingBottom:5,paddingLeft:10,fontSize:9,color:"#c4a97d"}}/>
                  {dates.map(d=>(
                    <td key={d} style={{textAlign:"center",fontSize:9,color:"#c4a97d",paddingBottom:5}}>
                      {["вс","пн","вт","ср","чт","пт","сб"][new Date(d+"T12:00:00").getDay()]}
                    </td>
                  ))}
                  <td/>
                </tr>
              </thead>
              <tbody>
                {fTasks.map((task,i)=>{
                  const sum=summary(task);
                  const cc=CAT_COLORS[task.category]||CAT_COLORS.other;
                  return(
                    <tr key={task.id} style={{borderTop:i>0?"1px dashed #f0e8d8":"none",background:i%2===0?"#fffdf7":"#fffbf4"}}>
                      <td style={{...S.stnm,padding:"9px 8px 9px 10px"}}>
                        <div style={{fontSize:12,color:"#2d1f0f",lineHeight:1.4}}>{task.text}</div>
                        <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:9,background:cc.bg,color:cc.text,padding:"1px 6px",borderRadius:10}}>{CATS[task.category]}</span>
                          <span style={{fontSize:9,background:task.type==="permanent"?"#fff3e0":"#f3e5f5",
                            color:task.type==="permanent"?"#e65100":"#6a1b9a",padding:"1px 6px",borderRadius:10}}>
                            {task.type==="permanent"?"🔁 постоянная":"⏳ временная"}
                          </span>
                          {task.paused&&<span style={{fontSize:9,background:"#fff8e0",color:"#9c7c00",padding:"1px 6px",borderRadius:10}}>⏸ пауза</span>}
                        </div>
                      </td>
                      {dates.map(d=>{
                        const st=cellStatus(task,d);
                        return(
                          <td key={d} style={{padding:"4px 3px",textAlign:"center"}}>
                            <div style={{...cellStyle(st),margin:"0 auto"}}>
                              {st==="done"?"✓":st==="missed"?"·":st==="paused"?"⏸":st==="after"?"✓":""}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{padding:"8px 10px 8px 4px",textAlign:"center",minWidth:90}}>
                        {sum.pct!==null?(
                          <div>
                            <div style={{fontSize:15,fontWeight:700,color:sum.color,fontFamily:"'Playfair Display',serif"}}>{sum.txt}</div>
                            <div style={{height:3,background:"#e8ddc8",borderRadius:2,overflow:"hidden",marginTop:3}}>
                              <div style={{height:"100%",width:`${sum.pct}%`,borderRadius:2,
                                background:sum.pct>=70?"#43a047":sum.pct>=40?"#f9a825":"#e53935"}}/>
                            </div>
                          </div>
                        ):<span style={{fontSize:11,color:sum.color}}>{sum.txt}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
      <div style={{fontSize:10,color:"#c4a97d",marginTop:10,textAlign:"right"}}>
        ✓ выполнено · · не выполнено · ⏸ пауза · — до создания
      </div>
    </div>
  );
}

// ─── Journal View ─────────────────────────────────────────────────────────────
function JournalView({ tasks, completions, onEdit, onDelete }) {
  const [date, setDate] = useState(todayKey());

  // Permanent tasks active on this date (not paused)
  const permOnDate   = tasks.filter(t=>t.type==="permanent" && t.createdAt<=date);
  const permPaused   = permOnDate.filter(t=>isPausedOn(t,date));
  const permActive   = permOnDate.filter(t=>!isPausedOn(t,date));
  const permDone     = permActive.filter(t=>completions[date]?.[t.id]);
  const permNotDone  = permActive.filter(t=>!completions[date]?.[t.id]);

  // Temporary tasks relevant to this date
  const tempOnDate   = tasks.filter(t=>t.type==="temporary" && (
    t.dueDate===date || (t.done && t.doneAt===date) || (!t.done && t.dueDate<date && t.createdAt<=date)
  ));
  const tempDone     = tempOnDate.filter(t=>t.done && t.doneAt===date);
  const tempNotDone  = tempOnDate.filter(t=>!t.done);
  const tempOverdue  = tempNotDone.filter(t=>t.dueDate<date);
  const tempScheduled= tempNotDone.filter(t=>t.dueDate===date);

  const total  = permActive.length + tempOnDate.length;
  const done   = permDone.length + tempDone.length;
  const pct    = total>0 ? Math.round(done/total*100) : 0;

  const JRow = ({task,done:d,paused:p,idx})=>{
    const cc=CAT_COLORS[task.category]||CAT_COLORS.other;
    return(
      <div className={`jrow ${d?"jrow-done":""} ${p?"jrow-paused":""}`}>
        <div style={{width:18,fontSize:11,color:"#c4a97d",textAlign:"right",flexShrink:0}}>{idx}</div>
        <div style={{width:22,height:22,border:`2px solid ${d?"#3d2c1e":p?"#e6a817":"#c4a97d"}`,borderRadius:5,
          flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
          background:d?"#3d2c1e":p?"#fff8e0":"transparent",color:d?"#f5f0e8":p?"#e6a817":"transparent"}}>
          {d?"✓":p?"⏸":""}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"#2d1f0f",
            textDecoration:d?"line-through":"none",opacity:d||p?0.55:1}}>{task.text}</span>
          {p&&task.pauseReason&&<div style={{fontSize:10,color:"#9c7c00",fontStyle:"italic",marginTop:2}}>⏸ {task.pauseReason}</div>}
          {task.dueDate&&task.type==="temporary"&&(
            <div style={{fontSize:10,color:"#8b7355",marginTop:1}}>📅 {fmtDay(task.dueDate)}</div>
          )}
        </div>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:cc.bg,color:cc.text,flexShrink:0}}>{CATS[task.category]}</span>
        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,flexShrink:0,
          background:task.type==="permanent"?"#fff3e0":"#f3e5f5",
          color:task.type==="permanent"?"#e65100":"#6a1b9a"}}>
          {task.type==="permanent"?"🔁":"⏳"}
        </span>
        <button className="editbtn" title="Редактировать" onClick={e=>{e.stopPropagation();onEdit(task);}}>✎</button>
        <button className="delbtn" onClick={e=>{e.stopPropagation();onDelete(task.id);}}>×</button>
      </div>
    );
  };

  const allRows=[
    ...permDone.map((t,i)=>({task:t,done:true,paused:false,idx:i+1})),
    ...permNotDone.map((t,i)=>({task:t,done:false,paused:false,idx:permDone.length+i+1})),
    ...permPaused.map((t,i)=>({task:t,done:false,paused:true,idx:permDone.length+permNotDone.length+i+1})),
    ...tempDone.map((t,i)=>({task:t,done:true,paused:false,idx:i+1})),
    ...tempScheduled.map((t,i)=>({task:t,done:false,paused:false,idx:tempDone.length+i+1})),
    ...tempOverdue.map((t,i)=>({task:t,done:false,paused:false,idx:tempDone.length+tempScheduled.length+i+1})),
  ];

  return (
    <div>
      {/* Date picker */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <span style={S.slbl}>Дата:</span>
        <input type="date" className="dinput" style={{fontSize:14,padding:"8px 12px",borderRadius:8}}
          value={date} max={todayKey()} onChange={e=>setDate(e.target.value)}/>
        <span style={{fontSize:12,color:"#8b7355",textTransform:"capitalize"}}>{fmtWeekday(date)}</span>
        <button className="sb" style={{fontSize:11,padding:"4px 10px",marginLeft:"auto"}}
          onClick={()=>setDate(todayKey())}>Сегодня</button>
      </div>

      {/* Summary */}
      <div style={{...S.banner,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:12,color:"#5a4027",marginBottom:2}}>Итог дня</div>
            <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:700,
              color:pct===100?"#2e6e3a":pct>=50?"#9c7c00":"#8b3a1a"}}>
              {pct===100?"🎉 Всё выполнено!":pct===0&&total===0?"Нет задач":`${done} из ${total} · ${pct}%`}
            </div>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#2e6e3a"}}>{done}</div>
              <div style={{fontSize:10,color:"#8b7355"}}>выполнено</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#c07b5a"}}>{total-done}</div>
              <div style={{fontSize:10,color:"#8b7355"}}>не выполнено</div>
            </div>
            {permPaused.length>0&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:"#9c7c00"}}>{permPaused.length}</div>
                <div style={{fontSize:10,color:"#8b7355"}}>на паузе</div>
              </div>
            )}
          </div>
        </div>
        {total>0&&(
          <div style={{height:6,background:"#e8ddc8",borderRadius:3,overflow:"hidden",marginTop:10}}>
            <div style={{height:"100%",width:`${pct}%`,borderRadius:3,transition:"width .6s",
              background:pct>=70?"#43a047":pct>=40?"#f9a825":"#e53935"}}/>
          </div>
        )}
      </div>

      {/* Task list */}
      {allRows.length===0
        ?<div style={{textAlign:"center",padding:"40px 0",color:"#b8a88a",fontSize:13}}>Нет задач на эту дату</div>
        :(
          <div>
            {permActive.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:"#8b7355",marginBottom:6,paddingLeft:2}}>
                  🔁 Постоянные · {permDone.length}/{permActive.length}
                </div>
                <div style={{borderRadius:10,border:"1.5px solid #d9cdb8",overflow:"hidden"}}>
                  {[...permDone,...permNotDone].map((t,i)=>(
                    <JRow key={t.id} task={t} done={!!completions[date]?.[t.id]} paused={false} idx={i+1}/>
                  ))}
                </div>
              </div>
            )}
            {permPaused.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:"#9c7c00",marginBottom:6,paddingLeft:2}}>
                  ⏸ На паузе · {permPaused.length}
                </div>
                <div style={{borderRadius:10,border:"1.5px solid #e8ddc8",overflow:"hidden"}}>
                  {permPaused.map((t,i)=><JRow key={t.id} task={t} done={false} paused={true} idx={i+1}/>)}
                </div>
              </div>
            )}
            {tempOnDate.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:"#8b7355",marginBottom:6,paddingLeft:2}}>
                  ⏳ Временные · {tempDone.length}/{tempOnDate.length}
                </div>
                <div style={{borderRadius:10,border:"1.5px solid #d9cdb8",overflow:"hidden"}}>
                  {[...tempDone,...tempScheduled,...tempOverdue].map((t,i)=>(
                    <JRow key={t.id} task={t} done={t.done&&t.doneAt===date} paused={false} idx={i+1}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, done, total, children }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#2d1f0f",flex:1}}>{title}</span>
        <span style={{fontSize:11,color:"#8b7355"}}>{done}/{total}</span>
      </div>
      <div style={{fontSize:10,color:"#b8a88a",marginBottom:9,paddingLeft:24}}>{subtitle}</div>
      <div style={{borderRadius:10,border:"1.5px solid #d9cdb8",overflow:"hidden"}}>{children}</div>
    </div>
  );
}
function Empty({text}){return<div style={{padding:"18px 16px",textAlign:"center",fontSize:12,color:"#b8a88a",fontStyle:"italic"}}>{text}</div>;}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks,setTasks]       = useState(()=>load("tdtasks-v4",SAMPLES));
  const [completions,setCompl] = useState(()=>load("tdcompl-v4",{}));
  const [view,setView]         = useState("today");
  const [showModal,setShowModal]= useState(false);
  const [editTask,setEditTask] = useState(null);
  const [confetti,setConfetti] = useState(null);

  useEffect(()=>{save("tdtasks-v4",tasks);},[tasks]);
  useEffect(()=>{save("tdcompl-v4",completions);},[completions]);

  const today=todayKey();

  // Only show non-done, non-paused permanent tasks
  const permTasks    = tasks.filter(t=>t.type==="permanent" && !isPausedOn(t,today) && !completions[today]?.[t.id]);
  const permPaused   = tasks.filter(t=>t.type==="permanent" && isPausedOn(t,today));
  const tempActive   = tasks.filter(t=>t.type==="temporary"&&!t.done&&(!t.dueDate||t.dueDate<=today));
  const tempFuture   = tasks.filter(t=>t.type==="temporary"&&!t.done&&t.dueDate&&t.dueDate>today);

  // Progress: all perm tasks except paused (whether done or not)
  const permForProgress = tasks.filter(t=>t.type==="permanent"&&!isPausedOn(t,today));
  const totalToday   = permForProgress.length + tempActive.length;
  const doneToday    = permForProgress.filter(t=>completions[today]?.[t.id]).length;
  const pct          = totalToday>0?Math.round(doneToday/totalToday*100):0;

  const fire=useCallback((e)=>{setConfetti({x:e?.clientX??window.innerWidth/2,y:e?.clientY??window.innerHeight/2,ts:Date.now()});},[]);

  const togglePerm=useCallback((id,e)=>{
    const wasOff=!completions[today]?.[id];
    setCompl(prev=>({...prev,[today]:{...prev[today],[id]:wasOff}}));
    if(wasOff) fire(e);
  },[completions,today,fire]);

  const toggleTemp=useCallback((id,e)=>{
    setTasks(prev=>prev.map(t=>{
      if(t.id!==id||t.done) return t;
      fire(e);
      setCompl(c=>({...c,[today]:{...c[today],[id]:true}}));
      return{...t,done:true,doneAt:today};
    }));
  },[today,fire]);

  const addTask=useCallback(({text,category,type,dueDate})=>{
    const t={
      id:`t${Date.now()}`,text,category,type,createdAt:today,
      ...(type==="temporary"?{done:false,doneAt:null,dueDate:dueDate||today}:
        {paused:false,pauseFrom:null,pauseTo:null,pauseReason:""}),
    };
    setTasks(prev=>[t,...prev]);
  },[today]);

  const delTask =useCallback(id=>setTasks(p=>p.filter(t=>t.id!==id)),[]);
  const saveTask=useCallback(updated=>setTasks(prev=>prev.map(t=>t.id===updated.id?updated:t)),[]);

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <ConfettiLayer trigger={confetti}/>
      {showModal&&<AddModal onAdd={addTask} onClose={()=>setShowModal(false)}/>}
      {editTask &&<EditModal task={editTask} onSave={saveTask} onClose={()=>setEditTask(null)}/>}

      <div style={S.paper}>
        <div style={S.hdr}>
          <div>
            <div style={S.htag}>✦ ежедневный планировщик</div>
            <h1 style={S.htitle}>Мои задачи</h1>
            <div style={S.hdate}>{fmtWeekday(today)}</div>
          </div>
          <button className="fab" onClick={()=>setShowModal(true)} title="Добавить задачу">＋</button>
        </div>

        <div style={S.tabs}>
          {[["today","📋 Сегодня"],["journal","📓 Журнал"],["stats","📊 Статистика"]].map(([id,lbl])=>(
            <button key={id} className={`tabbt ${view===id?"tab-on":""}`} onClick={()=>setView(id)}>{lbl}</button>
          ))}
        </div>

        <div style={S.body}>
          {view==="today"&&(
            <>
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:11,color:"#8b7355"}}>Прогресс дня</span>
                  <span style={{fontSize:11,color:pct===100?"#2e6e3a":"#8b7355",fontWeight:pct===100?700:400}}>
                    {pct===100?"🎉 Все выполнено!":`${doneToday}/${totalToday} · ${pct}%`}
                  </span>
                </div>
                <div style={{height:7,background:"#e8ddc8",borderRadius:4,overflow:"hidden"}}>
                  <div className="pbar" style={{width:`${pct}%`}}/>
                </div>
                {permPaused.length>0&&(
                  <div style={{fontSize:11,color:"#9c7c00",marginTop:6,background:"#fffbf0",border:"1px solid #e8ddc8",borderRadius:6,padding:"5px 10px"}}>
                    ⏸ {permPaused.length} {permPaused.length===1?"задача приостановлена":"задачи приостановлены"} — не учитывается в прогрессе
                  </div>
                )}
              </div>

              <Section icon="🔁" title="Постоянные"
                subtitle="Выполненные скрываются до следующего дня"
                done={permForProgress.filter(t=>completions[today]?.[t.id]).length}
                total={permForProgress.length}>
                {permTasks.length===0&&permForProgress.length>0
                  ?<Empty text="🎉 Все постоянные задачи выполнены!"/>
                  :permTasks.length===0
                    ?<Empty text="Нет постоянных задач — нажмите ＋ чтобы добавить"/>
                    :permTasks.map((t,i)=>(
                      <TaskRow key={t.id} task={t} done={false} paused={false}
                        onToggle={togglePerm} index={i+1}/>
                    ))
                }
              </Section>

              <Section icon="⏳" title="Временные"
                subtitle="Скрываются после выполнения"
                done={0} total={tempActive.length}>
                {tempActive.length===0
                  ?<Empty text="Нет временных задач на сегодня — нажмите ＋ чтобы добавить"/>
                  :tempActive.map((t,i)=>(
                    <TaskRow key={t.id} task={t} done={false} paused={false}
                      onToggle={toggleTemp} index={i+1}/>
                  ))
                }
              </Section>

              {tempFuture.length>0&&(
                <Section icon="🗓" title="Запланировано"
                  subtitle="Задачи появятся в указанную дату"
                  done={0} total={tempFuture.length}>
                  {tempFuture.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map((t,i)=>(
                    <TaskRow key={t.id} task={t} done={false} paused={false}
                      onToggle={()=>{}} index={i+1}/>
                  ))}
                </Section>
              )}

              {permPaused.length>0&&(
                <Section icon="⏸" title="На паузе"
                  subtitle="Не учитываются в прогрессе текущего дня"
                  done={0} total={permPaused.length}>
                  {permPaused.map((t,i)=>(
                    <TaskRow key={t.id} task={t} done={false} paused={true}
                      onToggle={()=>{}} index={i+1}/>
                  ))}
                </Section>
              )}
            </>
          )}
          {view==="journal"&&<JournalView tasks={tasks} completions={completions} onEdit={setEditTask} onDelete={delTask}/>}
          {view==="stats"&&<StatsView tasks={tasks} completions={completions}/>}
        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}

.jrow{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px dashed #d9cdb8;background:#fffdf7;transition:background .15s;}
.jrow:last-child{border-bottom:none;}
.jrow:hover{background:#fef9ee;}
.jrow:hover .editbtn,.jrow:hover .delbtn{opacity:1;}
.jrow-done{background:#f9fdf9!important;}
.jrow-paused{background:#fffbf0!important;}

.tr:last-child{border-bottom:none;}
.tr:hover{background:#fef9ee;transform:translateX(3px);}
.tr.tr-done{cursor:default;}
.tr.tr-done:hover{transform:none;background:#fffdf7;}
.tr.tr-overdue{background:#fff8f8;}
.tr.tr-overdue:hover{background:#fff0f0;}
.tr.tr-paused{background:#fffbf0;cursor:default;}
.tr.tr-paused:hover{transform:none;}

.task-num{width:18px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#c4a97d;flex-shrink:0;text-align:right;user-select:none;}
.tr-done .task-num,.tr-paused .task-num{opacity:.4;}

.chk{width:22px;height:22px;border:2px solid #c4a97d;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;transition:background .2s,border-color .2s,transform .15s;}
.chk-on{background:#3d2c1e!important;border-color:#3d2c1e!important;color:#f5f0e8;transform:scale(1.15);}
.chk-pause{background:#fff8e0!important;border-color:#e6a817!important;color:#e6a817!important;}

.tt{flex:1;font-family:'IBM Plex Mono',monospace;font-size:13.5px;color:#2d1f0f;line-height:1.5;}
.tt-s{opacity:.4;text-decoration:line-through;}
.tt-p{opacity:.55;font-style:italic;}

.cbadge{font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;flex-shrink:0;}
.editbtn{opacity:0;background:none;border:none;cursor:pointer;font-size:15px;color:#8b7355;transition:opacity .2s,color .2s;padding:0 3px;flex-shrink:0;line-height:1;}
.delbtn{opacity:0;background:none;border:none;cursor:pointer;font-size:20px;color:#c07b5a;transition:opacity .2s;padding:0 2px;flex-shrink:0;line-height:1;}
.tr:hover .editbtn,.tr:hover .delbtn{opacity:1;}
.editbtn:hover{color:#3d2c1e;}

.fab{width:46px;height:46px;border-radius:50%;background:#3d2c1e;color:#f5f0e8;border:none;font-size:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,transform .2s;line-height:1;flex-shrink:0;}
.fab:hover{background:#5a3d28;transform:scale(1.1) rotate(90deg);}
.fab:active{transform:scale(.95);}

.tabbt{font-family:'IBM Plex Mono',monospace;font-size:12px;padding:11px 16px;border:none;background:transparent;cursor:pointer;color:#8b7355;transition:color .2s;border-bottom:2.5px solid transparent;letter-spacing:.03em;white-space:nowrap;}
.tabbt:hover{color:#3d2c1e;}
.tab-on{color:#3d2c1e!important;border-bottom:2.5px solid #c07b5a!important;font-weight:500;}

.pbar{height:100%;background:linear-gradient(90deg,#c07b5a,#3d2c1e);border-radius:4px;transition:width .7s cubic-bezier(.4,0,.2,1);}

.sb{font-family:'IBM Plex Mono',monospace;font-size:12px;padding:5px 13px;border:1.5px solid #c4a97d;border-radius:20px;background:transparent;cursor:pointer;color:#5a4027;transition:background .18s,color .18s;}
.sb.wide{padding:6px 16px;}
.sb:hover:not(.sb-a){background:#e8ddc8;}
.sb-a{background:#3d2c1e!important;color:#f5f0e8!important;border-color:#3d2c1e!important;}

.toggle-btn{font-family:'IBM Plex Mono',monospace;font-size:12px;padding:6px 16px;border:1.5px solid #c4a97d;border-radius:20px;background:transparent;cursor:pointer;color:#5a4027;transition:all .2s;flex-shrink:0;}
.toggle-btn.toggle-on{background:#e6a817;border-color:#e6a817;color:#fff;}

.minput{font-family:'IBM Plex Mono',monospace;font-size:14px;color:#2d1f0f;background:#f5f0e8;border:1.5px solid #c4a97d;border-radius:8px;padding:11px 14px;outline:none;width:100%;transition:border-color .2s;}
.minput:focus{border-color:#c07b5a;box-shadow:0 0 0 3px rgba(192,123,90,.12);}

.mbtn-cancel{font-family:'IBM Plex Mono',monospace;font-size:13px;padding:10px 18px;border:1.5px solid #c4a97d;border-radius:8px;background:transparent;cursor:pointer;color:#5a4027;transition:background .18s;}
.mbtn-cancel:hover{background:#e8ddc8;}
.mbtn-add{font-family:'IBM Plex Mono',monospace;font-size:13px;padding:10px 22px;border:none;border-radius:8px;background:#3d2c1e;color:#f5f0e8;cursor:pointer;transition:background .2s,transform .15s;}
.mbtn-add:hover{background:#5a3d28;}
.mbtn-add:active{transform:scale(.97);}

.dinput{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#2d1f0f;background:#f5f0e8;border:1.5px solid #c4a97d;border-radius:6px;padding:5px 10px;outline:none;cursor:pointer;}
`;

const S={
  root:{minHeight:"100vh",background:"#f5f0e8",backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(0,0,0,.025) 28px)",display:"flex",justifyContent:"center",padding:"32px 16px 60px",fontFamily:"'IBM Plex Mono',monospace"},
  paper:{width:"100%",maxWidth:700,background:"#fffdf7",borderRadius:16,boxShadow:"4px 4px 0 #c4a97d,8px 8px 0 #d9cdb8,0 24px 60px rgba(0,0,0,.1)",border:"1.5px solid #d9cdb8",overflow:"hidden"},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"26px 28px 18px"},
  htag:{fontSize:10,color:"#c07b5a",letterSpacing:".15em",textTransform:"uppercase",marginBottom:4},
  htitle:{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:"#2d1f0f"},
  hdate:{fontSize:11,color:"#8b7355",marginTop:3,textTransform:"capitalize"},
  tabs:{display:"flex",borderBottom:"1.5px solid #d9cdb8",padding:"0 20px",overflowX:"auto"},
  body:{padding:"22px 26px 32px"},
  overlay:{position:"fixed",inset:0,background:"rgba(45,31,15,.45)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modal:{background:"#fffdf7",borderRadius:14,padding:28,width:"100%",maxWidth:440,boxShadow:"0 24px 60px rgba(0,0,0,.22)",border:"1.5px solid #d9cdb8",display:"flex",flexDirection:"column",gap:16},
  modalTitle:{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#2d1f0f"},
  mrow:{display:"flex",flexDirection:"column",gap:8},
  mlabel:{fontSize:10,color:"#8b7355",letterSpacing:".1em",textTransform:"uppercase"},
  bgroup:{display:"flex",gap:7,flexWrap:"wrap"},
  mhint:{fontSize:11,color:"#b8a88a",fontStyle:"italic",lineHeight:1.6,padding:"4px 0"},
  mfooter:{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4},
  slbl:{fontSize:12,color:"#8b7355",flexShrink:0},
  banner:{background:"linear-gradient(135deg,#fffbf3,#fff5e6)",border:"1.5px solid #e8ddc8",borderRadius:10,padding:"14px 18px",marginBottom:20},
  stbl:{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'IBM Plex Mono',monospace"},
  sth:{padding:"8px 4px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:400,whiteSpace:"nowrap"},
  stnm:{minWidth:170,maxWidth:190,padding:"8px 8px"},
};
