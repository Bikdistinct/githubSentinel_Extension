/**
 * content.ts
 *
 * Injected into every github.com tab.
 * Detects repo pages and adds a "🛡 Scan with Sentinel" button
 * near the repo header so developers can trigger a scan without
 * opening the extension popup manually.
 *
 * Uses MutationObserver so the button survives GitHub's pjax
 * client-side navigation (no full page reload between repos).
 */

const BUTTON_ID = "sentinel-scan-btn";

function isRepoPage(): boolean {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/?(\?.*)?$/.test(location.href);
}

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isRepoPage()) return;

  // Try several possible anchor points in GitHub's DOM
  const anchor =
    document.querySelector("ul.pagehead-actions") ??
    document.querySelector('[data-pjax="#repo-content-pjax-container"]') ??
    document.querySelector(".repository-content") ??
    document.querySelector("#repository-container-header");

  if (!anchor) return;

  const wrapper = document.createElement("li");
  wrapper.id = BUTTON_ID;

  const btn = document.createElement("button");
  btn.textContent = "🛡 Scan with Sentinel";
  Object.assign(btn.style, {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "6px",
    padding:        "4px 12px",
    borderRadius:   "6px",
    background:     "#161b22",
    border:         "1px solid #30363d",
    color:          "#8b949e",
    fontSize:       "12px",
    cursor:         "pointer",
    fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.borderColor = "#6366f1";
    btn.style.color       = "#a5b4fc";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.borderColor = "#30363d";
    btn.style.color       = "#8b949e";
  });
  btn.addEventListener("click", () => {
    // Store the current repo URL so the popup can read it
    chrome.runtime.sendMessage({ type: "OPEN_POPUP", url: location.href });
  });

  wrapper.appendChild(btn);
  anchor.insertAdjacentElement("afterbegin", wrapper);
}

// Initial injection (delayed slightly for dynamic GitHub rendering)
setTimeout(injectButton, 800);

// Re-inject on pjax navigation (GitHub doesn't do full page reloads)
const observer = new MutationObserver(() => {
  // Remove stale button if the URL changed away from a repo page
  if (!isRepoPage()) {
    document.getElementById(BUTTON_ID)?.remove();
    return;
  }
  injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
