"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApplication, putStatus, uploadDocument } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { DocumentRecord } from "@/lib/types";

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    getApplication(id)
      .then((app) => {
        setDocuments(app.documents ?? []);
        if (app.status !== "draft") {
          router.replace(`/applications/${id}`);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load application");
      });
  }, [id, router]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Choose a PDF or JPG file");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg"];
    if (!allowed.includes(file.type) && !/\.(pdf|jpe?g)$/i.test(file.name)) {
      setError("Only PDF and JPG files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be 5MB or smaller");
      return;
    }
    setPending(true);
    try {
      await uploadDocument(id, file);
      const app = await getApplication(id);
      setDocuments(app.documents ?? []);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit() {
    setError("");
    setPending(true);
    try {
      await putStatus(id, "submitted");
      router.push(`/applications/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Upload documents</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step 2 of 2 — PDF or JPG, 5MB max
      </p>

      <form
        onSubmit={onUpload}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm font-medium">
          File
          <input
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
            className="mt-1 block w-full text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Upload
        </button>
      </form>

      <ul className="mt-4 space-y-2 text-sm">
        {documents.map((doc) => (
          <li key={doc.id} className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
            {doc.filename} ({Math.round(doc.sizeBytes / 1024)} KB)
          </li>
        ))}
      </ul>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Submit application
      </button>
    </div>
  );
}
