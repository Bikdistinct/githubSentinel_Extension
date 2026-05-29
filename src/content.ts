
/**
 * content.ts
 *
 * Injects a "🛡 Scan with Sentinel" button on GitHub repo pages.
 * Clicking the button toggles a floating panel directly below the button —
 * no popup, no new tab, everything inline on the GitHub page.
 *
 * The panel handles:
 *   - Community threat check (instant, from MongoDB)
 *   - Full repo scan
 *   - Auto-warnings display
 *   - Threat list
 *   - RAG Q&A chat
 */

const BUTTON_ID = "sentinel-scan-btn";
const PANEL_ID  = "sentinel-panel";
// const API_BASE  = "http://localhost:8000/api/v1";
const API_BASE  = "https://githubsentinel.onrender.com/api/v1";
// ── Helpers ───────────────────────────────────────────────────────────────────

function isRepoPage(): boolean {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/?(\?.*)?$/.test(location.href);
}

function repoUrl(): string {
  return location.href.replace(/\?.+$/, "").replace(/\/$/, "");
}

function md5Short(str: string): string {
  // Simple hash for repo_id generation matching backend logic
  // (backend uses Python's hashlib.md5 — we replicate for cache checks)
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  safe: "#00d084", low: "#f0c040", medium: "#f08040",
  high: "#e03040", critical: "#c000e0",
};
const LEVEL_BG: Record<string, string> = {
  safe: "rgba(0,208,132,0.12)", low: "rgba(240,192,64,0.12)",
  medium: "rgba(240,128,64,0.12)", high: "rgba(224,48,64,0.12)",
  critical: "rgba(192,0,224,0.12)",
};
const CAT_ICON: Record<string, string> = {
  malware:"☣️", data_collection:"👁", network_activity:"🌐",
  file_system:"📁", system_commands:"⚡", obfuscation:"🔒",
  crypto_mining:"⛏", backdoor:"🚪", supply_chain:"📦", permissions:"🔑",
};

function badge(level: string) {
  return `<span style="
    padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;
    letter-spacing:.8px;text-transform:uppercase;
    background:${LEVEL_BG[level]};color:${LEVEL_COLOR[level]};
    border:1px solid ${LEVEL_COLOR[level]}33;white-space:nowrap;
  ">${level}</span>`;
}

// ── Panel state ───────────────────────────────────────────────────────────────

interface PanelState {
  tab:           "scan" | "threats" | "data" | "chat";
  checking:      boolean;
  scanning:      boolean;
  communityData: any | null;
  analysis:      any | null;
  error:         string | null;
  chatMessages:  Array<{ role: string; content: string; sources?: any[]; isAuto?: boolean }>;
  chatInput:     string;
  chatLoading:   boolean;
  expandedThreats: Set<number>;
  expandedData:    Set<number>;
  githubToken:   string;
}

const state: PanelState = {
  tab:             "scan",
  checking:        false,
  scanning:        false,
  communityData:   null,
  analysis:        null,
  error:           null,
  chatMessages:    [],
  chatInput:       "",
  chatLoading:     false,
  expandedThreats: new Set(),
  expandedData:    new Set(),
  githubToken:     "",
};

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.innerHTML = buildPanel();
  attachEvents();
}

function buildPanel(): string {
  return `
    <div id="sp-inner" style="
      background:#0d0d12;color:#f0f0f0;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:13px;line-height:1.5;
    ">
      <style>
        #sentinel-panel *{box-sizing:border-box;margin:0;padding:0}
        #sentinel-panel ::-webkit-scrollbar{width:4px}
        #sentinel-panel ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        @keyframes sp-spin{to{transform:rotate(360deg)}}
        @keyframes sp-pulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
        @keyframes sp-fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .sp-tab-btn{background:none;border:none;cursor:pointer;padding:9px 11px 7px;
          font-size:11px;font-weight:600;letter-spacing:.3px;transition:all .15s}
        .sp-tab-btn:disabled{opacity:.35;cursor:not-allowed}
        .sp-tab-btn.active{color:#a5b4fc;border-bottom:2px solid #6366f1}
        .sp-tab-btn:not(.active){color:rgba(255,255,255,.35);border-bottom:2px solid transparent}
        .sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:4rem;
          width:100%;padding:5px 11px !important;border-radius:8px;font-size:13px;font-weight:700;
          cursor:pointer;transition:opacity .15s;border:none}
        .sp-btn:disabled{opacity:.35;cursor:not-allowed}
        .sp-btn-primary{background:linear-gradient(135deg,rgba(99,102,241,.4),rgba(139,92,246,.4));
          border:1px solid rgba(99,102,241,.5)!important;color:#a5b4fc}
        .sp-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
          border-radius:8px;padding:9px 12px !important;color:#f0f0f0;font-size:12px;outline:none;
          transition:border-color .15s;font-family:inherit}
        .sp-input:focus{border-color:rgba(99,102,241,.55)}
        .sp-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
          border-radius:8px;padding:11px 13px;margin-bottom:8px;cursor:pointer;transition:background .15s}
        .sp-card:hover{background:rgba(255,255,255,.05)}
        .sp-spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(165,180,252,.25);
          border-top-color:#a5b4fc;animation:sp-spin .8s linear infinite;flex-shrink:0}
      </style>

      ${buildHeader()}
      ${buildTabs()}
      <div id="sp-content" style="padding:14px 16px;overflow-y:auto;max-height:420px;animation:sp-fadein .2s ease">
        ${buildContent()}
      </div>
    </div>
  `;
}

function buildHeader(): string {
  return `
    <div style="
      padding:12px 16px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,.07);
      background:linear-gradient(180deg,rgba(99,102,241,.08) 0%,transparent 100%);
      flex-shrink:0;
    ">
      <div style="display:flex;align-items:center;gap:9px">
        <div style="width:28px;height:28px;border-radius:7px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          display:flex;align-items:center;justify-content:center;font-size:14px">🛡</div>
        <div>
          <div style="font-size:13px;font-weight:700;letter-spacing:-.3px">GitHub Sentinel</div>
          <div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.5px">AI SECURITY SCANNER</div>
        </div>
      </div>
      <button id="sp-close" style="
        background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);
        font-size:18px;line-height:1;padding:2px 4px;transition:color .15s;
      " title="Close">✕</button>
    </div>
  `;
}

function buildTabs(): string {
  const tabs = [
    { id: "scan",    label: "Scan" },
    { id: "threats", label: `Threats${state.analysis ? ` (${state.analysis.threats?.length ?? 0})` : ""}` },
    { id: "data",    label: `Data${state.analysis ? ` (${state.analysis.data_collection?.length ?? 0})` : ""}` },
    { id: "chat",    label: "AI Chat" },
  ];
  const noAnalysis = !state.analysis;
  return `
    <div style="display:flex;border-bottom:1px solid rgba(255,255,255,.07);padding:2px 20px;gap:30px;flex-shrink:0;color:white">
      ${tabs.map(t => `
        <button class="sp-tab-btn ${state.tab === t.id ? "active" : ""}"
          data-tab="${t.id}"
          ${noAnalysis && t.id !== "scan" ? "disabled" : ""}
        >${t.label}</button>
      `).join("")}
    </div>
  `;
}

function buildContent(): string {
  switch (state.tab) {
    case "scan":    return buildScanTab();
    case "threats": return state.analysis ? buildThreatsTab() : "";
    case "data":    return state.analysis ? buildDataTab() : "";
    case "chat":    return state.analysis ? buildChatTab() : "";
    default:        return "";
  }
}

// ── Scan tab ──────────────────────────────────────────────────────────────────

function buildScanTab(): string {
  const cd   = state.communityData;
  const hasCommunity = cd?.found && cd?.auto_warnings?.length > 0;

  return `
    <div style="display:flex;flex-direction:column;gap:13px">

      ${hasCommunity ? buildCommunityAlert(cd) : ""}

      ${state.error ? `
        <div style="background:rgba(224,48,64,.1);border:1px solid rgba(224,48,64,.3);
          border-radius:8px;padding:10px 13px;font-size:11px;color:#f08080">
          ❌ ${state.error}
        </div>` : ""}

      <div>
        <div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.5px;margin-bottom:6px">
          REPOSITORY
          ${state.checking ? `<span style="color:rgba(255,255,255,.25);margin-left:8px;font-size:9px">checking…</span>` : ""}
          ${!state.checking && cd?.found === true ? `
            <span style="margin-left:8px;font-size:9px;color:${hasCommunity ? "#f08040" : "#00d084"}">
              ${hasCommunity ? `⚠️ ${cd.scan_count}× scanned, threats found` : `✅ ${cd.scan_count}× scanned, clean`}
            </span>` : ""}
          ${!state.checking && cd?.found === false ? `
            <span style="margin-left:8px;font-size:9px;color:rgba(255,255,255,.2)">never scanned</span>` : ""}
        </div>
        <input class="sp-input" id="sp-repo-url" value="${repoUrl()}" readonly
          style="color:rgba(255,255,255,.5);cursor:default"/>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.5px">
            GITHUB TOKEN <span style="color:rgba(255,255,255,.2)">(optional)</span>
          </span>
          <button id="sp-toggle-token" style="background:none;border:none;cursor:pointer;
            color:rgba(255,255,255,.3);font-size:10px">show</button>
        </div>
        <input class="sp-input" id="sp-token" type="password"
          placeholder="ghp_xxxxxxxxxxxx" value="${state.githubToken}"
          style="font-size:11px"/>
      </div>

      <button class="sp-btn sp-btn-primary" id="sp-scan-btn"
        ${state.scanning ? "disabled" : ""}>
        ${state.scanning
          ? `<span class="sp-spinner"></span> Scanning…`
          : "Full Scan"}
      </button>

      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
        border-radius:8px;padding:11px 13px">
        <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.3);
          margin-bottom:7px;letter-spacing:.5px">WHAT WE SCAN</div>
        ${[
          ["☣️","Malware, backdoors & reverse shells"],
          ["👁","Data collection & telemetry"],
          ["⚡","System command execution"],
          ["📁","File system & credential access"],
          ["📦","Supply chain & install scripts"],
          ["⛏","Cryptocurrency mining code"],
          ["🔒","Obfuscated / encoded payloads"],
        ].map(([icon, text]) => `
          <div style="display:flex;gap:7px;align-items:center;margin-bottom:5px">
            <span style="font-size:12px">${icon}</span>
            <span style="font-size:11px;color:rgba(255,255,255,.4)">${text}</span>
          </div>`).join("")}
      </div>
    </div>
  `;
}

function buildCommunityAlert(cd: any): string {
  const level    = cd.overall_threat_level ?? "medium";
  const isHigh   = ["high","critical"].includes(level);
  return `
    <div style="
      background:${LEVEL_BG[level]};
      border:1px solid ${LEVEL_COLOR[level]}40;
      border-left:4px solid ${LEVEL_COLOR[level]};
      border-radius:8px;padding:11px 13px;animation:sp-fadein .2s ease;
    ">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap">
        <span style="font-size:14px">🛡</span>
        <span style="font-size:10px;font-weight:700;color:${LEVEL_COLOR[level]};
          letter-spacing:.5px;text-transform:uppercase">
          Community Intel${isHigh ? " — THREATS FOUND" : ""}
        </span>
        <span style="font-size:9px;color:rgba(255,255,255,.3);
          background:rgba(255,255,255,.06);padding:1px 7px;border-radius:4px">
          ${cd.scan_count}× scanned
        </span>
        ${badge(level)}
      </div>
      ${cd.auto_warnings.map((w: string) => `
        <div style="display:flex;gap:7px;margin-bottom:6px;align-items:flex-start">
          <span style="font-size:11px;flex-shrink:0">${isHigh ? "⛔" : "⚠️"}</span>
          <span style="font-size:11px;color:rgba(255,255,255,.8);line-height:1.5">${w}</span>
        </div>`).join("")}
      <div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:4px">
        Run a full scan for detailed findings and Q&A.
        ${cd.last_scanned_at ? ` Last: ${new Date(cd.last_scanned_at).toLocaleDateString()}` : ""}
      </div>
    </div>
  `;
}

// ── Threats tab ───────────────────────────────────────────────────────────────

function buildThreatsTab(): string {
  const a = state.analysis;
  const level = a.overall_threat_level;
  return `
    <div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
        border-radius:10px;padding:13px;display:flex;gap:13px;align-items:flex-start;margin-bottom:13px">
        ${buildScoreRing(a.threat_score, level)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;flex-wrap:wrap">
            ${badge(level)}
            <span style="font-size:11px;color:rgba(255,255,255,.3)">${a.file_count} files</span>
            ${a.scan_count > 1 ? `<span style="font-size:10px;color:rgba(255,255,255,.25);
              background:rgba(255,255,255,.06);padding:1px 6px;border-radius:4px">${a.scan_count}× scanned</span>` : ""}
          </div>
          <p style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.55;margin-bottom:8px">${a.analysis_summary}</p>
          <div style="font-size:11px;font-weight:700;color:${a.safe_to_download ? "#00d084" : "#e03040"}">
            ${a.safe_to_download ? "✅ Relatively safe to download" : "⛔ Exercise caution before installing"}
          </div>
        </div>
      </div>

      ${a.threats.length === 0
        ? `<div style="text-align:center;padding:24px;color:rgba(255,255,255,.25);font-size:12px">✅ No threats detected</div>`
        : `<div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.5px;font-weight:600;margin-bottom:8px">
            ${a.threats.length} FINDINGS — CLICK TO EXPAND
           </div>
           ${a.threats.map((t: any, i: number) => buildThreatCard(t, i)).join("")}`
      }
    </div>
  `;
}

function buildScoreRing(score: number, level: string): string {
  const r = 30, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = LEVEL_COLOR[level] ?? "#888";
  return `
    <div style="position:relative;width:80px;height:80px;flex-shrink:0">
      <svg width="80" height="80" style="transform:rotate(-90deg)">
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="7"/>
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="7"
          stroke-dasharray="${fill} ${circ}" stroke-linecap="round"
          style="transition:stroke-dasharray 1s ease"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center">
        <span style="font-size:17px;font-weight:800;color:${color};font-family:monospace">${score}</span>
        <span style="font-size:8px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px">risk</span>
      </div>
    </div>
  `;
}

function buildThreatCard(t: any, i: number): string {
  const open  = state.expandedThreats.has(i);
  const color = LEVEL_COLOR[t.level] ?? "#888";
  const bg    = LEVEL_BG[t.level]    ?? "rgba(255,255,255,.05)";
  return `
    <div class="sp-card" data-threat-idx="${i}" style="
      background:${bg};border:1px solid ${color}33;margin-bottom:7px;
    ">
      <div style="display:flex;justify-content:space-between;gap:7px;align-items:flex-start">
        <div style="display:flex;gap:7px;align-items:center;flex:1;min-width:0">
          <span style="font-size:13px;flex-shrink:0">${CAT_ICON[t.category] ?? "⚠️"}</span>
          <span style="font-size:11px;font-weight:600;color:#f0f0f0;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
        </div>
        ${badge(t.level)}
      </div>
      ${t.file_path ? `
        <div style="font-size:10px;color:rgba(255,255,255,.3);margin-top:4px;
          font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${t.file_path}${t.line_number ? `:${t.line_number}` : ""}
        </div>` : ""}
      ${open ? `
        <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px">
          <p style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:6px;line-height:1.5">${t.description}</p>
          ${t.code_snippet ? `
            <pre style="font-size:10px;background:rgba(0,0,0,.4);padding:6px 8px;border-radius:4px;
              overflow:auto;margin-bottom:6px;color:#a8d8a8;font-family:monospace;max-height:70px">${t.code_snippet}</pre>` : ""}
          <div style="font-size:10px;color:#f0c040;display:flex;gap:5px;align-items:flex-start">
            <span>💡</span><span style="line-height:1.4">${t.recommendation}</span>
          </div>
        </div>` : ""}
    </div>
  `;
}

// ── Data tab ──────────────────────────────────────────────────────────────────

function buildDataTab(): string {
  const a = state.analysis;
  return `
    <div>
      <div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.5px;
        font-weight:600;margin-bottom:11px">
        ${a.data_collection.length} DATA COLLECTION PATTERNS
      </div>
      ${a.data_collection.length === 0
        ? `<div style="text-align:center;padding:24px;color:rgba(255,255,255,.25);font-size:12px">✅ None found</div>`
        : a.data_collection.map((d: any, i: number) => buildDataCard(d, i)).join("")
      }
    </div>
  `;
}

function buildDataCard(d: any, i: number): string {
  const open  = state.expandedData.has(i);
  const color = LEVEL_COLOR[d.severity] ?? "#888";
  const bg    = LEVEL_BG[d.severity]    ?? "rgba(255,255,255,.05)";
  return `
    <div class="sp-card" data-data-idx="${i}" style="background:${bg};border:1px solid ${color}33">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;font-weight:600;color:#f0f0f0">👁 ${d.type}</span>
        ${badge(d.severity)}
      </div>
      <p style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;line-height:1.4">${d.description}</p>
      ${open ? `
        <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px">
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
            ${d.data_types.map((dt: string) => `
              <span style="font-size:10px;background:rgba(255,255,255,.07);
                padding:2px 6px;border-radius:4px;color:#d0d0d0">${dt}</span>`).join("")}
          </div>
          <div style="font-size:10px;color:${d.opt_out_available ? "#00d084" : "#e03040"};margin-bottom:6px">
            ${d.opt_out_available ? "✅ Opt-out available" : "❌ No opt-out found"}
          </div>
          ${d.files_involved.slice(0,3).map((f: string) => `
            <div style="font-size:10px;font-family:monospace;color:rgba(255,255,255,.3);
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${f}</div>`).join("")}
        </div>` : ""}
    </div>
  `;
}

// ── Chat tab ──────────────────────────────────────────────────────────────────

function buildChatTab(): string {
  const msgs = state.chatMessages;
  return `
    <div style="display:flex;flex-direction:column;height:380px">
      <div id="sp-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:4px">
        ${msgs.map(m => buildChatMsg(m)).join("")}
        ${state.chatLoading ? `
          <div style="display:flex;gap:5px;align-items:center;padding:4px 0">
            ${[0,1,2].map(i => `<div style="width:6px;height:6px;border-radius:50%;
              background:rgba(99,102,241,.6);animation:sp-pulse 1s ${i*.2}s infinite"></div>`).join("")}
            <span style="font-size:10px;color:rgba(255,255,255,.25);margin-left:4px">Searching…</span>
          </div>` : ""}
      </div>
      <div style="margin-top:8px;display:flex;gap:7px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0">
        <input class="sp-input" id="sp-chat-input" placeholder="Ask about this repository…"
          value="${state.chatInput.replace(/"/g, '&quot;')}"
          ${state.chatLoading || !state.analysis?.indexed_for_qa ? "disabled" : ""}
          style="flex:1;font-size:12px"/>
        <button id="sp-chat-send" class="sp-btn sp-btn-primary"
          style="width:auto;padding:8px 14px;font-size:15px"
          ${state.chatLoading || !state.chatInput.trim() || !state.analysis?.indexed_for_qa ? "disabled" : ""}>↑</button>
      </div>
      ${!state.analysis?.indexed_for_qa ? `
        <p style="font-size:10px;color:#f08040;margin-top:5px;text-align:center">
          ⚠️ Q&A unavailable — Qdrant indexing failed
        </p>` : ""}
    </div>
  `;
}

function buildChatMsg(m: any): string {
  const isUser = m.role === "user";
  return `
    <div style="display:flex;flex-direction:column;align-items:${isUser ? "flex-end" : "flex-start"}">
      <div style="
        max-width:90%;padding:8px 11px;font-size:11px;color:#e8e8e8;line-height:1.55;
        border-radius:${isUser ? "11px 11px 2px 11px" : "11px 11px 11px 2px"};
        background:${isUser ? "rgba(99,102,241,.22)" : m.isAuto ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)"};
        border:1px solid ${isUser ? "rgba(99,102,241,.4)" : m.isAuto ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.1)"};
      ">${m.content}</div>
      ${m.sources?.length ? `
        <div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap;max-width:90%">
          ${m.sources.map((s: any) => `
            <span style="font-size:9px;background:rgba(99,102,241,.14);
              border:1px solid rgba(99,102,241,.3);border-radius:4px;
              padding:1px 5px;color:rgba(165,180,252,.85);font-family:monospace">
              📄 ${s.file_path.split("/").pop()}
            </span>`).join("")}
        </div>` : ""}
    </div>
  `;
}

// ── Events ────────────────────────────────────────────────────────────────────

function attachEvents() {
  // Close button
  document.getElementById("sp-close")?.addEventListener("click", closePanel);

  // Tab buttons
  document.querySelectorAll(".sp-tab-btn[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.tab = (btn as HTMLElement).dataset.tab as any;
      render();
    });
  });

  // Token toggle
  document.getElementById("sp-toggle-token")?.addEventListener("click", () => {
    const input = document.getElementById("sp-token") as HTMLInputElement;
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    (document.getElementById("sp-toggle-token") as HTMLElement).textContent =
      input.type === "password" ? "show" : "hide";
  });

  // Token input — sync to state
  document.getElementById("sp-token")?.addEventListener("input", e => {
    state.githubToken = (e.target as HTMLInputElement).value;
  });

  // Scan button
  document.getElementById("sp-scan-btn")?.addEventListener("click", runScan);

  // Threat cards expand/collapse
  document.querySelectorAll("[data-threat-idx]").forEach(el => {
    el.addEventListener("click", () => {
      const i = parseInt((el as HTMLElement).dataset.threatIdx!);
      state.expandedThreats.has(i) ? state.expandedThreats.delete(i) : state.expandedThreats.add(i);
      render();
      // Restore scroll position
      const content = document.getElementById("sp-content");
      if (content) content.scrollTop = content.scrollTop;
    });
  });

  // Data cards expand/collapse
  document.querySelectorAll("[data-data-idx]").forEach(el => {
    el.addEventListener("click", () => {
      const i = parseInt((el as HTMLElement).dataset.dataIdx!);
      state.expandedData.has(i) ? state.expandedData.delete(i) : state.expandedData.add(i);
      render();
    });
  });

  // Chat input
  const chatInput = document.getElementById("sp-chat-input") as HTMLInputElement;
  chatInput?.addEventListener("input", e => {
    state.chatInput = (e.target as HTMLInputElement).value;
    const sendBtn = document.getElementById("sp-chat-send") as HTMLButtonElement;
    if (sendBtn) sendBtn.disabled = !state.chatInput.trim() || state.chatLoading;
  });
  chatInput?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });

  // Chat send
  document.getElementById("sp-chat-send")?.addEventListener("click", sendChat);

  // Scroll chat to bottom
  const chatMsgs = document.getElementById("sp-chat-messages");
  if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function runScan() {
  state.scanning = true;
  state.error    = null;
  render();

  try {
    const data = await apiFetch("/analysis/analyze", {
      method: "POST",
      body:   JSON.stringify({
        repo_url:     repoUrl(),
        github_token: state.githubToken || undefined,
      }),
    });

    state.analysis = data;
    state.tab      = "chat";   // jump to chat which has auto-warnings

    // Pre-populate chat with auto-warnings
    state.chatMessages = [];
    if (data.auto_warnings?.length > 0) {
      state.chatMessages.push({
        role:    "assistant",
        content: `I've analysed **${data.repo_name}** (${data.file_count} files · threat score **${data.threat_score}/100**). Here are the key concerns:`,
        isAuto:  true,
      });
      data.auto_warnings.forEach((w: string) => {
        state.chatMessages.push({ role: "assistant", content: w, isAuto: true });
      });
      state.chatMessages.push({
        role:    "assistant",
        content: "You can ask me anything about this repository — I'll answer only from the actual code.",
        isAuto:  true,
      });
    } else {
      state.chatMessages.push({
        role:    "assistant",
        content: `✅ No significant threats found in **${data.repo_name}**. Ask me anything about the codebase.`,
        isAuto:  true,
      });
    }

  } catch (e: any) {
    state.error = e.message ?? "Scan failed";
    state.tab   = "scan";
  } finally {
    state.scanning = false;
    render();
  }
}

async function sendChat() {
  const q = state.chatInput.trim();
  if (!q || state.chatLoading || !state.analysis) return;

  state.chatMessages.push({ role: "user", content: q });
  state.chatInput  = "";
  state.chatLoading = true;
  render();

  try {
    const data = await apiFetch("/chat/ask", {
      method: "POST",
      body:   JSON.stringify({
        repo_id:  state.analysis.repo_id,
        question: q,
        conversation_history: state.chatMessages
          .filter(m => !m.isAuto)
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content })),
      }),
    });

    state.chatMessages.push({
      role:    "assistant",
      content: data.answer,
      sources: data.sources,
    });
  } catch (e: any) {
    state.chatMessages.push({
      role:    "assistant",
      content: `❌ ${e.message ?? "Request failed"}`,
    });
  } finally {
    state.chatLoading = false;
    render();
  }
}

// ── Community check on open ───────────────────────────────────────────────────

async function runCommunityCheck() {
  state.checking = true;
  render();
  try {
    const data = await apiFetch(
      `/analysis/check?repo_url=${encodeURIComponent(repoUrl())}`
    );
    state.communityData = data;
  } catch {
    state.communityData = null;
  } finally {
    state.checking = false;
    render();
  }
}

// ── Panel lifecycle ───────────────────────────────────────────────────────────

// function openPanel(anchor: Element) {
//   if (document.getElementById(PANEL_ID)) {
//     closePanel();
//     return;
//   }

//   // Reset per-open state
//   state.tab             = "scan";
//   state.error           = null;
//   state.expandedThreats = new Set();
//   state.expandedData    = new Set();
//   // Keep analysis if same repo
//   if (state.analysis && state.analysis.repo_url !== repoUrl()) {
//     state.analysis      = null;
//     state.communityData = null;
//     state.chatMessages  = [];
//   }

//   const panel = document.createElement("div");
//   panel.id    = PANEL_ID;
//   Object.assign(panel.style, {
//     position:    "absolute",
//     zIndex:      "999999",
//     width:       "420px",
//     borderRadius:"10px",
//     overflow:    "hidden",
//     boxShadow:   "0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)",
//     animation:   "sp-fadein .15s ease",
//   });

//   // Position below the button
//   const rect = anchor.getBoundingClientRect();
//   panel.style.top  = `${rect.bottom + window.scrollY + 6}px`;
//   panel.style.left = `${rect.left   + window.scrollX}px`;

//   document.body.appendChild(panel);
//   render();

//   // Close when clicking outside
//   setTimeout(() => {
//     document.addEventListener("click", outsideClick);
//   }, 50);

//   // Community check
//   runCommunityCheck();
// }

// function closePanel() {
//   document.getElementById(PANEL_ID)?.remove();
//   document.removeEventListener("click", outsideClick);
// }

// ── Panel lifecycle ───────────────────────────────────────────────────────────

function openPanel(anchor: Element) {
  if (document.getElementById(PANEL_ID)) {
    closePanel();
    return;
  }

  // Reset per-open state
  state.tab             = "scan";
  state.error           = null;
  state.expandedThreats = new Set();
  state.expandedData    = new Set();

  // Keep analysis if same repo
  if (state.analysis && state.analysis.repo_url !== repoUrl()) {
    state.analysis      = null;
    state.communityData = null;
    state.chatMessages  = [];
  }

  const panel = document.createElement("div");
  panel.id    = PANEL_ID;

  Object.assign(panel.style, {
    position:     "absolute",
    zIndex:       "999999",
    width:        "420px",
    borderRadius: "10px",
    overflow:     "hidden",
    boxShadow:    "0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)",
    animation:    "sp-fadein .15s ease",
  });

  // Position below the button
  const rect = anchor.getBoundingClientRect();

  panel.style.top  = `${rect.bottom + window.scrollY + 6}px`;
  panel.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(panel);

  // ⭐ CHANGE 1:
  // Prevent clicks INSIDE panel from bubbling to document
  // This stops outsideClick() from firing when switching tabs
  panel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  render();

  // ⭐ CHANGE 2:
  // Use mousedown instead of click
  // mousedown fires BEFORE DOM re-rendering happens
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClick);
  }, 50);

  // Community check
  runCommunityCheck();
}

function closePanel() {
  document.getElementById(PANEL_ID)?.remove();

  // ⭐ CHANGE 3:
  // remove mousedown listener instead of click
  document.removeEventListener("mousedown", outsideClick);
}

function outsideClick(e: MouseEvent) {
  const panel = document.getElementById(PANEL_ID);
  const btnEl = document.getElementById(BUTTON_ID);

  if (!panel) return;

  // If click is NOT inside panel
  // AND NOT inside scan button
  // => close panel
  if (
    !panel.contains(e.target as Node) &&
    !btnEl?.contains(e.target as Node)
  ) {
    closePanel();
  }
}

// function outsideClick(e: MouseEvent) {
//   const panel  = document.getElementById(PANEL_ID);
//   const btnEl  = document.getElementById(BUTTON_ID);
//   if (!panel) return;
//   if (!panel.contains(e.target as Node) && !btnEl?.contains(e.target as Node)) {
//     closePanel();
//   }
// }

// ── Button injection ──────────────────────────────────────────────────────────

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isRepoPage()) return;

  const anchor =
    document.querySelector("ul.pagehead-actions") ??
    document.querySelector('[data-pjax="#repo-content-pjax-container"]') ??
    document.querySelector(".repository-content") ??
    document.querySelector("#repository-container-header");

  if (!anchor) return;

  const wrapper = document.createElement("li");
  wrapper.id    = BUTTON_ID;
  wrapper.style.cssText = "position:relative;list-style:none;display:inline-block";

  const btn = document.createElement("button");
  btn.textContent = "🛡 Scan with Sentinel";
  Object.assign(btn.style, {
    display:     "inline-flex",
    alignItems:  "center",
    gap:         "6px",
    padding:     "4px 12px",
    borderRadius:"6px",
    background:  "#161b22",
    border:      "1px solid #30363d",
    color:       "#8b949e",
    fontSize:    "12px",
    cursor:      "pointer",
    fontFamily:  "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    transition:  "all .15s",
    whiteSpace:  "nowrap",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.borderColor = "#6366f1";
    btn.style.color       = "#a5b4fc";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.borderColor = "#30363d";
    btn.style.color       = "#8b949e";
  });
  btn.addEventListener("click", e => {
    e.stopPropagation();
    openPanel(wrapper);
  });

  wrapper.appendChild(btn);
  anchor.insertAdjacentElement("afterbegin", wrapper);
}

// Initial injection
setTimeout(injectButton, 800);

// Re-inject on GitHub pjax navigation
const observer = new MutationObserver(() => {
  if (!isRepoPage()) {
    document.getElementById(BUTTON_ID)?.remove();
    closePanel();
    return;
  }
  injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
