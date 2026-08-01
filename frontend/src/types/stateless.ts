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
  tokenMasked?: string;
  tokenRevealUsed?: boolean;
}

export interface ApiResult {
  status: "ok" | "error";
  message?: string;
  code?: number | string;
  detail?: string;
}

export interface FetchStartResult extends ApiResult {
  summary?: {
    sell: number;
    buy: number;
    lease: number;
  };
  files?: ServerFile[];
}

export interface FetchProgress {
  status: "idle" | "running" | "done" | "error";
  stage?: string;
  stageName?: string;
  page?: number;
  count?: number;
  message?: string;
  summary?: {
    sell: number;
    buy: number;
    lease: number;
  };
  files?: ServerFile[];
  updatedAt?: number;
}

export interface DownloadTicketResult extends ApiResult {
  ticket?: string;
  downloadUrl?: string;
}
