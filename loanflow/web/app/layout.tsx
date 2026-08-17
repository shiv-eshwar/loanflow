import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata = {
  title: "LoanFlow",
  description: "Loan origination — test target",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
