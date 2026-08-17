"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { listApplications } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { STATUSES, type Application, type ApplicationStatus } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Application[]>([]);
  const [status, setStatus] = useState<"" | ApplicationStatus>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    listApplications(status || undefined)
      .then((data) => setItems(data.items))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [router, status]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Link
          href="/apply"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          New application
        </Link>
      </div>

      <label className="mt-6 block text-sm font-medium">
        Filter by status
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ApplicationStatus)}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Borrower</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={3}>
                  No applications
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link className="hover:underline" href={`/applications/${item.id}`}>
                      {item.borrowerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">${item.loanAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
