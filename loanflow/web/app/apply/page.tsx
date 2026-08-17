"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApplication } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { PROPERTY_TYPES } from "@/lib/types";

export default function ApplyPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const borrowerName = String(form.get("borrowerName") ?? "").trim();
    const borrowerEmail = String(form.get("borrowerEmail") ?? "").trim();
    const loanAmount = Number(form.get("loanAmount"));
    const annualIncome = Number(form.get("annualIncome"));
    const propertyType = String(form.get("propertyType") ?? "");

    if (!borrowerName || !borrowerEmail) {
      setError("Borrower name and email are required");
      return;
    }
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      setError("Loan amount must be greater than 0");
      return;
    }
    if (!Number.isFinite(annualIncome) || annualIncome <= 0) {
      setError("Income must be greater than 0");
      return;
    }
    if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) {
      setError("Select a valid property type");
      return;
    }

    setPending(true);
    try {
      const app = await createApplication({
        borrowerName,
        borrowerEmail,
        loanAmount,
        propertyType,
        annualIncome,
      });
      router.push(`/apply/${app.id}/documents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create application");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Apply for a loan</h1>
      <p className="mt-1 text-sm text-slate-500">Step 1 of 2 — borrower details</p>
      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm font-medium">
          Borrower name
          <input
            name="borrowerName"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Borrower email
          <input
            name="borrowerEmail"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Loan amount
          <input
            name="loanAmount"
            type="number"
            min={1}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Annual income
          <input
            name="annualIncome"
            type="number"
            min={1}
            step="1"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Property type
          <select
            name="propertyType"
            required
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Continue to documents"}
        </button>
      </form>
    </div>
  );
}
