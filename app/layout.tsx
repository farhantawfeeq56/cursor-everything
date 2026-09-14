import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans } from "next/font/google";
import AskPalette from "./ask-palette";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = { title: "CRM", description: "Basic CRM" };

const nav = [
  ["Dashboard", "/"],
  ["Contacts", "/contacts"],
  ["Deals", "/deals"],
  ["Tasks", "/tasks"],
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.className} min-h-full bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}>
        <div className="flex min-h-screen">
          <aside className="w-48 shrink-0 bg-zinc-900 p-4 text-white">
            <p className="mb-6 text-lg font-bold">Mini CRM</p>
            <nav className="flex flex-col gap-1">
              {nav.map(([label, href]) => (
                <Link key={href + label} href={href} className="rounded px-3 py-2 text-sm hover:bg-zinc-700">
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
        <AskPalette />
      </body>
    </html>
  );
}
