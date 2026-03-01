"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

interface AdminUser {
  id: string; agentId: string; name: string; role: string; status: string;
  level: number; xp: number; anomalyScore: number; division: string;
  divisionName: string; loginCount: number; lastLogin: string;
}

interface ConsoleUser {
  uuid: string;
  agentId: string;
  name: string;
  role: "player" | "admin" | "super_admin";
  status: string;
  level: number;
  xp: number;
  division: string;
  divisionName: string;
  anomalyScore: number;
  observerLoad: number;
  lastLogin: string;
  loginCount: number;
  streak: number;
}

interface ConsoleLine {
  id: number;
  text: string;
  type: "success" | "error" | "warning" | "info" | "system";
  welcome?: boolean;
}

const ASCII_LOGO = `
    ██╗  ██╗ █████╗ ██╗███████╗██╗  ██╗ ██████╗ ██╗  ██╗██╗   ██╗
    ██║ ██╔╝██╔══██╗██║██╔════╝██║  ██║██╔═══██╗██║ ██╔╝██║   ██║
    █████╔╝ ███████║██║███████╗███████║██║   ██║█████╔╝ ██║   ██║
    ██╔═██╗ ██╔══██║██║╚════██║██╔══██║██║   ██║██╔═██╗ ██║   ██║
    ██║  ██╗██║  ██║██║███████║██║  ██║╚██████╔╝██║  ██╗╚██████╔╝
    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
                      SYSTEM CONSOLE v2.1.0`;

let lineCounter = 0;

export default function ConsoleClient({ user }: { user: ConsoleUser }) {
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const isSuperAdmin = user.role === "super_admin";

  const router = useRouter();
  const setStoreUser = useUserStore((s) => s.setUser);
  const updateStoreUser = useUserStore((s) => s.updateUser);
  const storeUser = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = useCallback((text: string, type: ConsoleLine["type"] = "system", welcome = false) => {
    const id = ++lineCounter;
    setLines((prev) => [...prev, { id, text, type, welcome }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }, 10);
  }, []);

  // Initialize welcome block
  useEffect(() => {
    const w = (text: string, type: ConsoleLine["type"] = "system") => {
      const id = ++lineCounter;
      setLines((prev) => [...prev, { id, text, type, welcome: true }]);
    };
    w(ASCII_LOGO, "success");
    w("═".repeat(80), "system");
    w("SYSTEM ACCESS GRANTED", "success");
    w(`User: ${user.name} [${user.agentId}]`, "info");
    w(`Clearance Level: ${user.level}`, "info");
    w(`Role: ${user.role.toUpperCase()}`, "info");
    w(`Session Start: ${new Date().toLocaleString("ja-JP")}`, "system");
    w("═".repeat(80), "system");
    w("", "system");
    w('Type "help" to see available commands.', "system");
    w("", "system");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleContainerClick() {
    inputRef.current?.focus();
  }

  // ── Command handlers ─────────────────────────────────────────────

  function cmdHelp() {
    addLine("Available Commands:", "info");
    addLine("", "system");
    const cmds: [string, string][] = [
      ["help",              "このヘルプを表示"],
      ["clear",             "コンソール画面をクリア（起動ログは保持）"],
      ["exit",              "ダッシュボードへ戻る"],
      ["whoami",            "現在のユーザー情報を表示"],
      ["status",            "詳細なユーザーステータスを表示"],
      ["grant <xp>",        "自分にXPを付与"],
      ["logout",            "ログアウト"],
      ["date",              "現在の日時を表示"],
      ["history",           "コマンド履歴を表示"],
      ["echo <text>",       "テキストをコンソールに出力"],
    ];
    const adminCmds: [string, string, boolean][] = [
      ["users",                           "ユーザー一覧 [ADMIN]",              false],
      ["user <agentId>",                  "ユーザー詳細 [ADMIN]",              false],
      ["level <n>",                       "クリアランスLV変更 1-5 [ADMIN]",   false],
      ["anomaly <uuid> <score>",          "異常スコア設定 0-100 [ADMIN]",     false],
      ["notify <target> <type> <t>|<b>",  "通知送信 [ADMIN]",                false],
      ["fire <uuid> <eventId> [xp]",      "イベント発火 [ADMIN]",             false],
      ["reset",                           "進行状況リセット [ADMIN]",         false],
      ["sql <query>",                     "SQL直接実行 [SUPER_ADMIN]",        true],
    ];
    cmds.forEach(([cmd, desc]) => addLine(`  ${cmd.padEnd(40)} ${desc}`, "success"));
    if (isAdmin) {
      addLine("", "system");
      addLine("  ── ADMIN COMMANDS ─────────────────────────────", "warning");
      adminCmds.forEach(([cmd, desc, superOnly]) => {
        if (superOnly && !isSuperAdmin) return;
        addLine(`  ${cmd.padEnd(40)} ${desc}`, superOnly ? "warning" : "success");
      });
    }
  }

  function cmdClear() {
    setLines((prev) => prev.filter((l) => l.welcome));
  }

  function cmdExit() {
    addLine("Exiting console...", "warning");
    setTimeout(() => router.push("/dashboard"), 500);
  }

  function cmdWhoami() {
    addLine(`${user.name} [${user.agentId}]  (${user.role.toUpperCase()})`, "info");
  }

  function cmdStatus() {
    const nextLevelXp = [0, 100, 300, 600, 1200, 2500];
    const lv = Math.min(user.level, 5);
    const nextXp = nextLevelXp[Math.min(lv + 1, 5)] ?? 2500;
    addLine("═".repeat(50), "info");
    addLine("             USER STATUS", "info");
    addLine("═".repeat(50), "info");
    [
      ["Name",         user.name],
      ["Agent ID",     user.agentId],
      ["UUID",         user.uuid],
      ["Division",     user.divisionName || user.division],
      ["Role",         user.role.toUpperCase()],
      ["Level",        String(user.level)],
      ["XP",           `${user.xp} / ${nextXp}`],
      ["Anomaly Score",String(user.anomalyScore)],
      ["Observer Load",String(user.observerLoad)],
      ["Login Count",  String(user.loginCount)],
      ["Streak",       `${user.streak}日`],
      ["Last Login",   user.lastLogin ? new Date(user.lastLogin).toLocaleString("ja-JP") : "N/A"],
    ].forEach(([k, v]) => addLine(`  ${k.padEnd(16)}: ${v}`, "success"));
    addLine("═".repeat(50), "system");
  }

  // ── Super-admin exclusive commands ──────────────────────────────

  async function cmdNotify(args: string[]) {
    // notify <target> <type> <title> | <body>
    // e.g. notify all info "緊急通達" | "本日00:00より施設Cを封鎖します"
    if (args.length < 3) {
      addLine("Usage: notify <target> <type> <title> | <body>", "system");
      addLine("  target: all | division:<slug> | level:<N> | user:<uuid>", "system");
      addLine("  type:   info | warn | error | mission | unlock | xp", "system");
      return;
    }
    const [target, type, ...rest] = args;
    const combined = rest.join(" ");
    const pipeIdx = combined.indexOf("|");
    const title = (pipeIdx >= 0 ? combined.slice(0, pipeIdx) : combined).trim();
    const body  = (pipeIdx >= 0 ? combined.slice(pipeIdx + 1) : "").trim();
    if (!title) { addLine("title が空です", "error"); return; }

    addLine(`Sending notification to ${target}...`, "system");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, type, title, body }),
      });
      const data = await res.json();
      if (res.ok) addLine(`✓ ${data.message ?? `${data.sent}名に送信しました`}`, "success");
      else addLine(`Error: ${data.error}`, "error");
    } catch { addLine("Network error.", "error"); }
  }

  async function cmdFire(args: string[]) {
    // fire <userId> <eventId> [xp] [flag=key:value]
    if (args.length < 2) {
      addLine("Usage: fire <userUuid> <eventId> [xp] [flag=key:value]", "system");
      return;
    }
    const [targetUserId, eventId, xpStr, flagArg] = args;
    const xpVal = xpStr ? parseInt(xpStr) : 0;
    const payload: Record<string, unknown> = { userId: targetUserId, eventId };
    if (xpVal > 0) payload.xp = xpVal;
    if (flagArg?.startsWith("flag=")) {
      const [k, v] = flagArg.slice(5).split(":");
      payload.flag = k; payload.flagValue = v ?? "true";
    }

    addLine(`Firing event "${eventId}" for user ${targetUserId}...`, "system");
    try {
      const res = await fetch("/api/admin/fire-event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) addLine(`✓ ${data.message}`, "success");
      else addLine(`Error: ${data.error}`, "error");
    } catch { addLine("Network error.", "error"); }
  }

  async function cmdSql(args: string[]) {
    if (!isSuperAdmin) { addLine("Permission denied. super_admin access required.", "error"); return; }
    if (args.length === 0) { addLine("Usage: sql <query>", "system"); return; }
    const sqlStr = args.join(" ");
    addLine(`> ${sqlStr}`, "system");
    try {
      const res = await fetch("/api/admin/db-query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlStr, confirmed: true }),
      });
      const data = await res.json();
      if (data.error) { addLine(`Error: ${data.error}`, "error"); return; }
      if (data.rows && data.rows.length > 0) {
        const cols = data.columns as string[];
        addLine(cols.join("  |  "), "info");
        addLine("─".repeat(cols.join("  |  ").length), "system");
        (data.rows as Record<string, unknown>[]).slice(0, 20).forEach((row) => {
          addLine(cols.map(c => String(row[c] ?? "NULL")).join("  |  "), "success");
        });
        if (data.truncated || data.rows.length === 20) addLine(`... (${data.rowsAffected}行, 表示は最大20行)`, "system");
      } else {
        addLine(`OK: ${data.rowsAffected ?? 0} 行影響 (${data.elapsed}ms)`, "success");
      }
    } catch { addLine("Network error.", "error"); }
  }

  async function cmdAnomaly(args: string[]) {
    if (!isAdmin) { addLine("Permission denied.", "error"); return; }
    if (args.length < 2) { addLine("Usage: anomaly <userUuid> <score 0-100>", "system"); return; }
    const [targetId, scoreStr] = args;
    const score = parseInt(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) { addLine("Invalid score (0-100).", "error"); return; }
    const res = await fetch(`/api/admin/users/${targetId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyScore: score }),
    });
    if (res.ok) addLine(`✓ anomaly_score → ${score}`, "success");
    else addLine("Update failed.", "error");
  }

  async function cmdGetUser(args: string[]) {
    if (!isAdmin) { addLine("Permission denied.", "error"); return; }
    if (!args[0]) { addLine("Usage: user <agentId or uuid>", "system"); return; }
    addLine(`Searching for "${args[0]}"...`, "system");
    try {
      const all = await fetch("/api/admin/users").then(r => r.json()) as AdminUser[];
      const found = all.find((u: AdminUser) =>
        u.agentId.toLowerCase() === args[0].toLowerCase() || u.id === args[0]
      );
      if (!found) { addLine("User not found.", "error"); return; }
      [
        ["Agent ID",  found.agentId],
        ["UUID",      found.id],
        ["Name",      found.name],
        ["Role",      found.role],
        ["Status",    found.status],
        ["Level",     String(found.level)],
        ["XP",        found.xp.toLocaleString()],
        ["Division",  found.divisionName || found.division],
        ["Anomaly",   String(found.anomalyScore)],
        ["Login Count",String(found.loginCount)],
        ["Last Login", found.lastLogin ? new Date(found.lastLogin).toLocaleString("ja-JP") : "N/A"],
      ].forEach(([k, v]) => addLine(`  ${k.padEnd(14)}: ${v}`, "info"));
    } catch { addLine("Network error.", "error"); }
  }

  async function cmdGrant(args: string[]) {
    if (!args[0]) { addLine("Usage: grant <xp>", "system"); return; }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1) { addLine("Invalid XP amount.", "error"); return; }

    addLine(`Granting ${amount} XP...`, "system");
    try {
      const res = await fetch("/api/users/me/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) { addLine(`Error: ${data.error || "サーバーエラー"}`, "error"); return; }

      addLine(`✓ ${amount} XP を付与しました`, "success");
      addLine(`  Total XP : ${data.totalXp}`, "info");
      addLine(`  Level    : ${data.newLevel}`, "info");
      if (data.leveledUp) {
        addLine("", "system");
        addLine("██████████████████████████████████████████████████", "warning");
        addLine(`  ★  LEVEL UP! → Level ${data.newLevel}  ★`, "warning");
        addLine("██████████████████████████████████████████████████", "warning");
      }
      // ストアも更新
      updateStoreUser({ level: data.newLevel, xp: data.totalXp });
    } catch {
      addLine("Network error.", "error");
    }
  }

  async function cmdUsers() {
    if (!isAdmin) { addLine("Permission denied. Admin access required.", "error"); return; }
    addLine("Fetching users...", "system");
    try {
      const res = await fetch("/api/admin/users");
      const users = await res.json();
      if (!res.ok) { addLine("Failed to fetch users.", "error"); return; }

      addLine("═".repeat(70), "info");
      addLine("  REGISTERED USERS", "info");
      addLine("═".repeat(70), "info");
      users.forEach((u: { agentId: string; name: string; role: string; level: number; divisionName: string }, i: number) => {
        addLine(`[${String(i + 1).padStart(2)}] ${u.name.padEnd(20)} ${u.agentId.padEnd(12)} LV${u.level}  ${u.divisionName || "—"}`, "success");
      });
      addLine("═".repeat(70), "system");
      addLine(`Total: ${users.length} users`, "info");
    } catch {
      addLine("Network error.", "error");
    }
  }

  async function cmdLevel(args: string[]) {
    if (!isAdmin) { addLine("Permission denied. Admin access required.", "error"); return; }
    if (!args[0]) { addLine(`Current level: ${user.level}`, "info"); addLine("Usage: level <1-5>", "system"); return; }
    const newLevel = parseInt(args[0]);
    if (isNaN(newLevel) || newLevel < 1 || newLevel > 5) { addLine("Invalid level. Must be 1-5.", "error"); return; }

    try {
      const res = await fetch(`/api/admin/users/${user.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearanceLevel: newLevel }),
      });
      if (!res.ok) { addLine("Update failed.", "error"); return; }
      addLine(`Level: ${user.level} → ${newLevel}`, "success");
      addLine("ページを再読み込みすると反映されます。", "system");
    } catch {
      addLine("Network error.", "error");
    }
  }

  async function cmdReset() {
    if (!isAdmin) { addLine("Permission denied. Admin access required.", "error"); return; }
    addLine("WARNING: This will reset your progress!", "error");
    addLine("Resetting...", "warning");
    try {
      await fetch(`/api/admin/users/${user.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearanceLevel: 1 }),
      });
      addLine("✓ Level reset to 1", "success");
      addLine("ページを再読み込みすると反映されます。", "system");
    } catch {
      addLine("Network error.", "error");
    }
  }

  async function cmdLogout() {
    addLine("Logging out...", "warning");
    addLine("Session terminated.", "system");
    setTimeout(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      router.replace("/login");
    }, 1000);
  }

  function cmdDate() {
    addLine(new Date().toString(), "info");
  }

  function showCmdHistory() {
    if (cmdHistory.length === 0) { addLine("No command history.", "system"); return; }
    addLine("Command History:", "info");
    cmdHistory.forEach((cmd, i) => addLine(`  ${String(i + 1).padStart(3)}  ${cmd}`, "system"));
  }

  function cmdEcho(args: string[]) {
    addLine(args.join(" "), "success");
  }

  // ── Autocomplete ─────────────────────────────────────────────────

  function autocomplete() {
    const cmds = ["help","clear","exit","whoami","status","grant","logout","users","level","reset","date","history","echo"];
    const matches = cmds.filter(c => c.startsWith(inputValue));
    if (matches.length === 1) {
      setInputValue(matches[0]);
    } else if (matches.length > 1) {
      addLine("Possible commands:", "system");
      matches.forEach(m => addLine(`  ${m}`, "info"));
    }
  }

  // ── Main input handler ───────────────────────────────────────────

  async function processCommand(raw: string) {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    addLine(`root@kaishoku:~# ${raw}`, "system");

    switch (cmd) {
      case "notify":    if (isAdmin) await cmdNotify(args); else addLine("Permission denied.", "error"); break;
      case "fire":      if (isAdmin) await cmdFire(args); else addLine("Permission denied.", "error"); break;
      case "sql":       await cmdSql(args); break;
      case "anomaly":   await cmdAnomaly(args); break;
      case "user":      await cmdGetUser(args); break;
      case "help":      cmdHelp(); break;
      case "clear":     cmdClear(); return;
      case "exit":      cmdExit(); break;
      case "whoami":    cmdWhoami(); break;
      case "status":    cmdStatus(); break;
      case "grant":     await cmdGrant(args); break;
      case "logout":    await cmdLogout(); break;
      case "users":     await cmdUsers(); break;
      case "level":     await cmdLevel(args); break;
      case "reset":     await cmdReset(); break;
      case "date":      cmdDate(); break;
      case "history":   showCmdHistory(); break;
      case "echo":      cmdEcho(args); break;
      default:
        addLine(`Command not found: ${cmd}`, "error");
        addLine("Type 'help' for available commands.", "system");
    }

    addLine("─".repeat(80), "system");
    addLine("", "system");
    scrollToBottom();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const raw = inputValue.trim();
      if (!raw) return;
      setCmdHistory(prev => [...prev, raw]);
      setHistoryIndex(-1);
      setInputValue("");
      processCommand(raw);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdHistory(hist => {
        const idx = historyIndex < hist.length - 1 ? historyIndex + 1 : hist.length - 1;
        setHistoryIndex(idx);
        setInputValue(hist[hist.length - 1 - idx] ?? "");
        return hist;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdHistory(hist => {
        const idx = historyIndex > 0 ? historyIndex - 1 : -1;
        setHistoryIndex(idx);
        setInputValue(idx < 0 ? "" : (hist[hist.length - 1 - idx] ?? ""));
        return hist;
      });
    } else if (e.key === "Tab") {
      e.preventDefault();
      autocomplete();
    }
  }

  // ── Style helpers ────────────────────────────────────────────────

  const colorMap: Record<ConsoleLine["type"], string> = {
    success: "#0f0",
    error:   "#f00",
    warning: "#ff0",
    info:    "#0ff",
    system:  "#0a0",
  };

  const shadowMap: Record<ConsoleLine["type"], string | undefined> = {
    success: undefined,
    error:   "0 0 5px #f00",
    warning: "0 0 5px #ff0",
    info:    "0 0 5px #0ff",
    system:  undefined,
  };

  return (
    <>
      <style>{`
        @keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:.8} 51%{opacity:1} 60%{opacity:.9} }
        #console-output::-webkit-scrollbar { width: 8px; }
        #console-output::-webkit-scrollbar-track { background: #000; }
        #console-output::-webkit-scrollbar-thumb { background: #0f0; box-shadow: 0 0 5px #0f0; }
        .console-input::selection { background: #0f0; color: #000; }
      `}</style>

      <div
        onClick={handleContainerClick}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
          backgroundColor: "#000",
          color: "#0f0",
          fontFamily: "'Courier New', monospace",
          overflow: "hidden",
          paddingBottom: "2.5rem",
          cursor: "text",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid #0f0", paddingBottom: "0.5rem", marginBottom: "1rem", flexShrink: 0 }}>
          <div style={{ fontSize: "1.1rem", color: "#0f0", textShadow: "0 0 10px #0f0", animation: "flicker 3s infinite", whiteSpace: "pre" }}>
            {"╔═══════════════════════════════════════════╗\n"}
            {"║     SEA SYSTEM CONSOLE - ROOT ACCESS     ║\n"}
            {"╚═══════════════════════════════════════════╝"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0a0", marginTop: "0.25rem" }}>SEA EROSION AGENCY</div>
          <div style={{ fontSize: "0.75rem", color: "#0a0" }}>Type &apos;help&apos; for commands | Type &apos;exit&apos; to return to dashboard</div>
        </div>

        {/* Output */}
        <div
          id="console-output"
          ref={outputRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.5rem 0",
            lineHeight: 1.5,
          }}
        >
          {lines.map((line) => (
            <div
              key={line.id}
              style={{
                marginBottom: "0.1rem",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                color: colorMap[line.type],
                textShadow: shadowMap[line.type],
                fontSize: "0.875rem",
              }}
            >
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid #0f0", paddingTop: "0.5rem", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: "#0f0", marginRight: "0.5rem", textShadow: "0 0 5px #0f0", whiteSpace: "nowrap", fontSize: "0.875rem" }}>
            root@kaishoku:~#
          </span>
          <input
            ref={inputRef}
            className="console-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#0f0",
              fontFamily: "'Courier New', monospace",
              fontSize: "0.875rem",
              outline: "none",
              caretColor: "#0f0",
            }}
          />
          <span style={{
            display: "inline-block",
            width: "0.55rem",
            height: "1rem",
            background: "#0f0",
            animation: "blink 1s infinite",
            verticalAlign: "text-bottom",
          }} />
        </div>

        {/* Disclaimer */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0.4rem",
          textAlign: "center",
          fontSize: "0.625rem",
          color: "rgba(0,255,0,0.4)",
          borderTop: "1px solid rgba(0,255,0,0.15)",
          pointerEvents: "none",
        }}>
          このサイトはフィクションです。現実の人物・施設・事件・場所・海蝕現象とは一切関係ありません。
        </div>
      </div>
    </>
  );
}
