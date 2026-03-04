"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";

const S = {
  bg:"#07090f", panel:"#0c1018", panel2:"#111620",
  border:"#1a2030", border2:"#263040",
  cyan:"#00d4ff", green:"#00e676", yellow:"#ffd740", red:"#ff5252",
  purple:"#ce93d8", lime:"#a3e635",
  text:"#cdd6e8", text2:"#7a8aa0", text3:"#445060",
  mono:"'Share Tech Mono','Courier New',monospace",
};

const genId = (pfx:string) => pfx + "_" + Math.random().toString(36).slice(2,7);

interface Skill { id:string; icon:string; name:string; level:number; req:string[]; xp:number; desc:string; effects:string[]; }
interface Track { id:string; label:string; icon:string; color:string; active:boolean; sort_order:number; skills:Skill[]; }

function Inp({ value, onChange, placeholder="", width="100%", color=S.text }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; width?:string; color?:string }) {
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ width, background:S.panel2, border:"1px solid "+S.border2, color,
      padding:"5px 8px", fontFamily:S.mono, fontSize:11, outline:"none", boxSizing:"border-box" as const }} />;
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

function SkillRow({ skill, onChange, onDelete, color }:
  { skill:Skill; onChange:(s:Skill)=>void; onDelete:()=>void; color:string }) {
  return (
    <div style={{ background:S.bg, border:"1px solid "+S.border, padding:"8px 10px", marginBottom:6 }}>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" as const }}>
        <Inp value={skill.icon} onChange={v=>onChange({...skill,icon:v})} width="40px" color={color} />
        <Inp value={skill.id} onChange={v=>onChange({...skill,id:v})} placeholder="sk_x1" width="80px" color={S.text3} />
        <Inp value={skill.name} onChange={v=>onChange({...skill,name:v})} placeholder="スキル名" width="140px" color={color} />
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>LV</span>
          <input type="number" value={skill.level} onChange={e=>onChange({...skill,level:Number(e.target.value)})} min={0} max={5}
            style={{ width:40,background:S.panel2,border:"1px solid "+S.border2,color:S.yellow,padding:"4px 6px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />
        </div>
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>XP</span>
          <input type="number" value={skill.xp} onChange={e=>onChange({...skill,xp:Number(e.target.value)})} min={0}
            style={{ width:60,background:S.panel2,border:"1px solid "+S.border2,color:S.cyan,padding:"4px 6px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />
        </div>
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>前提</span>
          <Inp value={skill.req.join(",")} onChange={v=>onChange({...skill,req:v.split(",").map(s=>s.trim()).filter(Boolean)})} placeholder="sk_x0,sk_x1" width="120px" color={S.text2} />
        </div>
        <button onClick={onDelete} style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:10,padding:"2px 8px",cursor:"pointer",flexShrink:0,marginLeft:"auto" }}>×</button>
      </div>
      <div style={{ marginTop:6 }}>
        <Inp value={skill.desc} onChange={v=>onChange({...skill,desc:v})} placeholder="スキル説明" />
      </div>
      <div style={{ marginTop:4, display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" as const }}>
        <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>効果:</span>
        {skill.effects.map((ef,i)=>(
          <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:3,background:color+"15",border:"1px solid "+color,color,fontFamily:S.mono,fontSize:10,padding:"1px 6px" }}>
            {ef}
            <button onClick={()=>onChange({...skill,effects:skill.effects.filter((_,j)=>j!==i)})}
              style={{ background:"none",border:"none",color,cursor:"pointer",fontSize:12,lineHeight:1,padding:0 }}>×</button>
          </span>
        ))}
        <button onClick={()=>{ const t=prompt("効果テキスト");if(t)onChange({...skill,effects:[...skill.effects,t]}); }}
          style={{ background:color+"10",border:"1px dashed "+S.border2,color,fontFamily:S.mono,fontSize:10,padding:"1px 8px",cursor:"pointer" }}>+</button>
      </div>
    </div>
  );
}

function TrackCard({ track, onChange, onSave, onDelete, saving, msg }:
  { track:Track; onChange:(t:Track)=>void; onSave:()=>void; onDelete:()=>void; saving:boolean; msg?:{text:string;ok:boolean} }) {
  function addSkill() {
    const newSk:Skill = { id:genId("sk"), icon:"✦", name:"新スキル", level:0, req:[], xp:0, desc:"", effects:[] };
    onChange({...track, skills:[...track.skills, newSk]});
  }
  return (
    <div style={{ background:S.panel2, border:"1px solid "+S.border2, borderLeft:"3px solid "+track.color, padding:"12px 14px", marginBottom:14 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12, flexWrap:"wrap" as const }}>
        <Inp value={track.id} onChange={v=>onChange({...track,id:v})} placeholder="track_id" width="120px" color={S.text3} />
        <Inp value={track.icon} onChange={v=>onChange({...track,icon:v})} placeholder="⚡" width="40px" color={track.color} />
        <Inp value={track.label} onChange={v=>onChange({...track,label:v})} placeholder="トラック名" width="120px" color={track.color} />
        <input type="color" value={track.color} onChange={e=>onChange({...track,color:e.target.value})}
          style={{ width:36,height:28,border:"1px solid "+S.border2,background:S.panel2,cursor:"pointer",padding:2 }} />
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>順序</span>
          <input type="number" value={track.sort_order} onChange={e=>onChange({...track,sort_order:Number(e.target.value)})} min={0}
            style={{ width:50,background:S.panel2,border:"1px solid "+S.border2,color:S.text,padding:"4px 6px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />
        </div>
        <Toggle value={track.active} onChange={v=>onChange({...track,active:v})} />
        <div style={{ flex:1 }} />
        {msg && <span style={{ fontFamily:S.mono,fontSize:10,color:msg.ok?S.green:S.red }}>{msg.text}</span>}
        <button onClick={onSave} disabled={saving}
          style={{ background:"rgba(0,212,255,0.1)",border:"1px solid "+S.cyan,color:S.cyan,fontFamily:S.mono,fontSize:10,padding:"4px 14px",cursor:"pointer" }}>
          {saving?"保存中...":"保存"}
        </button>
        <button onClick={onDelete} style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:10,padding:"4px 10px",cursor:"pointer" }}>削除</button>
      </div>
      {track.skills.map((sk,i)=>(
        <SkillRow key={sk.id+i} skill={sk} color={track.color}
          onChange={nsk=>{ const ss=[...track.skills]; ss[i]=nsk; onChange({...track,skills:ss}); }}
          onDelete={()=>onChange({...track,skills:track.skills.filter((_,j)=>j!==i)})} />
      ))}
      <button onClick={addSkill}
        style={{ background:track.color+"10",border:"1px dashed "+S.border2,color:track.color,fontFamily:S.mono,fontSize:10,padding:"5px 12px",cursor:"pointer",marginTop:4 }}>
        + スキルを追加
      </button>
    </div>
  );
}

export default function SkillTreeAdminPage() {
  const [tracks,setTracks] = useState<Track[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState<string|null>(null);
  const [msgs,setMsgs] = useState<Record<string,{text:string;ok:boolean}>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/admin/skill-tree");
      if (r.ok) setTracks(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function setMsg(id:string, text:string, ok:boolean) {
    setMsgs(m=>({...m,[id]:{text,ok}}));
    setTimeout(()=>setMsgs(m=>{const n={...m};delete n[id];return n;}),3000);
  }

  async function save(track:Track) {
    setSaving(track.id);
    try {
      const r = await apiFetch("/api/admin/skill-tree",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(track)});
      setMsg(track.id, r.ok?"保存しました":"保存に失敗", r.ok);
    } finally { setSaving(null); }
  }

  async function del(id:string) {
    await apiFetch("/api/admin/skill-tree?id="+id,{method:"DELETE"});
    setTracks(ts=>ts.filter(t=>t.id!==id));
  }

  function addTrack() {
    const t:Track = { id:genId("track"), label:"新トラック", icon:"⚡", color:"#00d4ff",
      active:true, sort_order:tracks.length, skills:[] };
    setTracks(ts=>[...ts, t]);
  }

  return (
    <div style={{ background:S.bg, margin:"-2rem -1.5rem", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:S.panel, borderBottom:"1px solid "+S.border2, padding:"10px 20px", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:S.lime,boxShadow:"0 0 8px "+S.lime }} />
        <span style={{ fontFamily:S.mono,fontSize:12,color:S.lime,letterSpacing:".2em" }}>スキルツリー管理</span>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>— {tracks.length} トラック / {tracks.reduce((s,t)=>s+t.skills.length,0)} スキル</span>
        <div style={{ flex:1 }} />
        <button onClick={addTrack} style={{ background:S.lime+"15",border:"1px solid "+S.lime,color:S.lime,fontFamily:S.mono,fontSize:10,padding:"5px 14px",cursor:"pointer" }}>+ トラック追加</button>
        <button onClick={load} style={{ background:"none",border:"1px solid "+S.border2,color:S.text2,fontFamily:S.mono,fontSize:10,padding:"5px 10px",cursor:"pointer" }}>⟳</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:14 }}>
        {loading
          ? <div style={{ textAlign:"center",padding:40,fontFamily:S.mono,fontSize:11,color:S.text3 }}>読み込み中...</div>
          : tracks.map(track=>(
            <TrackCard key={track.id} track={track}
              onChange={v=>setTracks(ts=>ts.map(t=>t.id===v.id?v:t))}
              onSave={()=>save(track)} onDelete={()=>del(track.id)}
              saving={saving===track.id} msg={msgs[track.id]} />
          ))
        }
      </div>
    </div>
  );
}
