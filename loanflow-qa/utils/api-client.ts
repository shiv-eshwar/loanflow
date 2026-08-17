import fs from "fs";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { ApplicationPayload, UploadFile } from "../fixtures/application-factory";
import type { TestUser } from "../fixtures/test-users";
import { loginSchema } from "../schemas/application.schema";
import { assertSchema } from "./assert-schema";

export const API_BASE = process.env.API_BASE ?? "http://localhost:4000";

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export class LoanFlowApi {
  constructor(private readonly request: APIRequestContext) {}

  private url(path: string): string {
    return `${API_BASE}${path}`;
  }

  login(
    user: TestUser,
    overrides?: { email?: string; password?: string },
  ): Promise<APIResponse> {
    return this.request.post(this.url("/api/auth/login"), {
      data: {
        email: overrides?.email ?? user.email,
        password: overrides?.password ?? user.password,
      },
    });
  }

  async loginToken(user: TestUser): Promise<string> {
    const res = await this.login(user);
    if (!res.ok()) {
      throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    }
    return assertSchema(loginSchema, await res.json()).token;
  }

  createApplication(
    token: string | null,
    payload: ApplicationPayload,
  ): Promise<APIResponse> {
    return this.request.post(this.url("/api/applications"), {
      headers: token ? authHeaders(token) : undefined,
      data: payload,
    });
  }

  getApplication(token: string | null, id: string): Promise<APIResponse> {
    return this.request.get(this.url(`/api/applications/${id}`), {
      headers: token ? authHeaders(token) : undefined,
    });
  }

  listApplications(
    token: string | null,
    query?: { page?: number; pageSize?: number; status?: string },
  ): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return this.request.get(
      this.url(`/api/applications${qs ? `?${qs}` : ""}`),
      { headers: token ? authHeaders(token) : undefined },
    );
  }

  putStatus(
    token: string | null,
    id: string,
    status: string,
  ): Promise<APIResponse> {
    return this.request.put(this.url(`/api/applications/${id}/status`), {
      headers: token ? authHeaders(token) : undefined,
      data: { status },
    });
  }

  getStatus(token: string | null, id: string): Promise<APIResponse> {
    return this.request.get(this.url(`/api/applications/${id}/status`), {
      headers: token ? authHeaders(token) : undefined,
    });
  }

  uploadDocument(
    token: string | null,
    id: string,
    file: string | UploadFile,
  ): Promise<APIResponse> {
    const payload =
      typeof file === "string"
        ? {
            name: file.split("/").pop() ?? "file",
            mimeType: "application/pdf",
            buffer: fs.readFileSync(file),
          }
        : file;

    return this.request.post(this.url(`/api/applications/${id}/documents`), {
      headers: token ? authHeaders(token) : undefined,
      multipart: {
        file: {
          name: payload.name,
          mimeType: payload.mimeType,
          buffer: payload.buffer,
        },
      },
    });
  }

  uploadDocumentMissingFile(
    token: string | null,
    id: string,
  ): Promise<APIResponse> {
    return this.request.post(this.url(`/api/applications/${id}/documents`), {
      headers: token ? authHeaders(token) : undefined,
    });
  }
}
