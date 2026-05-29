const g="sentinel-scan-btn",c="sentinel-panel",_="http://localhost:8000/api/v1";function $(){return/^https:\/\/github\.com\/[^/]+\/[^/]+\/?(\?.*)?$/.test(location.href)}function u(){return location.href.replace(/\?.+$/,"").replace(/\/$/,"")}async function m(e,n){const a=await fetch(`${_}${e}`,{...n,headers:{"Content-Type":"application/json",...(n==null?void 0:n.headers)??{}}});if(!a.ok){const s=await a.json().catch(()=>({detail:"Request failed"}));throw new Error(s.detail??`HTTP ${a.status}`)}return a.json()}const p={safe:"#00d084",low:"#f0c040",medium:"#f08040",high:"#e03040",critical:"#c000e0"},x={safe:"rgba(0,208,132,0.12)",low:"rgba(240,192,64,0.12)",medium:"rgba(240,128,64,0.12)",high:"rgba(224,48,64,0.12)",critical:"rgba(192,0,224,0.12)"},E={malware:"☣️",data_collection:"👁",network_activity:"🌐",file_system:"📁",system_commands:"⚡",obfuscation:"🔒",crypto_mining:"⛏",backdoor:"🚪",supply_chain:"📦",permissions:"🔑"};function f(e){return`<span style="
    padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;
    letter-spacing:.8px;text-transform:uppercase;
    background:${x[e]};color:${p[e]};
    border:1px solid ${p[e]}33;white-space:nowrap;
  ">${e}</span>`}const t={tab:"scan",checking:!1,scanning:!1,communityData:null,analysis:null,error:null,chatMessages:[],chatInput:"",chatLoading:!1,expandedThreats:new Set,expandedData:new Set,githubToken:""};function l(){const e=document.getElementById(c);e&&(e.innerHTML=z(),R())}function z(){return`
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

      ${I()}
      ${T()}
      <div id="sp-content" style="padding:14px 16px;overflow-y:auto;max-height:420px;animation:sp-fadein .2s ease">
        ${S()}
      </div>
    </div>
  `}function I(){return`
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
  `}function T(){var a,s;const e=[{id:"scan",label:"Scan"},{id:"threats",label:`Threats${t.analysis?` (${((a=t.analysis.threats)==null?void 0:a.length)??0})`:""}`},{id:"data",label:`Data${t.analysis?` (${((s=t.analysis.data_collection)==null?void 0:s.length)??0})`:""}`},{id:"chat",label:"AI Chat"}],n=!t.analysis;return`
    <div style="display:flex;border-bottom:1px solid rgba(255,255,255,.07);padding:2px 20px;gap:30px;flex-shrink:0;color:white">
      ${e.map(o=>`
        <button class="sp-tab-btn ${t.tab===o.id?"active":""}"
          data-tab="${o.id}"
          ${n&&o.id!=="scan"?"disabled":""}
        >${o.label}</button>
      `).join("")}
    </div>
  `}function S(){switch(t.tab){case"scan":return L();case"threats":return t.analysis?A():"";case"data":return t.analysis?D():"";case"chat":return t.analysis?O():"";default:return""}}function L(){var a;const e=t.communityData,n=(e==null?void 0:e.found)&&((a=e==null?void 0:e.auto_warnings)==null?void 0:a.length)>0;return`
    <div style="display:flex;flex-direction:column;gap:13px">

      ${n?C(e):""}

      ${t.error?`
        <div style="background:rgba(224,48,64,.1);border:1px solid rgba(224,48,64,.3);
          border-radius:8px;padding:10px 13px;font-size:11px;color:#f08080">
          ❌ ${t.error}
        </div>`:""}

      <div>
        <div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.5px;margin-bottom:6px">
          REPOSITORY
          ${t.checking?'<span style="color:rgba(255,255,255,.25);margin-left:8px;font-size:9px">checking…</span>':""}
          ${!t.checking&&(e==null?void 0:e.found)===!0?`
            <span style="margin-left:8px;font-size:9px;color:${n?"#f08040":"#00d084"}">
              ${n?`⚠️ ${e.scan_count}× scanned, threats found`:`✅ ${e.scan_count}× scanned, clean`}
            </span>`:""}
          ${!t.checking&&(e==null?void 0:e.found)===!1?`
            <span style="margin-left:8px;font-size:9px;color:rgba(255,255,255,.2)">never scanned</span>`:""}
        </div>
        <input class="sp-input" id="sp-repo-url" value="${u()}" readonly
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
          placeholder="ghp_xxxxxxxxxxxx" value="${t.githubToken}"
          style="font-size:11px"/>
      </div>

      <button class="sp-btn sp-btn-primary" id="sp-scan-btn"
        ${t.scanning?"disabled":""}>
        ${t.scanning?'<span class="sp-spinner"></span> Scanning…':"Full Scan"}
      </button>

      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
        border-radius:8px;padding:11px 13px">
        <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.3);
          margin-bottom:7px;letter-spacing:.5px">WHAT WE SCAN</div>
        ${[["☣️","Malware, backdoors & reverse shells"],["👁","Data collection & telemetry"],["⚡","System command execution"],["📁","File system & credential access"],["📦","Supply chain & install scripts"],["⛏","Cryptocurrency mining code"],["🔒","Obfuscated / encoded payloads"]].map(([s,o])=>`
          <div style="display:flex;gap:7px;align-items:center;margin-bottom:5px">
            <span style="font-size:12px">${s}</span>
            <span style="font-size:11px;color:rgba(255,255,255,.4)">${o}</span>
          </div>`).join("")}
      </div>
    </div>
  `}function C(e){const n=e.overall_threat_level??"medium",a=["high","critical"].includes(n);return`
    <div style="
      background:${x[n]};
      border:1px solid ${p[n]}40;
      border-left:4px solid ${p[n]};
      border-radius:8px;padding:11px 13px;animation:sp-fadein .2s ease;
    ">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap">
        <span style="font-size:14px">🛡</span>
        <span style="font-size:10px;font-weight:700;color:${p[n]};
          letter-spacing:.5px;text-transform:uppercase">
          Community Intel${a?" — THREATS FOUND":""}
        </span>
        <span style="font-size:9px;color:rgba(255,255,255,.3);
          background:rgba(255,255,255,.06);padding:1px 7px;border-radius:4px">
          ${e.scan_count}× scanned
        </span>
        ${f(n)}
      </div>
      ${e.auto_warnings.map(s=>`
        <div style="display:flex;gap:7px;margin-bottom:6px;align-items:flex-start">
          <span style="font-size:11px;flex-shrink:0">${a?"⛔":"⚠️"}</span>
          <span style="font-size:11px;color:rgba(255,255,255,.8);line-height:1.5">${s}</span>
        </div>`).join("")}
      <div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:4px">
        Run a full scan for detailed findings and Q&A.
        ${e.last_scanned_at?` Last: ${new Date(e.last_scanned_at).toLocaleDateString()}`:""}
      </div>
    </div>
  `}function A(){const e=t.analysis,n=e.overall_threat_level;return`
    <div>
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
        border-radius:10px;padding:13px;display:flex;gap:13px;align-items:flex-start;margin-bottom:13px">
        ${B(e.threat_score,n)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;flex-wrap:wrap">
            ${f(n)}
            <span style="font-size:11px;color:rgba(255,255,255,.3)">${e.file_count} files</span>
            ${e.scan_count>1?`<span style="font-size:10px;color:rgba(255,255,255,.25);
              background:rgba(255,255,255,.06);padding:1px 6px;border-radius:4px">${e.scan_count}× scanned</span>`:""}
          </div>
          <p style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.55;margin-bottom:8px">${e.analysis_summary}</p>
          <div style="font-size:11px;font-weight:700;color:${e.safe_to_download?"#00d084":"#e03040"}">
            ${e.safe_to_download?"✅ Relatively safe to download":"⛔ Exercise caution before installing"}
          </div>
        </div>
      </div>

      ${e.threats.length===0?'<div style="text-align:center;padding:24px;color:rgba(255,255,255,.25);font-size:12px">✅ No threats detected</div>':`<div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.5px;font-weight:600;margin-bottom:8px">
            ${e.threats.length} FINDINGS — CLICK TO EXPAND
           </div>
           ${e.threats.map((a,s)=>j(a,s)).join("")}`}
    </div>
  `}function B(e,n){const s=2*Math.PI*30,o=e/100*s,d=p[n]??"#888";return`
    <div style="position:relative;width:80px;height:80px;flex-shrink:0">
      <svg width="80" height="80" style="transform:rotate(-90deg)">
        <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="7"/>
        <circle cx="40" cy="40" r="30" fill="none" stroke="${d}" stroke-width="7"
          stroke-dasharray="${o} ${s}" stroke-linecap="round"
          style="transition:stroke-dasharray 1s ease"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center">
        <span style="font-size:17px;font-weight:800;color:${d};font-family:monospace">${e}</span>
        <span style="font-size:8px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px">risk</span>
      </div>
    </div>
  `}function j(e,n){const a=t.expandedThreats.has(n),s=p[e.level]??"#888",o=x[e.level]??"rgba(255,255,255,.05)";return`
    <div class="sp-card" data-threat-idx="${n}" style="
      background:${o};border:1px solid ${s}33;margin-bottom:7px;
    ">
      <div style="display:flex;justify-content:space-between;gap:7px;align-items:flex-start">
        <div style="display:flex;gap:7px;align-items:center;flex:1;min-width:0">
          <span style="font-size:13px;flex-shrink:0">${E[e.category]??"⚠️"}</span>
          <span style="font-size:11px;font-weight:600;color:#f0f0f0;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</span>
        </div>
        ${f(e.level)}
      </div>
      ${e.file_path?`
        <div style="font-size:10px;color:rgba(255,255,255,.3);margin-top:4px;
          font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${e.file_path}${e.line_number?`:${e.line_number}`:""}
        </div>`:""}
      ${a?`
        <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px">
          <p style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:6px;line-height:1.5">${e.description}</p>
          ${e.code_snippet?`
            <pre style="font-size:10px;background:rgba(0,0,0,.4);padding:6px 8px;border-radius:4px;
              overflow:auto;margin-bottom:6px;color:#a8d8a8;font-family:monospace;max-height:70px">${e.code_snippet}</pre>`:""}
          <div style="font-size:10px;color:#f0c040;display:flex;gap:5px;align-items:flex-start">
            <span>💡</span><span style="line-height:1.4">${e.recommendation}</span>
          </div>
        </div>`:""}
    </div>
  `}function D(){const e=t.analysis;return`
    <div>
      <div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.5px;
        font-weight:600;margin-bottom:11px">
        ${e.data_collection.length} DATA COLLECTION PATTERNS
      </div>
      ${e.data_collection.length===0?'<div style="text-align:center;padding:24px;color:rgba(255,255,255,.25);font-size:12px">✅ None found</div>':e.data_collection.map((n,a)=>M(n,a)).join("")}
    </div>
  `}function M(e,n){const a=t.expandedData.has(n),s=p[e.severity]??"#888",o=x[e.severity]??"rgba(255,255,255,.05)";return`
    <div class="sp-card" data-data-idx="${n}" style="background:${o};border:1px solid ${s}33">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;font-weight:600;color:#f0f0f0">👁 ${e.type}</span>
        ${f(e.severity)}
      </div>
      <p style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;line-height:1.4">${e.description}</p>
      ${a?`
        <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px">
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
            ${e.data_types.map(d=>`
              <span style="font-size:10px;background:rgba(255,255,255,.07);
                padding:2px 6px;border-radius:4px;color:#d0d0d0">${d}</span>`).join("")}
          </div>
          <div style="font-size:10px;color:${e.opt_out_available?"#00d084":"#e03040"};margin-bottom:6px">
            ${e.opt_out_available?"✅ Opt-out available":"❌ No opt-out found"}
          </div>
          ${e.files_involved.slice(0,3).map(d=>`
            <div style="font-size:10px;font-family:monospace;color:rgba(255,255,255,.3);
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${d}</div>`).join("")}
        </div>`:""}
    </div>
  `}function O(){var n,a,s;return`
    <div style="display:flex;flex-direction:column;height:380px">
      <div id="sp-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:4px">
        ${t.chatMessages.map(o=>N(o)).join("")}
        ${t.chatLoading?`
          <div style="display:flex;gap:5px;align-items:center;padding:4px 0">
            ${[0,1,2].map(o=>`<div style="width:6px;height:6px;border-radius:50%;
              background:rgba(99,102,241,.6);animation:sp-pulse 1s ${o*.2}s infinite"></div>`).join("")}
            <span style="font-size:10px;color:rgba(255,255,255,.25);margin-left:4px">Searching…</span>
          </div>`:""}
      </div>
      <div style="margin-top:8px;display:flex;gap:7px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0">
        <input class="sp-input" id="sp-chat-input" placeholder="Ask about this repository…"
          value="${t.chatInput.replace(/"/g,"&quot;")}"
          ${t.chatLoading||!((n=t.analysis)!=null&&n.indexed_for_qa)?"disabled":""}
          style="flex:1;font-size:12px"/>
        <button id="sp-chat-send" class="sp-btn sp-btn-primary"
          style="width:auto;padding:8px 14px;font-size:15px"
          ${t.chatLoading||!t.chatInput.trim()||!((a=t.analysis)!=null&&a.indexed_for_qa)?"disabled":""}>↑</button>
      </div>
      ${(s=t.analysis)!=null&&s.indexed_for_qa?"":`
        <p style="font-size:10px;color:#f08040;margin-top:5px;text-align:center">
          ⚠️ Q&A unavailable — Qdrant indexing failed
        </p>`}
    </div>
  `}function N(e){var a;const n=e.role==="user";return`
    <div style="display:flex;flex-direction:column;align-items:${n?"flex-end":"flex-start"}">
      <div style="
        max-width:90%;padding:8px 11px;font-size:11px;color:#e8e8e8;line-height:1.55;
        border-radius:${n?"11px 11px 2px 11px":"11px 11px 11px 2px"};
        background:${n?"rgba(99,102,241,.22)":e.isAuto?"rgba(255,255,255,.04)":"rgba(255,255,255,.08)"};
        border:1px solid ${n?"rgba(99,102,241,.4)":e.isAuto?"rgba(255,255,255,.06)":"rgba(255,255,255,.1)"};
      ">${e.content}</div>
      ${(a=e.sources)!=null&&a.length?`
        <div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap;max-width:90%">
          ${e.sources.map(s=>`
            <span style="font-size:9px;background:rgba(99,102,241,.14);
              border:1px solid rgba(99,102,241,.3);border-radius:4px;
              padding:1px 5px;color:rgba(165,180,252,.85);font-family:monospace">
              📄 ${s.file_path.split("/").pop()}
            </span>`).join("")}
        </div>`:""}
    </div>
  `}function R(){var a,s,o,d,h;(a=document.getElementById("sp-close"))==null||a.addEventListener("click",b),document.querySelectorAll(".sp-tab-btn[data-tab]").forEach(i=>{i.addEventListener("click",()=>{t.tab=i.dataset.tab,l()})}),(s=document.getElementById("sp-toggle-token"))==null||s.addEventListener("click",()=>{const i=document.getElementById("sp-token");i&&(i.type=i.type==="password"?"text":"password",document.getElementById("sp-toggle-token").textContent=i.type==="password"?"show":"hide")}),(o=document.getElementById("sp-token"))==null||o.addEventListener("input",i=>{t.githubToken=i.target.value}),(d=document.getElementById("sp-scan-btn"))==null||d.addEventListener("click",q),document.querySelectorAll("[data-threat-idx]").forEach(i=>{i.addEventListener("click",()=>{const r=parseInt(i.dataset.threatIdx);t.expandedThreats.has(r)?t.expandedThreats.delete(r):t.expandedThreats.add(r),l();const y=document.getElementById("sp-content");y&&(y.scrollTop=y.scrollTop)})}),document.querySelectorAll("[data-data-idx]").forEach(i=>{i.addEventListener("click",()=>{const r=parseInt(i.dataset.dataIdx);t.expandedData.has(r)?t.expandedData.delete(r):t.expandedData.add(r),l()})});const e=document.getElementById("sp-chat-input");e==null||e.addEventListener("input",i=>{t.chatInput=i.target.value;const r=document.getElementById("sp-chat-send");r&&(r.disabled=!t.chatInput.trim()||t.chatLoading)}),e==null||e.addEventListener("keydown",i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),v())}),(h=document.getElementById("sp-chat-send"))==null||h.addEventListener("click",v);const n=document.getElementById("sp-chat-messages");n&&(n.scrollTop=n.scrollHeight)}async function q(){var e;t.scanning=!0,t.error=null,l();try{const n=await m("/analysis/analyze",{method:"POST",body:JSON.stringify({repo_url:u(),github_token:t.githubToken||void 0})});t.analysis=n,t.tab="chat",t.chatMessages=[],((e=n.auto_warnings)==null?void 0:e.length)>0?(t.chatMessages.push({role:"assistant",content:`I've analysed **${n.repo_name}** (${n.file_count} files · threat score **${n.threat_score}/100**). Here are the key concerns:`,isAuto:!0}),n.auto_warnings.forEach(a=>{t.chatMessages.push({role:"assistant",content:a,isAuto:!0})}),t.chatMessages.push({role:"assistant",content:"You can ask me anything about this repository — I'll answer only from the actual code.",isAuto:!0})):t.chatMessages.push({role:"assistant",content:`✅ No significant threats found in **${n.repo_name}**. Ask me anything about the codebase.`,isAuto:!0})}catch(n){t.error=n.message??"Scan failed",t.tab="scan"}finally{t.scanning=!1,l()}}async function v(){const e=t.chatInput.trim();if(!(!e||t.chatLoading||!t.analysis)){t.chatMessages.push({role:"user",content:e}),t.chatInput="",t.chatLoading=!0,l();try{const n=await m("/chat/ask",{method:"POST",body:JSON.stringify({repo_id:t.analysis.repo_id,question:e,conversation_history:t.chatMessages.filter(a=>!a.isAuto).slice(-6).map(a=>({role:a.role,content:a.content}))})});t.chatMessages.push({role:"assistant",content:n.answer,sources:n.sources})}catch(n){t.chatMessages.push({role:"assistant",content:`❌ ${n.message??"Request failed"}`})}finally{t.chatLoading=!1,l()}}}async function P(){t.checking=!0,l();try{const e=await m(`/analysis/check?repo_url=${encodeURIComponent(u())}`);t.communityData=e}catch{t.communityData=null}finally{t.checking=!1,l()}}function H(e){if(document.getElementById(c)){b();return}t.tab="scan",t.error=null,t.expandedThreats=new Set,t.expandedData=new Set,t.analysis&&t.analysis.repo_url!==u()&&(t.analysis=null,t.communityData=null,t.chatMessages=[]);const n=document.createElement("div");n.id=c,Object.assign(n.style,{position:"absolute",zIndex:"999999",width:"420px",borderRadius:"10px",overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)",animation:"sp-fadein .15s ease"});const a=e.getBoundingClientRect();n.style.top=`${a.bottom+window.scrollY+6}px`,n.style.left=`${a.left+window.scrollX}px`,document.body.appendChild(n),n.addEventListener("click",s=>{s.stopPropagation()}),l(),setTimeout(()=>{document.addEventListener("mousedown",w)},50),P()}function b(){var e;(e=document.getElementById(c))==null||e.remove(),document.removeEventListener("mousedown",w)}function w(e){const n=document.getElementById(c),a=document.getElementById(g);n&&!n.contains(e.target)&&!(a!=null&&a.contains(e.target))&&b()}function k(){if(document.getElementById(g)||!$())return;const e=document.querySelector("ul.pagehead-actions")??document.querySelector('[data-pjax="#repo-content-pjax-container"]')??document.querySelector(".repository-content")??document.querySelector("#repository-container-header");if(!e)return;const n=document.createElement("li");n.id=g,n.style.cssText="position:relative;list-style:none;display:inline-block";const a=document.createElement("button");a.textContent="🛡 Scan with Sentinel",Object.assign(a.style,{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 12px",borderRadius:"6px",background:"#161b22",border:"1px solid #30363d",color:"#8b949e",fontSize:"12px",cursor:"pointer",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",transition:"all .15s",whiteSpace:"nowrap"}),a.addEventListener("mouseenter",()=>{a.style.borderColor="#6366f1",a.style.color="#a5b4fc"}),a.addEventListener("mouseleave",()=>{a.style.borderColor="#30363d",a.style.color="#8b949e"}),a.addEventListener("click",s=>{s.stopPropagation(),H(n)}),n.appendChild(a),e.insertAdjacentElement("afterbegin",n)}setTimeout(k,800);const U=new MutationObserver(()=>{var e;if(!$()){(e=document.getElementById(g))==null||e.remove(),b();return}k()});U.observe(document.body,{childList:!0,subtree:!0});
