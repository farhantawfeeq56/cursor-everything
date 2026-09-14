"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Dashboard", "/", "◧"],
  ["Contacts", "/contacts", "◉"],
  ["Deals", "/deals", "▤"],
  ["Tasks", "/tasks", "✓"],
  ["Settings", "/settings", "⚙"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(([label, href, glyph]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-indigo-600 font-medium text-white shadow-sm"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="w-4 text-center">{glyph}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
