"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";

const S = {
  bg:"#07090f", panel:"#0c1018", panel2:"#111620",
  border:"#1a2030", border2:"#263040",
  cyan:"#00d4ff", green:"#00e676", yellow:"#ffd740", red:"#ff5252",
  purple:"#ce93d8", orange:"#ff9800",
  text:"#cdd6e8", text2:"#7a8aa0", text3:"#445060",
  mono:"'Share Tech Mono','Courier New',monospace",
};

const genId = () => "badge_" + Math.random().toString(36).slice(2,9);

const COND_OPTIONS = [
  { value:"flag",      label:"フラグ" },
  { value:"level",     label:"レベル以上" },
  { value:"xp",        label:"XP以上" },
  { value:"loginCount",label:"ログイン回数以上" },
  { value:"streak",    label:"連続ログイン日数以上" },
  { value:"variable",  label:"変数値以上" },
];

interface AchievDef {
  id:string; active:boolean; secret:boolean;
  icon:string; color:string; name:string; desc:string;
  conditionType:string; conditionKey:string; conditionValue:string; conditionMin:number;
}

function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:28,height:16,borderRadius:8,
      background:value?"rgba(0,230,118,0.25)":S.border2, border:"1px solid "+(value?S.green:S.border2),
      position:"relative" as const, cursor:"pointer", flexShrink:0 }}>
      <div style={{ position:"absolute" as const, top:2, left:value?12:2, width:10, height:10,
        borderRadius:"50%", background:value?S.green:S.text3, transition:"left .15s" }} />
    </div>
  );
}

function Inp({ value, onChange, placeholder="", width="100%", color=S.text }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; width?:string; color?:string }) {
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ width, background:S.panel2, border:"1px solid "+S.border2, color,
      padding:"5px 9px", fontFamily:S.mono, fontSize:11, outline:"none", boxSizing:"border-box" as const }} />;
}

function BadgeCard({ item, onChange, onSave, onDelete, saving, msg }:
  { item:AchievDef; onChange:(v:AchievDef)=>void; onSave:()=>void; onDelete:()=>void; saving:boolean; msg?:{text:string;ok:boolean} }) {
  const needs = ["flag","variable"].includes(item.conditionType);
  const needsMin = ["level","xp","loginCount","streak","variable"].includes(item.conditionType);
  return (
    <div style={{ background:S.panel2, border:"1px solid "+S.border2, borderLeft:"3px solid "+item.color, padding:"12px 14px", marginBottom:10 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, flexWrap:"wrap" as const }}>
        <Inp value={item.icon} onChange={v=>onChange({...item,icon:v})} placeholder="🏆" width="50px" color={item.color} />
        <input type="color" value={item.color} onChange={e=>onChange({...item,color:e.target.value})}
          style={{ width:36, height:28, border:"1px solid "+S.border2, background:S.panel2, cursor:"pointer", padding:2 }} />
        <Inp value={item.name} onChange={v=>onChange({...item,name:v})} placeholder="実績名" width="180px" color={item.color} />
        <Inp value={item.desc} onChange={v=>onChange({...item,desc:v})} placeholder="説明文" />
        <label style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0 }}>
          <Toggle value={item.secret} onChange={v=>onChange({...item,secret:v})} />
          <span style={{ fontFamily:S.mono,fontSize:10,color:item.secret?S.yellow:S.text3 }}>シークレット</span>
        </label>
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" as const }}>
        <select value={item.conditionType} onChange={e=>onChange({...item,conditionType:e.target.value})}
          style={{ background:S.panel2, border:"1px solid "+S.border2, color:S.text, padding:"5px 8px", fontFamily:S.mono, fontSize:11, outline:"none" }}>
          {COND_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {needs && <Inp value={item.conditionKey} onChange={v=>onChange({...item,conditionKey:v})} placeholder="キー名" width="140px" color={S.cyan} />}
        {item.conditionType==="flag" && <Inp value={item.conditionValue} onChange={v=>onChange({...item,conditionValue:v})} placeholder="値 (例: true)" width="100px" color={S.text2} />}
        {needsMin && (
          <div style={{ display:"flex",gap:5,alignItems:"center" }}>
            <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>閾値</span>
            <input type="number" value={item.conditionMin} onChange={e=>onChange({...item,conditionMin:Number(e.target.value)})} min={0}
              style={{ width:80,background:S.panel2,border:"1px solid "+S.border2,color:S.yellow,padding:"5px 8px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />
          </div>
        )}
        <div style={{ flex:1 }} />
        {msg && <span style={{ fontFamily:S.mono,fontSize:10,color:msg.ok?S.green:S.red }}>{msg.text}</span>}
        <button onClick={onSave} disabled={saving}
          style={{ background:"rgba(0,212,255,0.1)",border:"1px solid "+S.cyan,color:S.cyan,fontFamily:S.mono,fontSize:10,padding:"4px 14px",cursor:"pointer" }}>
          {saving?"保存中...":"保存"}
        </button>
        <button onClick={onDelete} style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:10,padding:"4px 10px",cursor:"pointer" }}>削除</button>
      </div>
    </div>
  );
}

export default function AchievementsAdminPage() {
  const [items,setItems] = useState<AchievDef[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState<string|null>(null);
  const [msgs,setMsgs] = useState<Record<string,{text:string;ok:boolean}>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/admin/achievements");
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setMsg(id:string, text:string, ok:boolean) {
    setMsgs(m=>({...m,[id]:{text,ok}}));
    setTimeout(()=>setMsgs(m=>{const n={...m};delete n[id];return n;}),3000);
  }

  async function save(item:AchievDef) {
    setSaving(item.id);
    try {
      const r = await apiFetch("/api/admin/achievements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item)});
      setMsg(item.id, r.ok?"保存しました":"保存に失敗", r.ok);
    } finally { setSaving(null); }
  }

  async function del(id:string) {
    await apiFetch("/api/admin/achievements?id="+id,{method:"DELETE"});
    setItems(it=>it.filter(i=>i.id!==id));
  }

  function add() {
    const newItem:AchievDef = { id:genId(), active:true, secret:false, icon:"🏆", color:"#ffd740",
      name:"新規実績", desc:"条件説明", conditionType:"flag", conditionKey:"", conditionValue:"true", conditionMin:0 };
    setItems(it=>[newItem,...it]);
  }

  return (
    <div style={{ background:S.bg, margin:"-2rem -1.5rem", minHeight:"100vh", padding:0, display:"flex", flexDirection:"column" }}>
      <div style={{ background:S.panel, borderBottom:"1px solid "+S.border2, padding:"10px 20px", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:S.yellow,boxShadow:"0 0 8px "+S.yellow }} />
        <span style={{ fontFamily:S.mono,fontSize:12,color:S.yellow,letterSpacing:".2em" }}>実績・バッジ管理</span>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>— {items.filter(i=>i.active).length}/{items.length} 件 有効</span>
        <div style={{ flex:1 }} />
        <button onClick={add} style={{ background:"rgba(255,215,64,0.1)",border:"1px solid "+S.yellow,color:S.yellow,fontFamily:S.mono,fontSize:10,padding:"5px 14px",cursor:"pointer" }}>+ 追加</button>
        <button onClick={load} style={{ background:"none",border:"1px solid "+S.border2,color:S.text2,fontFamily:S.mono,fontSize:10,padding:"5px 10px",cursor:"pointer" }}>⟳</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        {loading
          ? <div style={{ textAlign:"center",padding:40,fontFamily:S.mono,fontSize:11,color:S.text3 }}>読み込み中...</div>
          : items.map(item=>(
            <BadgeCard key={item.id} item={item}
              onChange={v=>setItems(it=>it.map(i=>i.id===v.id?v:i))}
              onSave={()=>save(item)} onDelete={()=>del(item.id)}
              saving={saving===item.id} msg={msgs[item.id]} />
          ))
        }
      </div>
    </div>
  );
}
