"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { getApplication, getStatus } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Application, ApplicationStatus } from "@/lib/types";

const TERMINAL: ApplicationStatus[] = ["approved", "rejected"];

export default function StatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [app, setApp] = useState<Application | null>(null);
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    getApplication(id)
      .then((loaded) => {
        if (cancelled) return;
        setApp(loaded);
        setStatus(loaded.status);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });

    const timer = window.setInterval(async () => {
      try {
        const payload = await getStatus(id);
        if (cancelled) return;
        setStatus(payload.status);
        if (TERMINAL.includes(payload.status)) {
          window.clearInterval(timer);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Status poll failed");
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, router]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Application status</h1>
      {app ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">{app.borrowerName}</p>
          <p className="mt-1 text-lg font-medium">
            ${app.loanAmount.toLocaleString()} · {app.propertyType.replace("_", " ")}
          </p>
          <div className="mt-4">
            {status ? <StatusBadge status={status} /> : null}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Status updates automatically. Underwriting may take a few seconds.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      )}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
