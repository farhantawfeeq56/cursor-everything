import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import AskPalette from "./ask-palette";
import Nav from "./nav";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = { title: "Mini CRM", description: "Deals, contacts and tasks with an AI guide" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.className} min-h-full bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100`}>
        <div className="flex min-h-screen">
          <aside className="flex w-52 shrink-0 flex-col bg-gradient-to-b from-zinc-950 via-zinc-900 to-indigo-950 p-4 text-white">
            <div className="mb-6 flex items-center gap-2.5 px-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-base font-bold shadow-sm">
                ◈
              </span>
              <div>
                <p className="text-base font-bold leading-tight">Mini CRM</p>
                <p className="text-[11px] leading-tight text-zinc-400">Find · Guide · Act</p>
              </div>
            </div>
            <Nav />
            <p className="mt-auto px-1 pt-6 text-[11px] text-zinc-500">Press Shift + A anywhere</p>
          </aside>
          <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
        </div>
        <AskPalette />
      </body>
    </html>
  );
}
