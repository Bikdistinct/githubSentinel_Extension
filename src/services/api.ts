import type { RepoAnalysis, RepoCheckResult, ChatMessage, AnalysisHistoryItem } from "../types";

const API_BASE = "http://localhost:8000/api/v1";

/**
 * Community threat check.
 * Called automatically (debounced) when a GitHub URL is typed.
 * Returns instantly from MongoDB — warns the user BEFORE they click Scan.
 */
export async function checkRepoThreats(repoUrl: string): Promise<RepoCheckResult> {
  const res = await fetch(
    `${API_BASE}/analysis/check?repo_url=${encodeURIComponent(repoUrl)}`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) throw new Error(`Check failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * Full repository scan.
 * Fetches repo, runs security analysis, indexes into Qdrant,
 * generates AI summary + 3 auto_warnings, saves to MongoDB.
 */
export async function analyzeRepo(
  repoUrl: string,
  githubToken?: string,
): Promise<RepoAnalysis> {
  const res = await fetch(`${API_BASE}/analysis/analyze`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ repo_url: repoUrl, github_token: githubToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Ask a question about a scanned repo.
 * Auto-warning messages are filtered out of conversation history
 * so they don't pollute the LLM context.
 */
export async function askQuestion(
  repoId:   string,
  question: string,
  history:  ChatMessage[],
): Promise<{ answer: string; sources: ChatMessage["sources"]; confidence: number }> {
  const res = await fetch(`${API_BASE}/chat/ask`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      repo_id:              repoId,
      question,
      conversation_history: history
        .filter(m => !m.isAutoWarning)
        .map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getHistory(): Promise<AnalysisHistoryItem[]> {
  const res = await fetch(`${API_BASE}/analysis/history`);
  if (!res.ok) return [];
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
