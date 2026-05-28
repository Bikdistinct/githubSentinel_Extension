/**
 * background.ts  —  Chrome Extension Service Worker
 *
 * Responsibilities:
 *   1. Listen for OPEN_POPUP messages from the content script
 *      (when the user clicks "Scan with Sentinel" on a GitHub page)
 *      → store the repo URL in session storage so the popup reads it on open
 *
 *   2. Update the extension icon to an "active" variant on GitHub repo pages
 *      so developers know Sentinel is available.
 */

chrome.runtime.onMessage.addListener((message: { type: string; url?: string }) => {
  if (message.type === "OPEN_POPUP" && message.url) {
    // Store so popup can read on mount
    chrome.storage.session.set({ pendingUrl: message.url });
    // Open the popup programmatically (MV3 — requires activeTab permission)
    // chrome.action.openPopup?.();   // uncomment if you have that permission
  }
});

// Highlight the toolbar icon when on a GitHub repo page
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  const isGitHubRepo = /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(tab.url);

  // If you add active icon assets, swap them here:
  // chrome.action.setIcon({
  //   tabId: _tabId,
  //   path: { 16: isGitHubRepo ? "icons/icon16_active.png" : "icons/icon16.png" }
  // });

  chrome.action.setBadgeText({
    tabId: _tabId,
    text:  isGitHubRepo ? "●" : "",
  });
  chrome.action.setBadgeBackgroundColor({
    tabId: _tabId,
    color: "#6366f1",
  });
});
