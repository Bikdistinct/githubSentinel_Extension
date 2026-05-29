# Privacy Policy — GitHub Sentinel

**Last updated: May 2026**

GitHub Sentinel is a browser extension that scans GitHub repositories for
security threats. This policy explains what data is accessed, what is stored,
and what is sent externally.

---

## What data the extension accesses

**GitHub repository content**
When you scan a repository, the extension fetches publicly available source
files from the GitHub API. Only public repositories are accessed unless you
provide a personal access token, in which case your own private repositories
may be scanned at your explicit request.

**GitHub Personal Access Token (optional)**
If you enter a GitHub token, it is stored locally in your browser using
`chrome.storage.local`. It is never sent anywhere except to the GitHub API
to authenticate repository fetches. It is never stored on any server.

**Current tab URL**
The extension reads the URL of the active GitHub tab to pre-fill the
repository field. No browsing history is collected or stored.

---

## What data is sent externally

| Destination | What is sent | Why |
|-------------|-------------|-----|
| `github.com` | Repository URL, optional token | Fetch source files |
|  backend server (`https://githubsentinel.onrender.com` by default) | Repository URL | Run security analysis |
| `api.jina.ai` | Code chunks (text) | Generate embeddings for Q&A search |
| `api.groq.com` or `api.anthropic.com` | Code snippets, threat findings | Generate AI summaries and answers |

**Code chunks sent to Jina AI and the LLM provider (Groq/Anthropic) contain
only source code from the scanned repository — never your personal data,
credentials, or browser information.**

Hardcoded secrets found in scanned code are masked to `[REDACTED]` before
being sent to any AI provider.

---

## What data is stored

**On your machine (browser storage)**
- Your GitHub token (if provided) — stored in `chrome.storage.local`
- Nothing else is stored in the browser

**On your backend server**
- Scan results (threat findings, AI summaries, repository metadata) are
  stored in your own MongoDB Atlas instance that you configure and control
- Code embeddings (vector representations of scanned files) are stored in
  your own Qdrant Cloud instance that you configure and control

GitHub Sentinel does not operate any shared backend server. All storage
is in infrastructure you own and configure yourself.

---

## What data is NOT collected

- No personal information (name, email, location)
- No browsing history
- No usage analytics or telemetry
- No crash reports sent to the developer
- No advertising identifiers

---

## Third-party services

When you use GitHub Sentinel, your data may be processed by:

- **GitHub** ([privacy policy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement))
- **Jina AI** ([privacy policy](https://jina.ai/privacy-policy))
- **Anthropic** ([privacy policy](https://www.anthropic.com/privacy)) — if using Claude
- **Groq** ([privacy policy](https://groq.com/privacy-policy/)) — if using Groq
- **MongoDB** ([privacy policy](https://www.mongodb.com/legal/privacy-policy)) — your Atlas instance
- **Qdrant** ([privacy policy](https://qdrant.tech/legal/privacy-policy/)) — your Cloud instance

---

## Open source

GitHub Sentinel is fully open source. You can inspect exactly what data
is accessed and how it is used:

**[https://github.com/Bikdistinct/githubSentinel_Extension](https://github.com/Bikdistinct/githubSentinel_Extension)**

---

## Contact

If you have questions about this privacy policy, open an issue on the
GitHub repository above.
