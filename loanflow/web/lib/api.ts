import { authHeaders } from "./auth";
import type { Application, ApplicationList, StatusPayload } from "./types";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: string;
      details?: Record<string, string>;
    };
    if (body.details) {
      return Object.values(body.details).join(", ");
    }
    if (body.error) return body.error;
  } catch {
    // ignore non-JSON
  }
  return `Request failed (${res.status})`;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ token: string }>;
}

export async function createApplication(payload: {
  borrowerName: string;
  borrowerEmail: string;
  loanAmount: number;
  propertyType: string;
  annualIncome: number;
}): Promise<Application> {
  const res = await fetch("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Application>;
}

export async function listApplications(status?: string): Promise<ApplicationList> {
  const params = new URLSearchParams({ page: "1", pageSize: "50" });
  if (status) params.set("status", status);
  const res = await fetch(`/api/applications?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<ApplicationList>;
}

export async function getApplication(id: string): Promise<Application> {
  const res = await fetch(`/api/applications/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Application>;
}

export async function getStatus(id: string): Promise<StatusPayload> {
  const res = await fetch(`/api/applications/${id}/status`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<StatusPayload>;
}

export async function putStatus(
  id: string,
  status: string,
): Promise<Application> {
  const res = await fetch(`/api/applications/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Application>;
}

export async function uploadDocument(
  id: string,
  file: File,
): Promise<unknown> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`/api/applications/${id}/documents`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
