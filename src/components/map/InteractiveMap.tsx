"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── 型 ───────────────────────────────────────────────────────
interface GeoPath  { code: string; name: string; color: string; stroke: string; paths: string[] }
interface Muni     { code: string; name: string; x: number; y: number }
interface IncidentPos {
  id: string; name: string;
  severity: "critical" | "warning" | "safe";
  pos: { x: number; y: number };
  location: string; status: string; entity: string; gsi: string;
  assignedDivision: string; description: string; timestamp: string;
}

interface Props {
  geoPaths:      GeoPath[];
  municipalities: Muni[];
  incidents:     IncidentPos[];
  W: number;
  H: number;
}

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "重大" },
  warning:  { color: "#eab308", bg: "rgba(234,179,8,0.15)",  label: "警戒" },
  safe:     { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "安全" },
} as const;

// ── ツールチップ ─────────────────────────────────────────────
interface Tooltip {
  code: string;
  name: string;
  x: number;   // SVG座標
  y: number;
}

export default function InteractiveMap({ geoPaths, municipalities, incidents, W, H }: Props) {
  const router = useRouter();
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [tooltip,  setTooltip]  = useState<Tooltip | null>(null);

  // SVGの実DOM座標からビューポート座標へ変換するためのref不要版
  // → tooltip位置はSVG viewBox座標をそのまま使い、foreignObjectで表示

  const handleEnter = useCallback((muni: GeoPath, muniInfo?: Muni) => {
    setHovered(muni.code);
    if (muniInfo) {
      setTooltip({ code: muni.code, name: muni.name, x: muniInfo.x, y: muniInfo.y });
    }
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback((code: string) => {
    router.push(`/map/${code}`);
  }, [router]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", backgroundColor: "#00050f", cursor: "default" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="f-glow-r">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="f-glow-y">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="f-glow-c">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="f-glow-h">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="sea-grad" cx="50%" cy="60%" r="70%">
          <stop offset="0%"   stopColor="#001428"/>
          <stop offset="100%" stopColor="#00050f"/>
        </radialGradient>
        <style>{`
          .ping-r { animation: pingR 2s cubic-bezier(0,0,0.2,1) infinite; }
          @keyframes pingR { 0%{r:11;opacity:.65} 100%{r:30;opacity:0} }
          .muni-path { transition: fill 0.15s, filter 0.15s; }
          .muni-path:hover { cursor: pointer; }
        `}</style>
      </defs>

      {/* 海背景 */}
      <rect width={W} height={H} fill="url(#sea-grad)"/>

      {/* グリッドドット */}
      {Array.from({length:22},(_,i)=>i*40+20).map(gx =>
        Array.from({length:18},(_,j)=>j*40+20).map(gy =>
          <circle key={`g${gx}-${gy}`} cx={gx} cy={gy} r="0.6" fill="rgba(0,200,255,0.04)"/>
        )
      )}

      {/* ── 市区町村ポリゴン（クリッカブル） ── */}
      {geoPaths.map(muni => {
        const isHovered = hovered === muni.code;
        const muniInfo  = municipalities.find(m => m.code === muni.code);
        return (
          <g
            key={muni.code}
            style={{ cursor: "pointer" }}
            onClick={() => handleClick(muni.code)}
            onMouseEnter={() => handleEnter(muni, muniInfo)}
            onMouseLeave={handleLeave}
            filter={isHovered ? "url(#f-glow-h)" : undefined}
          >
            {muni.paths.map((d, i) => (
              <path
                key={i}
                d={d}
                className="muni-path"
                fill={isHovered ? `${muni.stroke}30` : muni.color}
                stroke={muni.stroke}
                strokeWidth={isHovered ? "1.4" : "0.7"}
                strokeLinejoin="round"
                opacity={isHovered ? 1 : 0.9}
              />
            ))}
          </g>
        );
      })}

      {/* 海域ラベル */}
      {[
        { x: 790, y: 440, t: "周 防 灘" },
        { x: 470, y: 648, t: "別 府 湾" },
        { x:  90, y: 560, t: "豊 後 水 道" },
      ].map(({ x, y, t }) => (
        <text key={t} x={x} y={y} fontFamily="'JetBrains Mono',monospace"
          fontSize="9" fill="rgba(20,100,200,0.22)" letterSpacing="4" textAnchor="middle">{t}</text>
      ))}

      {/* 市区町村名ラベル */}
      {municipalities.map(m => {
        const isHovered = hovered === m.code;
        return (
          <g key={m.code} filter="url(#f-glow-c)"
            style={{ cursor: "pointer", pointerEvents: "none" }}>
            <text
              x={m.x} y={m.y}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'JetBrains Mono',monospace"
              fontSize={m.name.length > 4 ? "7" : "8"}
              fill={isHovered ? "rgba(0,255,220,1)" : "rgba(0,220,200,0.72)"}
              fontWeight={isHovered ? "bold" : "normal"}
            >{m.name}</text>
          </g>
        );
      })}

      {/* インシデントマーカー */}
      {incidents.map(inc => {
        const s = SEV[inc.severity] ?? SEV.safe;
        const r = inc.severity === "critical" ? 9 : inc.severity === "warning" ? 7 : 5;
        const filt = inc.severity === "critical" ? "url(#f-glow-r)" : "url(#f-glow-y)";
        return (
          <g key={inc.id} filter={filt} style={{ pointerEvents: "none" }}>
            {inc.severity === "critical" && (
              <circle className="ping-r" cx={inc.pos.x} cy={inc.pos.y}
                r={r+2} fill="none" stroke={s.color} strokeWidth="1.5"/>
            )}
            <circle cx={inc.pos.x} cy={inc.pos.y}
              r={r+6} fill="none" stroke={s.color} strokeWidth="0.6" opacity="0.2"/>
            <circle cx={inc.pos.x} cy={inc.pos.y} r={r} fill={s.color} opacity="0.9"/>
            <line x1={inc.pos.x-r} y1={inc.pos.y} x2={inc.pos.x+r} y2={inc.pos.y}
              stroke="rgba(0,0,0,0.55)" strokeWidth="1.3"/>
            <line x1={inc.pos.x} y1={inc.pos.y-r} x2={inc.pos.x} y2={inc.pos.y+r}
              stroke="rgba(0,0,0,0.55)" strokeWidth="1.3"/>
          </g>
        );
      })}

      {/* ── ホバーツールチップ（SVG foreignObject） ── */}
      {tooltip && (() => {
        // ツールチップをSVG座標空間で配置。はみ出さないよう調整
        const TW = 130, TH = 44;
        const tx = Math.min(tooltip.x + 12, W - TW - 8);
        const ty = Math.max(tooltip.y - TH - 8, 8);
        return (
          <g style={{ pointerEvents: "none" }}>
            {/* 接続線 */}
            <line
              x1={tooltip.x} y1={tooltip.y}
              x2={tx} y2={ty + TH}
              stroke="rgba(0,255,200,0.25)" strokeWidth="0.8" strokeDasharray="3,2"
            />
            <foreignObject x={tx} y={ty} width={TW} height={TH}>
              <div
                style={{
                  background: "rgba(0,5,20,0.92)",
                  border: "1px solid rgba(0,220,200,0.4)",
                  borderLeft: "2px solid rgba(0,220,200,0.8)",
                  padding: "6px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: "9px", color: "rgba(0,220,200,0.5)", marginBottom: "2px", letterSpacing: "0.06em" }}>
                  {tooltip.code}
                </div>
                <div style={{ fontSize: "11px", color: "white", fontWeight: 600, letterSpacing: "0.03em" }}>
                  {tooltip.name}
                </div>
              </div>
            </foreignObject>
          </g>
        );
      })()}

      {/* 凡例 */}
      <rect x={W-150} y={H-80} width={140} height={70}
        fill="rgba(0,5,15,0.88)" stroke="rgba(0,255,255,0.12)" strokeWidth="0.6"/>
      <text x={W-80} y={H-65} textAnchor="middle"
        fontFamily="'JetBrains Mono',monospace" fontSize="7"
        fill="rgba(0,255,255,0.35)" letterSpacing="1">OITA PREFECTURE · GeoJSON</text>
      {[
        { c: "#ef4444", l: "重大インシデント", dy: 0  },
        { c: "#eab308", l: "警戒インシデント", dy: 14 },
        { c: "#10b981", l: "安全区域",         dy: 28 },
      ].map(item => (
        <g key={item.l}>
          <circle cx={W-138} cy={H-52+item.dy} r={4.5} fill={item.c} opacity="0.9"/>
          <text x={W-130} y={H-48+item.dy}
            fontFamily="'JetBrains Mono',monospace" fontSize="7.5"
            fill="rgba(255,255,255,0.45)">{item.l}</text>
        </g>
      ))}

      {/* フッター */}
      <text x={8} y={H-6} fontFamily="'JetBrains Mono',monospace"
        fontSize="7" fill="rgba(0,255,255,0.2)">
        N33° E131° · ROT:123° · N03-20250101_44.geojson — クリックで詳細へ
      </text>
    </svg>
  );
}
