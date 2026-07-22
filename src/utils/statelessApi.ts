import type {
  ApiResult,
  AuthInfo,
  DownloadTicketResult,
  FetchStartResult,
  ServerFile,
  SessionInfo,
} from "@/types/stateless";

function isServerFile(value: unknown): value is ServerFile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    typeof item.size === "number" &&
    typeof item.mtime === "number"
  );
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getSessionInfo(): Promise<SessionInfo> {
  const res = await fetch("/api/session/info", {
    signal: AbortSignal.timeout(3000),
  });
  const payload = await parseJson<SessionInfo>(res);
  if (!payload || !payload.session) {
    return { session: { exists: false, ttlSeconds: 0 } };
  }
  return payload;
}

export async function getAuthInfo(): Promise<AuthInfo> {
  const res = await fetch("/api/auth/me", {
    signal: AbortSignal.timeout(3000),
  });
  const payload = await parseJson<AuthInfo>(res);
  if (!payload || typeof payload.authenticated !== "boolean") {
    return { authenticated: false };
  }
  return payload;
}

export async function getServerFiles(): Promise<ServerFile[]> {
  const res = await fetch("/api/files", { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return [];

  const payload = await parseJson<unknown>(res);
  if (Array.isArray(payload)) return payload.filter(isServerFile);
  if (payload && typeof payload === "object") {
    const files = (payload as { files?: unknown }).files;
    if (Array.isArray(files)) return files.filter(isServerFile);
  }
  return [];
}

export async function uploadCsvToSession(
  files: File[],
): Promise<ApiResult & { files?: ServerFile[] }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch("/api/upload-csv", {
    method: "POST",
    body: formData,
  });
  const payload = await parseJson<ApiResult & { files?: ServerFile[] }>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "上传失败",
      code: payload?.code,
    };
  }

  const normalized = Array.isArray(payload?.files)
    ? payload?.files.filter(isServerFile)
    : [];
  return {
    status: "ok",
    files: normalized,
    message: payload?.message,
  };
}

export async function authByToken(
  token: string,
  appType: "app" | "web" = "app",
): Promise<ApiResult> {
  const res = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, appType }),
  });
  const payload = await parseJson<ApiResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "Token 认证失败",
      code: payload?.code,
    };
  }
  return { status: "ok", message: payload?.message };
}

export async function sendSmsCode(
  phone: string,
): Promise<ApiResult & { requiresManualSms?: boolean }> {
  const res = await fetch("/api/auth/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const payload = await parseJson<ApiResult & { requiresManualSms?: boolean }>(
    res,
  );
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "短信发送失败",
      code: payload?.code,
    };
  }
  return {
    status: "ok",
    message: payload?.message,
    requiresManualSms: payload?.requiresManualSms,
  };
}

export async function verifySmsCode(
  phone: string,
  code: string,
): Promise<ApiResult> {
  const res = await fetch("/api/auth/sms/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const payload = await parseJson<ApiResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "短信验证失败",
      code: payload?.code,
    };
  }
  return { status: "ok", message: payload?.message };
}

export async function authByPassword(
  username: string,
  password: string,
): Promise<ApiResult> {
  const res = await fetch("/api/auth/pwd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await parseJson<ApiResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "密码登录失败",
      code: payload?.code,
    };
  }
  return { status: "ok", message: payload?.message };
}

export async function startFetch(options: {
  detail?: boolean;
  noLease?: boolean;
  exportSplit?: boolean;
  leaseInPath?: string;
}): Promise<FetchStartResult> {
  const res = await fetch("/api/fetch/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  const payload = await parseJson<FetchStartResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "抓取失败",
      code: payload?.code,
    };
  }
  return {
    status: "ok",
    summary: payload?.summary,
    files: Array.isArray(payload?.files)
      ? payload.files.filter(isServerFile)
      : [],
  };
}

export async function createDownloadTicket(
  filename: string,
): Promise<DownloadTicketResult> {
  const res = await fetch("/api/download-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
  const payload = await parseJson<DownloadTicketResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "获取下载链接失败",
      code: payload?.code,
    };
  }
  return {
    status: "ok",
    ticket: payload?.ticket,
    downloadUrl: payload?.downloadUrl,
  };
}

export async function destroySession(): Promise<ApiResult> {
  const res = await fetch("/api/session/destroy", {
    method: "POST",
  });
  const payload = await parseJson<ApiResult>(res);
  if (!res.ok) {
    return {
      status: "error",
      message: payload?.message || "销毁会话失败",
      code: payload?.code,
    };
  }
  return { status: "ok", message: payload?.message };
}
