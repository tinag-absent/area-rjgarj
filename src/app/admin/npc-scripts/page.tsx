"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620",
  border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", orange: "#ff9800", pink: "#f472b6",
  text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

const NPC_KEYS = ["K-ECHO", "N-VEIL", "L-RIFT", "A-PHOS", "G-MIST"] as const;
type NpcKey = typeof NPC_KEYS[number];

const NPC_COLOR: Record<string, string> = {
  "K-ECHO": S.cyan, "N-VEIL": S.purple, "L-RIFT": S.green,
  "A-PHOS": S.pink, "G-MIST": S.orange,
};

const genId = () => Math.random().toString(36).slice(2, 10);

/* ─── 共通: タグ入力 ─── */
function TagInput({ items, onChange, placeholder = "入力して Enter", color = S.cyan }:
  { items: string[]; onChange: (v: string[]) => void; placeholder?: string; color?: string }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (!v || items.includes(v)) { setInput(""); return; }
    onChange([...items, v]); setInput("");
  }
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5, minHeight: 20 }}>
        {items.map(item => (
          <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: color + "18", border: "1px solid " + color, color, fontFamily: S.mono, fontSize: 11, padding: "1px 7px" }}>
            {item}
            <button onClick={() => onChange(items.filter(i => i !== item))} style={{ background: "none", border: "none", color, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>x</button>
          </span>
        ))}
        {items.length === 0 && <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>未設定</span>}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1, background: S.panel2, border: "1px solid " + S.border2, color: S.text, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
        <button onClick={add} style={{ background: color + "18", border: "1px solid " + color, color, fontFamily: S.mono, fontSize: 10, padding: "5px 10px", cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

/* ─── 共通: NPCセレクタ ─── */
function NpcSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: S.panel2, border: "1px solid " + S.border2, color: NPC_COLOR[value] || S.text, padding: "5px 8px", fontFamily: S.mono, fontSize: 11, outline: "none" }}>
      {NPC_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}

/* ─── 共通: 保存ボタン ─── */
function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ background: "rgba(0,212,255,0.1)", border: "1px solid " + S.cyan, color: S.cyan, fontFamily: S.mono, fontSize: 11, padding: "5px 18px", cursor: "pointer" }}>
      {saving ? "保存中..." : "保存"}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 1: 会話スクリプト（分岐ツリー）
   ─── 型定義 ─── */
interface ScriptStep { id: string; parentId: string | null; keywords: string[]; response: string; label?: string; }
interface NpcScript { id: string; name: string; npc_key: string; active: boolean; entryStepId: string; steps: ScriptStep[]; created_at: string; updated_at: string; }

const BRANCH_COLORS = [S.cyan, S.green, S.yellow, S.pink, S.orange, S.purple];
function getChildren(steps: ScriptStep[], parentId: string | null) { return steps.filter(s => s.parentId === parentId); }
function getAllDescendantIds(steps: ScriptStep[], id: string): string[] {
  const children = steps.filter(s => s.parentId === id);
  return [id, ...children.flatMap(c => getAllDescendantIds(steps, c.id))];
}
function stepDepth(steps: ScriptStep[], id: string): number {
  const step = steps.find(s => s.id === id);
  if (!step || step.parentId === null) return 0;
  return 1 + stepDepth(steps, step.parentId);
}

function KeywordInput({ keywords, onChange }: { keywords: string[]; onChange: (kws: string[]) => void }) {
  return <TagInput items={keywords} onChange={onChange} placeholder="キーワードを入力して Enter" color={S.cyan} />;
}

function TreeNode({ step, steps, depth: d, selectedId, onSelect, onAdd, onDelete, branchIndex }: {
  step: ScriptStep; steps: ScriptStep[]; depth: number; selectedId: string | null;
  onSelect: (id: string) => void; onAdd: (parentId: string) => void; onDelete: (id: string) => void; branchIndex: number;
}) {
  const children = getChildren(steps, step.id);
  const isSelected = selectedId === step.id;
  const color = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
  const isRoot = step.parentId === null;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {d > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
            {Array.from({ length: d }).map((_, i) => (
              <div key={i} style={{ width: 24, display: "flex", justifyContent: "center" }}>
                <div style={{ width: 1, background: i === d - 1 ? color : S.border2, alignSelf: "stretch", minHeight: 40 }} />
              </div>
            ))}
            <div style={{ width: 16, height: 20, borderBottom: "1px solid " + color, borderLeft: "1px solid " + color, flexShrink: 0 }} />
          </div>
        )}
        <div onClick={() => onSelect(step.id)} style={{ flex: 1, background: isSelected ? "rgba(0,0,0,0.5)" : S.panel2, border: "1px solid " + (isSelected ? color : S.border2), borderLeft: "3px solid " + color, margin: "4px 6px 4px 0", padding: "8px 12px", cursor: "pointer", boxShadow: isSelected ? "0 0 10px " + color + "33" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {isRoot && <span style={{ fontFamily: S.mono, fontSize: 9, color: S.green, border: "1px solid " + S.green, padding: "0 4px" }}>ROOT</span>}
            {step.label && <span style={{ fontFamily: S.mono, fontSize: 9, color, border: "1px solid " + color + "88", padding: "0 4px" }}>{step.label}</span>}
            <div style={{ flex: 1 }} />
            <button onClick={e => { e.stopPropagation(); onAdd(step.id); }} style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>+ 分岐</button>
            <button onClick={e => { e.stopPropagation(); onDelete(step.id); }} style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>×</button>
          </div>
          {step.keywords.length > 0
            ? <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 3 }}>{step.keywords.slice(0, 4).map(kw => <span key={kw} style={{ fontFamily: S.mono, fontSize: 10, color, background: color + "18", padding: "0 4px" }}>{kw}</span>)}{step.keywords.length > 4 && <span style={{ color: S.text3, fontSize: 10, fontFamily: S.mono }}>+{step.keywords.length - 4}</span>}</div>
            : <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 3 }}>キーワード未設定</div>}
          <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>{step.response || "返答未設定"}</div>
        </div>
      </div>
      {children.length > 0 && (
        <div style={{ marginLeft: d > 0 ? d * 24 + 16 : 0 }}>
          {children.map((child, idx) => <TreeNode key={child.id} step={child} steps={steps} depth={d + 1} selectedId={selectedId} onSelect={onSelect} onAdd={onAdd} onDelete={onDelete} branchIndex={idx} />)}
        </div>
      )}
    </div>
  );
}

function NodeEditor({ step, steps, onUpdate, onClose }: { step: ScriptStep; steps: ScriptStep[]; onUpdate: (s: ScriptStep) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ScriptStep>({ ...step, keywords: [...step.keywords] });
  useEffect(() => { setDraft({ ...step, keywords: [...step.keywords] }); }, [step.id]);
  const parent = steps.find(s => s.id === draft.parentId);
  const childCount = steps.filter(s => s.parentId === draft.id).length;
  const d = stepDepth(steps, draft.id);
  function apply(patch: Partial<ScriptStep>) { const u = { ...draft, ...patch }; setDraft(u); onUpdate(u); }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: S.panel }}>
      <div style={{ borderBottom: "1px solid " + S.border2, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRANCH_COLORS[d % BRANCH_COLORS.length] }} />
        <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text2 }}>{draft.parentId === null ? "ROOT ノード" : "分岐ノード (depth " + d + ")"}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>子: {childCount}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: S.text3, fontFamily: S.mono, fontSize: 16, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {parent && <div style={{ background: S.panel2, border: "1px solid " + S.border, padding: "8px 12px" }}><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>// 親の返答後に反応</div><div style={{ fontFamily: S.mono, fontSize: 11, color: S.text2 }}>{parent.response || "（返答未設定）"}</div></div>}
        {draft.parentId !== null && (
          <div><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>分岐ラベル</div>
            <input value={draft.label || ""} onChange={e => apply({ label: e.target.value })} placeholder="例: 協力ルート / 敵対ルート" style={{ width: "100%", background: S.panel2, border: "1px solid " + S.border2, color: S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} /></div>
        )}
        <div><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 6 }}>▸ 反応キーワード</div><KeywordInput keywords={draft.keywords} onChange={kws => apply({ keywords: kws })} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 1, background: S.border2 }} /><span style={{ fontFamily: S.mono, fontSize: 10, color: S.orange }}>NPC の返答</span><div style={{ flex: 1, height: 1, background: S.border2 }} /></div>
        <div><textarea value={draft.response} onChange={e => apply({ response: e.target.value })} rows={5} placeholder="NPCの返答テキスト..." style={{ width: "100%", background: S.panel2, border: "1px solid " + S.border2, color: S.text, padding: "8px 10px", fontFamily: S.mono, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" as const, lineHeight: 1.7 }} /></div>
        {childCount > 0 && <div style={{ background: "rgba(206,147,216,0.07)", border: "1px solid rgba(206,147,216,0.2)", padding: "8px 12px" }}><div style={{ fontFamily: S.mono, fontSize: 10, color: S.purple }}>この返答の後、{childCount} 件の分岐が続きます</div></div>}
      </div>
    </div>
  );
}

function ScriptEditor({ script, onSave, onDelete, onClose }: { script: NpcScript; onSave: (s: NpcScript) => Promise<void>; onDelete: (id: string) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<NpcScript>(JSON.parse(JSON.stringify(script)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const selectedStep = draft.steps.find(s => s.id === selectedId) || null;
  const roots = getChildren(draft.steps, null);
  function updateStep(u: ScriptStep) { setDraft(d => ({ ...d, steps: d.steps.map(s => s.id === u.id ? u : s) })); }
  function addChild(parentId: string | null) {
    const ns: ScriptStep = { id: genId(), parentId, keywords: [], response: "", label: "" };
    setDraft(d => ({ ...d, steps: [...d.steps, ns], entryStepId: d.entryStepId || (parentId === null ? ns.id : d.entryStepId) }));
    setSelectedId(ns.id);
  }
  function deleteStep(id: string) {
    const ids = getAllDescendantIds(draft.steps, id);
    setDraft(d => { const steps = d.steps.filter(s => !ids.includes(s.id)); return { ...d, steps, entryStepId: d.entryStepId === id ? (steps[0]?.id || "") : d.entryStepId }; });
    if (selectedId && ids.includes(selectedId)) setSelectedId(null);
  }
  async function save() { setSaving(true); setMsg(null); try { await onSave(draft); setMsg({ text: "保存しました", ok: true }); } catch { setMsg({ text: "保存に失敗", ok: false }); } finally { setSaving(false); setTimeout(() => setMsg(null), 3000); } }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ background: S.panel, borderBottom: "1px solid " + S.border2, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: S.text2, fontFamily: S.mono, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>‹</button>
        <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={{ flex: 1, background: "none", border: "none", color: S.text, fontFamily: S.mono, fontSize: 13, fontWeight: 600, outline: "none" }} />
        <div onClick={() => setDraft(d => ({ ...d, active: !d.active }))} style={{ width: 32, height: 18, borderRadius: 9, background: draft.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (draft.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 2, left: draft.active ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: draft.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
        <span style={{ fontFamily: S.mono, fontSize: 10, color: draft.active ? S.green : S.text3 }}>{draft.active ? "有効" : "無効"}</span>
      </div>
      <div style={{ background: S.panel, borderBottom: "1px solid " + S.border, padding: "7px 14px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>NPC_KEY</span>
        <input value={draft.npc_key} onChange={e => setDraft(d => ({ ...d, npc_key: e.target.value }))} style={{ background: S.panel2, border: "1px solid " + S.border2, color: S.yellow, padding: "3px 8px", fontFamily: S.mono, fontSize: 11, outline: "none", width: 180 }} />
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginLeft: "auto" }}>ノード数: {draft.steps.length}</span>
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: selectedStep ? "0 0 56%" : "1", borderRight: selectedStep ? "1px solid " + S.border2 : "none", overflowY: "auto", padding: "14px 10px" }}>
          {roots.length === 0
            ? <div style={{ textAlign: "center", padding: "40px 0", fontFamily: S.mono, fontSize: 11, color: S.text3 }}>「+ ルートノード追加」からスタート</div>
            : roots.map((root, idx) => <TreeNode key={root.id} step={root} steps={draft.steps} depth={0} selectedId={selectedId} onSelect={setSelectedId} onAdd={addChild} onDelete={deleteStep} branchIndex={idx} />)}
          <button onClick={() => addChild(null)} style={{ display: "block", width: "calc(100% - 8px)", marginTop: 12, background: "rgba(0,230,118,0.04)", border: "1px dashed " + S.border2, color: S.green, fontFamily: S.mono, fontSize: 11, padding: "9px", cursor: "pointer" }}>+ ルートノード追加</button>
        </div>
        {selectedStep && <div style={{ flex: "0 0 44%", overflow: "hidden" }}><NodeEditor step={selectedStep} steps={draft.steps} onUpdate={updateStep} onClose={() => setSelectedId(null)} /></div>}
      </div>
      <div style={{ background: S.panel, borderTop: "1px solid " + S.border2, padding: "9px 14px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        {confirmDel ? (
          <><span style={{ fontFamily: S.mono, fontSize: 11, color: S.red }}>削除しますか？</span>
            <button onClick={() => onDelete(draft.id)} style={{ background: "rgba(255,82,82,0.15)", border: "1px solid " + S.red, color: S.red, fontFamily: S.mono, fontSize: 11, padding: "5px 14px", cursor: "pointer" }}>削除</button>
            <button onClick={() => setConfirmDel(false)} style={{ background: "none", border: "1px solid " + S.border2, color: S.text2, fontFamily: S.mono, fontSize: 11, padding: "5px 14px", cursor: "pointer" }}>戻る</button></>
        ) : (
          <><button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>削除</button>
            <div style={{ flex: 1 }} />
            {msg && <span style={{ fontFamily: S.mono, fontSize: 11, color: msg.ok ? S.green : S.red }}>{msg.text}</span>}
            <SaveBtn saving={saving} onClick={save} /></>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 2: トリガールール
   ─── キーワード → NPC → ランダム返答 ─── */
interface TriggerRule { id: string; npcKey: string; keywords: string[]; responses: string[]; priority: number; active: boolean; }

function TriggerEditor({ rule, onChange }: { rule: TriggerRule; onChange: (r: TriggerRule) => void }) {
  const color = NPC_COLOR[rule.npcKey] || S.cyan;
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, borderLeft: "3px solid " + color, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <NpcSelect value={rule.npcKey} onChange={v => onChange({ ...rule, npcKey: v })} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>優先度</span>
          <input type="number" value={rule.priority} onChange={e => onChange({ ...rule, priority: Number(e.target.value) })} style={{ width: 52, background: S.panel, border: "1px solid " + S.border2, color: S.text, padding: "4px 6px", fontFamily: S.mono, fontSize: 11, outline: "none", textAlign: "center" }} />
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={() => onChange({ ...rule, active: !rule.active })} style={{ width: 28, height: 16, borderRadius: 8, background: rule.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (rule.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: rule.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: rule.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>
      <div><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>▸ 反応キーワード（いずれかにマッチで発動）</div>
        <TagInput items={rule.keywords} onChange={v => onChange({ ...rule, keywords: v })} placeholder="キーワードを入力して Enter" color={color} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 1, background: S.border2 }} /><span style={{ fontFamily: S.mono, fontSize: 10, color: S.orange }}>返答候補（ランダム選択）</span><div style={{ flex: 1, height: 1, background: S.border2 }} /></div>
      <div>
        {rule.responses.map((resp, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, paddingTop: 7, minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
            <input value={resp} onChange={e => { const rs = [...rule.responses]; rs[i] = e.target.value; onChange({ ...rule, responses: rs }); }}
              style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: S.text, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
            <button onClick={() => onChange({ ...rule, responses: rule.responses.filter((_, j) => j !== i) })}
              style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...rule, responses: [...rule.responses, ""] })}
          style={{ background: "rgba(255,152,0,0.08)", border: "1px dashed " + S.border2, color: S.orange, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer", marginTop: 3 }}>+ 返答候補を追加</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 3: アイドル発言
   ─── 自発的なNPCの独り言プール ─── */
interface IdleEntry { id: string; npcKey: string; text: string; weight: number; active: boolean; }

function IdleEditor({ entry, onChange }: { entry: IdleEntry; onChange: (e: IdleEntry) => void }) {
  const color = NPC_COLOR[entry.npcKey] || S.cyan;
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, borderLeft: "3px solid " + color, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, width: 100 }}>
        <NpcSelect value={entry.npcKey} onChange={v => onChange({ ...entry, npcKey: v })} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>重み</span>
          <input type="number" value={entry.weight} min={1} onChange={e => onChange({ ...entry, weight: Number(e.target.value) })}
            style={{ width: 44, background: S.panel, border: "1px solid " + S.border2, color: S.text, padding: "3px 5px", fontFamily: S.mono, fontSize: 11, outline: "none", textAlign: "center" }} />
        </div>
        <div onClick={() => onChange({ ...entry, active: !entry.active })} style={{ width: 28, height: 16, borderRadius: 8, background: entry.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (entry.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: entry.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: entry.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>
      <input value={entry.text} onChange={e => onChange({ ...entry, text: e.target.value })} placeholder="NPCのセリフを入力..."
        style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: color, padding: "7px 10px", fontFamily: S.mono, fontSize: 12, outline: "none" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 4: NPC連鎖反応
   ─── あるNPCの発言に別NPCが反応するルール ─── */
interface ReactionRule { id: string; sourceNpcKey: string; reactingNpcKey: string; probability: number; reactions: string[]; active: boolean; npcKey: string; }

function ReactionEditor({ rule, onChange }: { rule: ReactionRule; onChange: (r: ReactionRule) => void }) {
  const srcColor = NPC_COLOR[rule.sourceNpcKey] || S.cyan;
  const reactColor = NPC_COLOR[rule.reactingNpcKey] || S.purple;
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>発言者</span>
          <NpcSelect value={rule.sourceNpcKey} onChange={v => onChange({ ...rule, sourceNpcKey: v, npcKey: rule.reactingNpcKey })} />
        </div>
        <span style={{ fontFamily: S.mono, fontSize: 14, color: S.orange }}>→</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>反応者</span>
          <NpcSelect value={rule.reactingNpcKey} onChange={v => onChange({ ...rule, reactingNpcKey: v, npcKey: v })} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>確率</span>
          <input type="number" value={Math.round(rule.probability * 100)} min={0} max={100}
            onChange={e => onChange({ ...rule, probability: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
            style={{ width: 52, background: S.panel, border: "1px solid " + S.border2, color: S.yellow, padding: "4px 6px", fontFamily: S.mono, fontSize: 11, outline: "none", textAlign: "center" }} />
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>%</span>
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={() => onChange({ ...rule, active: !rule.active })} style={{ width: 28, height: 16, borderRadius: 8, background: rule.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (rule.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: rule.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: rule.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: S.mono, fontSize: 10, color: srcColor }}>{rule.sourceNpcKey}</span>
        <div style={{ flex: 1, height: 1, background: S.border2 }} />
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{Math.round(rule.probability * 100)}% で反応</span>
        <div style={{ flex: 1, height: 1, background: S.border2 }} />
        <span style={{ fontFamily: S.mono, fontSize: 10, color: reactColor }}>{rule.reactingNpcKey}</span>
      </div>
      <div>
        {rule.reactions.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, paddingTop: 7, minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
            <input value={r} onChange={e => { const rs = [...rule.reactions]; rs[i] = e.target.value; onChange({ ...rule, reactions: rs }); }}
              style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: reactColor, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
            <button onClick={() => onChange({ ...rule, reactions: rule.reactions.filter((_, j) => j !== i) })}
              style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...rule, reactions: [...rule.reactions, ""] })}
          style={{ background: "rgba(206,147,216,0.08)", border: "1px dashed " + S.border2, color: S.purple, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer", marginTop: 3 }}>+ 反応テキストを追加</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 5: スケジュール発言
   ─── 時刻・曜日指定でNPCが自動的に発言 ─── */
interface ScheduleEntry { id: string; npcKey: string; active: boolean; hours: number[]; days: number[]; messages: string[]; probability: number; }

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i + "時");

function ScheduleEditor({ entry, onChange }: { entry: ScheduleEntry; onChange: (e: ScheduleEntry) => void }) {
  const color = NPC_COLOR[entry.npcKey] || "#38bdf8";
  const accent = "#38bdf8";
  function toggleHour(h: number) { onChange({ ...entry, hours: entry.hours.includes(h) ? entry.hours.filter(x => x !== h) : [...entry.hours, h].sort((a,b)=>a-b) }); }
  function toggleDay(d: number) { onChange({ ...entry, days: entry.days.includes(d) ? entry.days.filter(x => x !== d) : [...entry.days, d].sort((a,b)=>a-b) }); }
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, borderLeft: "3px solid " + accent, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <NpcSelect value={entry.npcKey} onChange={v => onChange({ ...entry, npcKey: v })} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>発言確率</span>
          <input type="number" value={Math.round(entry.probability * 100)} min={1} max={100} onChange={e => onChange({ ...entry, probability: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)) })}
            style={{ width: 52, background: S.panel, border: "1px solid " + S.border2, color: S.yellow, padding: "4px 6px", fontFamily: S.mono, fontSize: 11, outline: "none", textAlign: "center" }} />
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>%</span>
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={() => onChange({ ...entry, active: !entry.active })} style={{ width: 28, height: 16, borderRadius: 8, background: entry.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (entry.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: entry.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: entry.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>

      {/* 曜日選択 */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 7 }}>▸ 発言曜日（未選択=毎日）</div>
        <div style={{ display: "flex", gap: 5 }}>
          {DAY_LABELS.map((label, d) => (
            <button key={d} onClick={() => toggleDay(d)} style={{ width: 34, height: 30, background: entry.days.includes(d) ? accent + "22" : S.panel, border: "1px solid " + (entry.days.includes(d) ? accent : S.border2), color: entry.days.includes(d) ? accent : S.text3, fontFamily: S.mono, fontSize: 11, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* 時間選択 */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 7 }}>▸ 発言時間帯（毎時チェック）</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <button key={h} onClick={() => toggleHour(h)} style={{ width: 36, height: 26, background: entry.hours.includes(h) ? accent + "22" : S.panel, border: "1px solid " + (entry.hours.includes(h) ? accent : S.border2), color: entry.hours.includes(h) ? accent : S.text3, fontFamily: S.mono, fontSize: 10, cursor: "pointer" }}>{h}</button>
          ))}
        </div>
      </div>

      {/* メッセージ候補 */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 7 }}>▸ 発言候補（ランダム選択）</div>
        {entry.messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, paddingTop: 7, minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
            <input value={msg} onChange={e => { const m = [...entry.messages]; m[i] = e.target.value; onChange({ ...entry, messages: m }); }}
              style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
            <button onClick={() => onChange({ ...entry, messages: entry.messages.filter((_, j) => j !== i) })}
              style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...entry, messages: [...entry.messages, ""] })}
          style={{ background: accent + "10", border: "1px dashed " + S.border2, color: accent, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>+ 発言候補を追加</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 6: 多段放送
   ─── 複数NPCが時間差で発言するシナリオイベント ─── */
interface BroadcastStep { id: string; npcKey: string; text: string; delaySeconds: number; }
interface BroadcastEvent { id: string; name: string; active: boolean; npcKey: string; triggerType: "keyword" | "manual"; keywords: string[]; sequence: BroadcastStep[]; }

const genStepId = () => "bs_" + Math.random().toString(36).slice(2, 8);
const accent6 = "#fb7185";

function BroadcastEditor({ event: ev, onChange }: { event: BroadcastEvent; onChange: (e: BroadcastEvent) => void }) {
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, borderLeft: "3px solid " + accent6, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={ev.name} onChange={e => onChange({ ...ev, name: e.target.value })} placeholder="イベント名"
          style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: S.text, padding: "5px 9px", fontFamily: S.mono, fontSize: 12, fontWeight: 600, outline: "none" }} />
        <div onClick={() => onChange({ ...ev, active: !ev.active })} style={{ width: 28, height: 16, borderRadius: 8, background: ev.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (ev.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: ev.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: ev.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>

      {/* トリガー種別 */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 7 }}>▸ 発動トリガー</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["keyword", "manual"] as const).map(t => (
            <button key={t} onClick={() => onChange({ ...ev, triggerType: t })}
              style={{ background: ev.triggerType === t ? accent6 + "20" : S.panel, border: "1px solid " + (ev.triggerType === t ? accent6 : S.border2), color: ev.triggerType === t ? accent6 : S.text3, fontFamily: S.mono, fontSize: 10, padding: "4px 14px", cursor: "pointer" }}>
              {t === "keyword" ? "キーワード" : "手動発火のみ"}
            </button>
          ))}
        </div>
        {ev.triggerType === "keyword" && (
          <TagInput items={ev.keywords} onChange={v => onChange({ ...ev, keywords: v })} placeholder="トリガーキーワードを入力して Enter" color={accent6} />
        )}
      </div>

      {/* シーケンス */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 8 }}>▸ 発言シーケンス（上から順に時間差で発言）</div>
        {ev.sequence.map((step, i) => (
          <div key={step.id} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
            {/* 番号＋遅延 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, width: 52 }}>
              <div style={{ fontFamily: S.mono, fontSize: 10, color: accent6, textAlign: "center" }}>{i + 1}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <input type="number" value={step.delaySeconds} min={0} onChange={e => { const seq = [...ev.sequence]; seq[i] = { ...step, delaySeconds: Number(e.target.value) }; onChange({ ...ev, sequence: seq }); }}
                  style={{ width: 40, background: S.panel, border: "1px solid " + S.border2, color: S.yellow, padding: "2px 4px", fontFamily: S.mono, fontSize: 10, outline: "none", textAlign: "center" }} />
                <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>秒</span>
              </div>
            </div>
            {/* NPC + テキスト */}
            <NpcSelect value={step.npcKey} onChange={v => { const seq = [...ev.sequence]; seq[i] = { ...step, npcKey: v }; onChange({ ...ev, sequence: seq }); }} />
            <input value={step.text} onChange={e => { const seq = [...ev.sequence]; seq[i] = { ...step, text: e.target.value }; onChange({ ...ev, sequence: seq }); }} placeholder="セリフを入力..."
              style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: NPC_COLOR[step.npcKey] || S.text, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
            <button onClick={() => onChange({ ...ev, sequence: ev.sequence.filter((_, j) => j !== i) })}
              style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 11, padding: "4px 8px", cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange({ ...ev, sequence: [...ev.sequence, { id: genStepId(), npcKey: "K-ECHO", text: "", delaySeconds: ev.sequence.length === 0 ? 0 : 5 }] })}
          style={{ background: accent6 + "10", border: "1px dashed " + S.border2, color: accent6, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer", marginTop: 2 }}>+ 発言を追加</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE 7: 条件放送
   ─── プレイヤーのフラグ/XP達成時にNPCが個別メッセージ送信 ─── */
interface ConditionEntry { id: string; npcKey: string; active: boolean; label: string; conditionType: "flag" | "xp" | "level"; flagKey: string; flagValue: string; minXp: number; minLevel: number; message: string; oneShot: boolean; }

const accent7 = "#a3e635";

function ConditionEditor({ entry, onChange }: { entry: ConditionEntry; onChange: (e: ConditionEntry) => void }) {
  const color = NPC_COLOR[entry.npcKey] || accent7;
  return (
    <div style={{ background: S.panel2, border: "1px solid " + S.border2, borderLeft: "3px solid " + accent7, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={entry.label} onChange={e => onChange({ ...entry, label: e.target.value })} placeholder="管理ラベル（例: LV5到達メッセージ）"
          style={{ flex: 1, background: S.panel, border: "1px solid " + S.border2, color: S.text, padding: "5px 9px", fontFamily: S.mono, fontSize: 12, fontWeight: 600, outline: "none" }} />
        <div onClick={() => onChange({ ...entry, active: !entry.active })} style={{ width: 28, height: 16, borderRadius: 8, background: entry.active ? "rgba(0,230,118,0.3)" : S.border2, border: "1px solid " + (entry.active ? S.green : S.border2), position: "relative" as const, cursor: "pointer" }}>
          <div style={{ position: "absolute" as const, top: 1, left: entry.active ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: entry.active ? S.green : S.text3, transition: "left .2s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <NpcSelect value={entry.npcKey} onChange={v => onChange({ ...entry, npcKey: v })} />
        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <div onClick={() => onChange({ ...entry, oneShot: !entry.oneShot })} style={{ width: 28, height: 16, borderRadius: 8, background: entry.oneShot ? "rgba(163,230,53,0.3)" : S.border2, border: "1px solid " + (entry.oneShot ? accent7 : S.border2), position: "relative" as const, cursor: "pointer" }}>
            <div style={{ position: "absolute" as const, top: 1, left: entry.oneShot ? 12 : 1, width: 12, height: 12, borderRadius: "50%", background: entry.oneShot ? accent7 : S.text3, transition: "left .2s" }} />
          </div>
          <span style={{ fontFamily: S.mono, fontSize: 10, color: entry.oneShot ? accent7 : S.text3 }}>一度だけ送信</span>
        </label>
      </div>

      {/* 条件設定 */}
      <div>
        <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 7 }}>▸ 発動条件</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["flag", "xp", "level"] as const).map(t => (
            <button key={t} onClick={() => onChange({ ...entry, conditionType: t })}
              style={{ background: entry.conditionType === t ? accent7 + "20" : S.panel, border: "1px solid " + (entry.conditionType === t ? accent7 : S.border2), color: entry.conditionType === t ? accent7 : S.text3, fontFamily: S.mono, fontSize: 10, padding: "4px 14px", cursor: "pointer" }}>
              {t === "flag" ? "フラグ取得" : t === "xp" ? "XP達成" : "レベル到達"}
            </button>
          ))}
        </div>
        {entry.conditionType === "flag" && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>フラグキー</div>
              <input value={entry.flagKey} onChange={e => onChange({ ...entry, flagKey: e.target.value })} placeholder="例: phase2_unlocked"
                style={{ width: "100%", background: S.panel, border: "1px solid " + S.border2, color: accent7, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} /></div>
            <div style={{ flex: 1 }}><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>フラグ値</div>
              <input value={entry.flagValue} onChange={e => onChange({ ...entry, flagValue: e.target.value })} placeholder="true"
                style={{ width: "100%", background: S.panel, border: "1px solid " + S.border2, color: accent7, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} /></div>
          </div>
        )}
        {entry.conditionType === "xp" && (
          <div><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>最低XP</div>
            <input type="number" value={entry.minXp} min={0} onChange={e => onChange({ ...entry, minXp: Number(e.target.value) })}
              style={{ width: 120, background: S.panel, border: "1px solid " + S.border2, color: accent7, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} /></div>
        )}
        {entry.conditionType === "level" && (
          <div><div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>最低レベル</div>
            <input type="number" value={entry.minLevel} min={1} max={10} onChange={e => onChange({ ...entry, minLevel: Number(e.target.value) })}
              style={{ width: 80, background: S.panel, border: "1px solid " + S.border2, color: accent7, padding: "5px 9px", fontFamily: S.mono, fontSize: 11, outline: "none" }} /></div>
        )}
      </div>

      {/* メッセージ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 1, background: S.border2 }} /><span style={{ fontFamily: S.mono, fontSize: 10, color: S.orange }}>条件達成時のNPCメッセージ</span><div style={{ flex: 1, height: 1, background: S.border2 }} /></div>
      <textarea value={entry.message} onChange={e => onChange({ ...entry, message: e.target.value })} rows={3} placeholder="条件を達成したプレイヤーへのメッセージ..."
        style={{ width: "100%", background: S.panel, border: "1px solid " + S.border2, color, padding: "8px 10px", fontFamily: S.mono, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" as const, lineHeight: 1.7 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   汎用リストエンジン（trigger / idle / reaction 共通UI）
   ─── ─── */
function GenericEnginePanel<T extends { id: string; active: boolean }>({
  type, label, items, loading, onLoad, renderItem, createNew, filterFn,
  npcFilterOptions,
}: {
  type: string; label: string; items: T[]; loading: boolean;
  onLoad: () => void;
  renderItem: (item: T, onChange: (v: T) => void, onDelete: () => void, onSave: (v: T) => void) => React.ReactNode;
  createNew: () => T;
  filterFn?: (item: T, search: string) => boolean;
  npcFilterOptions?: boolean;
}) {
  const [localItems, setLocalItems] = useState<T[]>(items);
  const [search, setSearch] = useState("");
  const [npcFilter, setNpcFilter] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { text: string; ok: boolean }>>({});

  useEffect(() => { setLocalItems(items); }, [items]);

  function setMsg(id: string, text: string, ok: boolean) {
    setMsgs(m => ({ ...m, [id]: { text, ok } }));
    setTimeout(() => setMsgs(m => { const n = { ...m }; delete n[id]; return n; }), 3000);
  }

  async function save(item: T) {
    setSaving(item.id);
    try {
      const res = await apiFetch("/api/admin/npc-engine-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, type }) });
      if (!res.ok) throw new Error();
      setMsg(item.id, "保存しました", true);
    } catch { setMsg(item.id, "保存に失敗", false); }
    finally { setSaving(null); }
  }

  async function del(id: string) {
    await apiFetch("/api/admin/npc-engine-rules?id=" + id, { method: "DELETE" });
    setLocalItems(li => li.filter(i => i.id !== id));
    onLoad();
  }

  function addNew() {
    const item = createNew();
    setLocalItems(li => [item, ...li]);
  }

  const filtered = localItems.filter(item => {
    const npcKey = (item as unknown as { npcKey?: string }).npcKey;
    if (npcFilter !== "all" && npcKey !== npcFilter) return false;
    if (search && filterFn) return filterFn(item, search);
    return true;
  });
  const activeCount = localItems.filter(i => i.active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
      {/* ツールバー */}
      <div style={{ background: S.panel, borderBottom: "1px solid " + S.border, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{activeCount} / {localItems.length} 件 有効</span>
        <div style={{ flex: 1 }} />
        {npcFilterOptions && (
          <select value={npcFilter} onChange={e => setNpcFilter(e.target.value)}
            style={{ background: S.panel2, border: "1px solid " + S.border2, color: npcFilter === "all" ? S.text2 : NPC_COLOR[npcFilter] || S.text, padding: "4px 8px", fontFamily: S.mono, fontSize: 11, outline: "none" }}>
            <option value="all">全NPC</option>
            {NPC_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索..."
          style={{ background: S.panel2, border: "1px solid " + S.border2, color: S.text, padding: "4px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", width: 150 }} />
        <button onClick={addNew} style={{ background: "rgba(0,212,255,0.1)", border: "1px solid " + S.cyan, color: S.cyan, fontFamily: S.mono, fontSize: 10, padding: "5px 14px", cursor: "pointer" }}>+ 追加</button>
      </div>

      {/* リスト */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: S.mono, fontSize: 11, color: S.text3 }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: S.mono, fontSize: 11, color: S.text3 }}>ルールがありません。「+ 追加」から作成してください。</div>
        ) : filtered.map(item => (
          <div key={item.id}>
            {renderItem(
              item,
              (v) => setLocalItems(li => li.map(i => i.id === v.id ? v : i)),
              () => del(item.id),
              (v) => save(v),
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              {msgs[item.id] && <span style={{ fontFamily: S.mono, fontSize: 10, color: msgs[item.id].ok ? S.green : S.red }}>{msgs[item.id].text}</span>}
              <SaveBtn saving={saving === item.id} onClick={() => save(item)} />
              <button onClick={() => del(item.id)} style={{ background: "none", border: "1px solid " + S.border2, color: S.text3, fontFamily: S.mono, fontSize: 10, padding: "5px 10px", cursor: "pointer" }}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   メインページ
   ─── ─── */
const ENGINE_TABS = [
  { id: "script",    label: "会話スクリプト", color: S.purple,  desc: "分岐ツリー型の会話フロー" },
  { id: "trigger",   label: "トリガールール", color: S.cyan,    desc: "キーワード → NPC → ランダム返答" },
  { id: "idle",      label: "アイドル発言",   color: S.green,   desc: "自発的なNPCの独り言プール" },
  { id: "reaction",  label: "NPC連鎖反応",   color: S.orange,  desc: "NPC同士の相槌・反応チェーン" },
  { id: "schedule",  label: "スケジュール発言", color: "#38bdf8", desc: "時刻・曜日指定の自動投稿" },
  { id: "broadcast", label: "多段放送",       color: "#fb7185", desc: "複数NPCが順番に発言するイベント" },
  { id: "condition", label: "条件放送",       color: "#a3e635", desc: "フラグ/XP達成時の個別メッセージ" },
] as const;
type EngineTab = typeof ENGINE_TABS[number]["id"];

export default function NpcScriptsPage() {
  const [tab, setTab] = useState<EngineTab>("script");

  // === スクリプト ===
  const [scripts, setScripts] = useState<NpcScript[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<NpcScript | null>(null);
  const [scriptSearch, setScriptSearch] = useState("");

  const loadScripts = useCallback(async () => {
    setScriptsLoading(true);
    try { const r = await fetch("/api/admin/npc-script"); const d = await r.json(); setScripts(Array.isArray(d) ? d : []); }
    finally { setScriptsLoading(false); }
  }, []);

  // === エンジンルール ===
  const [triggers, setTriggers] = useState<TriggerRule[]>([]);
  const [idles, setIdles] = useState<IdleEntry[]>([]);
  const [reactions, setReactions] = useState<ReactionRule[]>([]);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [idlesLoading, setIdlesLoading] = useState(false);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastEvent[]>([]);
  const [conditions, setConditions] = useState<ConditionEntry[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [conditionsLoading, setConditionsLoading] = useState(false);

  async function loadRules(type: "trigger" | "idle" | "reaction" | "schedule" | "broadcast" | "condition") {
    if (type === "trigger") { setTriggersLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=trigger"); const d = await r.json(); setTriggers(Array.isArray(d) ? d : []); } finally { setTriggersLoading(false); } }
    if (type === "idle") { setIdlesLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=idle"); const d = await r.json(); setIdles(Array.isArray(d) ? d : []); } finally { setIdlesLoading(false); } }
    if (type === "reaction") { setReactionsLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=reaction"); const d = await r.json(); setReactions(Array.isArray(d) ? d : []); } finally { setReactionsLoading(false); } }
    if (type === "schedule") { setSchedulesLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=schedule"); const d = await r.json(); setSchedules(Array.isArray(d) ? d : []); } finally { setSchedulesLoading(false); } }
    if (type === "broadcast") { setBroadcastsLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=broadcast"); const d = await r.json(); setBroadcasts(Array.isArray(d) ? d.map((x: BroadcastEvent) => ({ ...x, sequence: x.sequence || [] })) : []); } finally { setBroadcastsLoading(false); } }
    if (type === "condition") { setConditionsLoading(true); try { const r = await fetch("/api/admin/npc-engine-rules?type=condition"); const d = await r.json(); setConditions(Array.isArray(d) ? d : []); } finally { setConditionsLoading(false); } }
  }

  useEffect(() => { loadScripts(); }, [loadScripts]);
  useEffect(() => {
    if (tab === "trigger" && triggers.length === 0) loadRules("trigger");
    if (tab === "idle" && idles.length === 0) loadRules("idle");
    if (tab === "reaction" && reactions.length === 0) loadRules("reaction");
    if (tab === "schedule" && schedules.length === 0) loadRules("schedule");
    if (tab === "broadcast" && broadcasts.length === 0) loadRules("broadcast");
    if (tab === "condition" && conditions.length === 0) loadRules("condition");
  }, [tab]);

  async function saveScript(script: NpcScript) {
    const res = await apiFetch("/api/admin/npc-script", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(script) });
    if (!res.ok) throw new Error("save failed");
    await loadScripts();
    setSelectedScript(script);
  }

  async function deleteScript(id: string) {
    await apiFetch("/api/admin/npc-script?id=" + id, { method: "DELETE" });
    setSelectedScript(null);
    await loadScripts();
  }

  function createNewScript() {
    setSelectedScript({ id: genId(), name: "新規スクリプト", npc_key: "K-ECHO", active: true, entryStepId: "", steps: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }

  const filteredScripts = scripts.filter(s => !scriptSearch || s.name.includes(scriptSearch) || s.npc_key.includes(scriptSearch));

  const currentTab = ENGINE_TABS.find(t => t.id === tab)!;

  return (
    <div style={{ background: S.bg, margin: "-2rem -1.5rem", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ページヘッダー */}
      <div style={{ background: S.panel, borderBottom: "1px solid " + S.border2, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: currentTab.color, boxShadow: "0 0 8px " + currentTab.color }} />
        <span style={{ fontFamily: S.mono, fontSize: 12, color: currentTab.color, letterSpacing: ".2em" }}>NPC エンジン管理</span>
        <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>— {currentTab.desc}</span>
      </div>

      {/* タブバー */}
      <div style={{ background: S.panel, borderBottom: "1px solid " + S.border2, display: "flex", flexShrink: 0 }}>
        {ENGINE_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", borderBottom: "2px solid " + (tab === t.id ? t.color : "transparent"), color: tab === t.id ? t.color : S.text3, fontFamily: S.mono, fontSize: 11, padding: "10px 20px", cursor: "pointer", letterSpacing: ".06em", transition: "all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── 会話スクリプト ── */}
        {tab === "script" && (
          <>
            {/* サイドバー */}
            <div style={{ width: 268, borderRight: "1px solid " + S.border2, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid " + S.border }}>
                <input value={scriptSearch} onChange={e => setScriptSearch(e.target.value)} placeholder="名前 / NPC_KEY 検索..."
                  style={{ width: "100%", background: S.panel2, border: "1px solid " + S.border2, color: S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <button onClick={createNewScript} style={{ background: "rgba(206,147,216,0.08)", border: "none", borderBottom: "1px solid " + S.border, color: S.purple, fontFamily: S.mono, fontSize: 11, padding: "10px 14px", cursor: "pointer", textAlign: "left" as const }}>
                ＋ 新規スクリプト作成
              </button>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {scriptsLoading ? (
                  <div style={{ textAlign: "center", padding: 28, fontFamily: S.mono, fontSize: 11, color: S.text3 }}>読み込み中...</div>
                ) : filteredScripts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 28, fontFamily: S.mono, fontSize: 11, color: S.text3 }}>スクリプトなし</div>
                ) : filteredScripts.map(s => {
                  const sel = selectedScript?.id === s.id;
                  const rootCount = s.steps.filter((st: ScriptStep) => st.parentId === null).length;
                  const branchCount = s.steps.filter((st: ScriptStep) => st.parentId !== null).length;
                  return (
                    <button key={s.id} onClick={() => setSelectedScript(s)} style={{ width: "100%", background: sel ? "rgba(206,147,216,0.1)" : "none", border: "none", borderBottom: "1px solid " + S.border, borderLeft: "3px solid " + (sel ? S.purple : "transparent"), color: S.text, padding: "11px 14px", cursor: "pointer", textAlign: "left" as const }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: s.active ? S.green : S.text3 }} />
                        <span style={{ fontFamily: S.mono, fontSize: 12, color: sel ? S.purple : S.text, fontWeight: 600 }}>{s.name}</span>
                      </div>
                      <div style={{ fontFamily: S.mono, fontSize: 10, color: NPC_COLOR[s.npc_key] || S.yellow, marginBottom: 2 }}>{s.npc_key}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>ROOT×{rootCount} / 分岐×{branchCount}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* エディタ */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {selectedScript ? (
                <ScriptEditor key={selectedScript.id} script={selectedScript} onSave={saveScript} onDelete={deleteScript} onClose={() => setSelectedScript(null)} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 40, color: S.border2 }}>⬡</div>
                  <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text3, textAlign: "center", lineHeight: 2.2 }}>スクリプトを選択または新規作成</div>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.border2, textAlign: "center", lineHeight: 1.9 }}>// キーワード分岐で会話フローを定義<br />// 各ノードに条件・エフェクトを設定可</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── トリガールール ── */}
        {tab === "trigger" && (
          <GenericEnginePanel<TriggerRule>
            type="trigger" label="トリガールール"
            items={triggers} loading={triggersLoading}
            onLoad={() => loadRules("trigger")}
            createNew={() => ({ id: genId(), npcKey: "K-ECHO", keywords: [], responses: [], priority: 0, active: true })}
            filterFn={(item, s) => item.keywords.some(k => k.includes(s)) || item.npcKey.includes(s)}
            npcFilterOptions
            renderItem={(item, onChange, onDelete, onSave) => (
              <TriggerEditor rule={item} onChange={onChange} />
            )}
          />
        )}

        {/* ── アイドル発言 ── */}
        {tab === "idle" && (
          <GenericEnginePanel<IdleEntry>
            type="idle" label="アイドル発言"
            items={idles} loading={idlesLoading}
            onLoad={() => loadRules("idle")}
            createNew={() => ({ id: genId(), npcKey: "K-ECHO", text: "", weight: 1, active: true })}
            filterFn={(item, s) => item.text.includes(s) || item.npcKey.includes(s)}
            npcFilterOptions
            renderItem={(item, onChange, onDelete, onSave) => (
              <IdleEditor entry={item} onChange={onChange} />
            )}
          />
        )}

        {/* ── NPC連鎖反応 ── */}
        {tab === "reaction" && (
          <GenericEnginePanel<ReactionRule>
            type="reaction" label="NPC連鎖反応"
            items={reactions} loading={reactionsLoading}
            onLoad={() => loadRules("reaction")}
            createNew={() => ({ id: genId(), npcKey: "N-VEIL", sourceNpcKey: "K-ECHO", reactingNpcKey: "N-VEIL", probability: 0.4, reactions: [], active: true })}
            filterFn={(item, s) => item.sourceNpcKey.includes(s) || item.reactingNpcKey.includes(s)}
            npcFilterOptions
            renderItem={(item, onChange, onDelete, onSave) => (
              <ReactionEditor rule={item} onChange={onChange} />
            )}
          />
        )}

        {/* ── スケジュール発言 ── */}
        {tab === "schedule" && (
          <GenericEnginePanel<ScheduleEntry>
            type="schedule" label="スケジュール発言"
            items={schedules} loading={schedulesLoading}
            onLoad={() => loadRules("schedule")}
            createNew={() => ({ id: genId(), npcKey: "K-ECHO", active: true, hours: [9, 12, 18, 22], days: [], messages: [], probability: 0.6 })}
            filterFn={(item, s) => item.npcKey.includes(s) || item.messages.some(m => m.includes(s))}
            npcFilterOptions
            renderItem={(item, onChange) => (
              <ScheduleEditor entry={item} onChange={onChange} />
            )}
          />
        )}

        {/* ── 多段放送 ── */}
        {tab === "broadcast" && (
          <GenericEnginePanel<BroadcastEvent>
            type="broadcast" label="多段放送"
            items={broadcasts} loading={broadcastsLoading}
            onLoad={() => loadRules("broadcast")}
            createNew={() => ({ id: genId(), name: "新規イベント", active: true, npcKey: "K-ECHO", triggerType: "keyword", keywords: [], sequence: [] })}
            filterFn={(item, s) => item.name.includes(s) || item.keywords.some(k => k.includes(s))}
            renderItem={(item, onChange) => (
              <BroadcastEditor event={item} onChange={onChange} />
            )}
          />
        )}

        {/* ── 条件放送 ── */}
        {tab === "condition" && (
          <GenericEnginePanel<ConditionEntry>
            type="condition" label="条件放送"
            items={conditions} loading={conditionsLoading}
            onLoad={() => loadRules("condition")}
            createNew={() => ({ id: genId(), npcKey: "K-ECHO", active: true, label: "", conditionType: "flag", flagKey: "", flagValue: "true", minXp: 0, minLevel: 1, message: "", oneShot: true })}
            filterFn={(item, s) => item.label.includes(s) || item.flagKey.includes(s) || item.message.includes(s)}
            npcFilterOptions
            renderItem={(item, onChange) => (
              <ConditionEditor entry={item} onChange={onChange} />
            )}
          />
        )}

      </div>
    </div>
  );
}
