"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";

const S = {
  bg:"#07090f", panel:"#0c1018", panel2:"#111620",
  border:"#1a2030", border2:"#263040",
  cyan:"#00d4ff", green:"#00e676", yellow:"#ffd740", red:"#ff5252",
  purple:"#ce93d8", orange:"#ff9800", pink:"#f472b6", lime:"#a3e635", sky:"#38bdf8",
  text:"#cdd6e8", text2:"#7a8aa0", text3:"#445060",
  mono:"'Share Tech Mono','Courier New',monospace",
};

const genId = (pfx: string) => pfx+"_"+Math.random().toString(36).slice(2,9);

const TABS = [
  { id:"arg_keyword",          label:"ARGキーワード",         color:S.red,    desc:"チャットハイライト対象のキーワード一覧" },
  { id:"known_flag",           label:"KNOWNフラグ",           color:S.cyan,   desc:"フラグキーの定義・フェーズ管理" },
  { id:"incident_lifecycle",   label:"インシデントライフサイクル", color:S.orange, desc:"ステータス自動遷移・GSIエスカレーション" },
  { id:"novel_rule",           label:"ノベル公開ルール",       color:S.purple, desc:"フラグ/レベル/日時による複合公開条件" },
  { id:"xp_rule",              label:"XPイベントルール",       color:S.green,  desc:"イベント別XP・倍率・上限・条件設定" },
  { id:"anomaly_rule",         label:"異常スコア変動ルール",   color:S.pink,   desc:"スコア増減トリガー・自動ステータス変化" },
] as const;
type TabId = typeof TABS[number]["id"];

/* ── 共通UI ── */
function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:30,height:17,borderRadius:9,
      background:value?"rgba(0,230,118,0.3)":S.border2,
      border:"1px solid "+(value?S.green:S.border2),
      position:"relative" as const,cursor:"pointer",flexShrink:0 }}>
      <div style={{ position:"absolute" as const,top:2,left:value?13:2,width:11,height:11,
        borderRadius:"50%",background:value?S.green:S.text3,transition:"left .2s" }} />
    </div>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:5,letterSpacing:".08em" }}>{label}</div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder="", color=S.text, width="100%" }:
  { value:string; onChange:(v:string)=>void; placeholder?:string; color?:string; width?:string }) {
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ width,background:S.panel2,border:"1px solid "+S.border2,color,padding:"5px 9px",
      fontFamily:S.mono,fontSize:11,outline:"none",boxSizing:"border-box" as const }} />;
}

function NumInput({ value, onChange, min=0, width=60 }:
  { value:number; onChange:(v:number)=>void; min?:number; width?:number }) {
  return <input type="number" value={value} onChange={e=>onChange(Number(e.target.value))} min={min}
    style={{ width,background:S.panel2,border:"1px solid "+S.border2,color:S.yellow,
      padding:"4px 6px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />;
}

function TagInput({ items, onChange, color=S.cyan, placeholder="入力してEnter" }:
  { items:string[]; onChange:(v:string[])=>void; color?:string; placeholder?:string }) {
  const [inp,setInp]=useState("");
  function add() { const v=inp.trim(); if(!v||items.includes(v)){setInp("");return;} onChange([...items,v]);setInp(""); }
  return (
    <div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:5,minHeight:20 }}>
        {items.map(it=>(
          <span key={it} style={{ display:"inline-flex",alignItems:"center",gap:3,
            background:color+"18",border:"1px solid "+color,color,fontFamily:S.mono,fontSize:11,padding:"1px 7px" }}>
            {it}
            <button onClick={()=>onChange(items.filter(i=>i!==it))}
              style={{ background:"none",border:"none",color,cursor:"pointer",fontSize:13,lineHeight:1,padding:0 }}>x</button>
          </span>
        ))}
        {items.length===0&&<span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>未設定</span>}
      </div>
      <div style={{ display:"flex",gap:5 }}>
        <input value={inp} onChange={e=>setInp(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();add();}}}
          placeholder={placeholder}
          style={{ flex:1,background:S.panel2,border:"1px solid "+S.border2,color:S.text,
            padding:"5px 9px",fontFamily:S.mono,fontSize:11,outline:"none" }} />
        <button onClick={add} style={{ background:color+"18",border:"1px solid "+color,color,
          fontFamily:S.mono,fontSize:10,padding:"5px 10px",cursor:"pointer" }}>+</button>
      </div>
    </div>
  );
}

function Sel({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:S.panel2,border:"1px solid "+S.border2,color:S.text,
        padding:"5px 8px",fontFamily:S.mono,fontSize:11,outline:"none" }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. ARGキーワード
   ══════════════════════════════════════════════════════════════ */
interface ArgKeyword { id:string; keyword:string; description:string; phase:string; severity:string; active:boolean; }

const SEVERITY_COLORS: Record<string,string> = { critical:S.red, high:S.orange, medium:S.yellow, low:S.green };

function ArgKeywordEditor({ item, onChange }: { item:ArgKeyword; onChange:(v:ArgKeyword)=>void }) {
  const sc = SEVERITY_COLORS[item.severity]||S.text2;
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+sc,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <TextInput value={item.keyword} onChange={v=>onChange({...item,keyword:v})} placeholder="キーワード" color={sc} width="200px" />
        <Sel value={item.severity} onChange={v=>onChange({...item,severity:v})}
          options={["critical","high","medium","low"].map(s=>({value:s,label:s.toUpperCase()}))} />
        <Field label="フェーズ">
          <TextInput value={item.phase} onChange={v=>onChange({...item,phase:v})} placeholder="1" width="60px" />
        </Field>
        <div style={{ flex:1 }} />
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>
      <TextInput value={item.description} onChange={v=>onChange({...item,description:v})} placeholder="説明・用途メモ" color={S.text2} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. KNOWNフラグ
   ══════════════════════════════════════════════════════════════ */
interface KnownFlag { id:string; key:string; label:string; phase:string; description:string; category:string; active:boolean; }

const FLAG_CATEGORY_COLORS: Record<string,string> = { system:S.cyan, progress:S.green, story:S.purple, achievement:S.yellow };

function KnownFlagEditor({ item, onChange }: { item:KnownFlag; onChange:(v:KnownFlag)=>void }) {
  const cc = FLAG_CATEGORY_COLORS[item.category]||S.text2;
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+cc,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const }}>
        <TextInput value={item.key} onChange={v=>onChange({...item,key:v})} placeholder="flag_key" color={S.cyan} width="200px" />
        <TextInput value={item.label} onChange={v=>onChange({...item,label:v})} placeholder="表示名" width="160px" />
        <Sel value={item.category} onChange={v=>onChange({...item,category:v})}
          options={["system","progress","story","achievement"].map(c=>({value:c,label:c}))} />
        <Field label="フェーズ">
          <TextInput value={item.phase} onChange={v=>onChange({...item,phase:v})} placeholder="1" width="55px" />
        </Field>
        <div style={{ flex:1 }} />
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>
      <TextInput value={item.description} onChange={v=>onChange({...item,description:v})} placeholder="フラグの意味・用途" color={S.text2} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. インシデントライフサイクル
   ══════════════════════════════════════════════════════════════ */
interface IncidentLifecycle {
  id:string; name:string; active:boolean;
  conditionType:"age_days"|"gsi_threshold"|"severity";
  conditionValue:number; fromStatus:string; toStatus:string;
  newSeverity:string; notifyAdmin:boolean;
}

const STATUS_OPTIONS = ["調査中","監視中","対応中","保留","終息",""].map(s=>({value:s,label:s||"（変更なし）"}));
const SEVERITY_OPTIONS = ["critical","high","medium","low",""].map(s=>({value:s,label:s||"（変更なし）"}));
const COND_TYPE_OPTIONS = [
  {value:"age_days",label:"経過日数"},
  {value:"gsi_threshold",label:"GSI閾値超過"},
  {value:"severity",label:"重大度が以上"},
];

function IncidentLifecycleEditor({ item, onChange }: { item:IncidentLifecycle; onChange:(v:IncidentLifecycle)=>void }) {
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+S.orange,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <TextInput value={item.name} onChange={v=>onChange({...item,name:v})} placeholder="ルール名" color={S.text} width="280px" />
        <div style={{ flex:1 }} />
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
        <Field label="条件タイプ">
          <Sel value={item.conditionType} onChange={v=>onChange({...item,conditionType:v as IncidentLifecycle["conditionType"]})} options={COND_TYPE_OPTIONS} />
        </Field>
        <Field label="閾値">
          <NumInput value={item.conditionValue} onChange={v=>onChange({...item,conditionValue:v})} min={0} width={80} />
        </Field>
        <Field label="管理者通知">
          <div style={{ paddingTop:4 }}><Toggle value={item.notifyAdmin} onChange={v=>onChange({...item,notifyAdmin:v})} /></div>
        </Field>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
        <Field label="元ステータス（空=全て）">
          <Sel value={item.fromStatus} onChange={v=>onChange({...item,fromStatus:v})} options={STATUS_OPTIONS} />
        </Field>
        <Field label="変更後ステータス">
          <Sel value={item.toStatus} onChange={v=>onChange({...item,toStatus:v})} options={STATUS_OPTIONS} />
        </Field>
        <Field label="重大度変更">
          <Sel value={item.newSeverity} onChange={v=>onChange({...item,newSeverity:v})} options={SEVERITY_OPTIONS} />
        </Field>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. ノベル公開ルール
   ══════════════════════════════════════════════════════════════ */
interface NovelCondition { type:"flag"|"level"|"date"|"division"; key?:string; value?:string; minLevel?:number; minDate?:string; division?:string; }
interface NovelRule {
  id:string; name:string; active:boolean;
  applyTo:"all"|"category"|"novel_id"; applyValue:string;
  operator:"AND"|"OR";
  conditions:NovelCondition[];
}

function NovelConditionRow({ cond, onChange, onDelete, color }:
  { cond:NovelCondition; onChange:(c:NovelCondition)=>void; onDelete:()=>void; color:string }) {
  return (
    <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:5,background:S.panel,padding:"6px 10px",border:"1px solid "+S.border }}>
      <Sel value={cond.type} onChange={v=>onChange({...cond,type:v as NovelCondition["type"]})}
        options={[{value:"flag",label:"フラグ"},{value:"level",label:"レベル"},{value:"date",label:"日時"},{value:"division",label:"部署"}]} />
      {cond.type==="flag"&&<>
        <TextInput value={cond.key||""} onChange={v=>onChange({...cond,key:v})} placeholder="flag_key" color={color} width="160px" />
        <TextInput value={cond.value||""} onChange={v=>onChange({...cond,value:v})} placeholder="true" color={S.text2} width="80px" />
      </>}
      {cond.type==="level"&&<>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>最低LV</span>
        <NumInput value={cond.minLevel||1} onChange={v=>onChange({...cond,minLevel:v})} min={1} width={60} />
      </>}
      {cond.type==="date"&&<>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>公開開始日時</span>
        <input type="datetime-local" value={cond.minDate||""} onChange={e=>onChange({...cond,minDate:e.target.value})}
          style={{ background:S.panel2,border:"1px solid "+S.border2,color:S.text,padding:"4px 8px",fontFamily:S.mono,fontSize:11,outline:"none" }} />
      </>}
      {cond.type==="division"&&<>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>部署</span>
        <TextInput value={cond.division||""} onChange={v=>onChange({...cond,division:v})} placeholder="convergence" color={color} width="140px" />
      </>}
      <button onClick={onDelete} style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:11,padding:"2px 8px",cursor:"pointer",flexShrink:0 }}>×</button>
    </div>
  );
}

function NovelRuleEditor({ item, onChange }: { item:NovelRule; onChange:(v:NovelRule)=>void }) {
  function addCond() { onChange({...item,conditions:[...item.conditions,{type:"flag",key:"",value:"true"}]}); }
  function updateCond(i:number,c:NovelCondition) { const cs=[...item.conditions];cs[i]=c;onChange({...item,conditions:cs}); }
  function delCond(i:number) { onChange({...item,conditions:item.conditions.filter((_,j)=>j!==i)}); }
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+S.purple,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <TextInput value={item.name} onChange={v=>onChange({...item,name:v})} placeholder="ルール名" color={S.text} width="240px" />
        <div style={{ flex:1 }} />
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>
      <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const }}>
        <Field label="適用対象">
          <Sel value={item.applyTo} onChange={v=>onChange({...item,applyTo:v as NovelRule["applyTo"]})}
            options={[{value:"all",label:"全ノベル"},{value:"category",label:"カテゴリ"},{value:"novel_id",label:"ノベルID指定"}]} />
        </Field>
        {item.applyTo!=="all"&&<Field label={item.applyTo==="category"?"カテゴリ名":"ノベルID"}>
          <TextInput value={item.applyValue} onChange={v=>onChange({...item,applyValue:v})} placeholder={item.applyTo==="category"?"phase2":"novel_xxx"} width="160px" />
        </Field>}
        <Field label="条件結合">
          <div style={{ display:"flex",gap:6 }}>
            {(["AND","OR"] as const).map(op=>(
              <button key={op} onClick={()=>onChange({...item,operator:op})}
                style={{ background:item.operator===op?S.purple+"20":S.panel,border:"1px solid "+(item.operator===op?S.purple:S.border2),
                  color:item.operator===op?S.purple:S.text3,fontFamily:S.mono,fontSize:10,padding:"3px 12px",cursor:"pointer" }}>{op}</button>
            ))}
          </div>
        </Field>
      </div>
      <div>
        <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:6 }}>公開条件（{item.operator}で評価）</div>
        {item.conditions.map((c,i)=>(
          <NovelConditionRow key={i} cond={c} onChange={nc=>updateCond(i,nc)} onDelete={()=>delCond(i)} color={S.purple} />
        ))}
        <button onClick={addCond} style={{ background:S.purple+"10",border:"1px dashed "+S.border2,color:S.purple,fontFamily:S.mono,fontSize:10,padding:"5px 12px",cursor:"pointer",marginTop:3 }}>+ 条件を追加</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. XPイベントルール
   ══════════════════════════════════════════════════════════════ */
interface XpCondition { type:"flag"|"level"|"division"; key?:string; value?:string; minLevel?:number; division?:string; }
interface XpRule {
  id:string; event:string; baseXp:number; active:boolean;
  onlyFirst:boolean; maxPerDay:number; multiplier:number;
  conditions:XpCondition[]; priority:number;
}

const XP_EVENTS = [
  "first_login","profile_view","chat_message","division_view","codex_view",
  "mission_complete","daily_login","location_view","entity_view","module_view","search_use","bookmark_add",
];

function XpCondRow({ cond, onChange, onDelete }:
  { cond:XpCondition; onChange:(c:XpCondition)=>void; onDelete:()=>void }) {
  return (
    <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:5,background:S.panel,padding:"5px 8px",border:"1px solid "+S.border }}>
      <Sel value={cond.type} onChange={v=>onChange({...cond,type:v as XpCondition["type"]})}
        options={[{value:"flag",label:"フラグ"},{value:"level",label:"レベル"},{value:"division",label:"部署"}]} />
      {cond.type==="flag"&&<>
        <TextInput value={cond.key||""} onChange={v=>onChange({...cond,key:v})} placeholder="flag_key" color={S.green} width="140px" />
        <TextInput value={cond.value||""} onChange={v=>onChange({...cond,value:v})} placeholder="true" color={S.text2} width="70px" />
      </>}
      {cond.type==="level"&&<><span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>最低LV</span>
        <NumInput value={cond.minLevel||1} onChange={v=>onChange({...cond,minLevel:v})} min={1} width={55} /></>}
      {cond.type==="division"&&<TextInput value={cond.division||""} onChange={v=>onChange({...cond,division:v})} placeholder="convergence" color={S.green} width="140px" />}
      <button onClick={onDelete} style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:11,padding:"2px 8px",cursor:"pointer" }}>×</button>
    </div>
  );
}

function XpRuleEditor({ item, onChange }: { item:XpRule; onChange:(v:XpRule)=>void }) {
  function addCond() { onChange({...item,conditions:[...item.conditions,{type:"flag",key:"",value:"true"}]}); }
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+S.green,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const }}>
        <Field label="イベント名">
          <select value={item.event} onChange={e=>onChange({...item,event:e.target.value})}
            style={{ background:S.panel2,border:"1px solid "+S.border2,color:S.green,padding:"5px 8px",fontFamily:S.mono,fontSize:11,outline:"none" }}>
            {XP_EVENTS.map(ev=><option key={ev} value={ev}>{ev}</option>)}
            <option value="__custom__">カスタム...</option>
          </select>
        </Field>
        {item.event==="__custom__"&&<TextInput value={item.event} onChange={v=>onChange({...item,event:v})} placeholder="custom_event" color={S.green} width="150px" />}
        <Field label="基本XP">
          <NumInput value={item.baseXp} onChange={v=>onChange({...item,baseXp:v})} min={0} width={70} />
        </Field>
        <Field label="倍率">
          <input type="number" value={item.multiplier} step={0.1} min={0.1} onChange={e=>onChange({...item,multiplier:Number(e.target.value)})}
            style={{ width:65,background:S.panel2,border:"1px solid "+S.border2,color:S.yellow,padding:"4px 6px",fontFamily:S.mono,fontSize:11,outline:"none",textAlign:"center" as const }} />
        </Field>
        <Field label="1日上限(0=無制限)">
          <NumInput value={item.maxPerDay} onChange={v=>onChange({...item,maxPerDay:v})} min={0} width={70} />
        </Field>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
          <label style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer" }}>
            <Toggle value={item.onlyFirst} onChange={v=>onChange({...item,onlyFirst:v})} />
            <span style={{ fontFamily:S.mono,fontSize:10,color:item.onlyFirst?S.yellow:S.text3 }}>初回のみ</span>
          </label>
          <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
        </div>
      </div>
      {item.conditions.length>0&&<div>
        <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:5 }}>付与条件（全て満たした場合のみ）</div>
        {item.conditions.map((c,i)=>(
          <XpCondRow key={i} cond={c} onChange={nc=>{const cs=[...item.conditions];cs[i]=nc;onChange({...item,conditions:cs});}} onDelete={()=>onChange({...item,conditions:item.conditions.filter((_,j)=>j!==i)})} />
        ))}
      </div>}
      <button onClick={addCond} style={{ background:S.green+"0a",border:"1px dashed "+S.border2,color:S.green,fontFamily:S.mono,fontSize:10,padding:"4px 12px",cursor:"pointer",width:"fit-content" }}>+ 付与条件を追加</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. 異常スコア変動ルール
   ══════════════════════════════════════════════════════════════ */
interface AnomalyRule {
  id:string; name:string; active:boolean;
  triggerType:"keyword"|"flag"|"action"|"score_threshold";
  triggerValue:string; delta:number; maxPerDay:number;
  effectStatusThreshold:number; effectStatusChange:string;
  notifyAdminThreshold:number; notifyMessage:string;
}

const TRIGGER_TYPE_OPTIONS = [
  {value:"keyword",label:"キーワード発言"},
  {value:"flag",label:"フラグ取得"},
  {value:"action",label:"アクション"},
  {value:"score_threshold",label:"スコア閾値"},
];

function AnomalyRuleEditor({ item, onChange }: { item:AnomalyRule; onChange:(v:AnomalyRule)=>void }) {
  const deltaColor = item.delta>0?S.red:item.delta<0?S.green:S.text2;
  return (
    <div style={{ background:S.panel2,border:"1px solid "+S.border2,borderLeft:"3px solid "+S.pink,padding:"12px 14px",display:"flex",flexDirection:"column",gap:12 }}>
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <TextInput value={item.name} onChange={v=>onChange({...item,name:v})} placeholder="ルール名" color={S.text} width="260px" />
        <div style={{ flex:1 }} />
        <Toggle value={item.active} onChange={v=>onChange({...item,active:v})} />
      </div>

      {/* トリガー設定 */}
      <div style={{ background:S.panel,border:"1px solid "+S.border,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8 }}>
        <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:2 }}>▸ トリガー</div>
        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const }}>
          <Sel value={item.triggerType} onChange={v=>onChange({...item,triggerType:v as AnomalyRule["triggerType"]})} options={TRIGGER_TYPE_OPTIONS} />
          <TextInput value={item.triggerValue} onChange={v=>onChange({...item,triggerValue:v})}
            placeholder={item.triggerType==="keyword"?"境界|消滅":item.triggerType==="flag"?"flag_key":item.triggerType==="score_threshold"?"50":"action_id"}
            color={S.pink} width="200px" />
          {item.triggerType==="keyword"&&<span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>| で複数指定</span>}
        </div>
      </div>

      {/* スコア変動 */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <div style={{ background:S.panel,border:"1px solid "+S.border,padding:"10px 12px" }}>
          <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:6 }}>▸ スコア変動</div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <div style={{ display:"flex",gap:4 }}>
              {[-20,-10,-5,0,5,10,20].map(d=>(
                <button key={d} onClick={()=>onChange({...item,delta:d})}
                  style={{ width:36,height:28,background:item.delta===d?(d>0?"rgba(255,82,82,0.2)":d<0?"rgba(0,230,118,0.2)":S.border2):S.panel,
                    border:"1px solid "+(item.delta===d?(d>0?S.red:d<0?S.green:S.text2):S.border2),
                    color:item.delta===d?deltaColor:S.text3,fontFamily:S.mono,fontSize:10,cursor:"pointer" }}>
                  {d>0?"+"+d:d}
                </button>
              ))}
            </div>
            <span style={{ fontFamily:S.mono,fontSize:11,color:deltaColor,minWidth:36 }}>{item.delta>0?"+"+item.delta:item.delta}</span>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center",marginTop:8 }}>
            <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>1日上限</span>
            <NumInput value={item.maxPerDay} onChange={v=>onChange({...item,maxPerDay:v})} min={0} width={60} />
            <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>回（0=無制限）</span>
          </div>
        </div>

        <div style={{ background:S.panel,border:"1px solid "+S.border,padding:"10px 12px" }}>
          <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:6 }}>▸ エフェクト</div>
          <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:7 }}>
            <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3,minWidth:60 }}>スコア閾値</span>
            <NumInput value={item.effectStatusThreshold} onChange={v=>onChange({...item,effectStatusThreshold:v})} min={0} width={60} />
            <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>超えたら</span>
          </div>
          <TextInput value={item.effectStatusChange} onChange={v=>onChange({...item,effectStatusChange:v})}
            placeholder="要観察（空=変更なし）" color={S.orange} />
        </div>
      </div>

      {/* 通知設定 */}
      <div style={{ background:S.panel,border:"1px solid "+S.border,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7 }}>
        <div style={{ fontFamily:S.mono,fontSize:9,color:S.text3,marginBottom:2 }}>▸ 管理者通知</div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3,minWidth:80 }}>スコアが</span>
          <NumInput value={item.notifyAdminThreshold} onChange={v=>onChange({...item,notifyAdminThreshold:v})} min={0} width={60} />
          <span style={{ fontFamily:S.mono,fontSize:9,color:S.text3 }}>を超えたら通知（0=通知なし）</span>
        </div>
        <TextInput value={item.notifyMessage} onChange={v=>onChange({...item,notifyMessage:v})} placeholder="管理者への通知メッセージ" color={S.text2} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   汎用パネル
   ══════════════════════════════════════════════════════════════ */
function RulePanel<T extends { id:string; active:boolean }>({
  type, items, loading, onReload, createNew, renderEditor, filterFn, searchPlaceholder="検索...",
}: {
  type:string; items:T[]; loading:boolean; onReload:()=>void;
  createNew:()=>T;
  renderEditor:(item:T, onChange:(v:T)=>void)=>React.ReactNode;
  filterFn?:(item:T,s:string)=>boolean;
  searchPlaceholder?:string;
}) {
  const [local,setLocal]=useState<T[]>(items);
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState<string|null>(null);
  const [msgs,setMsgs]=useState<Record<string,{text:string;ok:boolean}>>({});
  useEffect(()=>{setLocal(items);},[items]);

  function setMsg(id:string,text:string,ok:boolean) {
    setMsgs(m=>({...m,[id]:{text,ok}}));
    setTimeout(()=>setMsgs(m=>{const n={...m};delete n[id];return n;}),3000);
  }

  async function save(item:T) {
    setSaving(item.id);
    try {
      const res=await apiFetch("/api/admin/rule-engine",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...item,type})});
      if(!res.ok) throw new Error();
      setMsg(item.id,"保存しました",true);
    } catch { setMsg(item.id,"保存に失敗",false); }
    finally { setSaving(null); }
  }

  async function del(id:string) {
    await apiFetch("/api/admin/rule-engine?id="+id,{method:"DELETE"});
    setLocal(l=>l.filter(i=>i.id!==id));
    onReload();
  }

  const filtered=local.filter(item=>{
    if(!search) return true;
    return filterFn?filterFn(item,search):false;
  });
  const activeCount=local.filter(i=>i.active).length;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%" }}>
      <div style={{ background:S.panel,borderBottom:"1px solid "+S.border,padding:"9px 16px",display:"flex",gap:10,alignItems:"center",flexShrink:0 }}>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>{activeCount}/{local.length} 件 有効</span>
        <div style={{ flex:1 }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={searchPlaceholder}
          style={{ background:S.panel2,border:"1px solid "+S.border2,color:S.text,padding:"4px 10px",fontFamily:S.mono,fontSize:11,outline:"none",width:180 }} />
        <button onClick={()=>setLocal(l=>[createNew(),...l])}
          style={{ background:"rgba(0,212,255,0.1)",border:"1px solid "+S.cyan,color:S.cyan,fontFamily:S.mono,fontSize:10,padding:"5px 14px",cursor:"pointer" }}>+ 追加</button>
        <button onClick={onReload}
          style={{ background:"none",border:"1px solid "+S.border2,color:S.text2,fontFamily:S.mono,fontSize:10,padding:"5px 10px",cursor:"pointer" }}>⟳</button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10 }}>
        {loading
          ?<div style={{ textAlign:"center",padding:40,fontFamily:S.mono,fontSize:11,color:S.text3 }}>読み込み中...</div>
          :filtered.length===0
          ?<div style={{ textAlign:"center",padding:40,fontFamily:S.mono,fontSize:11,color:S.text3 }}>ルールがありません。「+ 追加」から作成してください。</div>
          :filtered.map(item=>(
            <div key={item.id}>
              {renderEditor(item,(v)=>setLocal(l=>l.map(i=>i.id===v.id?v:i)))}
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginTop:5,paddingBottom:6,borderBottom:"1px solid "+S.border }}>
                {msgs[item.id]&&<span style={{ fontFamily:S.mono,fontSize:10,color:msgs[item.id].ok?S.green:S.red }}>{msgs[item.id].text}</span>}
                <button onClick={()=>save(item)} disabled={saving===item.id}
                  style={{ background:"rgba(0,212,255,0.1)",border:"1px solid "+S.cyan,color:S.cyan,fontFamily:S.mono,fontSize:10,padding:"4px 16px",cursor:"pointer" }}>
                  {saving===item.id?"保存中...":"保存"}
                </button>
                <button onClick={()=>del(item.id)}
                  style={{ background:"none",border:"1px solid "+S.border2,color:S.text3,fontFamily:S.mono,fontSize:10,padding:"4px 10px",cursor:"pointer" }}>削除</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   メインページ
   ══════════════════════════════════════════════════════════════ */
export default function RuleEnginePage() {
  const [tab,setTab]=useState<TabId>("arg_keyword");
  const [data,setData]=useState<Record<string,unknown[]>>({});
  const [loading,setLoading]=useState<Record<string,boolean>>({});

  const load=useCallback(async(type:string)=>{
    setLoading(l=>({...l,[type]:true}));
    try {
      const r=await fetch("/api/admin/rule-engine?type="+type);
      const d=await r.json();
      setData(dd=>({...dd,[type]:Array.isArray(d)?d:[]}));
    } finally { setLoading(l=>({...l,[type]:false})); }
  },[]);

  useEffect(()=>{ if(!data[tab]) load(tab); },[tab,data,load]);

  const currentTab=TABS.find(t=>t.id===tab)!;

  return (
    <div style={{ background:S.bg,margin:"-2rem -1.5rem",minHeight:"100vh",display:"flex",flexDirection:"column" }}>
      {/* ページヘッダー */}
      <div style={{ background:S.panel,borderBottom:"1px solid "+S.border2,padding:"10px 20px",display:"flex",alignItems:"center",gap:14,flexShrink:0 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:currentTab.color,boxShadow:"0 0 8px "+currentTab.color }} />
        <span style={{ fontFamily:S.mono,fontSize:12,color:currentTab.color,letterSpacing:".2em" }}>ルールエンジン管理</span>
        <span style={{ fontFamily:S.mono,fontSize:10,color:S.text3 }}>— {currentTab.desc}</span>
      </div>

      {/* タブバー */}
      <div style={{ background:S.panel,borderBottom:"1px solid "+S.border2,display:"flex",flexShrink:0,overflowX:"auto" as const }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:"none",border:"none",
            borderBottom:"2px solid "+(tab===t.id?t.color:"transparent"),
            color:tab===t.id?t.color:S.text3,fontFamily:S.mono,fontSize:10,
            padding:"10px 16px",cursor:"pointer",whiteSpace:"nowrap" as const,
            letterSpacing:".05em",transition:"all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex:1,overflow:"hidden" }}>
        {tab==="arg_keyword"&&(
          <RulePanel<ArgKeyword>
            type="arg_keyword" items={(data.arg_keyword||[]) as ArgKeyword[]} loading={!!loading.arg_keyword}
            onReload={()=>load("arg_keyword")}
            createNew={()=>({id:genId("arg"),keyword:"",description:"",phase:"1",severity:"medium",active:true})}
            filterFn={(item,s)=>item.keyword.includes(s)||item.description.includes(s)}
            searchPlaceholder="キーワード検索..."
            renderEditor={(item,onChange)=><ArgKeywordEditor item={item} onChange={onChange} />}
          />
        )}
        {tab==="known_flag"&&(
          <RulePanel<KnownFlag>
            type="known_flag" items={(data.known_flag||[]) as KnownFlag[]} loading={!!loading.known_flag}
            onReload={()=>load("known_flag")}
            createNew={()=>({id:genId("flg"),key:"",label:"",phase:"1",description:"",category:"story",active:true})}
            filterFn={(item,s)=>item.key.includes(s)||item.label.includes(s)||item.description.includes(s)}
            searchPlaceholder="フラグキー検索..."
            renderEditor={(item,onChange)=><KnownFlagEditor item={item} onChange={onChange} />}
          />
        )}
        {tab==="incident_lifecycle"&&(
          <RulePanel<IncidentLifecycle>
            type="incident_lifecycle" items={(data.incident_lifecycle||[]) as IncidentLifecycle[]} loading={!!loading.incident_lifecycle}
            onReload={()=>load("incident_lifecycle")}
            createNew={()=>({id:genId("inc"),name:"新規ライフサイクルルール",active:true,conditionType:"age_days",conditionValue:7,fromStatus:"調査中",toStatus:"終息",newSeverity:"",notifyAdmin:false})}
            filterFn={(item,s)=>item.name.includes(s)}
            searchPlaceholder="ルール名検索..."
            renderEditor={(item,onChange)=><IncidentLifecycleEditor item={item} onChange={onChange} />}
          />
        )}
        {tab==="novel_rule"&&(
          <RulePanel<NovelRule>
            type="novel_rule" items={(data.novel_rule||[]) as NovelRule[]} loading={!!loading.novel_rule}
            onReload={()=>load("novel_rule")}
            createNew={()=>({id:genId("nvl"),name:"新規公開ルール",active:true,applyTo:"category",applyValue:"",operator:"AND",conditions:[]})}
            filterFn={(item,s)=>item.name.includes(s)||item.applyValue.includes(s)}
            searchPlaceholder="ルール名検索..."
            renderEditor={(item,onChange)=><NovelRuleEditor item={item} onChange={onChange} />}
          />
        )}
        {tab==="xp_rule"&&(
          <RulePanel<XpRule>
            type="xp_rule" items={(data.xp_rule||[]) as XpRule[]} loading={!!loading.xp_rule}
            onReload={()=>load("xp_rule")}
            createNew={()=>({id:genId("xpr"),event:"chat_message",baseXp:10,active:true,onlyFirst:false,maxPerDay:10,multiplier:1.0,conditions:[],priority:0})}
            filterFn={(item,s)=>item.event.includes(s)}
            searchPlaceholder="イベント名検索..."
            renderEditor={(item,onChange)=><XpRuleEditor item={item} onChange={onChange} />}
          />
        )}
        {tab==="anomaly_rule"&&(
          <RulePanel<AnomalyRule>
            type="anomaly_rule" items={(data.anomaly_rule||[]) as AnomalyRule[]} loading={!!loading.anomaly_rule}
            onReload={()=>load("anomaly_rule")}
            createNew={()=>({id:genId("anm"),name:"新規異常スコアルール",active:true,triggerType:"keyword",triggerValue:"",delta:5,maxPerDay:3,effectStatusThreshold:0,effectStatusChange:"",notifyAdminThreshold:0,notifyMessage:""})}
            filterFn={(item,s)=>item.name.includes(s)||item.triggerValue.includes(s)}
            searchPlaceholder="ルール名・トリガー検索..."
            renderEditor={(item,onChange)=><AnomalyRuleEditor item={item} onChange={onChange} />}
          />
        )}
      </div>
    </div>
  );
}
