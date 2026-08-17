"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, [pathname]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LoanFlow
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {authed ? (
            <>
              <Link className="text-slate-600 hover:text-slate-900" href="/dashboard">
                Dashboard
              </Link>
              <Link className="text-slate-600 hover:text-slate-900" href="/apply">
                Apply
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-slate-600 hover:text-slate-900"
              >
                Log out
              </button>
            </>
          ) : (
            <Link className="text-slate-600 hover:text-slate-900" href="/login">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
