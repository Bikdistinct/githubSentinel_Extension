export type ThreatLevel = "safe" | "low" | "medium" | "high" | "critical";

export type ThreatCategory =
  | "malware" | "data_collection" | "network_activity" | "file_system"
  | "system_commands" | "obfuscation" | "crypto_mining" | "backdoor"
  | "supply_chain" | "permissions";

export interface ThreatFinding {
  category:       ThreatCategory;
  level:          ThreatLevel;
  title:          string;
  description:    string;
  file_path?:     string;
  line_number?:   number;
  code_snippet?:  string;
  recommendation: string;
}

export interface DataCollectionFinding {
  type:               string;
  description:        string;
  files_involved:     string[];
  data_types:         string[];
  opt_out_available:  boolean;
  severity:           ThreatLevel;
}

export interface RepoAnalysis {
  repo_id:              string;
  repo_url:             string;
  repo_name:            string;
  overall_threat_level: ThreatLevel;
  threat_score:         number;
  analysis_summary:     string;
  /** 3 AI-generated plain-English warnings pre-loaded in Chat tab */
  auto_warnings:        string[];
  threats:              ThreatFinding[];
  data_collection:      DataCollectionFinding[];
  safe_to_download:     boolean;
  indexed_for_qa:       boolean;
  analyzed_at:          string;
  file_count:           number;
  scan_count:           number;
  first_scanned_at?:    string;
  last_scanned_at?:     string;
  stats:                Record<string, unknown>;
}

export interface RepoCheckResult {
  repo_id:              string;
  repo_url:             string;
  repo_name:            string;
  /** false = never scanned by anyone */
  found:                boolean;
  overall_threat_level?: ThreatLevel;
  threat_score?:         number;
  /** empty if never scanned or no threats */
  auto_warnings:         string[];
  safe_to_download?:     boolean;
  scan_count:            number;
  last_scanned_at?:      string;
}

export interface ChatMessage {
  role:         "user" | "assistant";
  content:      string;
  sources?:     Array<{ file_path: string; score: number; snippet: string }>;
  confidence?:  number;
  timestamp?:   number;
  /** true = auto-generated on scan complete, not from user input */
  isAutoWarning?: boolean;
}

export interface AnalysisHistoryItem {
  repo_id:              string;
  repo_name:            string;
  repo_url:             string;
  overall_threat_level: ThreatLevel;
  threat_score:         number;
  auto_warnings:        string[];
  safe_to_download:     boolean;
  scan_count:           number;
  last_scanned_at:      string;
}

export type TabType = "scan" | "threats" | "data" | "chat" | "history";
