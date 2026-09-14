"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { load, type Crm } from "@/lib/crm";

export default function Dashboard() {
  const [crm, setCrm] = useState<Crm | null>(null);
  const [palOpen, setPalOpen] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const cmds = ["Where are my contacts?", "Where are my deals?", "Where are my tasks?", "What is my pipeline worth?", "What can you do?"];
  const [spot, setSpot] = useState<string | null>(null);
  const palRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!spot) { setCursor(null); return; }
    const el = document.querySelector(`[data-spot="${spot}"]`);
    const pal = palRef.current?.getBoundingClientRect();
    const start = pal ? { x: pal.left + pal.width / 2, y: pal.top + pal.height / 2 } : { x: innerWidth / 2, y: innerHeight / 3 };
    setCursor(start);
    const t = setTimeout(() => {
      const r = el?.getBoundingClientRect();
      if (r) setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }, 50);
    return () => clearTimeout(t);
  }, [spot]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setPalOpen((v) => !v);
      }
      if (e.key === "Escape") setPalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const run = (label: string) => {
    setMsgs((m) => [...m, label]);
    const q = label.toLowerCase();
    setSpot(q.includes("contact") ? "Contacts" : q.includes("deal") ? "Open deals" : q.includes("task") ? "Tasks due" : q.includes("pipeline") || q.includes("worth") ? "Pipeline $" : null);
    setTimeout(() => setPalOpen(false), 300);
  };
  useEffect(() => setCrm(load()), []);
  const stats = useMemo(() => {
    if (!crm) return null;
    const pipeline = crm.deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
    return [
      ["Contacts", crm.contacts.length, "/contacts"],
      ["Open deals", crm.deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length, "/deals"],
      ["Pipeline $", pipeline.toLocaleString(), "/deals"],
      ["Tasks due", crm.tasks.filter((t) => !t.done).length, "/tasks"],
    ] as const;
  }, [crm]);
  if (!crm || !stats) return <p>Loading…</p>;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, v, href]) => (
          <Link key={label} data-spot={label} href={href} onClick={() => setSpot(null)} className={`relative rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800 ${spot === label ? "animate-pulse ring-4 ring-yellow-400" : ""}`}>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-2xl font-bold">{v}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
          <h2 className="mb-2 font-semibold">Recent deals</h2>
          <ul className="divide-y text-sm">
            {crm.deals.slice(-5).reverse().map((d) => (
              <li key={d.id} className="flex justify-between py-2">
                <span>{d.title}</span>
                <span className="text-zinc-500 dark:text-zinc-400">${d.value.toLocaleString()} · {d.stage}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
          <h2 className="mb-2 font-semibold">Open tasks</h2>
          <ul className="divide-y text-sm">
            {crm.tasks.filter((t) => !t.done).map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>{t.title}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{t.due}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="text-xs text-zinc-500">Press Shift + C to ask</p>
      {cursor && spot && (
        <span className="pointer-events-none fixed z-50 transition-all duration-1000 ease-in-out" style={{ left: cursor.x, top: cursor.y }}>
          <svg width="28" height="28" viewBox="0 0 24 24" className="drop-shadow-lg"><path d="M6 3l14 8-6.5 1.5L10 19z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </span>
      )}
      {palOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-32" onClick={() => setPalOpen(false)}>
          <div ref={palRef} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; run(draft.trim()); setDraft(""); }}>
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setPalOpen(false)} placeholder="Type anything…" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {cmds.map((c) => (
                <button key={c} onClick={() => run(c)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{c}</button>
              ))}
            </div>
            {msgs.length > 0 && (
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
                {msgs.map((m, i) => (
                  <li key={i} className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
