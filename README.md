# GitHub Sentinel — Extension

React + TypeScript Chrome extension. Talks to the FastAPI backend at `localhost:8000`.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Manifest | Chrome MV3 |
| Storage | `chrome.storage.local` (GitHub token only) |
| API | `fetch()` → FastAPI backend |

---

## Prerequisites

- Node.js 18+
- Chrome 114+
- Backend running at `http://localhost:8000`

---

## Build & Load

```bash
cd extension
npm install
npm run build        # outputs to extension/dist/
```

**Load in Chrome:**
1. `chrome://extensions`
2. Enable **Developer Mode**
3. **Load unpacked** → select `extension/dist/`

**Rebuild after changes:**
```bash
npm run build
# then click ↺ refresh on the extension card in chrome://extensions
```

---

## Extension Tabs

### Scan
- Paste any GitHub URL
- The extension **automatically checks MongoDB** (debounced 600ms) for existing community threat data the moment you type — the `CommunityAlert` banner appears before you click anything
- Optional GitHub token (stored locally, improves rate limits)
- Click **Full Scan** for fresh analysis

### Threats
- Animated risk score ring (0–100)
- All findings colour-coded by severity
- Click any finding to expand: file path, line number, code snippet, recommendation

### Data Collection
- Lists data types the repo accesses (env vars, IP, email, clipboard, etc.)
- Shows which files are involved
- Flags whether opt-out exists

### AI Chat
- **Opens automatically after a scan** pre-populated with 3 AI-generated warnings
- No user input needed — the briefing is immediate
- Ask follow-up questions — answers sourced only from the repo's code via RAG
- Source file citations shown under each answer

### History
- Community scan history from MongoDB
- Tap any row to pre-fill the URL for a re-scan

---

## File Structure

```
extension/
├── index.html              Popup HTML shell
├── package.json
├── vite.config.ts          Multi-entry build (popup + content + background)
├── tsconfig.json
├── tsconfig.node.json
├── public/
│   └── manifest.json       Chrome MV3 manifest
└── src/
    ├── main.tsx            React entry point
    ├── App.tsx             Complete popup UI — all tabs and components
    ├── content.ts          Injects "Scan with Sentinel" button on GitHub
    ├── background.ts       Service worker — badge, message relay
    ├── types/
    │   └── index.ts        TypeScript interfaces
    └── services/
        └── api.ts          fetch() wrappers for all backend endpoints
```

---

## Changing the Backend URL

Edit `src/services/api.ts`:

```typescript
const API_BASE = "https://your-deployed-api.com/api/v1";
```

Then rebuild.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "OFFLINE" badge | Start backend: `uvicorn app.main:app --reload` |
| Community alert not showing | Backend must be running; check MONGODB_URI |
| Chat tab shows "Q&A unavailable" | Qdrant indexing failed — check QDRANT credentials |
| Scan button on GitHub not appearing | Refresh the GitHub page after loading the extension |
| HTTP 502 on scan | GitHub rate limit — add GITHUB_TOKEN to backend .env |
| Popup blank | Right-click extension icon → Inspect → check console errors |
