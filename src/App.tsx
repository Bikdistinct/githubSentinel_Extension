import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  RepoAnalysis, RepoCheckResult, ChatMessage,
  TabType, ThreatFinding, DataCollectionFinding,
  ThreatLevel, AnalysisHistoryItem,
} from "./types";
import {
  checkRepoThreats, analyzeRepo, askQuestion,
  getHistory, checkHealth,
} from "./services/api";

// ─── Theme ────────────────────────────────────────────────────────────────────

const C: Record<ThreatLevel, string> = {
  safe:     "#00d084",
  low:      "#f0c040",
  medium:   "#f08040",
  high:     "#e03040",
  critical: "#c000e0",
};
const BG: Record<ThreatLevel, string> = {
  safe:     "rgba(0,208,132,0.10)",
  low:      "rgba(240,192,64,0.10)",
  medium:   "rgba(240,128,64,0.10)",
  high:     "rgba(224,48,64,0.10)",
  critical: "rgba(192,0,224,0.10)",
};
const CAT: Record<string, string> = {
  malware:"☣️", data_collection:"👁", network_activity:"🌐",
  file_system:"📁", system_commands:"⚡", obfuscation:"🔒",
  crypto_mining:"⛏", backdoor:"🚪", supply_chain:"📦", permissions:"🔑",
};

const threatEmoji = (l: ThreatLevel) =>
  ({ safe:"✅", low:"🟡", medium:"🟠", high:"🔴", critical:"💀" }[l] ?? "❓");

function extractGitHubUrl(url: string): string | null {
  const m = url.match(/^(https?:\/\/github\.com\/[^/]+\/[^/?#]+)/);
  return m ? m[1] : null;
}

// ─── Shared small components ──────────────────────────────────────────────────

function Badge({ level }: { level: ThreatLevel }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
      letterSpacing: 1, textTransform: "uppercase",
      background: BG[level], color: C[level], border: `1px solid ${C[level]}33`,
    }}>{level}</span>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid rgba(165,180,252,0.25)`,
      borderTopColor: "#a5b4fc",
      animation: "spin 0.8s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function ScoreRing({ score, level }: { score: number; level: ThreatLevel }) {
  const r = 36, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={C[level]} strokeWidth={8}
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C[level], fontFamily: "monospace" }}>{score}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>risk</span>
      </div>
    </div>
  );
}

// ─── ThreatCard ───────────────────────────────────────────────────────────────

function ThreatCard({ t }: { t: ThreatFinding }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: BG[t.level], border: `1px solid ${C[t.level]}33`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
      transition: "background 0.15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{CAT[t.category] ?? "⚠️"}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
        </div>
        <Badge level={t.level} />
      </div>
      {t.file_path && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4,
          fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.file_path}{t.line_number ? `:${t.line_number}` : ""}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 6px", lineHeight: 1.5 }}>
            {t.description}
          </p>
          {t.code_snippet && (
            <pre style={{
              fontSize: 10, background: "rgba(0,0,0,0.4)", padding: "6px 8px",
              borderRadius: 4, overflow: "auto", margin: "0 0 6px",
              color: "#a8d8a8", fontFamily: "monospace", maxHeight: 80,
            }}>{t.code_snippet}</pre>
          )}
          <div style={{ fontSize: 10, color: "#f0c040", display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span>💡</span><span style={{ lineHeight: 1.4 }}>{t.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DataCard ─────────────────────────────────────────────────────────────────

function DataCard({ d }: { d: DataCollectionFinding }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: BG[d.severity], border: `1px solid ${C[d.severity]}33`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0" }}>👁 {d.type}</span>
        <Badge level={d.severity} />
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "4px 0 0", lineHeight: 1.4 }}>
        {d.description}
      </p>
      {open && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {d.data_types.map(dt => (
              <span key={dt} style={{
                fontSize: 10, background: "rgba(255,255,255,0.07)",
                padding: "2px 6px", borderRadius: 4, color: "#d0d0d0",
              }}>{dt}</span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: d.opt_out_available ? "#00d084" : "#e03040", marginBottom: 6 }}>
            {d.opt_out_available ? "✅ Opt-out available" : "❌ No opt-out mechanism found"}
          </div>
          {d.files_involved.slice(0, 4).map(f => (
            <div key={f} style={{
              fontSize: 10, fontFamily: "monospace",
              color: "rgba(255,255,255,0.3)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{f}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CommunityAlert ───────────────────────────────────────────────────────────
// Shown in Scan tab as soon as a URL is recognised in MongoDB.
// This is the key feature: other users' scans warn you BEFORE you even click Scan.

function CommunityAlert({ check, onDismiss }: { check: RepoCheckResult; onDismiss: () => void }) {
  if (!check.found) return null;
  const level  = (check.overall_threat_level ?? "medium") as ThreatLevel;
  const isHigh = ["high", "critical"].includes(level);
  const hasWarnings = check.auto_warnings.length > 0;

  return (
    <div style={{
      background: BG[level],
      border: `1px solid ${C[level]}40`,
      borderLeft: `4px solid ${C[level]}`,
      borderRadius: 8, padding: "12px 14px",
      animation: "slideIn 0.2s ease",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 15 }}>🛡</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C[level], letterSpacing: 0.5, textTransform: "uppercase" }}>
            Community Intel{isHigh ? " — THREATS FOUND" : ""}
          </span>
          <span style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 4,
          }}>
            {check.scan_count}× scanned
          </span>
          <Badge level={level} />
        </div>
        <button onClick={onDismiss} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 16, lineHeight: 1, padding: "0 2px",
        }}>✕</button>
      </div>

      {/* Warnings */}
      {hasWarnings ? (
        check.auto_warnings.map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>{isHigh ? "⛔" : "⚠️"}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{w}</span>
          </div>
        ))
      ) : (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>
          ✅ Previously scanned — no significant threats found.
        </p>
      )}

      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
        Run a full scan to see detailed findings and ask questions.
        {check.last_scanned_at && ` Last scanned: ${new Date(check.last_scanned_at).toLocaleDateString()}`}
      </div>
    </div>
  );
}

// ─── ChatTab ──────────────────────────────────────────────────────────────────

function ChatTab({ analysis }: { analysis: RepoAnalysis }) {
  /**
   * The chat initialises with auto_warnings already populated as assistant
   * messages — no user input needed.  These come from the scan result and
   * are the same warnings stored in MongoDB for the community check.
   */
  const buildInitial = (): ChatMessage[] => {
    const msgs: ChatMessage[] = [];
    if (analysis.auto_warnings.length > 0) {
      msgs.push({
        role: "assistant",
        content: `I've analysed **${analysis.repo_name}** (${analysis.file_count} files · threat score **${analysis.threat_score}/100**). Here are the key concerns you should know before using this repository:`,
        timestamp: Date.now() - 4000,
        isAutoWarning: true,
      });
      analysis.auto_warnings.forEach((w, i) => {
        msgs.push({
          role: "assistant", content: w,
          timestamp: Date.now() - 3000 + i * 150,
          isAutoWarning: true,
        });
      });
      msgs.push({
        role: "assistant",
        content: "You can ask me anything about this repository's code — I'll answer only from what I found in the actual files.",
        timestamp: Date.now() - 500,
        isAutoWarning: true,
      });
    } else {
      msgs.push({
        role: "assistant",
        content: `✅ No significant threats found in **${analysis.repo_name}**. The repository looks relatively safe. Feel free to ask me anything about the codebase.`,
        timestamp: Date.now(),
        isAutoWarning: true,
      });
    }
    return msgs;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(buildInitial);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: q, timestamp: Date.now() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      const result = await askQuestion(analysis.repo_id, q, [...messages, userMsg]);
      setMessages(m => [...m, {
        role: "assistant", content: result.answer,
        sources: result.sources, confidence: result.confidence,
        timestamp: Date.now(),
      }]);
    } catch (e: unknown) {
      setMessages(m => [...m, {
        role: "assistant",
        content: `❌ ${e instanceof Error ? e.message : "Request failed"}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "90%", padding: "8px 12px", lineHeight: 1.55, fontSize: 12, color: "#e8e8e8",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user"
                ? "rgba(99,102,241,0.22)"
                : msg.isAutoWarning ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
              border: msg.role === "user"
                ? "1px solid rgba(99,102,241,0.4)"
                : msg.isAutoWarning ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.1)",
            }}>
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "90%" }}>
                {msg.sources.map((s, si) => (
                  <span key={si} style={{
                    fontSize: 9, background: "rgba(99,102,241,0.14)",
                    border: "1px solid rgba(99,102,241,0.3)", borderRadius: 4,
                    padding: "1px 6px", color: "rgba(165,180,252,0.85)", fontFamily: "monospace",
                  }}>📄 {s.file_path.split("/").pop()}</span>
                ))}
                {msg.confidence !== undefined && (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", padding: "2px 4px" }}>
                    {Math.round(msg.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "4px 0", alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "rgba(99,102,241,0.6)",
                animation: `pulse 1s ${i * 0.2}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>
              Searching codebase…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{
        marginTop: 10, display: "flex", gap: 8,
        paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={analysis.indexed_for_qa ? "Ask about this repository…" : "Q&A unavailable (indexing failed)"}
          disabled={loading || !analysis.indexed_for_qa}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "8px 12px", color: "#f0f0f0", fontSize: 12, outline: "none",
            transition: "border-color 0.15s",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim() || !analysis.indexed_for_qa}
          style={{
            background: "rgba(99,102,241,0.28)", border: "1px solid rgba(99,102,241,0.5)",
            borderRadius: 8, padding: "8px 16px", color: "#a5b4fc",
            cursor: "pointer", fontSize: 16, fontWeight: 700,
          }}>↑</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab,            setTab]            = useState<TabType>("scan");
  const [repoUrl,        setRepoUrl]        = useState("");
  const [githubToken,    setGithubToken]    = useState("");
  const [showToken,      setShowToken]      = useState(false);
  const [analysis,       setAnalysis]       = useState<RepoAnalysis | null>(null);
  const [communityCheck, setCommunityCheck] = useState<RepoCheckResult | null>(null);
  const [checkDismissed, setCheckDismissed] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [checking,       setChecking]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [backendOk,      setBackendOk]      = useState<boolean | null>(null);
  const [history,        setHistory]        = useState<AnalysisHistoryItem[]>([]);

  // ── On mount: health check, history, active tab URL, saved token ──────────
  useEffect(() => {
    checkHealth().then(setBackendOk);
    getHistory().then(setHistory);

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const gh = extractGitHubUrl(tabs[0]?.url ?? "");
        if (gh) setRepoUrl(gh);
      });
    }
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["githubToken"], r => {
        if (r.githubToken) setGithubToken(r.githubToken);
      });
    }
  }, []);

  // ── Community check: debounced 600 ms after URL changes ───────────────────
  useEffect(() => {
    const url = extractGitHubUrl(repoUrl.trim());
    if (!url || !backendOk) { setCommunityCheck(null); return; }
    setCheckDismissed(false);

    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await checkRepoThreats(url);
        setCommunityCheck(result);
      } catch {
        setCommunityCheck(null);
      } finally {
        setChecking(false);
      }
    }, 600);

    return () => clearTimeout(t);
  }, [repoUrl, backendOk]);

  // ── Full scan ─────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!repoUrl.trim()) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const result = await analyzeRepo(repoUrl.trim(), githubToken || undefined);
      setAnalysis(result);
      setTab("chat");    // jump straight to Chat where auto-warnings live
      if (githubToken && typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ githubToken });
      }
      getHistory().then(setHistory);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [repoUrl, githubToken]);

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs: { id: TabType; label: string; disabled?: boolean }[] = [
    { id: "scan",    label: "Scan" },
    { id: "threats", label: `Threats${analysis ? ` (${analysis.threats.length})` : ""}`, disabled: !analysis },
    { id: "data",    label: `Data${analysis ? ` (${analysis.data_collection.length})` : ""}`, disabled: !analysis },
    { id: "chat",    label: "AI Chat", disabled: !analysis },
    { id: "history", label: "History" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: 420, minHeight: 580, maxHeight: 680,
      background: "#0d0d12", color: "#f0f0f0",
      fontFamily: "'SF Pro Display','Segoe UI',system-ui,sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        input:focus{border-color:rgba(99,102,241,0.55)!important;outline:none}
        button:hover:not(:disabled){opacity:.8}
        button:disabled{opacity:.35;cursor:not-allowed!important}
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg,rgba(99,102,241,0.08) 0%,transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🛡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>GitHub Sentinel</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>
              AI SECURITY SCANNER
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 600, letterSpacing: 0.5,
          background: backendOk ? "rgba(0,208,132,0.12)" : "rgba(224,48,64,0.12)",
          border: `1px solid ${backendOk ? "rgba(0,208,132,0.3)" : "rgba(224,48,64,0.3)"}`,
          color: backendOk ? "#00d084" : "#e03040",
        }}>
          {backendOk === null ? "CONNECTING…" : backendOk ? "● ONLINE" : "● OFFLINE"}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 18px", gap: 2, flexShrink: 0,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
            style={{
              background: "none", border: "none",
              cursor: t.disabled ? "not-allowed" : "pointer",
              padding: "10px 10px 8px", fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
              color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.3)",
              borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all 0.15s", opacity: t.disabled ? 0.3 : 1, flexShrink: 0,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 18px",
        animation: "fadeIn 0.2s ease", display: "flex", flexDirection: "column",
      }}>

        {/* ═══════════════ SCAN TAB ═══════════════ */}
        {tab === "scan" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Backend offline warning */}
            {backendOk === false && (
              <div style={{
                background: "rgba(224,48,64,0.10)", border: "1px solid rgba(224,48,64,0.3)",
                borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#f08080",
              }}>
                ⚠️ Backend offline — run: <code style={{ fontFamily: "monospace" }}>uvicorn app.main:app --reload</code>
              </div>
            )}

            {/* Community alert — shown as soon as URL recognised in MongoDB */}
            {communityCheck && !checkDismissed && (
              <CommunityAlert check={communityCheck} onDismiss={() => setCheckDismissed(true)} />
            )}

            {/* URL input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
                  GITHUB REPOSITORY URL
                </label>
                <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  {checking && <><Spinner size={8} /><span style={{ color: "rgba(255,255,255,0.25)" }}>checking…</span></>}
                  {!checking && communityCheck?.found === true && !checkDismissed && (
                    <span style={{ color: communityCheck.auto_warnings.length > 0 ? "#f08040" : "#00d084" }}>
                      {communityCheck.auto_warnings.length > 0
                        ? `⚠️ ${communityCheck.scan_count}× scanned, threats found`
                        : `✅ ${communityCheck.scan_count}× scanned, clean`}
                    </span>
                  )}
                  {!checking && communityCheck?.found === false && (
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>never scanned</span>
                  )}
                </span>
              </div>
              <input
                value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                placeholder="https://github.com/owner/repo"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                  padding: "10px 12px", color: "#f0f0f0", fontSize: 12,
                }}
              />
            </div>

            {/* Token input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
                  GITHUB TOKEN <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span>
                </label>
                <button onClick={() => setShowToken(s => !s)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.3)", fontSize: 10,
                }}>{showToken ? "hide" : "show"}</button>
              </div>
              <input
                type={showToken ? "text" : "password"}
                value={githubToken} onChange={e => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                  padding: "10px 12px", color: "#f0f0f0", fontSize: 12,
                }}
              />
            </div>

            {/* Scan button */}
            <button onClick={handleAnalyze} disabled={!repoUrl.trim() || loading || !backendOk}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.4))",
                border: "1px solid rgba(99,102,241,0.5)", borderRadius: 8,
                color: "#a5b4fc", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
              }}>
              {loading ? <><Spinner />Scanning repository…</> : "🔍 Full Scan"}
            </button>

            {error && (
              <div style={{
                background: "rgba(224,48,64,0.10)", border: "1px solid rgba(224,48,64,0.3)",
                borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#f08080",
              }}>❌ {error}</div>
            )}

            {/* What we scan */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)",
                marginBottom: 8, letterSpacing: 0.5 }}>WHAT WE SCAN</div>
              {[
                ["☣️", "Malware, backdoors & reverse shells"],
                ["👁",  "Data collection & telemetry code"],
                ["⚡", "System command execution"],
                ["📁", "File system & credential access"],
                ["📦", "Supply chain & install scripts"],
                ["⛏", "Cryptocurrency mining code"],
                ["🔒", "Obfuscated / encoded payloads"],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 12 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{text as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ THREATS TAB ═══════════════ */}
        {tab === "threats" && analysis && (
          <div>
            {/* Summary card */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: 14, display: "flex", gap: 14,
              alignItems: "flex-start", marginBottom: 14,
            }}>
              <ScoreRing score={analysis.threat_score} level={analysis.overall_threat_level} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{threatEmoji(analysis.overall_threat_level)}</span>
                  <Badge level={analysis.overall_threat_level} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{analysis.file_count} files</span>
                  {analysis.scan_count > 1 && (
                    <span style={{
                      fontSize: 10, color: "rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4,
                    }}>{analysis.scan_count}× scanned</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.55, margin: "0 0 8px" }}>
                  {analysis.analysis_summary}
                </p>
                <div style={{ fontSize: 11, fontWeight: 700,
                  color: analysis.safe_to_download ? "#00d084" : "#e03040" }}>
                  {analysis.safe_to_download ? "✅ Relatively safe to download" : "⛔ Exercise caution before installing"}
                </div>
              </div>
            </div>

            {analysis.threats.length === 0 ? (
              <div style={{ textAlign: "center", padding: 28, color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                ✅ No threat patterns detected
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5,
                  fontWeight: 600, marginBottom: 8 }}>
                  {analysis.threats.length} FINDINGS — CLICK ANY TO EXPAND
                </div>
                {analysis.threats.map((t, i) => <ThreatCard key={i} t={t} />)}
              </>
            )}
          </div>
        )}

        {/* ═══════════════ DATA TAB ═══════════════ */}
        {tab === "data" && analysis && (
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5,
              fontWeight: 600, marginBottom: 12 }}>
              {analysis.data_collection.length} DATA COLLECTION PATTERNS
            </div>
            {analysis.data_collection.length === 0 ? (
              <div style={{ textAlign: "center", padding: 28, color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                ✅ No data collection patterns found
              </div>
            ) : (
              analysis.data_collection.map((d, i) => <DataCard key={i} d={d} />)
            )}
          </div>
        )}

        {/* ═══════════════ CHAT TAB ═══════════════ */}
        {tab === "chat" && analysis && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <ChatTab analysis={analysis} />
          </div>
        )}

        {/* ═══════════════ HISTORY TAB ═══════════════ */}
        {tab === "history" && (
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5,
              fontWeight: 600, marginBottom: 12 }}>
              COMMUNITY SCAN HISTORY
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 28, color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                No scans yet
              </div>
            ) : (
              history.map(item => (
                <div key={item.repo_id}
                  onClick={() => { setRepoUrl(item.repo_url); setTab("scan"); }}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
                    transition: "background 0.15s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#c8c8f0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {item.repo_name}
                    </span>
                    <Badge level={item.overall_threat_level as ThreatLevel} />
                  </div>
                  {item.auto_warnings.length > 0 && (
                    <div style={{
                      fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 5,
                      lineHeight: 1.4, borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: 8,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.auto_warnings[0]}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                      Score: {item.threat_score}/100 · {item.scan_count}× scanned
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                      {item.last_scanned_at ? new Date(item.last_scanned_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
