"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────

interface Chapter { id?: string; title: string; content: string; }
interface Novel {
  id: string; title: string; subtitle: string; author: string;
  date: string; category: string; tags: string[]; summary: string;
  securityLevel: number; chapters: Chapter[];
}
type CardData =
  | { type: "PERSONNEL"; id: string; name: string; division: string; rank: string; age?: number; specialization?: string; resume?: { achievements?: string[] }; }
  | { type: "INCIDENT";  id: string; name: string; severity: string; status: string; location?: string; entity?: string; gsi?: string | number; description?: string; timestamp?: string; assignedDivision?: string; }
  | { type: "ENTITY";    id: string; code?: string; name: string; classification?: string; description?: string; threat?: string; intelligence?: string; behavior?: string; containment?: string; }
  | { type: "LOCATION";  id: string; name: string; type?: string; description?: string; coordinates?: string; securityLevel?: number; facilities?: string[]; }
  | { type: "MODULE";    id: string; code?: string; name: string; classification?: string; description?: string; range?: string; duration?: string; energy?: string; warning?: string; }
  | null;

interface AllData {
  personnel: Record<string, CardData>;
  incidents: Record<string, CardData>;
  entities: Record<string, CardData>;
  locations: Record<string, CardData>;
  modules: Record<string, CardData>;
}

// ── Data loader ───────────────────────────────────────────────────────────

async function loadAllData(): Promise<AllData> {
  const [pRaw, iRaw, eRaw, lRaw, mRaw] = await Promise.all([
    fetch("/data/personnel-data.json").then(r => r.json()),
    fetch("/data/map-incidents.json").then(r => r.json()),
    fetch("/data/entities-data.json").then(r => r.json()),
    fetch("/data/locations-data.json").then(r => r.json()),
    fetch("/data/modules-data.json").then(r => r.json()),
  ]);
  const personnel: Record<string, CardData> = {};
  for (const p of (pRaw.personnel ?? pRaw)) personnel[p.id] = { type: "PERSONNEL", ...p };
  const incidents: Record<string, CardData> = {};
  for (const i of (iRaw.incidents ?? iRaw)) incidents[i.id] = { type: "INCIDENT", ...i };
  const entities: Record<string, CardData> = {};
  for (const e of (eRaw.entities ?? eRaw)) {
    entities[e.id] = { type: "ENTITY", ...e };
    if (e.code) entities[e.code] = { type: "ENTITY", ...e };
  }
  const locations: Record<string, CardData> = {};
  for (const l of (lRaw.locations ?? lRaw)) {
    locations[l.id] = { type: "LOCATION", ...l };
  }
  const modules: Record<string, CardData> = {};
  for (const m of (mRaw.modules ?? mRaw)) {
    modules[m.id] = { type: "MODULE", ...m };
    if (m.code) modules[m.code] = { type: "MODULE", ...m };
  }
  return { personnel, incidents, entities, locations, modules };
}

// ── Styles ────────────────────────────────────────────────────────────────

const CAT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  "作戦記録":     { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "rgb(239,68,68)" },
  "実体接触記録": { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  text: "rgb(16,185,129)" },
  "内部記録":     { bg: "rgba(0,255,255,0.10)",   border: "rgba(0,255,255,0.35)",  text: "var(--primary)" },
  "人物記録":     { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.4)",  text: "rgb(168,85,247)" },
  "個人記録":     { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  text: "rgb(245,158,11)" },
};
const SEC_LABELS: Record<number, string> = { 1: "公開", 2: "機密", 3: "極秘" };
const SEC_COLORS: Record<number, string> = { 1: "rgb(16,185,129)", 2: "rgb(245,158,11)", 3: "rgb(239,68,68)" };

const TAG_STYLES: Record<string, { bg: string; color: string; border: string; clickable?: boolean }> = {
  PERSONNEL:  { bg: "rgba(168,85,247,0.15)", color: "#c084fc", border: "rgba(168,85,247,0.4)",  clickable: true },
  INCIDENT:   { bg: "rgba(239,68,68,0.15)",  color: "#f87171", border: "rgba(239,68,68,0.4)",   clickable: true },
  ENTITY:     { bg: "rgba(0,200,255,0.12)",  color: "#00c8ff", border: "rgba(0,200,255,0.4)",   clickable: true },
  LOCATION:   { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.4)",  clickable: true },
  MODULE:     { bg: "rgba(80,220,120,0.12)", color: "#50dc78", border: "rgba(80,220,120,0.4)",  clickable: true },
  CONSOLE:    { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.4)", clickable: true },
  CLASSIFIED: { bg: "rgba(239,68,68,0.2)",   color: "#ef4444", border: "rgba(239,68,68,0.6)",   clickable: true },
  ALERT:      { bg: "rgba(239,68,68,0.18)",  color: "#ff4444", border: "rgba(239,68,68,0.7)",   clickable: true },
  REDACTED:   { bg: "rgba(80,80,80,0.3)",    color: "#aaa",    border: "rgba(160,160,160,0.5)", clickable: true },
  SCAN:       { bg: "rgba(0,200,255,0.08)",  color: "#67e8f9", border: "rgba(0,200,255,0.3)",   clickable: true },
  DIARY:      { bg: "rgba(245,158,11,0.1)",  color: "#fcd34d", border: "rgba(245,158,11,0.3)",  clickable: true },
  CHAT:       { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "rgba(99,102,241,0.45)", clickable: true },
  AUDIO:        { bg: "rgba(99,102,241,0.15)",  color: "#818cf8", border: "rgba(99,102,241,0.4)",  clickable: true },
  TRANSMISSION: { bg: "rgba(239,68,68,0.15)",   color: "#f87171", border: "rgba(239,68,68,0.4)",  clickable: true },
  MEMORY:       { bg: "rgba(180,140,80,0.12)",  color: "#d4a855", border: "rgba(180,140,80,0.4)", clickable: true },
  DECODE:       { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24", border: "rgba(245,158,11,0.4)", clickable: true },
  CHOICE:       { bg: "rgba(16,185,129,0.12)",  color: "#34d399", border: "rgba(16,185,129,0.4)", clickable: true },
  SIGNAL:       { bg: "rgba(0,200,255,0.10)",   color: "#67e8f9", border: "rgba(0,200,255,0.35)", clickable: true },
  GRAPH:        { bg: "rgba(0,200,255,0.08)",   color: "#67e8f9", border: "rgba(0,200,255,0.25)", clickable: true },
  TIMELINE:     { bg: "rgba(168,85,247,0.10)",  color: "#c084fc", border: "rgba(168,85,247,0.3)", clickable: true },
  MISSION:      { bg: "rgba(0,200,255,0.10)",   color: "#00c8ff", border: "rgba(0,200,255,0.4)",  clickable: true },
  GSI:          { bg: "rgba(16,185,129,0.08)",  color: "#34d399", border: "rgba(16,185,129,0.25)" },
  REDACT_REVEAL:{ bg: "rgba(60,60,60,0.5)",     color: "#888",    border: "rgba(120,120,120,0.4)", clickable: true },
};

// ── Alert modal ───────────────────────────────────────────────────────────

interface AlertData {
  level: string;   // "critical" | "high" | "medium" | "info"
  message: string;
  reveal: boolean; // true if "|REVEAL" was present
}

const ALERT_LEVEL_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  critical: { color: "#ff2222", bg: "rgba(200,0,0,0.12)",   border: "rgba(255,34,34,0.6)",  label: "緊急警報",   icon: "⚠" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.55)", label: "高度警戒",   icon: "▲" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.10)",  border: "rgba(234,179,8,0.5)",  label: "警戒",       icon: "◆" },
  info:     { color: "#00c8ff", bg: "rgba(0,200,255,0.08)",  border: "rgba(0,200,255,0.4)",  label: "通達",       icon: "◈" },
};

function AlertModal({ alert, onClose }: { alert: AlertData; onClose: () => void }) {
  const cfg = ALERT_LEVEL_CONFIG[alert.level] ?? ALERT_LEVEL_CONFIG["info"];
  const [revealVisible, setRevealVisible] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  // Simulate scan effect on open
  useEffect(() => {
    const t = setTimeout(() => setScanDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isCritical = alert.level === "critical";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "alertOverlayIn 0.2s ease-out",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: isCritical ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.78)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Flicker scanline on critical */}
      {isCritical && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,0,0,0.025) 3px,rgba(255,0,0,0.025) 4px)",
          animation: "alertFlicker 0.15s step-end infinite",
          zIndex: 1,
        }} />
      )}

      {/* Modal */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "min(520px, 92vw)",
        backgroundColor: "rgba(5,8,14,0.98)",
        border: `1px solid ${cfg.border}`,
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: `0 0 60px ${cfg.color}30, 0 0 120px ${cfg.color}15, inset 0 0 40px rgba(0,0,0,0.5)`,
        animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Top accent bar */}
        <div style={{
          height: "3px",
          background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80, transparent)`,
          animation: isCritical ? "alertBarPulse 1s ease-in-out infinite" : "none",
        }} />

        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem 1rem",
          borderBottom: `1px solid ${cfg.border}30`,
          backgroundColor: cfg.bg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
            {/* Level icon with pulse */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              backgroundColor: `${cfg.color}18`,
              border: `2px solid ${cfg.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", color: cfg.color,
              flexShrink: 0,
              boxShadow: `0 0 14px ${cfg.color}50`,
              animation: isCritical ? "alertIconPulse 0.8s ease-in-out infinite" : "none",
            }}>
              {cfg.icon}
            </div>
            <div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.58rem", color: `${cfg.color}cc`, letterSpacing: "0.2em", marginBottom: "0.2rem" }}>
                ALERT SYSTEM // {alert.level.toUpperCase()}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: cfg.color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.03em" }}>
                {cfg.label}
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.2rem",
              lineHeight: 1, padding: "0.25rem", flexShrink: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >×</button>
          </div>

          {/* Scan bar animation */}
          <div style={{
            height: "2px", backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: "1px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              backgroundColor: cfg.color,
              width: scanDone ? "100%" : "0%",
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 0 8px ${cfg.color}`,
            }} />
          </div>
        </div>

        {/* Message body */}
        <div style={{ padding: "1.5rem" }}>
          <div style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.58rem", color: `${cfg.color}80`,
            letterSpacing: "0.15em", marginBottom: "0.75rem",
          }}>
            {scanDone ? "▮ MESSAGE DECODED" : "▮ DECODING..."}
          </div>

          <div style={{
            fontSize: "0.92rem", lineHeight: 1.8,
            color: scanDone ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
            fontFamily: "'Space Grotesk', sans-serif",
            transition: "color 0.4s 0.3s",
            letterSpacing: "0.015em",
          }}>
            {alert.message}
          </div>

          {/* REVEAL section */}
          {alert.reveal && (
            <div style={{ marginTop: "1.25rem" }}>
              {!revealVisible ? (
                <button
                  onClick={() => setRevealVisible(true)}
                  style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: "0.68rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: `${cfg.color}12`,
                    border: `1px solid ${cfg.border}`,
                    color: cfg.color, cursor: "pointer", letterSpacing: "0.1em",
                    transition: "all 0.2s", borderRadius: "2px",
                    animation: scanDone ? "alertRevealPulse 2s ease-in-out infinite" : "none",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${cfg.color}25`; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${cfg.color}12`; }}
                >
                  ▶ 機密附記を展開する
                </button>
              ) : (
                <div style={{
                  padding: "0.85rem 1rem",
                  backgroundColor: `${cfg.color}08`,
                  border: `1px solid ${cfg.border}50`,
                  borderRadius: "2px",
                  animation: "alertRevealIn 0.3s ease-out",
                }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.56rem", color: `${cfg.color}90`, letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
                    ▮ 附記 // CLASSIFIED
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontFamily: "JetBrains Mono, monospace" }}>
                    このアラートは上位権限によって発令されました。<br />
                    対応記録は自動的に機関中央サーバーへ送信されます。<br />
                    <span style={{ color: cfg.color, marginTop: "0.5rem", display: "block" }}>
                      全エージェントは直ちに安全規定に従ってください。
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.75rem 1.5rem",
          borderTop: `1px solid ${cfg.border}20`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.25)" }}>
            PRESS ESC OR CLICK OUTSIDE TO DISMISS
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem",
              padding: "0.4rem 1rem",
              backgroundColor: `${cfg.color}15`,
              border: `1px solid ${cfg.border}`,
              color: cfg.color, cursor: "pointer", letterSpacing: "0.08em",
              transition: "all 0.15s", borderRadius: "2px",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${cfg.color}28`; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${cfg.color}15`; }}
          >
            了解 [ACKNOWLEDGE]
          </button>
        </div>

        {/* Bottom accent bar */}
        <div style={{
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${cfg.color}80, ${cfg.color}, ${cfg.color}80, transparent)`,
          animation: isCritical ? "alertBarPulse 1s ease-in-out infinite" : "none",
        }} />
      </div>
    </div>
  );
}

// ── Console modal ─────────────────────────────────────────────────────────

interface ConsoleEntry {
  time: string;
  message: string;
  type: string; // alert | deployment | action | critical | discovery | completed
}
interface ConsoleData {
  entries: ConsoleEntry[];
  cmd?: string;
  result?: string;
}

function parseConsoleTag(tagValue: string): ConsoleData {
  // Format: timestamp:message:type|timestamp:message:type|...|CMD:cmd>>RESULT:result
  const parts = tagValue.split("|");
  const entries: ConsoleEntry[] = [];
  let cmd: string | undefined;
  let result: string | undefined;

  for (const part of parts) {
    if (part.startsWith("CMD:")) {
      const cmdResult = part.slice(4);
      const sep = cmdResult.indexOf(">>RESULT:");
      if (sep !== -1) {
        cmd = cmdResult.slice(0, sep).trim();
        result = cmdResult.slice(sep + 9).trim();
      } else {
        cmd = cmdResult.trim();
      }
      continue;
    }
    // Expect: time:message[:type]
    const firstColon = part.indexOf(":");
    if (firstColon === -1) continue;
    const time = part.slice(0, firstColon).trim();
    const rest = part.slice(firstColon + 1).trim();
    // Last colon segment is type if it's a known keyword
    const TYPES = ["alert", "deployment", "action", "critical", "discovery", "completed"];
    const lastColon = rest.lastIndexOf(":");
    let message = rest;
    let type = "action";
    if (lastColon !== -1) {
      const possibleType = rest.slice(lastColon + 1).trim().toLowerCase();
      if (TYPES.includes(possibleType)) {
        message = rest.slice(0, lastColon).trim();
        type = possibleType;
      }
    }
    if (time && message) entries.push({ time, message, type });
  }
  return { entries, cmd, result };
}

const CONSOLE_TYPE_STYLES: Record<string, { color: string; icon: string; prefix: string }> = {
  alert:      { color: "#f97316", icon: "⚠", prefix: "ALERT" },
  critical:   { color: "#ef4444", icon: "!!",prefix: "CRIT " },
  deployment: { color: "#60a5fa", icon: "▶", prefix: "DEPL " },
  action:     { color: "#34d399", icon: "›", prefix: "ACT  " },
  discovery:  { color: "#a78bfa", icon: "◎", prefix: "DISC " },
  completed:  { color: "#86efac", icon: "✓", prefix: "DONE " },
};

function ConsoleModal({ data, onClose }: { data: ConsoleData; onClose: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cmdVisible, setCmdVisible] = useState(false);
  const [cmdResult, setCmdResult] = useState("");
  const [cmdDone, setCmdDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reveal entries one by one
  useEffect(() => {
    if (visibleCount >= data.entries.length) {
      if (data.cmd) setTimeout(() => setCmdVisible(true), 400);
      return;
    }
    const delay = visibleCount === 0 ? 200 : 180 + Math.random() * 280;
    const t = setTimeout(() => setVisibleCount(v => v + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount, data.entries.length, data.cmd]);

  // Scroll to bottom as entries appear
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleCount, cmdResult]);

  // Typewriter for CMD result
  useEffect(() => {
    if (!cmdVisible || !data.result) return;
    let i = 0;
    const tick = () => {
      i++;
      setCmdResult(data.result!.slice(0, i));
      if (i < data.result!.length) setTimeout(tick, 22);
      else setCmdDone(true);
    };
    setTimeout(tick, 500);
  }, [cmdVisible, data.result]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", zIndex: 2,
        width: "min(640px, 94vw)",
        backgroundColor: "rgba(2,8,6,0.98)",
        border: "1px solid rgba(16,185,129,0.45)",
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: "0 0 50px rgba(16,185,129,0.2), 0 8px 40px rgba(0,0,0,0.8)",
        animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {/* Title bar */}
        <div style={{ padding: "0.6rem 1rem", backgroundColor: "rgba(16,185,129,0.08)", borderBottom: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {["#ef4444","#f59e0b","#34d399"].map((c,i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c, opacity: 0.8 }} />
            ))}
          </div>
          <span style={{ fontSize: "0.65rem", color: "rgba(16,185,129,0.7)", letterSpacing: "0.12em", flex: 1, textAlign: "center" }}>
            KAISHOKU-ORGAN SYSTEM TERMINAL — LOG VIEWER
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color="white")}
            onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.3)")}
          >×</button>
        </div>

        {/* Log area */}
        <div ref={scrollRef} style={{ padding: "1rem", overflowY: "auto", maxHeight: "400px", minHeight: "200px" }}>
          {/* Boot line */}
          <div style={{ fontSize: "0.65rem", color: "rgba(16,185,129,0.4)", marginBottom: "0.75rem" }}>
            $ logview --format=timeline --auth=operator<br />
            <span style={{ color: "rgba(16,185,129,0.25)" }}>Initializing secure log channel... OK</span>
          </div>

          {data.entries.slice(0, visibleCount).map((entry, i) => {
            const ts = CONSOLE_TYPE_STYLES[entry.type] ?? CONSOLE_TYPE_STYLES["action"];
            return (
              <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.45rem", animation: "consoleEntryIn 0.2s ease-out", alignItems: "flex-start" }}>
                <span style={{ color: "rgba(16,185,129,0.4)", fontSize: "0.6rem", flexShrink: 0, marginTop: "0.1rem" }}>{entry.time}</span>
                <span style={{ color: ts.color, fontSize: "0.6rem", flexShrink: 0, marginTop: "0.1rem", letterSpacing: "0.05em" }}>[{ts.prefix}]</span>
                <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.72rem", lineHeight: 1.5 }}>{entry.message}</span>
                <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "0.65rem" }}>{ts.icon}</span>
              </div>
            );
          })}

          {/* Blinking cursor while loading entries */}
          {visibleCount < data.entries.length && (
            <span style={{ color: "#34d399", fontSize: "0.65rem", animation: "cursorBlink 0.8s step-end infinite" }}>▮</span>
          )}

          {/* CMD block */}
          {cmdVisible && data.cmd && (
            <div style={{ marginTop: "0.75rem", animation: "consoleEntryIn 0.2s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ color: "#34d399", fontSize: "0.65rem" }}>$</span>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.7rem", fontStyle: "italic" }}>{data.cmd}</span>
              </div>
              {cmdResult && (
                <div style={{ paddingLeft: "1rem", borderLeft: "2px solid rgba(16,185,129,0.25)", marginLeft: "0.35rem" }}>
                  <span style={{ color: "#a7f3d0", fontSize: "0.68rem", lineHeight: 1.7 }}>{cmdResult}</span>
                  {!cmdDone && <span style={{ color: "#34d399", animation: "cursorBlink 0.8s step-end infinite" }}>▮</span>}
                </div>
              )}
            </div>
          )}

          {/* End of log */}
          {visibleCount >= data.entries.length && (
            <div style={{ marginTop: "0.75rem", color: "rgba(16,185,129,0.3)", fontSize: "0.6rem" }}>
              — ログ終端 —
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.6rem 1rem", borderTop: "1px solid rgba(16,185,129,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <span style={{ fontSize: "0.55rem", color: "rgba(16,185,129,0.3)" }}>{data.entries.length} ENTRIES · ESC TO CLOSE</span>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.62rem", padding: "0.35rem 0.9rem", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399", cursor: "pointer", letterSpacing: "0.08em" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor="rgba(16,185,129,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor="rgba(16,185,129,0.08)")}
          >[CLOSE]</button>
        </div>
      </div>
    </div>
  );
}

// ── Chat modal ────────────────────────────────────────────────────────────
// Format: PLAYER:message|NPC_NAME:response|PLAYER:message|NPC_NAME:response...

interface ChatLine { speaker: string; message: string; }

const NPC_CHAT_COLORS: Record<string, { name: string; bg: string; border: string; icon: string }> = {
  "K-ECHO": { name: "#00c8ff", bg: "rgba(0,200,255,0.07)",   border: "rgba(0,200,255,0.3)",   icon: "◈" },
  "N-VEIL": { name: "#a064ff", bg: "rgba(160,100,255,0.07)", border: "rgba(160,100,255,0.3)", icon: "◉" },
  "L-RIFT": { name: "#50dc78", bg: "rgba(80,220,120,0.07)",  border: "rgba(80,220,120,0.3)",  icon: "⬡" },
  "A-PHOS": { name: "#ffb43c", bg: "rgba(255,180,60,0.07)",  border: "rgba(255,180,60,0.3)",  icon: "♡" },
  "G-MIST": { name: "#a0a0a0", bg: "rgba(160,160,160,0.06)", border: "rgba(160,160,160,0.25)",icon: "〜" },
  "PLAYER": { name: "var(--primary)", bg: "rgba(0,255,255,0.07)", border: "rgba(0,255,255,0.25)", icon: "◎" },
};
function getNpcStyle(speaker: string) {
  return NPC_CHAT_COLORS[speaker] ?? { name: "#c084fc", bg: "rgba(168,85,247,0.07)", border: "rgba(168,85,247,0.25)", icon: "◆" };
}

function parseChatTag(tagValue: string): ChatLine[] {
  const lines: ChatLine[] = [];
  for (const part of tagValue.split("|")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const speaker = part.slice(0, colon).trim();
    const message = part.slice(colon + 1).trim();
    if (speaker && message) lines.push({ speaker, message });
  }
  return lines;
}

// phase: "waiting" = player can press send
//        "sending" = lag animation in progress
//        "typing"  = NPC typing indicator
//        "done"    = all lines shown, send button disabled
type ChatPhase = "waiting" | "sending" | "typing" | "done";

function ChatModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const lines = parseChatTag(tagValue);
  const [shown, setShown] = useState<ChatLine[]>([]);
  const [nextIdx, setNextIdx] = useState(0);
  const [phase, setPhase] = useState<ChatPhase>(() =>
    lines[0]?.speaker === "PLAYER" ? "waiting" : "typing"
  );
  // Remember the message in the input box during "sending" phase
  const [sendingMsg, setSendingMsg] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-show NPC lines (typing → show → next)
  useEffect(() => {
    if (phase !== "typing") return;
    const line = lines[nextIdx];
    if (!line) { setPhase("done"); return; }
    const delay = 800 + Math.random() * 700;
    const t = setTimeout(() => {
      setShown(prev => [...prev, line]);
      const after = nextIdx + 1;
      setNextIdx(after);
      if (after >= lines.length) {
        setPhase("done");
      } else if (lines[after].speaker === "PLAYER") {
        setPhase("waiting");
      } else {
        setPhase("typing");
      }
    }, delay);
    return () => clearTimeout(t);
  }, [phase, nextIdx, lines]);

  const handleSend = () => {
    if (phase !== "waiting") return;
    const line = lines[nextIdx];
    if (!line || line.speaker !== "PLAYER") return;
    setSendingMsg(line.message);
    setPhase("sending");
    const lagDelay = 700 + Math.random() * 700;
    setTimeout(() => {
      setShown(prev => [...prev, line]);
      const after = nextIdx + 1;
      setNextIdx(after);
      setSendingMsg("");
      if (after >= lines.length) {
        setPhase("done");
      } else {
        setPhase("typing");
      }
    }, lagDelay);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shown, phase]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // What's shown in the input box
  const inputValue =
    phase === "waiting" ? (lines[nextIdx]?.message ?? "") :
    phase === "sending" ? sendingMsg :
    "";

  const typingNpcName = phase === "typing" ? lines[nextIdx]?.speaker : null;
  const typingStyle   = typingNpcName ? getNpcStyle(typingNpcName) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", zIndex: 2,
        width: "min(560px, 94vw)",
        backgroundColor: "rgba(6,8,16,0.98)",
        border: "1px solid rgba(99,102,241,0.35)",
        borderRadius: "8px", overflow: "hidden",
        boxShadow: "0 0 50px rgba(99,102,241,0.15), 0 8px 40px rgba(0,0,0,0.8)",
        animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column", maxHeight: "80vh",
      }}>
        {/* Header */}
        <div style={{ padding: "0.75rem 1.25rem", backgroundColor: "rgba(99,102,241,0.07)", borderBottom: "1px solid rgba(99,102,241,0.18)", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#818cf8", boxShadow: "0 0 8px #818cf8", animation: "groupPulse 2s ease-in-out infinite" }} />
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", fontWeight: 700, color: "white", letterSpacing: "0.04em" }}>通信記録 // ARCHIVED CHAT</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>
              {lines.length} MESSAGES
              {phase === "done"
                ? <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: "0.5rem" }}>· 通信終了</span>
                : <span style={{ color: "#818cf8", marginLeft: "0.5rem" }}>· 再生中...</span>
              }
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0.2rem" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }} className="novel-content">
          {shown.map((line, i) => {
            const isPlayer = line.speaker === "PLAYER";
            const s = getNpcStyle(line.speaker);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isPlayer ? "flex-end" : "flex-start", gap: "0.25rem", animation: "chatMsgIn 0.25s ease-out" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.58rem", color: s.name, opacity: 0.8, letterSpacing: "0.04em" }}>
                  {s.icon} {isPlayer ? "あなた" : line.speaker}
                </span>
                <div style={{
                  maxWidth: "75%", padding: "0.6rem 0.9rem",
                  borderRadius: isPlayer ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                  backgroundColor: s.bg, border: `1px solid ${s.border}`,
                  color: "rgba(255,255,255,0.88)", fontSize: "0.82rem", lineHeight: 1.6,
                  wordBreak: "break-word", fontStyle: isPlayer ? "normal" : "italic",
                  boxShadow: `0 0 10px ${s.bg}`,
                }}>
                  {line.message}
                </div>
              </div>
            );
          })}

          {/* NPC typing indicator */}
          {phase === "typing" && typingStyle && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", animation: "chatMsgIn 0.2s ease-out" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: typingStyle.bg, border: `1.5px solid ${typingStyle.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: typingStyle.name, flexShrink: 0 }}>
                {typingStyle.icon}
              </div>
              <div style={{ padding: "0.5rem 0.8rem", borderRadius: "2px 12px 12px 12px", backgroundColor: typingStyle.bg, border: `1px solid ${typingStyle.border}`, display: "flex", gap: "4px", alignItems: "center" }}>
                {[0,1,2].map(j => (
                  <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: typingStyle.name, display: "inline-block", animation: `npcDot 1.2s ease-in-out ${j*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Done marker */}
          {phase === "done" && (
            <div style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", padding: "0.35rem 0", animation: "chatMsgIn 0.3s ease-out" }}>
              — 通信終了 —
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid rgba(99,102,241,0.15)", backgroundColor: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
            {/* Player avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: phase === "done" ? "rgba(255,255,255,0.03)" : "rgba(0,255,255,0.08)",
              border: `1.5px solid ${phase === "done" ? "rgba(255,255,255,0.12)" : "rgba(0,255,255,0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", color: phase === "done" ? "rgba(255,255,255,0.2)" : "var(--primary)",
              flexShrink: 0, transition: "all 0.4s",
            }}>◎</div>

            {/* Pre-filled read-only input */}
            <div style={{ flex: 1, position: "relative" }}>
              <input
                readOnly
                value={inputValue}
                style={{
                  width: "100%",
                  backgroundColor:
                    phase === "waiting" ? "rgba(0,255,255,0.05)" :
                    phase === "sending" ? "rgba(0,255,255,0.02)" :
                    "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    phase === "waiting" ? "rgba(0,255,255,0.28)" :
                    phase === "sending" ? "rgba(0,255,255,0.12)" :
                    "rgba(255,255,255,0.07)"
                  }`,
                  borderRadius: "20px",
                  padding: "0.5rem 1rem",
                  color:
                    phase === "waiting" ? "rgba(255,255,255,0.88)" :
                    phase === "sending" ? "rgba(255,255,255,0.3)" :
                    "rgba(255,255,255,0.18)",
                  fontSize: "0.82rem", outline: "none", cursor: "default",
                  fontFamily: "inherit", userSelect: "none", transition: "all 0.3s",
                  boxSizing: "border-box",
                  animation: phase === "sending" ? "chatSendingPulse 0.9s ease-in-out infinite" : "none",
                }}
                placeholder={
                  phase === "done"   ? "— 通信終了 —" :
                  phase === "typing" ? "応答を待っています..." :
                  ""
                }
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={phase !== "waiting"}
              style={{
                padding: "0.5rem 1.1rem",
                backgroundColor:
                  phase === "waiting" ? "rgba(0,255,255,0.12)" :
                  phase === "sending" ? "rgba(0,255,255,0.04)" :
                  "transparent",
                border: `1px solid ${
                  phase === "waiting" ? "rgba(0,255,255,0.45)" :
                  phase === "sending" ? "rgba(0,255,255,0.18)" :
                  "rgba(255,255,255,0.08)"
                }`,
                borderRadius: "20px",
                color:
                  phase === "waiting" ? "var(--primary)" :
                  phase === "sending" ? "rgba(0,255,255,0.35)" :
                  "rgba(255,255,255,0.15)",
                fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem",
                cursor: phase === "waiting" ? "pointer" : "not-allowed",
                letterSpacing: "0.05em", transition: "all 0.25s",
                whiteSpace: "nowrap", flexShrink: 0,
                boxShadow: phase === "waiting" ? "0 0 10px rgba(0,255,255,0.1)" : "none",
              }}
              onMouseEnter={e => { if (phase === "waiting") { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(0,255,255,0.22)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0,255,255,0.25)"; } }}
              onMouseLeave={e => { if (phase === "waiting") { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(0,255,255,0.12)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 10px rgba(0,255,255,0.1)"; } }}
            >
              {phase === "sending" ? "送信中..." : phase === "done" ? "— 完了 —" : "送信 ▶"}
            </button>
          </div>

          {/* Progress: one dot per PLAYER turn, fills as sent */}
          {lines.filter(l => l.speaker === "PLAYER").length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.35rem", marginTop: "0.7rem", alignItems: "center" }}>
              {lines.filter(l => l.speaker === "PLAYER").map((_, i) => {
                const sent = shown.filter(l => l.speaker === "PLAYER").length;
                const isCurrent = i === sent && phase === "waiting";
                return (
                  <div key={i} style={{
                    width: isCurrent ? 20 : sent > i ? 14 : 6,
                    height: 6, borderRadius: 3,
                    backgroundColor:
                      sent > i ? "rgba(0,255,255,0.55)" :
                      isCurrent ? "rgba(0,255,255,0.3)" :
                      "rgba(255,255,255,0.1)",
                    boxShadow: isCurrent ? "0 0 6px rgba(0,255,255,0.3)" : "none",
                    transition: "all 0.35s",
                  }} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Console modal ──────────────────────────────────────────────────────────

interface ConsoleEntry {
  kind: "log" | "cmd" | "result";
  timestamp?: string;
  message: string;
  type?: string; // alert, deployment, action, critical, discovery, completed
}

const CONSOLE_TYPE_CONFIG: Record<string, { color: string; icon: string; bg: string }> = {
  alert:      { color: "#ef4444", icon: "⚠", bg: "rgba(239,68,68,0.08)" },
  critical:   { color: "#ff2222", icon: "☠", bg: "rgba(255,0,0,0.1)" },
  deployment: { color: "#a064ff", icon: "▶", bg: "rgba(160,100,255,0.08)" },
  action:     { color: "#00c8ff", icon: "◈", bg: "rgba(0,200,255,0.06)" },
  discovery:  { color: "#fbbf24", icon: "◉", bg: "rgba(245,158,11,0.07)" },
  completed:  { color: "#50dc78", icon: "✓", bg: "rgba(80,220,120,0.07)" },
};

function parseConsoleEntries(raw: string): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  const parts = raw.split("|").map(s => s.trim()).filter(s => s && s !== "REVEAL");
  for (const part of parts) {
    if (part.startsWith("CMD:")) {
      const [cmdPart, resultPart] = part.split(">>").map(s => s.trim());
      entries.push({ kind: "cmd", message: cmdPart.slice(4) });
      if (resultPart?.startsWith("RESULT:")) {
        entries.push({ kind: "result", message: resultPart.slice(7).replace(/\\n/g, "\n") });
      }
    } else {
      // format: "timestamp:message:type" or "timestamp:message"
      const segments = part.split(":");
      if (segments.length >= 2) {
        // Last segment might be a known type
        const lastSeg = segments[segments.length - 1].toLowerCase();
        const isType = lastSeg in CONSOLE_TYPE_CONFIG;
        const type = isType ? lastSeg : "action";
        const msgParts = isType ? segments.slice(0, -1) : segments;
        // First segment(s) might be timestamp (contains digits/dashes/spaces)
        const tsCandidate = msgParts[0];
        const isTimestamp = /^[\d\-\s:]+$/.test(tsCandidate) || tsCandidate.length <= 16;
        const timestamp = isTimestamp && msgParts.length > 1 ? msgParts[0].trim() : undefined;
        const message = isTimestamp && msgParts.length > 1 ? msgParts.slice(1).join(":").trim() : msgParts.join(":").trim();
        entries.push({ kind: "log", timestamp, message, type });
      } else {
        entries.push({ kind: "log", message: part, type: "action" });
      }
    }
  }
  return entries;
}

function ConsoleModal({ raw, onClose }: { raw: string; onClose: () => void }) {
  const entries = parseConsoleEntries(raw);
  const [visible, setVisible] = useState(0);
  const [cmdInput, setCmdInput] = useState("");
  const [userCmds, setUserCmds] = useState<{ cmd: string; out: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible >= entries.length) return;
    const delay = entries[visible]?.kind === "result" ? 80 : 350;
    const t = setTimeout(() => setVisible(v => v + 1), delay);
    return () => clearTimeout(t);
  }, [visible, entries.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible, userCmds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const allDone = visible >= entries.length;

  const executeCmd = () => {
    if (!cmdInput.trim()) return;
    const cmd = cmdInput.trim();
    setCmdInput("");
    const responses: Record<string, string> = {
      "help": "利用可能コマンド: status / scan / list / clear / info",
      "status": "システム状態: 正常稼働中\nGSI監視: アクティブ\n接続エージェント: 1名",
      "scan": "エリアスキャン実行中...\n異常検知: なし\n次元安定性: 98.2%",
      "list": "最近の作戦記録:\n  [1] 別府駅次元亀裂封鎖\n  [2] 日田市漂流者帰還支援\n  [3] 九重B-12封じ込め",
      "clear": "__CLEAR__",
      "info": "海蝕機関 統合コンソール v2.4.1\n分類: 機密 // 許可エージェントのみ",
    };
    const out = responses[cmd.toLowerCase()] ?? `ERROR: 認識できないコマンド '${cmd}'`;
    if (out === "__CLEAR__") {
      setUserCmds([]);
    } else {
      setUserCmds(prev => [...prev, { cmd, out }]);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", zIndex: 2,
        width: "min(640px, 94vw)", maxHeight: "82vh",
        backgroundColor: "rgba(2,6,10,0.99)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "4px",
        boxShadow: "0 0 50px rgba(16,185,129,0.12), 0 8px 40px rgba(0,0,0,0.8)",
        animation: "alertModalIn 0.2s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {/* Title bar */}
        <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid rgba(16,185,129,0.2)", backgroundColor: "rgba(16,185,129,0.05)", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {["#ef4444","#eab308","#22c55e"].map((c,i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c, opacity: 0.7 }} />)}
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(16,185,129,0.8)", letterSpacing: "0.12em", marginLeft: "0.5rem" }}>
            海蝕機関 統合コンソール — 作戦ログ
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "1rem" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >×</button>
        </div>

        {/* Console output */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }} className="novel-content">
          {/* Boot text */}
          <div style={{ fontSize: "0.65rem", color: "rgba(16,185,129,0.5)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
            {`KAISHOKU AGENCY // INTEGRATED CONSOLE v2.4.1\nCLASSIFIED — AUTHORIZED PERSONNEL ONLY\n${"─".repeat(48)}`}
          </div>

          {entries.slice(0, visible).map((entry, i) => {
            if (entry.kind === "cmd") {
              return (
                <div key={i} style={{ animation: "alertRevealIn 0.15s ease-out" }}>
                  <div style={{ fontSize: "0.72rem", color: "#34d399" }}>
                    <span style={{ color: "rgba(16,185,129,0.5)", userSelect: "none" }}>$ </span>
                    {entry.message}
                  </div>
                </div>
              );
            }
            if (entry.kind === "result") {
              return (
                <div key={i} style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", paddingLeft: "1rem", borderLeft: "2px solid rgba(16,185,129,0.2)", marginBottom: "0.35rem", whiteSpace: "pre-wrap", lineHeight: 1.7, animation: "alertRevealIn 0.15s ease-out" }}>
                  {entry.message}
                </div>
              );
            }
            // log entry
            const cfg = CONSOLE_TYPE_CONFIG[entry.type ?? "action"] ?? CONSOLE_TYPE_CONFIG["action"];
            return (
              <div key={i} style={{
                display: "flex", gap: "0.6rem", alignItems: "flex-start",
                padding: "0.3rem 0.5rem",
                backgroundColor: cfg.bg,
                borderLeft: `2px solid ${cfg.color}50`,
                marginBottom: "0.1rem",
                animation: "alertRevealIn 0.2s ease-out",
              }}>
                <span style={{ color: cfg.color, flexShrink: 0, fontSize: "0.7rem", marginTop: "1px" }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  {entry.timestamp && (
                    <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginRight: "0.6rem" }}>{entry.timestamp}</span>
                  )}
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.82)" }}>{entry.message}</span>
                </div>
                <span style={{ fontSize: "0.55rem", color: `${cfg.color}80`, flexShrink: 0, letterSpacing: "0.05em" }}>{(entry.type ?? "action").toUpperCase()}</span>
              </div>
            );
          })}

          {/* Cursor while loading */}
          {!allDone && (
            <div style={{ fontSize: "0.72rem", color: "rgba(16,185,129,0.6)" }}>
              <span style={{ animation: "cursorBlink 0.8s step-end infinite" }}>█</span>
            </div>
          )}

          {/* User commands */}
          {userCmds.map((uc, i) => (
            <div key={`uc-${i}`} style={{ marginTop: "0.25rem", animation: "alertRevealIn 0.15s ease-out" }}>
              <div style={{ fontSize: "0.72rem", color: "#34d399" }}>
                <span style={{ color: "rgba(16,185,129,0.5)", userSelect: "none" }}>$ </span>{uc.cmd}
              </div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", paddingLeft: "1rem", whiteSpace: "pre-wrap", lineHeight: 1.7, borderLeft: "2px solid rgba(16,185,129,0.2)" }}>
                {uc.out}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Interactive input (shown after all entries loaded) */}
        {allDone && (
          <div style={{ padding: "0.6rem 1rem", borderTop: "1px solid rgba(16,185,129,0.15)", backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(16,185,129,0.6)", userSelect: "none" }}>$</span>
            <input
              ref={inputRef}
              value={cmdInput}
              onChange={e => setCmdInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") executeCmd(); }}
              placeholder="コマンドを入力... (help で一覧)"
              autoFocus
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#34d399", fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem",
                caretColor: "#34d399",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Data card popup ───────────────────────────────────────────────────────

function DataCard({ data, onClose, anchorRect }: {
  data: NonNullable<CardData>;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 200, left: 200 });

  useEffect(() => {
    if (!anchorRect) return;
    const cw = 320, ch = 340;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 8;
    if (left + cw > vw - 16) left = vw - cw - 16;
    if (left < 16) left = 16;
    if (top + ch > vh - 16) top = anchorRect.top - ch - 8;
    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const mono = { fontFamily: "JetBrains Mono, monospace" } as const;
  const label = (txt: string) => (
    <div style={{ ...mono, fontSize: "0.57rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "0.2rem", marginTop: "0.45rem" }}>{txt}</div>
  );
  const val = (txt?: string | number, fb = "—") => (
    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: "0.1rem" }}>{txt ?? fb}</div>
  );
  const badge = (txt: string, color: string) => (
    <span style={{ ...mono, fontSize: "0.58rem", padding: "0.15rem 0.5rem", backgroundColor: `${color}20`, border: `1px solid ${color}50`, color, borderRadius: "2px", marginRight: "0.35rem" }}>{txt}</span>
  );

  const sevColor = (s: string) => ({ critical: "#ef4444", high: "#f97316", medium: "#eab308" }[s] ?? "#22c55e");
  const clsColor = (c?: string) => ({ safe: "#22c55e", euclid: "#eab308", danger: "#ef4444", keter: "#ef4444" }[c ?? ""] ?? "#a855f7");

  let headerColor = "var(--primary)";
  let headerBg = "rgba(0,255,255,0.06)";
  let typeLabel = "";
  let titleText = "";

  if (data.type === "PERSONNEL") { headerColor = "#c084fc"; headerBg = "rgba(168,85,247,0.09)"; typeLabel = "人員ファイル"; titleText = data.name; }
  if (data.type === "INCIDENT")  { headerColor = "#f87171"; headerBg = "rgba(239,68,68,0.09)";  typeLabel = "事案記録";     titleText = data.name; }
  if (data.type === "ENTITY")    { headerColor = "#00c8ff"; headerBg = "rgba(0,200,255,0.07)";  typeLabel = "実体記録";     titleText = `${(data as any).code ?? ""} ${data.name}`.trim(); }
  if (data.type === "LOCATION")  { headerColor = "#fbbf24"; headerBg = "rgba(245,158,11,0.07)"; typeLabel = "拠点情報";     titleText = data.name; }
  if (data.type === "MODULE")    { headerColor = "#50dc78"; headerBg = "rgba(80,220,120,0.07)"; typeLabel = "装備記録";     titleText = `${(data as any).code ?? ""} ${data.name}`.trim(); }

  return (
    <div ref={cardRef} style={{
      position: "fixed", top: pos.top, left: pos.left, width: 320, zIndex: 99999,
      backgroundColor: "rgba(6,10,18,0.97)",
      border: `1px solid ${headerColor}45`,
      borderRadius: "6px",
      boxShadow: `0 0 28px ${headerColor}28, 0 8px 40px rgba(0,0,0,0.7)`,
      overflow: "hidden",
      animation: "cardFadeIn 0.15s ease-out",
    }}>
      {/* Header */}
      <div style={{ padding: "0.75rem 1rem", backgroundColor: headerBg, borderBottom: `1px solid ${headerColor}25`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ ...mono, fontSize: "0.55rem", color: headerColor, letterSpacing: "0.15em", marginBottom: "0.25rem" }}>▮ {typeLabel}</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>{titleText}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 0.1rem", marginLeft: "0.5rem", flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: "0.75rem 1rem 1rem", overflowY: "auto", maxHeight: "380px" }}>

        {data.type === "PERSONNEL" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 0.5rem" }}>
            <div>{label("ID")}{val(data.id)}</div>
            <div>{label("階級")}{val(data.rank)}</div>
          </div>
          {label("所属部門")}{val(data.division)}
          {data.specialization && <>{label("専門分野")}{val(data.specialization)}</>}
          {data.age && <>{label("年齢")}{val(`${data.age}歳`)}</>}
          {data.resume?.achievements && data.resume.achievements.length > 0 && <>
            {label("主な実績")}
            <ul style={{ margin: "0.2rem 0 0", paddingLeft: "1.1rem" }}>
              {data.resume.achievements.slice(0, 3).map((a, i) => (
                <li key={i} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.62)", marginBottom: "0.25rem", lineHeight: 1.5 }}>{a}</li>
              ))}
            </ul>
          </>}
        </>}

        {data.type === "INCIDENT" && <>
          <div style={{ marginBottom: "0.6rem" }}>
            {badge(data.severity?.toUpperCase(), sevColor(data.severity))}
            {badge(data.status, "rgba(255,255,255,0.5)")}
          </div>
          {data.location && <>{label("発生地点")}{val(data.location)}</>}
          {data.entity   && <>{label("確認実体")}{val(data.entity)}</>}
          {data.gsi != null && <>{label("GSI値")}{val(String(data.gsi))}</>}
          {data.assignedDivision && <>{label("対応部門")}{val(data.assignedDivision)}</>}
          {data.description && <>{label("概要")}{val(data.description)}</>}
          {data.timestamp && <div style={{ ...mono, fontSize: "0.57rem", color: "rgba(255,255,255,0.28)", marginTop: "0.5rem" }}>記録: {data.timestamp}</div>}
        </>}

        {data.type === "ENTITY" && <>
          <div style={{ marginBottom: "0.6rem" }}>
            {(data as any).classification && badge((data as any).classification.toUpperCase(), clsColor((data as any).classification))}
            {data.threat && badge(`脅威: ${data.threat}`, "rgba(255,255,255,0.5)")}
            {data.intelligence && badge(`知性: ${data.intelligence}`, "rgba(255,255,255,0.5)")}
          </div>
          {data.description && <>{label("説明")}{val(data.description)}</>}
          {data.behavior   && <>{label("行動パターン")}{val(data.behavior)}</>}
          {data.containment && <>{label("対処法")}{val(data.containment)}</>}
        </>}

        {data.type === "LOCATION" && <>
          {(data as any).type && <>{label("施設種別")}{val((data as any).type)}</>}
          {data.coordinates && <>{label("座標")}{val(data.coordinates)}</>}
          {data.securityLevel != null && <>{label("セキュリティLv")}{val(`Lv.${data.securityLevel}`)}</>}
          {data.description && <>{label("説明")}{val(data.description)}</>}
          {data.facilities && data.facilities.length > 0 && <>
            {label("主要設備")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
              {data.facilities.map((f, i) => (
                <span key={i} style={{ ...mono, fontSize: "0.58rem", padding: "0.1rem 0.45rem", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24", borderRadius: "2px" }}>{f}</span>
              ))}
            </div>
          </>}
        </>}

        {data.type === "MODULE" && <>
          <div style={{ marginBottom: "0.6rem" }}>
            {(data as any).classification && badge((data as any).classification.toUpperCase(), clsColor((data as any).classification))}
          </div>
          {data.description && <>{label("概要")}{val(data.description)}</>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 0.4rem" }}>
            {data.range    && <div>{label("範囲")}{val(data.range)}</div>}
            {data.duration && <div>{label("持続")}{val(data.duration)}</div>}
            {data.energy   && <div>{label("消費")}{val(data.energy)}</div>}
          </div>
          {data.warning && (
            <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.65rem", backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: "3px" }}>
              <div style={{ ...mono, fontSize: "0.54rem", color: "#f87171", marginBottom: "0.2rem", letterSpacing: "0.05em" }}>⚠ WARNING</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{data.warning}</div>
            </div>
          )}
        </>}
      </div>
    </div>
  );
}

// ── Classified modal ──────────────────────────────────────────────────────
// Format: [CLASSIFIED:タイトル|本文行1|本文行2...]  or  [CLASSIFIED:本文]

function ClassifiedModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const parts = tagValue.split("|").map((s: string) => s.trim()).filter(Boolean);
  const title     = parts.length > 1 ? parts[0] : "機密文書";
  const bodyLines = parts.length > 1 ? parts.slice(1) : parts;

  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i += 3; setScanLine(Math.min(i, 100)); if (i >= 100) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const docId = Math.abs(tagValue.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 99999).toString().padStart(5, "0");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }} />
      {/* Scan sweep */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: `${scanLine}%`, height: "2px", background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.5),transparent)", transition: "top 0.016s linear" }} />
      </div>
      <div style={{ position: "relative", zIndex: 2, width: "min(560px,93vw)", backgroundColor: "rgba(8,2,2,0.98)", border: "2px solid rgba(239,68,68,0.45)", boxShadow: "0 0 60px rgba(239,68,68,0.18)", animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden" }}>
        <div style={{ height: "4px", background: "linear-gradient(90deg,#ef4444,#991b1b,#ef4444)" }} />
        {/* Document header */}
        <div style={{ padding: "1.2rem 1.5rem 0.9rem", borderBottom: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.05)", position: "relative" }}>
          {/* Stamp */}
          <div style={{ position: "absolute", top: "0.75rem", right: "1.2rem", border: "3px solid rgba(239,68,68,0.65)", color: "rgba(239,68,68,0.7)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", fontWeight: 900, padding: "0.15rem 0.5rem", letterSpacing: "0.2em", transform: "rotate(-8deg)", textShadow: "0 0 8px rgba(239,68,68,0.4)", userSelect: "none" }}>TOP SECRET</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.54rem", color: "rgba(239,68,68,0.55)", letterSpacing: "0.18em", marginBottom: "0.4rem" }}>海蝕機関 // 機密文書 // 閲覧制限あり</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "white", lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.22)", marginTop: "0.4rem", letterSpacing: "0.1em" }}>
            文書番号: KA-{docId}　分類: S-CLASS　閲覧ログ記録済み
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: "1.5rem", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono, monospace", fontSize: "5rem", fontWeight: 900, color: "rgba(239,68,68,0.04)", transform: "rotate(-30deg)", pointerEvents: "none", userSelect: "none" }}>SECRET</div>
          <div style={{ position: "relative", zIndex: 1 }}>
            {bodyLines.map((line: string, i: number) => (
              <p key={i} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.88rem", lineHeight: 1.85, color: "rgba(255,255,255,0.82)", margin: "0 0 0.85em", filter: scanLine < 100 ? "blur(3px)" : "none", transition: "filter 0.5s" }}>{line}</p>
            ))}
          </div>
          {scanLine < 100 && (
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(239,68,68,0.5)", textAlign: "center", marginTop: "0.5rem", letterSpacing: "0.15em" }}>▮ スキャン中... {scanLine}%</div>
          )}
        </div>
        <div style={{ padding: "0.7rem 1.5rem", borderTop: "1px solid rgba(239,68,68,0.12)", backgroundColor: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.53rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>ESC / クリック外で閉じる</div>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.64rem", padding: "0.32rem 1rem", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", cursor: "pointer", letterSpacing: "0.1em" }} onMouseEnter={e=>(e.currentTarget.style.backgroundColor="rgba(239,68,68,0.18)")} onMouseLeave={e=>(e.currentTarget.style.backgroundColor="rgba(239,68,68,0.08)")}>閉じる [ESC]</button>
        </div>
        <div style={{ height: "3px", background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.5),transparent)" }} />
      </div>
    </div>
  );
}

// ── Redacted modal ─────────────────────────────────────────────────────────
// Format: [REDACTED:隠されたテキスト]  (パイプ区切りで複数行も可)

function RedactedModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const lines = tagValue.split("|").map((s: string) => s.trim()).filter(Boolean);
  const fullText = lines.join("\n");
  const [phase, setPhase] = useState<"locked"|"cracking"|"partial"|"revealed">("locked");
  const [crackPct, setCrackPct] = useState(0);
  const [revealedChars, setRevealedChars] = useState(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const startCrack = () => {
    if (phase !== "locked") return;
    setPhase("cracking");
    let pct = 0;
    const t = setInterval(() => {
      pct += 2 + Math.random() * 3;
      setCrackPct(Math.min(pct, 100));
      if (pct >= 100) {
        clearInterval(t);
        setPhase("partial");
        let i = 0;
        const tw = setInterval(() => {
          i += 2;
          setRevealedChars(i);
          if (i >= fullText.length) { clearInterval(tw); setPhase("revealed"); }
        }, 22);
      }
    }, 55);
  };

  // Build char-by-char reveal per line
  const displayLines = lines.map((line: string, li: number) => {
    const offset = lines.slice(0, li).join("\n").length + (li > 0 ? 1 : 0);
    return line.split("").map((ch: string, ci: number) => (offset + ci < revealedChars ? ch : "█")).join("");
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", backdropFilter: "blur(5px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(520px,93vw)", backgroundColor: "rgba(4,4,6,0.99)", border: "1px solid rgba(160,160,160,0.3)", boxShadow: "0 0 40px rgba(0,0,0,0.8)", animation: "alertModalIn 0.22s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", backgroundColor: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", fontWeight: 700, color: "#aaa", letterSpacing: "0.15em" }}>▮ 編集済み文書 / REDACTED</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem" }} onMouseEnter={e=>(e.currentTarget.style.color="white")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>×</button>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", marginBottom: "1rem", letterSpacing: "0.1em" }}>
            {phase==="locked" && "// アクセス保護されています — 解読を試みますか？"}
            {phase==="cracking" && `// 解読中... ${Math.round(crackPct)}%`}
            {phase==="partial" && "// 復元中..."}
            {phase==="revealed" && "// 復元完了"}
          </div>
          {phase === "cracking" && (
            <div style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.06)", marginBottom: "1rem", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${crackPct}%`, background: "linear-gradient(90deg,#888,white)", transition: "width 0.06s linear" }} />
            </div>
          )}
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.88rem", lineHeight: 2, color: phase==="revealed" ? "rgba(255,255,255,0.85)" : "#555", padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", minHeight: "80px", whiteSpace: "pre-wrap", transition: "color 0.4s" }}>
            {phase==="locked" ? lines.map((l: string) => "█".repeat(l.length)).join("\n") : displayLines.join("\n")}
            {phase==="partial" && <span style={{ animation: "cursorBlink 0.6s step-end infinite", color: "white" }}>▮</span>}
          </div>
          {phase === "locked" && (
            <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
              <button onClick={startCrack} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", padding: "0.5rem 1.4rem", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.7)", cursor: "pointer", letterSpacing: "0.12em", transition: "all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.backgroundColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="white";}} onMouseLeave={e=>{e.currentTarget.style.backgroundColor="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}>▶ 解読を試みる [DECRYPT]</button>
            </div>
          )}
        </div>
        <div style={{ padding: "0.6rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.62rem", padding: "0.3rem 0.9rem", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ── Scan modal ─────────────────────────────────────────────────────────────
// Format: [SCAN:スキャン対象|パラメータ名:値|パラメータ名:値...]

function ScanModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const parts = tagValue.split("|").map((s: string) => s.trim()).filter(Boolean);
  const subject = parts[0] ?? "不明な対象";
  const params  = parts.slice(1).map((p: string) => { const ci = p.indexOf(":"); return ci === -1 ? { key: p, val: "—" } : { key: p.slice(0, ci).trim(), val: p.slice(ci + 1).trim() }; });

  const [scanPct, setScanPct] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const [visibleParams, setVisibleParams] = useState(0);

  useEffect(() => {
    let pct = 0;
    const t = setInterval(() => { pct += 1.5 + Math.random() * 1.5; setScanPct(Math.min(pct, 100)); if (pct >= 100) { clearInterval(t); setScanDone(true); } }, 28);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!scanDone || visibleParams >= params.length) return;
    const t = setTimeout(() => setVisibleParams(v => v + 1), 200);
    return () => clearTimeout(t);
  }, [scanDone, visibleParams, params.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const C = "#67e8f9";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(5px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(500px,93vw)", backgroundColor: "rgba(0,6,10,0.99)", border: `1px solid ${C}38`, boxShadow: `0 0 50px ${C}15, 0 8px 40px rgba(0,0,0,0.8)`, animation: "alertModalIn 0.22s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden", fontFamily: "JetBrains Mono, monospace" }}>
        {/* Progress bar top */}
        <div style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${scanPct}%`, background: `linear-gradient(90deg,transparent,${C},${C})`, boxShadow: `0 0 12px ${C}`, transition: "width 0.03s linear" }} />
        </div>
        <div style={{ padding: "1rem 1.25rem 0.8rem", borderBottom: `1px solid ${C}18`, backgroundColor: `${C}05` }}>
          <div style={{ fontSize: "0.54rem", color: `${C}70`, letterSpacing: "0.18em", marginBottom: "0.3rem" }}>KAISHOKU AGENCY // FIELD SCANNER v3.1</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>スキャン対象: <span style={{ color: C }}>{subject}</span></div>
        </div>
        <div style={{ padding: "1.25rem 1.25rem 0" }}>
          {/* Progress row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1, height: "6px", backgroundColor: `${C}12`, borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${scanPct}%`, background: `linear-gradient(90deg,${C}55,${C})`, boxShadow: `0 0 8px ${C}`, borderRadius: "3px", transition: "width 0.03s linear" }} />
            </div>
            <div style={{ fontSize: "0.65rem", color: scanDone ? C : `${C}70`, minWidth: "3rem", textAlign: "right", fontWeight: scanDone ? 700 : 400 }}>{scanDone ? "DONE" : `${Math.round(scanPct)}%`}</div>
          </div>
          {/* Dot matrix viz */}
          <div style={{ height: "40px", marginBottom: "1rem", display: "grid", gridTemplateColumns: "repeat(40,1fr)", gap: "2px", overflow: "hidden" }}>
            {Array.from({ length: 120 }).map((_, i) => (
              <div key={i} style={{ width: "100%", paddingBottom: "100%", borderRadius: "1px", backgroundColor: i / 120 < scanPct / 100 ? `${C}bb` : `${C}10` }} />
            ))}
          </div>
          {/* Params */}
          {params.length > 0 && (
            <div style={{ borderTop: `1px solid ${C}18`, paddingTop: "1rem", paddingBottom: "1rem" }}>
              <div style={{ fontSize: "0.54rem", color: `${C}55`, letterSpacing: "0.15em", marginBottom: "0.6rem" }}>{scanDone ? "▮ スキャン結果" : "▮ 解析待機中..."}</div>
              {params.slice(0, visibleParams).map((p: {key:string;val:string}, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.3rem 0", borderBottom: `1px solid ${C}0e`, animation: "consoleEntryIn 0.2s ease-out" }}>
                  <span style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.45)" }}>{p.key}</span>
                  <span style={{ fontSize: "0.75rem", color: C, fontWeight: 600, letterSpacing: "0.04em" }}>{p.val}</span>
                </div>
              ))}
              {visibleParams < params.length && scanDone && <span style={{ fontSize: "0.65rem", color: `${C}55`, animation: "cursorBlink 0.7s step-end infinite" }}>▮</span>}
            </div>
          )}
        </div>
        <div style={{ padding: "0.6rem 1.25rem", borderTop: `1px solid ${C}12`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <span style={{ fontSize: "0.53rem", color: "rgba(255,255,255,0.18)" }}>ESC で閉じる</span>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.62rem", padding: "0.3rem 0.9rem", backgroundColor: `${C}0c`, border: `1px solid ${C}30`, color: C, cursor: "pointer" }}>[CLOSE]</button>
        </div>
      </div>
    </div>
  );
}

// ── Diary modal ────────────────────────────────────────────────────────────
// Format: [DIARY:日付|本文行1|本文行2...]  or  [DIARY:本文]

function DiaryModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const parts   = tagValue.split("|").map((s: string) => s.trim()).filter(Boolean);
  const hasDate = parts.length > 1 && parts[0].length < 30;
  const date    = hasDate ? parts[0] : null;
  const lines   = hasDate ? parts.slice(1) : parts;
  const fullText = lines.join("\n\n");

  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i += 2; setVisibleText(fullText.slice(0, i)); if (i >= fullText.length) clearInterval(t); }, 18);
    return () => clearInterval(t);
  }, [fullText]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const A = "#fcd34d";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s ease-out" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(520px,93vw)", backgroundColor: "rgba(14,10,2,0.99)", border: `1px solid ${A}30`, boxShadow: `0 0 60px ${A}10, 0 8px 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(245,158,11,0.02)`, animation: "alertModalIn 0.22s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden" }}>
        <div style={{ height: "2px", background: `linear-gradient(90deg,transparent,${A}70,${A},${A}70,transparent)` }} />
        <div style={{ padding: "1.1rem 1.5rem 0.85rem", borderBottom: `1px solid ${A}18`, backgroundColor: `${A}04`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.54rem", color: `${A}55`, letterSpacing: "0.2em", marginBottom: "0.25rem" }}>個人記録 // PERSONAL DIARY</div>
            {date && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.95rem", color: A, fontWeight: 600, letterSpacing: "0.03em" }}>{date}</div>}
          </div>
          <div style={{ fontSize: "1.4rem", opacity: 0.25, marginTop: "0.1rem" }}>✒</div>
        </div>
        {/* Ruled notebook area */}
        <div style={{ padding: "1.25rem 1.5rem 1.5rem", position: "relative", minHeight: "160px", maxHeight: "55vh", overflowY: "auto" }} className="novel-content">
          <div style={{ position: "absolute", inset: "1.25rem 1.5rem", backgroundImage: `repeating-linear-gradient(transparent,transparent 29px,${A}0d 29px,${A}0d 30px)`, backgroundPosition: "0 5px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "3rem", top: "1.25rem", bottom: "1.5rem", width: "1px", backgroundColor: `${A}12`, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, fontFamily: "Georgia,'Noto Serif JP',serif", fontSize: "0.9rem", lineHeight: "30px", color: "rgba(255,240,200,0.82)", paddingLeft: "1.5rem", whiteSpace: "pre-wrap", fontStyle: "italic", letterSpacing: "0.02em" }}>
            {visibleText}
            {visibleText.length < fullText.length && <span style={{ animation: "cursorBlink 0.7s step-end infinite", fontStyle: "normal", color: A }}>|</span>}
          </div>
        </div>
        <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${A}15`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.53rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>{visibleText.length < fullText.length ? "転写中..." : "転写完了"}</div>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.62rem", padding: "0.3rem 0.9rem", backgroundColor: `${A}0c`, border: `1px solid ${A}28`, color: A, cursor: "pointer" }}>[CLOSE]</button>
        </div>
        <div style={{ height: "2px", background: `linear-gradient(90deg,transparent,${A}55,transparent)` }} />
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// 追加タグ コンポーネント群
// ══════════════════════════════════════════════════════════════════

// ── GSI Badge (インライン、モーダルなし) ────────────────────────
function GsiBadge({ value }: { value: number }) {
  const color = value >= 86 ? "#ef4444" : value >= 61 ? "#f97316" : value >= 31 ? "#eab308" : "#22c55e";
  const label = value >= 86 ? "CRITICAL" : value >= 61 ? "HIGH" : value >= 31 ? "ELEVATED" : "NORMAL";
  return (
    <span style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: "0.72em",
      padding: "0.12em 0.55em", border: `1px solid ${color}60`,
      backgroundColor: `${color}18`, color, borderRadius: "3px",
      verticalAlign: "middle", display: "inline-block", margin: "0 2px",
      textShadow: value >= 86 ? `0 0 6px ${color}` : "none",
      animation: value >= 86 ? "alertTagPulse 1.5s ease-in-out infinite" : "none",
    }}>
      GSI {value} <span style={{ opacity: 0.65, fontSize: "0.85em" }}>/ {label}</span>
    </span>
  );
}

// ── REDACT_REVEAL (インライン、クリックで解除) ─────────────────
function RedactReveal({ content }: { content: string }) {
  const [revealed, setRevealed] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const handleClick = () => {
    if (revealed || scanning) return;
    setScanning(true);
    setTimeout(() => { setScanning(false); setRevealed(true); }, 950);
  };
  if (revealed) return (
    <span style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: "0.9em",
      backgroundColor: "rgba(0,255,255,0.07)", border: "1px solid rgba(0,255,255,0.25)",
      color: "rgba(0,255,255,0.9)", padding: "0.05em 0.4em", borderRadius: "2px",
      animation: "alertRevealIn 0.3s ease-out", verticalAlign: "middle",
    }}>{content}</span>
  );
  return (
    <span onClick={handleClick} title="クリックして機密解除" style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: "0.9em",
      backgroundColor: scanning ? "rgba(0,255,80,0.1)" : "rgba(0,0,0,0.85)",
      border: `1px solid ${scanning ? "rgba(0,255,80,0.5)" : "rgba(100,100,100,0.4)"}`,
      color: scanning ? "#0f0" : "transparent", textShadow: scanning ? "0 0 4px #0f0" : "none",
      padding: "0.05em 0.5em", borderRadius: "2px", cursor: "pointer",
      verticalAlign: "middle", userSelect: "none", position: "relative",
      letterSpacing: scanning ? "0.2em" : "normal", transition: "all 0.2s",
    }}>
      {scanning ? "DECRYPTING" : <span style={{ color: "#444" }}>{"█".repeat(Math.min(content.length, 14))}</span>}
      {!scanning && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58em", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>REDACTED</span>}
    </span>
  );
}

// ── AUDIO modal ──────────────────────────────────────────────────
// Format: id:タイトル:書き起こし
function AudioModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const parts = tagValue.split(":");
  const audioId = parts[0]?.trim() ?? "???";
  const title = parts[1]?.trim() ?? "音声ログ";
  const transcript = parts.slice(2).join(":").trim() || "（書き起こしなし）";
  const [playing, setPlaying] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [noise, setNoise] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    if (!playing || done) return;
    if (idx >= transcript.length) { setDone(true); setPlaying(false); return; }
    if (Math.random() < 0.04) { setNoise(true); setTimeout(() => setNoise(false), 140); }
    const t = setTimeout(() => setIdx(i => i + 1), 26); return () => clearTimeout(t);
  }, [playing, idx, transcript, done]);

  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.86)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(520px,92vw)", backgroundColor: "rgba(4,6,20,0.98)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "8px", overflow: "hidden", boxShadow: "0 0 40px rgba(99,102,241,0.2)", animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)", fontFamily: "JetBrains Mono, monospace" }}>
        <div style={{ padding: "1rem 1.25rem 0.75rem", backgroundColor: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.2)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{playing ? "◉" : "▶"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.57rem", color: "rgba(99,102,241,0.7)", letterSpacing: "0.15em", marginBottom: "0.18rem" }}>AUDIO LOG // {audioId.toUpperCase()}</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem" }} onMouseEnter={e=>(e.currentTarget.style.color="white")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>×</button>
        </div>
        <div style={{ padding: "1.1rem 1.5rem 0.65rem", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "44px", justifyContent: "center" }}>
            {bars.map(i => {
              const glitch = noise && i % 3 === 0;
              return <div key={i} style={{ width: "3px", backgroundColor: glitch ? "#f00" : playing ? `rgba(129,140,248,0.8)` : "rgba(99,102,241,0.25)", borderRadius: "1px", animation: playing ? `audioBar${i % 4} ${0.38 + (i % 6) * 0.08}s ease-in-out infinite alternate` : "none", height: playing ? undefined : "4px" }} />;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.7rem", marginTop: "0.75rem" }}>
            <button onClick={() => setPlaying(p => !p)} style={{ padding: "0.38rem 1.1rem", backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.45)", color: "#818cf8", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "0.08em", borderRadius: "3px" }}>{playing ? "⏸ PAUSE" : "▶ PLAY"}</button>
            <button onClick={() => { setIdx(transcript.length); setDone(true); setPlaying(false); }} style={{ padding: "0.38rem 0.8rem", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "0.08em", borderRadius: "3px" }}>SKIP ▶▶</button>
          </div>
        </div>
        <div style={{ padding: "1rem 1.5rem 1.25rem", maxHeight: "200px", overflowY: "auto" }} className="novel-content">
          <div style={{ fontSize: "0.58rem", color: "rgba(99,102,241,0.5)", letterSpacing: "0.12em", marginBottom: "0.55rem" }}>▮ TRANSCRIPT</div>
          <div style={{ fontSize: "0.82rem", lineHeight: 1.85, color: noise ? "#f00" : "rgba(255,255,255,0.82)", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "pre-wrap" }}>
            {noise ? transcript.slice(0, idx).replace(/./g, c => Math.random() < 0.3 ? "▒" : c) : transcript.slice(0, idx)}
            {playing && !done && <span style={{ animation: "cursorBlink 0.6s step-end infinite" }}>▮</span>}
          </div>
          {!playing && !done && idx === 0 && <div style={{ color: "rgba(255,255,255,0.22)", fontSize: "0.72rem" }}>再生ボタンを押してください...</div>}
        </div>
      </div>
    </div>
  );
}

// ── TRANSMISSION modal ───────────────────────────────────────────
// Format: 送信者>受信者:内容
function TransmissionModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const gtIdx = tagValue.indexOf(">");
  const colIdx = tagValue.indexOf(":");
  const sender = gtIdx !== -1 ? tagValue.slice(0, gtIdx).trim() : "UNKNOWN";
  const receiver = gtIdx !== -1 && colIdx !== -1 ? tagValue.slice(gtIdx + 1, colIdx).trim() : "ALL";
  const content = colIdx !== -1 ? tagValue.slice(colIdx + 1).trim() : tagValue;
  const [phase, setPhase] = React.useState<"static"|"decoding"|"done">("static");
  const [decodeIdx, setDecodeIdx] = React.useState(0);
  const [glitchSet, setGlitchSet] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  React.useEffect(() => { const t = setTimeout(() => setPhase("decoding"), 1100); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (phase !== "decoding") return;
    if (decodeIdx >= content.length) { setPhase("done"); return; }
    const g = new Set<number>();
    for (let i = decodeIdx + 1; i < Math.min(decodeIdx + 8, content.length); i++) g.add(i);
    setGlitchSet(g);
    const t = setTimeout(() => setDecodeIdx(i => i + 1), 30); return () => clearTimeout(t);
  }, [phase, decodeIdx, content]);

  const GC = "▒░█▓■□▪◆◇";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,0,0,0.018) 2px,rgba(255,0,0,0.018) 4px)", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(540px,92vw)", backgroundColor: "rgba(6,2,2,0.98)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "4px", boxShadow: "0 0 40px rgba(239,68,68,0.15)", overflow: "hidden", animation: "alertModalIn 0.2s cubic-bezier(0.16,1,0.3,1)", fontFamily: "JetBrains Mono, monospace" }}>
        <div style={{ height: "2px", background: "linear-gradient(90deg,#ef4444,#f87171,transparent)" }} />
        <div style={{ padding: "0.85rem 1.25rem", backgroundColor: "rgba(239,68,68,0.07)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
          <div style={{ fontSize: "0.56rem", color: "rgba(239,68,68,0.6)", letterSpacing: "0.18em", marginBottom: "0.5rem" }}>⚡ INTERCEPTED TRANSMISSION</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem" }}>
            <div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.52rem", marginBottom: "0.2rem" }}>SENDER</div><div style={{ color: "#f87171", fontWeight: "bold" }}>{sender}</div></div>
            <div style={{ color: "rgba(239,68,68,0.5)", fontSize: "1.1rem" }}>→</div>
            <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.52rem", marginBottom: "0.2rem" }}>RECEIVER</div><div style={{ color: "#fca5a5", fontWeight: "bold" }}>{receiver}</div></div>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.56rem", color: phase === "done" ? "#ef4444" : "rgba(239,68,68,0.4)", letterSpacing: "0.1em" }}>
            {phase === "static" ? "▮ 静電気ノイズを除去中..." : phase === "decoding" ? "▮ 暗号解読中..." : "▮ 解読完了"}
          </div>
        </div>
        <div style={{ padding: "1.25rem 1.5rem 1.5rem", fontSize: "0.88rem", lineHeight: 2, fontFamily: "'Space Grotesk', sans-serif", minHeight: "80px" }}>
          {phase === "static"
            ? <span style={{ color: "#f00", letterSpacing: "0.2em", fontFamily: "JetBrains Mono, monospace" }}>{Array.from({ length: 40 }, () => GC[Math.floor(Math.random()*GC.length)]).join("")}</span>
            : Array.from(content).map((char, i) => {
                if (i < decodeIdx) return <span key={i} style={{ color: "rgba(255,255,255,0.85)" }}>{char}</span>;
                if (glitchSet.has(i)) return <span key={i} style={{ color: "#f87171", opacity: 0.7 }}>{GC[i % GC.length]}</span>;
                return <span key={i} style={{ color: "transparent" }}>{char}</span>;
              })
          }
          {phase === "decoding" && <span style={{ animation: "cursorBlink 0.5s step-end infinite", color: "#ef4444" }}>█</span>}
        </div>
        <div style={{ padding: "0.55rem 1.25rem", borderTop: "1px solid rgba(239,68,68,0.12)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", padding: "0.33rem 1rem", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", letterSpacing: "0.08em" }}>CLOSE</button>
        </div>
        <div style={{ height: "2px", background: "linear-gradient(90deg,transparent,#ef4444,transparent)" }} />
      </div>
    </div>
  );
}

// ── MEMORY modal ─────────────────────────────────────────────────
// Format: キャラ名:内容
function MemoryModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const ci = tagValue.indexOf(":");
  const character = ci !== -1 ? tagValue.slice(0, ci).trim() : "不明";
  const content = ci !== -1 ? tagValue.slice(ci + 1).trim() : tagValue;
  const [vis, setVis] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setVis(true), 80); }, []);
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: `rgba(18,10,6,${vis ? 0.92 : 0})`, backdropFilter: "blur(8px) sepia(0.4)", transition: "background-color 0.7s, backdrop-filter 0.7s" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)", pointerEvents: "none" }} />
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(560px,92vw)", backgroundColor: "rgba(28,18,8,0.97)", border: "1px solid rgba(180,140,80,0.28)", borderRadius: "2px", boxShadow: "0 0 60px rgba(180,140,80,0.08), inset 0 0 40px rgba(0,0,0,0.5)", overflow: "hidden", opacity: vis ? 1 : 0, transform: vis ? "none" : "scale(0.96) translateY(12px)", transition: "opacity 0.6s, transform 0.6s" }}>
        <div style={{ padding: "1.25rem 1.75rem 1.5rem" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.56rem", color: "rgba(180,140,80,0.5)", letterSpacing: "0.18em", marginBottom: "0.75rem" }}>◈ 記憶断片 // {character}</div>
          <div style={{ fontSize: "0.92rem", lineHeight: 2.1, color: "rgba(220,195,155,0.88)", fontFamily: "'Noto Serif JP', Georgia, serif", fontStyle: "italic", whiteSpace: "pre-wrap", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{content}</div>
          <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", padding: "0.38rem 1rem", backgroundColor: "rgba(180,140,80,0.07)", border: "1px solid rgba(180,140,80,0.22)", color: "rgba(180,140,80,0.7)", cursor: "pointer", letterSpacing: "0.1em" }}>— 記憶から戻る</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DECODE modal ─────────────────────────────────────────────────
// Format: 暗号文:正解[:ヒント]
function DecodeModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const parts = tagValue.split(":");
  const cipherText = parts[0]?.trim() ?? "";
  const answer = parts[1]?.trim() ?? "";
  const hint = parts[2]?.trim() ?? "";
  const [input, setInput] = React.useState("");
  const [status, setStatus] = React.useState<"idle"|"wrong"|"correct">("idle");
  const [attempts, setAttempts] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && status !== "correct") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose, status]);

  const tryDecode = () => {
    if (!input.trim()) return;
    if (input.trim().toLowerCase() === answer.toLowerCase()) { setStatus("correct"); }
    else { setStatus("wrong"); setAttempts(a => a + 1); setTimeout(() => { setStatus("idle"); inputRef.current?.focus(); }, 700); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s" }}>
      <div onClick={status !== "correct" ? onClose : undefined} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.87)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(480px,92vw)", backgroundColor: "rgba(5,10,8,0.98)", border: `1px solid ${status === "correct" ? "rgba(34,197,94,0.5)" : status === "wrong" ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.4)"}`, borderRadius: "6px", boxShadow: `0 0 40px ${status === "correct" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.1)"}`, overflow: "hidden", animation: `alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)${status === "wrong" ? ",wrongShake 0.4s ease-out" : ""}`, fontFamily: "JetBrains Mono, monospace", transition: "border-color 0.3s, box-shadow 0.3s" }}>
        <div style={{ padding: "0.9rem 1.25rem 0.75rem", backgroundColor: "rgba(245,158,11,0.07)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
          <div style={{ fontSize: "0.56rem", color: "rgba(245,158,11,0.6)", letterSpacing: "0.18em", marginBottom: "0.25rem" }}>▶ DECODE CHALLENGE</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "white" }}>暗号解読</div>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "4px", padding: "0.85rem 1rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.52rem", color: "rgba(245,158,11,0.5)", letterSpacing: "0.12em", marginBottom: "0.35rem" }}>CIPHER TEXT</div>
            <div style={{ fontSize: "1rem", color: "#fbbf24", letterSpacing: "0.15em", wordBreak: "break-all", lineHeight: 1.6 }}>{cipherText}</div>
          </div>
          {status !== "correct" ? (
            <>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
                <input ref={inputRef} autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") tryDecode(); }} placeholder="解読結果を入力..." style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${status === "wrong" ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.3)"}`, borderRadius: "4px", padding: "0.5rem 0.8rem", color: "white", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", outline: "none", transition: "border-color 0.2s" }} />
                <button onClick={tryDecode} style={{ padding: "0.5rem 1rem", backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "0.08em", borderRadius: "4px" }}>DECODE</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.58rem", color: status === "wrong" ? "#ef4444" : "rgba(255,255,255,0.28)" }}>{status === "wrong" ? "✗ 解読失敗" : attempts > 0 ? `試行 ${attempts}回` : ""}</div>
                {hint && <button onClick={() => setShowHint(h => !h)} style={{ fontSize: "0.58rem", color: "rgba(245,158,11,0.5)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}>{showHint ? "▾ ヒントを隠す" : "▸ ヒントを表示"}</button>}
              </div>
              {showHint && hint && <div style={{ marginTop: "0.55rem", padding: "0.45rem 0.7rem", backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "3px", fontSize: "0.7rem", color: "rgba(245,158,11,0.7)", animation: "alertRevealIn 0.2s ease-out" }}>ヒント: {hint}</div>}
            </>
          ) : (
            <div style={{ animation: "alertRevealIn 0.4s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.4rem" }}>✓</span>
                <div><div style={{ fontSize: "0.62rem", color: "rgba(34,197,94,0.7)", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>DECODE SUCCESS</div><div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#22c55e" }}>解読完了</div></div>
              </div>
              <div style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "4px", padding: "0.85rem 1rem", marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.52rem", color: "rgba(34,197,94,0.5)", letterSpacing: "0.12em", marginBottom: "0.35rem" }}>DECODED</div>
                <div style={{ fontSize: "1rem", color: "#86efac", letterSpacing: "0.08em" }}>{answer}</div>
              </div>
              <button onClick={onClose} style={{ width: "100%", padding: "0.55rem", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "0.1em" }}>ACKNOWLEDGE</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CHOICE modal ─────────────────────────────────────────────────
// Format: 選択肢A|選択肢B:結果A|結果B
function ChoiceModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const ci = tagValue.indexOf(":");
  const choicesRaw = ci !== -1 ? tagValue.slice(0, ci) : tagValue;
  const resultsRaw = ci !== -1 ? tagValue.slice(ci + 1) : "";
  const choices = choicesRaw.split("|").map(s => s.trim()).filter(Boolean);
  const results = resultsRaw.split("|").map(s => s.trim());
  const [chosen, setChosen] = React.useState<number | null>(null);
  const COLORS = ["rgba(0,200,255,", "rgba(168,85,247,", "rgba(245,158,11,", "rgba(34,197,94,"];

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s" }}>
      <div onClick={chosen !== null ? onClose : undefined} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(500px,92vw)", backgroundColor: "rgba(5,8,18,0.98)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: "8px", overflow: "hidden", boxShadow: "0 0 50px rgba(99,102,241,0.1)", animation: "alertModalIn 0.25s cubic-bezier(0.16,1,0.3,1)", fontFamily: "JetBrains Mono, monospace" }}>
        <div style={{ padding: "0.95rem 1.5rem 0.75rem", backgroundColor: "rgba(99,102,241,0.07)", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
          <div style={{ fontSize: "0.56rem", color: "rgba(99,102,241,0.6)", letterSpacing: "0.18em", marginBottom: "0.22rem" }}>◈ DECISION REQUIRED</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "white" }}>判断を求められています</div>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {chosen === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {choices.map((choice, i) => {
                const C = COLORS[i % COLORS.length];
                return (
                  <button key={i} onClick={() => setChosen(i)} style={{ padding: "0.8rem 1.2rem", backgroundColor: `${C}0.08)`, border: `1px solid ${C}0.35)`, borderRadius: "6px", color: "rgba(255,255,255,0.85)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", cursor: "pointer", textAlign: "left", letterSpacing: "0.03em", lineHeight: 1.5, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${C}0.15)`; e.currentTarget.style.boxShadow = `0 0 12px ${C}0.2)`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${C}0.08)`; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <span style={{ color: `${C}0.7)`, marginRight: "0.6em", fontSize: "0.75em" }}>[{String.fromCharCode(65 + i)}]</span>{choice}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ animation: "alertRevealIn 0.35s ease-out" }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>あなたは選択しました</div>
                <div style={{ fontSize: "0.88rem", color: "rgba(99,102,241,0.9)", border: "1px solid rgba(99,102,241,0.3)", padding: "0.45rem 0.8rem", borderRadius: "4px", backgroundColor: "rgba(99,102,241,0.07)" }}>
                  [{String.fromCharCode(65 + chosen)}] {choices[chosen]}
                </div>
              </div>
              {results[chosen] && <div style={{ padding: "0.85rem 1rem", backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontFamily: "'Space Grotesk', sans-serif" }}>{results[chosen]}</div>}
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.68rem", padding: "0.42rem 1.1rem", backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.35)", color: "#818cf8", cursor: "pointer", letterSpacing: "0.08em" }}>ACKNOWLEDGE</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SIGNAL modal ─────────────────────────────────────────────────
// Format: 周波数:内容
function SignalModal({ tagValue, onClose }: { tagValue: string; onClose: () => void }) {
  const ci = tagValue.indexOf(":");
  const freq = ci !== -1 ? tagValue.slice(0, ci).trim() : "???";
  const content = ci !== -1 ? tagValue.slice(ci + 1).trim() : tagValue;
  const [idx, setIdx] = React.useState(0);
  const [locked, setLocked] = React.useState(false);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  React.useEffect(() => { const t = setTimeout(() => setLocked(true), 1200); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    if (!locked || idx >= content.length) return;
    const t = setTimeout(() => setIdx(i => i + 1), 24); return () => clearTimeout(t);
  }, [locked, idx, content]);

  const osc = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "alertOverlayIn 0.2s" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.87)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(540px,92vw)", backgroundColor: "rgba(2,8,14,0.98)", border: "1px solid rgba(0,200,255,0.3)", borderRadius: "4px", boxShadow: "0 0 40px rgba(0,200,255,0.1)", overflow: "hidden", animation: "alertModalIn 0.2s cubic-bezier(0.16,1,0.3,1)", fontFamily: "JetBrains Mono, monospace" }}>
        <div style={{ padding: "0.85rem 1.25rem 0.5rem", backgroundColor: "rgba(0,200,255,0.04)", borderBottom: "1px solid rgba(0,200,255,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem" }}>
            <div><div style={{ fontSize: "0.52rem", color: "rgba(0,200,255,0.5)", letterSpacing: "0.15em", marginBottom: "0.18rem" }}>SIGNAL DETECTED</div><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#67e8f9" }}>{freq} Hz</div></div>
            <div style={{ fontSize: "0.6rem", color: locked ? "#22c55e" : "#f97316" }}>{locked ? "● LOCKED" : "◌ ACQUIRING..."}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", height: "34px", gap: "2px" }}>
            {osc.map(i => {
              const ph = (i / osc.length) * Math.PI * 4;
              return <div key={i} style={{ width: "2px", backgroundColor: locked ? `rgba(103,232,249,${0.3 + Math.abs(Math.sin(ph)) * 0.7})` : `rgba(249,115,22,0.4)`, borderRadius: "1px", height: locked ? `${4 + Math.abs(Math.sin(ph)) * 20}px` : `${2 + Math.random() * 24}px`, animation: `signalBar ${0.28 + (i % 6) * 0.1}s ease-in-out infinite alternate` }} />;
            })}
          </div>
        </div>
        <div style={{ padding: "1.1rem 1.5rem 1.25rem" }}>
          <div style={{ fontSize: "0.56rem", color: "rgba(0,200,255,0.4)", letterSpacing: "0.15em", marginBottom: "0.6rem" }}>{locked ? "▮ DECODED MESSAGE" : "▮ DECODING..."}</div>
          <div style={{ fontSize: "0.87rem", lineHeight: 1.85, color: "rgba(255,255,255,0.82)", fontFamily: "'Space Grotesk', sans-serif", minHeight: "50px" }}>
            {content.slice(0, idx)}{idx < content.length && <span style={{ animation: "cursorBlink 0.5s step-end infinite", color: "#67e8f9" }}>█</span>}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.63rem", padding: "0.35rem 1rem", backgroundColor: "rgba(0,200,255,0.07)", border: "1px solid rgba(0,200,255,0.28)", color: "#67e8f9", cursor: "pointer", letterSpacing: "0.08em" }}>CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GRAPH inline ─────────────────────────────────────────────────
// Format: ラベル:値1,値2,値3[:単位]
function GraphInline({ tagValue }: { tagValue: string }) {
  const parts = tagValue.split(":");
  const label = parts[0]?.trim() ?? "";
  const values = (parts[1]?.trim() ?? "").split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  const unit = parts[2]?.trim() ?? "";
  const [open, setOpen] = React.useState(false);
  const max = Math.max(...values, 1);
  if (!open) return (
    <span onClick={() => setOpen(true)} title="クリックしてグラフを表示" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72em", padding: "0.1em 0.5em", border: "1px solid rgba(0,200,255,0.3)", backgroundColor: "rgba(0,200,255,0.08)", color: "#67e8f9", borderRadius: "3px", verticalAlign: "middle", display: "inline-block", margin: "0 2px", cursor: "pointer", userSelect: "none" }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.3)")} onMouseLeave={e => (e.currentTarget.style.filter = "")}>
      GRAPH:{label}({values.length}pts) ▸
    </span>
  );
  return (
    <span style={{ display: "inline-block", verticalAlign: "middle", margin: "0.5em 0", width: "100%" }}>
      <span style={{ display: "block", backgroundColor: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.22)", borderRadius: "4px", padding: "0.65rem 0.85rem", fontFamily: "JetBrains Mono, monospace", animation: "alertRevealIn 0.2s ease-out" }}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
          <span style={{ fontSize: "0.58rem", color: "rgba(0,200,255,0.6)", letterSpacing: "0.1em" }}>◈ {label}</span>
          <span onClick={() => setOpen(false)} style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>✕</span>
        </span>
        <span style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "48px" }}>
          {values.map((v, i) => {
            const pct = v / max;
            const c = pct > 0.8 ? "#ef4444" : pct > 0.6 ? "#f97316" : pct > 0.35 ? "#eab308" : "#22c55e";
            return (
              <span key={i} title={`${v}${unit}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: 1 }}>
                <span style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.35)" }}>{v}</span>
                <span style={{ width: "100%", height: `${Math.max(pct * 36, 2)}px`, backgroundColor: c, borderRadius: "1px 1px 0 0", opacity: 0.82 }} />
              </span>
            );
          })}
        </span>
        {unit && <span style={{ display: "block", marginTop: "0.22rem", fontSize: "0.5rem", color: "rgba(255,255,255,0.22)", textAlign: "right" }}>{unit}</span>}
      </span>
    </span>
  );
}

// ── TIMELINE inline ──────────────────────────────────────────────
// Format: 日付1:イベント1|日付2:イベント2
function TimelineInline({ tagValue }: { tagValue: string }) {
  const [open, setOpen] = React.useState(false);
  const entries = tagValue.split("|").map(e => {
    const ci = e.indexOf(":"); if (ci === -1) return { date: "?", event: e.trim() };
    return { date: e.slice(0, ci).trim(), event: e.slice(ci + 1).trim() };
  });
  if (!open) return (
    <span onClick={() => setOpen(true)} title="クリックして時系列を表示" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72em", padding: "0.1em 0.5em", border: "1px solid rgba(168,85,247,0.3)", backgroundColor: "rgba(168,85,247,0.1)", color: "#c084fc", borderRadius: "3px", verticalAlign: "middle", display: "inline-block", margin: "0 2px", cursor: "pointer", userSelect: "none" }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.3)")} onMouseLeave={e => (e.currentTarget.style.filter = "")}>
      TIMELINE({entries.length}) ▸
    </span>
  );
  return (
    <span style={{ display: "inline-block", verticalAlign: "middle", margin: "0.5em 0", width: "100%" }}>
      <span style={{ display: "block", backgroundColor: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "4px", padding: "0.65rem 0.85rem", fontFamily: "JetBrains Mono, monospace", animation: "alertRevealIn 0.2s ease-out" }}>
        <span style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.55rem" }}>
          <span style={{ fontSize: "0.58rem", color: "rgba(168,85,247,0.6)", letterSpacing: "0.12em" }}>◈ TIMELINE</span>
          <span onClick={() => setOpen(false)} style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>✕</span>
        </span>
        {entries.map((entry, i) => (
          <span key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "stretch" }}>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "10px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: i === 0 ? "#c084fc" : "rgba(168,85,247,0.45)", border: "1px solid rgba(168,85,247,0.55)", flexShrink: 0, marginTop: "2px" }} />
              {i < entries.length - 1 && <span style={{ width: "1px", flex: 1, backgroundColor: "rgba(168,85,247,0.18)", marginTop: "3px", minHeight: "18px" }} />}
            </span>
            <span style={{ paddingBottom: i < entries.length - 1 ? "0.65rem" : "0" }}>
              <span style={{ display: "block", fontSize: "0.56rem", color: "rgba(168,85,247,0.65)", marginBottom: "0.12rem", letterSpacing: "0.04em" }}>{entry.date}</span>
              <span style={{ display: "block", fontSize: "0.78rem", color: "rgba(255,255,255,0.76)", lineHeight: 1.5, fontFamily: "'Space Grotesk', sans-serif" }}>{entry.event}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

// ── MISSION card popup ───────────────────────────────────────────
interface MissionEntry { id: string; title?: string; description?: string; difficulty?: string; reward?: string; status?: string; division?: string; location?: string; }

function MissionCard({ missionId, anchorRect, onClose }: { missionId: string; anchorRect: DOMRect | null; onClose: () => void }) {
  const [data, setData] = React.useState<MissionEntry | null>(null);
  const [loading, setLoading] = React.useState(true);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: 200, left: 200 });

  React.useEffect(() => {
    fetch("/data/mission-data.json").then(r => r.json()).then(raw => {
      const ms: MissionEntry[] = Array.isArray(raw) ? raw : (raw.missions ?? []);
      const found = ms.find(m => m.id === missionId || m.id?.toLowerCase() === missionId.toLowerCase());
      setData(found ?? { id: missionId, title: "不明なミッション", description: "データが見つかりませんでした。" });
    }).catch(() => setData({ id: missionId, title: "エラー", description: "データ読み込みに失敗しました。" }))
      .finally(() => setLoading(false));
  }, [missionId]);

  React.useEffect(() => {
    if (!anchorRect) return;
    const cw = 300, ch = 280, vw = window.innerWidth, vh = window.innerHeight;
    let left = anchorRect.left, top = anchorRect.bottom + 8;
    if (left + cw > vw - 16) left = vw - cw - 16;
    if (left < 16) left = 16;
    if (top + ch > vh - 16) top = anchorRect.top - ch - 8;
    setPos({ top, left });
  }, [anchorRect]);

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const DC = (d?: string) => ({ easy:"#22c55e", normal:"#eab308", hard:"#f97316", critical:"#ef4444" }[d?.toLowerCase()??""]) ?? "#818cf8";
  return (
    <div ref={cardRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: 300, zIndex: 99999, backgroundColor: "rgba(5,8,18,0.97)", border: "1px solid rgba(0,200,255,0.35)", borderRadius: "6px", boxShadow: "0 0 28px rgba(0,200,255,0.15), 0 8px 40px rgba(0,0,0,0.7)", overflow: "hidden", animation: "cardFadeIn 0.15s ease-out", fontFamily: "JetBrains Mono, monospace" }}>
      <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(0,200,255,0.07)", borderBottom: "1px solid rgba(0,200,255,0.2)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div style={{ fontSize: "0.52rem", color: "rgba(0,200,255,0.6)", letterSpacing: "0.15em", marginBottom: "0.22rem" }}>▮ ミッション記録</div><div style={{ fontSize: "0.88rem", fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>{loading ? "読み込み中..." : data?.title ?? missionId}</div></div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem" }}>×</button>
      </div>
      <div style={{ padding: "0.75rem 1rem 1rem" }}>
        {loading ? <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", animation: "pulse 1s infinite" }}>◈ 読み込み中...</div> : data ? (
          <>
            {data.status && <div style={{ marginBottom: "0.5rem" }}><span style={{ fontSize: "0.57rem", padding: "0.13rem 0.48rem", backgroundColor: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)", color: "#67e8f9", borderRadius: "2px" }}>{data.status}</span></div>}
            {data.difficulty && <div style={{ marginBottom: "0.45rem" }}><span style={{ fontSize: "0.57rem", padding: "0.13rem 0.48rem", backgroundColor: `${DC(data.difficulty)}20`, border: `1px solid ${DC(data.difficulty)}50`, color: DC(data.difficulty), borderRadius: "2px" }}>難易度: {data.difficulty}</span></div>}
            {data.description && <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "0.45rem", fontFamily: "'Space Grotesk', sans-serif" }}>{data.description}</div>}
            {data.division && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.32)" }}>部門: {data.division}</div>}
            {data.location && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.32)" }}>場所: {data.location}</div>}
            {data.reward && <div style={{ marginTop: "0.4rem", fontSize: "0.6rem", color: "#fbbf24" }}>報酬: {data.reward}</div>}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Inline tag component ──────────────────────────────────────────────────

function InlineTag({ tagName, tagValue, allData }: {
  tagName: string; tagValue: string; allData: AllData | null;
}) {
  const [card, setCard]                     = useState<NonNullable<CardData> | null>(null);
  const [anchorRect, setAnchorRect]         = useState<DOMRect | null>(null);
  const [alertData, setAlertData]           = useState<AlertData | null>(null);
  const [consoleRaw, setConsoleRaw]         = useState<string | null>(null);
  const [chatRaw, setChatRaw]               = useState<string | null>(null);
  const [classifiedOpen, setClassifiedOpen]     = useState(false);
  const [redactedOpen, setRedactedOpen]         = useState(false);
  const [scanOpen, setScanOpen]                 = useState(false);
  const [diaryOpen, setDiaryOpen]               = useState(false);
  const [audioOpen, setAudioOpen]               = useState(false);
  const [transmissionOpen, setTransmissionOpen] = useState(false);
  const [memoryOpen, setMemoryOpen]             = useState(false);
  const [decodeOpen, setDecodeOpen]             = useState(false);
  const [choiceOpen, setChoiceOpen]             = useState(false);
  const [signalOpen, setSignalOpen]             = useState(false);
  const [missionCardRect, setMissionCardRect]   = useState<DOMRect | null>(null);

  const SELF_TAGS = ["ALERT","CONSOLE","CHAT","CLASSIFIED","REDACTED","SCAN","DIARY","AUDIO","TRANSMISSION","MEMORY","DECODE","CHOICE","SIGNAL","MISSION"] as const;
  const style = TAG_STYLES[tagName] ?? { bg: "rgba(0,200,255,0.12)", color: "#00c8ff", border: "rgba(0,200,255,0.4)", clickable: false };
  const INLINE_ONLY = ["GSI","REDACT_REVEAL","GRAPH","TIMELINE"];
  const isClickable = !INLINE_ONLY.includes(tagName) && !!style.clickable && (SELF_TAGS.includes(tagName as typeof SELF_TAGS[number]) || !!allData);

  // インラインのみのタグは早期リターン
  if (tagName === "GSI")           return <GsiBadge value={parseInt(tagValue) || 0} />;
  if (tagName === "REDACT_REVEAL") return <RedactReveal content={tagValue} />;
  if (tagName === "GRAPH")         return <GraphInline tagValue={tagValue} />;
  if (tagName === "TIMELINE")      return <TimelineInline tagValue={tagValue} />;

  const resolveCard = useCallback((): NonNullable<CardData> | null => {
    if (!allData) return null;
    const v = tagValue.split("|")[0].trim();
    let found: CardData = null;
    if (tagName === "PERSONNEL") found = allData.personnel[v] ?? null;
    else if (tagName === "INCIDENT") found = allData.incidents[v] ?? null;
    else if (tagName === "ENTITY")   found = allData.entities[v] ?? null;
    else if (tagName === "LOCATION") found = allData.locations[v] ?? null;
    else if (tagName === "MODULE")   found = allData.modules[v] ?? null;
    return found as NonNullable<CardData> | null;
  }, [allData, tagName, tagValue]);

  const parseAlert = useCallback((): AlertData | null => {
    if (tagName !== "ALERT") return null;
    const reveal = tagValue.includes("|REVEAL");
    const raw = tagValue.replace(/\|REVEAL.*$/, "").trim();
    const colonIdx = raw.indexOf(":");
    if (colonIdx === -1) return { level: "info", message: raw, reveal };
    return { level: raw.slice(0, colonIdx).trim().toLowerCase(), message: raw.slice(colonIdx + 1).trim(), reveal };
  }, [tagName, tagValue]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    if (!isClickable) return;
    e.stopPropagation();

    if (tagName === "ALERT")      { const parsed = parseAlert(); if (parsed) setAlertData(a => a ? null : parsed); return; }
    if (tagName === "CONSOLE")    { setConsoleRaw(d => d ? null : tagValue); return; }
    if (tagName === "CHAT")       { setChatRaw(d => d ? null : tagValue); return; }
    if (tagName === "CLASSIFIED")    { setClassifiedOpen(v => !v); return; }
    if (tagName === "REDACTED")      { setRedactedOpen(v => !v); return; }
    if (tagName === "SCAN")          { setScanOpen(v => !v); return; }
    if (tagName === "DIARY")         { setDiaryOpen(v => !v); return; }
    if (tagName === "AUDIO")         { setAudioOpen(v => !v); return; }
    if (tagName === "TRANSMISSION")  { setTransmissionOpen(v => !v); return; }
    if (tagName === "MEMORY")        { setMemoryOpen(v => !v); return; }
    if (tagName === "DECODE")        { setDecodeOpen(v => !v); return; }
    if (tagName === "CHOICE")        { setChoiceOpen(v => !v); return; }
    if (tagName === "SIGNAL")        { setSignalOpen(v => !v); return; }
    if (tagName === "MISSION")       {
      if (missionCardRect) { setMissionCardRect(null); return; }
      setMissionCardRect(e.currentTarget.getBoundingClientRect()); return;
    }

    if (card) { setCard(null); return; }
    const resolved = resolveCard();
    if (resolved) { setAnchorRect(e.currentTarget.getBoundingClientRect()); setCard(resolved); }
  }, [isClickable, tagName, tagValue, card, resolveCard, parseAlert]);

  // Display label
  let displayValue: string;
  if (tagName === "ALERT") {
    const raw = tagValue.replace(/\|REVEAL.*$/, "").trim();
    const ci = raw.indexOf(":");
    displayValue = ci === -1 ? "ALERT" : raw.slice(0, ci).toUpperCase();
  } else if (tagName === "CONSOLE") {
    const count = tagValue.split("|").filter(p => p && p !== "REVEAL" && !p.startsWith("CMD:")).length;
    displayValue = `LOG(${count})`;
  } else if (tagName === "CHAT") {
    const count = tagValue.split("|").filter(p => p && p !== "REVEAL" && !p.startsWith("SYSTEM:") && p.includes(":")).length;
    displayValue = `CHAT(${count})`;
  } else if (tagName === "CLASSIFIED") {
    const t = tagValue.split("|")[0].trim();
    displayValue = t || "文書";
  } else if (tagName === "REDACTED") {
    displayValue = "██████";
  } else if (tagName === "SCAN") {
    displayValue = tagValue.split("|")[0].trim();
  } else if (tagName === "DIARY") {
    const t = tagValue.split("|")[0].trim(); displayValue = t || "日記";
  } else if (tagName === "AUDIO") {
    displayValue = tagValue.split(":")[1]?.trim() || "AUDIO";
  } else if (tagName === "TRANSMISSION") {
    const gi = tagValue.indexOf(">"), ci2 = tagValue.indexOf(":");
    displayValue = gi !== -1 && ci2 !== -1 ? `${tagValue.slice(0,gi).trim()}→${tagValue.slice(gi+1,ci2).trim()}` : "COMM";
  } else if (tagName === "MEMORY") {
    displayValue = tagValue.split(":")[0]?.trim() || "MEMORY";
  } else if (tagName === "DECODE") {
    displayValue = "DECODE";
  } else if (tagName === "CHOICE") {
    displayValue = `CHOICE(${tagValue.split(":")[0]?.split("|").length ?? 0})`;
  } else if (tagName === "SIGNAL") {
    displayValue = tagValue.split(":")[0]?.trim() || "SIGNAL";
  } else if (tagName === "MISSION") {
    displayValue = tagValue.split("|")[0].trim();
  } else {
    displayValue = tagValue.split("|")[0].trim();
  }

  const selfTagOpen = classifiedOpen || redactedOpen || scanOpen || diaryOpen || audioOpen || transmissionOpen || memoryOpen || decodeOpen || choiceOpen || signalOpen || !!missionCardRect;
  const isOpen = !!(card || alertData || consoleRaw || chatRaw || selfTagOpen);
  const hasData = SELF_TAGS.includes(tagName as typeof SELF_TAGS[number]) ? true : !!resolveCard();
  const prefix =
    tagName === "ALERT"        ? "⚠ " :
    tagName === "CONSOLE"      ? "▶ " :
    tagName === "CHAT"         ? "◈ " :
    tagName === "CLASSIFIED"   ? "🔒 " :
    tagName === "REDACTED"     ? "" :
    tagName === "SCAN"         ? "⊙ " :
    tagName === "DIARY"        ? "✒ " :
    tagName === "AUDIO"        ? "♪ " :
    tagName === "TRANSMISSION" ? "⚡ " :
    tagName === "MEMORY"       ? "◉ " :
    tagName === "DECODE"       ? "🔓 " :
    tagName === "CHOICE"       ? "◆ " :
    tagName === "SIGNAL"       ? "〜 " :
    tagName === "MISSION"      ? "▶ " : "";

  // tooltip
  const tooltip =
    tagName === "CONSOLE"      ? "クリックしてログを表示" :
    tagName === "CHAT"         ? "クリックして通信記録を表示" :
    tagName === "CLASSIFIED"   ? "クリックして機密文書を表示" :
    tagName === "REDACTED"     ? "クリックして解読を試みる" :
    tagName === "SCAN"         ? "クリックしてスキャン結果を表示" :
    tagName === "DIARY"        ? "クリックして日記を表示" :
    tagName === "AUDIO"        ? "クリックして音声ログを再生" :
    tagName === "TRANSMISSION" ? "クリックして通信を傍受" :
    tagName === "MEMORY"       ? "クリックして記憶を再生" :
    tagName === "DECODE"       ? "クリックして解読に挑む" :
    tagName === "CHOICE"       ? "クリックして判断する" :
    tagName === "SIGNAL"       ? "クリックして信号を解析" :
    tagName === "MISSION"      ? "クリックしてミッション詳細を表示" :
    "クリックして詳細を表示";

  return (
    <>
      <span
        onClick={handleClick}
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.72em",
          padding: "0.1em 0.45em",
          borderRadius: "3px",
          backgroundColor: style.bg,
          border: `1px solid ${isOpen ? style.color + "80" : style.border}`,
          color: style.color,
          letterSpacing: "0.04em",
          verticalAlign: "middle",
          display: "inline-block",
          margin: "0 2px",
          cursor: isClickable ? "pointer" : "default",
          transition: "all 0.15s",
          userSelect: "none",
          boxShadow: isOpen ? `0 0 8px ${style.border}` : "none",
          animation: tagName === "ALERT" ? "alertTagPulse 2s ease-in-out infinite" : "none",
        }}
        onMouseEnter={e => { if (isClickable) { e.currentTarget.style.filter = "brightness(1.3)"; if (!isOpen) e.currentTarget.style.boxShadow = `0 0 6px ${style.border}`; } }}
        onMouseLeave={e => { if (isClickable) { e.currentTarget.style.filter = ""; if (!isOpen) e.currentTarget.style.boxShadow = ""; } }}
        title={isClickable ? tooltip : undefined}
      >
        {prefix}{tagName === "ALERT" ? displayValue : (tagName === "REDACTED" || tagName === "DECODE") ? displayValue : `${tagName}:${displayValue}`}
        {isClickable && hasData && !SELF_TAGS.includes(tagName as typeof SELF_TAGS[number]) && (
          <span style={{ marginLeft: "0.3em", opacity: 0.55, fontSize: "0.85em" }}>{card ? "▾" : "▸"}</span>
        )}
      </span>
      {card            && <DataCard        data={card}           anchorRect={anchorRect} onClose={() => setCard(null)} />}
      {alertData       && <AlertModal      alert={alertData}                             onClose={() => setAlertData(null)} />}
      {consoleRaw      && <ConsoleModal    raw={consoleRaw}                              onClose={() => setConsoleRaw(null)} />}
      {chatRaw         && <ChatModal       tagValue={chatRaw}                            onClose={() => setChatRaw(null)} />}
      {classifiedOpen    && <ClassifiedModal    tagValue={tagValue}                               onClose={() => setClassifiedOpen(false)} />}
      {redactedOpen      && <RedactedModal      tagValue={tagValue}                               onClose={() => setRedactedOpen(false)} />}
      {scanOpen          && <ScanModal          tagValue={tagValue}                               onClose={() => setScanOpen(false)} />}
      {diaryOpen         && <DiaryModal         tagValue={tagValue}                               onClose={() => setDiaryOpen(false)} />}
      {audioOpen         && <AudioModal         tagValue={tagValue}                               onClose={() => setAudioOpen(false)} />}
      {transmissionOpen  && <TransmissionModal  tagValue={tagValue}                               onClose={() => setTransmissionOpen(false)} />}
      {memoryOpen        && <MemoryModal        tagValue={tagValue}                               onClose={() => setMemoryOpen(false)} />}
      {decodeOpen        && <DecodeModal        tagValue={tagValue}                               onClose={() => setDecodeOpen(false)} />}
      {choiceOpen        && <ChoiceModal        tagValue={tagValue}                               onClose={() => setChoiceOpen(false)} />}
      {signalOpen        && <SignalModal        tagValue={tagValue}                               onClose={() => setSignalOpen(false)} />}
      {missionCardRect   && <MissionCard        missionId={tagValue.split("|")[0].trim()} anchorRect={missionCardRect} onClose={() => setMissionCardRect(null)} />}
    </>
  );
}

// ── Inline tag parser ─────────────────────────────────────────────────────

function parseInlineTags(text: string, allData: AllData | null): React.ReactNode[] {
  const tagRegex = /\[([A-Z_]+)(?::([^\]]*))?\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<InlineTag key={key++} tagName={match[1]} tagValue={match[2] ?? match[1]} allData={allData} />);
    lastIndex = tagRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ── Typewriter hook ───────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 14) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    setDisplayed(""); setDone(false); indexRef.current = 0; lastTimeRef.current = 0;
    const animate = (t: number) => {
      if (t - lastTimeRef.current >= speed) {
        lastTimeRef.current = t;
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) { setDone(true); return; }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [text, speed]);

  const skip = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setDisplayed(text); setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

// ── Chapter reader ────────────────────────────────────────────────────────

function ChapterReader({ chapter, chapterIndex, total, onPrev, onNext, allData }: {
  chapter: Chapter; chapterIndex: number; total: number;
  onPrev: () => void; onNext: () => void; allData: AllData | null;
}) {
  const { displayed, done, skip } = useTypewriter(chapter.content, 14);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayed]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Chapter header */}
      <div style={{ padding: "1.25rem 2rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(0,255,255,0.5)", letterSpacing: "0.15em" }}>
            CH.{String(chapterIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          {!done && <button onClick={skip} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.1em" }}>[スキップ ▶▶]</button>}
          {done  && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.58rem", color: "rgba(0,255,255,0.35)", letterSpacing: "0.1em" }}>[転送完了]</span>}
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0 }}>
          {chapter.title}
        </h2>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="novel-content" style={{ flex: 1, overflowY: "auto", padding: "2rem", fontSize: "0.9rem", lineHeight: 2, color: "rgba(255,255,255,0.82)", fontFamily: "'Noto Serif JP', Georgia, serif" }}>
        {displayed.split("\n\n").map((para, i) => para.trim()
          ? <p key={i} style={{ marginBottom: "1.4em" }}>{parseInlineTags(para, allData)}</p>
          : null
        )}
        {!done && <span style={{ display: "inline-block", animation: "cursorBlink 0.8s step-end infinite" }}>▮</span>}
      </div>

      {/* Navigation */}
      <div style={{ padding: "1rem 2rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button onClick={onPrev} disabled={chapterIndex === 0} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem", padding: "0.5rem 1.2rem", backgroundColor: chapterIndex === 0 ? "transparent" : "rgba(255,255,255,0.05)", border: `1px solid ${chapterIndex === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)"}`, color: chapterIndex === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", cursor: chapterIndex === 0 ? "not-allowed" : "pointer", letterSpacing: "0.08em" }}>← PREV</button>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === chapterIndex ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === chapterIndex ? "var(--primary)" : "rgba(255,255,255,0.15)", transition: "all 0.3s", boxShadow: i === chapterIndex ? "0 0 8px var(--primary)" : "none" }} />
          ))}
        </div>
        <button onClick={onNext} disabled={chapterIndex === total - 1} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem", padding: "0.5rem 1.2rem", backgroundColor: chapterIndex === total - 1 ? "transparent" : "rgba(0,255,255,0.08)", border: `1px solid ${chapterIndex === total - 1 ? "rgba(255,255,255,0.08)" : "rgba(0,255,255,0.35)"}`, color: chapterIndex === total - 1 ? "rgba(255,255,255,0.2)" : "var(--primary)", cursor: chapterIndex === total - 1 ? "not-allowed" : "pointer", letterSpacing: "0.08em" }}>NEXT →</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function NovelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [allData, setAllData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    Promise.all([
      // ① 認証済みAPIから取得（アクセス制御込み）
      fetch(`/api/novels/${id}`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => {
          if (r.status === 403) throw new Error("ACCESS_DENIED");
          if (r.status === 404) throw new Error("NOT_FOUND");
          if (!r.ok) throw new Error("SERVER_ERROR");
          return r.json();
        }),
      loadAllData(),
    ]).then(([novelData, data]) => {
      setNovel(novelData);
      setAllData(data);
      setLoading(false);
      setGlitch(true);
      setTimeout(() => setGlitch(false), 500);
    }).catch((err) => {
      if (err.message === "ACCESS_DENIED") setNovel(null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.15) { setGlitch(true); setTimeout(() => setGlitch(false), 200); }
    }, 8000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div style={{ padding: "4rem", textAlign: "center", fontFamily: "JetBrains Mono, monospace", color: "var(--primary)" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "1rem", animation: "pulse 1s ease-in-out infinite" }}>◈</div>
      <div style={{ fontSize: "0.75rem", letterSpacing: "0.2em" }}>LOADING ARCHIVE...</div>
    </div>
  );

  if (!novel) return (
    <div style={{ padding: "4rem", textAlign: "center", fontFamily: "JetBrains Mono, monospace", color: "rgba(239,68,68,0.7)" }}>
      <div style={{ fontSize: "0.8rem", letterSpacing: "0.15em" }}>ERROR: RECORD NOT FOUND</div>
      <button onClick={() => router.back()} style={{ marginTop: "2rem", background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}>← BACK</button>
    </div>
  );

  const cat = CAT_STYLES[novel.category] ?? CAT_STYLES["内部記録"];
  const secColor = SEC_COLORS[novel.securityLevel] ?? "var(--muted-foreground)";
  const secLabel = SEC_LABELS[novel.securityLevel] ?? "公開";

  return (
    <>
      <style>{`
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes cardFadeIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes alertOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes alertModalIn { from { opacity: 0; transform: scale(0.94) translateY(-12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes alertBarPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes alertIconPulse { 0%, 100% { box-shadow: 0 0 14px rgba(255,34,34,0.5); } 50% { box-shadow: 0 0 28px rgba(255,34,34,0.9); } }
        @keyframes alertFlicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; } 20%,22%,24%,55% { opacity: 0.6; } }
        @keyframes alertRevealIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes consoleEntryIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes chatMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chatSendingPulse { 0%, 100% { opacity: 0.6; border-color: rgba(0,255,255,0.12); } 50% { opacity: 1; border-color: rgba(0,255,255,0.28); } }
        @keyframes groupPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes npcDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.6; } 30% { transform: translateY(-4px); opacity: 1; } }
        @keyframes alertRevealPulse { 0%, 100% { box-shadow: none; } 50% { box-shadow: 0 0 10px currentColor; } }
        @keyframes alertTagPulse { 0%, 100% { box-shadow: none; } 50% { box-shadow: 0 0 6px rgba(255,34,34,0.5); } }
        @keyframes audioBar0 { from { height: 6px; } to { height: 28px; } }
        @keyframes audioBar1 { from { height: 12px; } to { height: 22px; } }
        @keyframes audioBar2 { from { height: 4px; } to { height: 34px; } }
        @keyframes audioBar3 { from { height: 8px; } to { height: 18px; } }
        @keyframes signalBar { from { opacity: 0.25; transform: scaleY(0.7); } to { opacity: 1; transform: scaleY(1); } }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} }
        .novel-content::-webkit-scrollbar { width: 4px; }
        .novel-content::-webkit-scrollbar-track { background: transparent; }
        .novel-content::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.2); border-radius: 2px; }
        .chapter-btn:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>
      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9990, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)", mixBlendMode: "overlay" }} />

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", filter: glitch ? "hue-rotate(10deg) brightness(1.05)" : "none", transition: "filter 0.1s" }}>
        {/* Topbar */}
        <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "1rem", backgroundColor: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
          <button onClick={() => router.back()} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.08em" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >← 記録文庫</button>
          <div style={{ width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "0.65rem", padding: "0.2rem 0.55rem", backgroundColor: cat.bg, border: `1px solid ${cat.border}`, color: cat.text, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>{novel.category}</span>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "white", margin: 0, whiteSpace: "nowrap" }}>{novel.title}</h1>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {novel.subtitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: secColor }}>▮ {secLabel}</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>著: {novel.author} · {novel.date}</span>
          </div>
        </div>

        {/* Layout */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{ width: "220px", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", backgroundColor: "rgba(0,0,0,0.3)", overflowY: "auto" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}>
              CHAPTERS — {novel.chapters.length}
            </div>
            {novel.chapters.map((ch, i) => (
              <button key={i} className="chapter-btn" onClick={() => setChapterIndex(i)} style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)", backgroundColor: i === chapterIndex ? "rgba(0,255,255,0.06)" : "transparent", borderLeft: i === chapterIndex ? "2px solid var(--primary)" : "2px solid transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: i === chapterIndex ? "var(--primary)" : "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>CH.{String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: "0.75rem", color: i === chapterIndex ? "white" : "rgba(255,255,255,0.5)", lineHeight: 1.35, fontFamily: "'Space Grotesk', sans-serif", fontWeight: i === chapterIndex ? 600 : 400 }}>{ch.title}</div>
              </button>
            ))}
            <div style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>TAGS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {novel.tags.map(tag => (
                  <span key={tag} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", padding: "0.15rem 0.4rem", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}>#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Reader */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {novel.chapters.length > 0
              ? <ChapterReader chapter={novel.chapters[chapterIndex]} chapterIndex={chapterIndex} total={novel.chapters.length} onPrev={() => setChapterIndex(i => Math.max(0, i - 1))} onNext={() => setChapterIndex(i => Math.min(novel.chapters.length - 1, i + 1))} allData={allData} />
              : <div style={{ padding: "4rem", textAlign: "center", fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>[データなし]</div>
            }
          </div>
        </div>
      </div>
    </>
  );
}
