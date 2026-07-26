export interface ServerFile {
  name: string;
  size: number;
  mtime: number;
}

export interface SessionInfo {
  session: {
    exists: boolean;
    ttlSeconds: number;
  };
}

export interface AuthInfo {
  authenticated: boolean;
  nickname?: string;
  userId?: string;
  appType?: "app" | "web";
}

export interface ApiResult {
  status: "ok" | "error";
  message?: string;
  code?: number;
}

export interface FetchStartResult extends ApiResult {
  summary?: {
    sell: number;
    buy: number;
    lease: number;
  };
  files?: ServerFile[];
}

export interface DownloadTicketResult extends ApiResult {
  ticket?: string;
  downloadUrl?: string;
}
