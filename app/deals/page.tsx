"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, type Deal } from "@/lib/crm";

const input = "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";
const stages: Deal["stage"][] = ["Lead", "Qualified", "Won", "Lost"];
const nextStage = (s: Deal["stage"]): Deal["stage"] | null => s === "Lead" ? "Qualified" : s === "Qualified" ? "Won" : null;
const prevStage = (s: Deal["stage"]): Deal["stage"] | null => s === "Qualified" ? "Lead" : s === "Won" ? "Qualified" : null;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState({ title: "", value: "", contact: "" });
  const [q, setQ] = useState("");
  useEffect(() => setDeals(load().deals), []);
  const update = (next: Deal[]) => {
    setDeals(next);
    save({ ...load(), deals: next });
  };
  const move = (id: string, stage: Deal["stage"]) => update(deals.map((x) => (x.id === id ? { ...x, stage } : x)));
  const shown = useMemo(() => deals.filter((d) => `${d.title} ${d.contact}`.toLowerCase().includes(q.toLowerCase())), [deals, q]);
  const pipeline = deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
  const won = deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Deals</h1>
      <div data-spot="Pipeline $" className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">Pipeline ${pipeline.toLocaleString()}</span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">Won ${won.toLocaleString()}</span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">Open {deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length}</span>
      </div>
      <form
        className="grid grid-cols-2 gap-2 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-4 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          update([...deals, { id: uid("d"), title: form.title, value: Number(form.value) || 0, stage: "Lead", contact: form.contact }]);
          setForm({ title: "", value: "", contact: "" });
        }}
      >
        <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="Value $" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className={input} placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add deal</button>
      </form>
      <div className="flex gap-2">
        <input className={input} placeholder="Search deals…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-zinc-500">Tip: move cards Lead → Qualified → Won with ◀ ▶ buttons or the dropdown.</p>
      <div data-spot="Open deals" className="grid gap-4 lg:grid-cols-4">
        {stages.map((s) => {
          const cards = shown.filter((d) => d.stage === s).sort((a, b) => b.value - a.value);
          const total = cards.reduce((sum, d) => sum + d.value, 0);
          return (
            <section key={s} className="rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
              <h2 className="mb-2 text-sm font-semibold">{s} ({cards.length}) · ${total.toLocaleString()}</h2>
              <ul className="flex flex-col gap-2">
                {cards.map((d) => {
                  const nx = nextStage(d.stage);
                  const pv = prevStage(d.stage);
                  return (
                    <li key={d.id} className="rounded border border-zinc-200 p-2 text-sm dark:border-zinc-700">
                      <p className="font-medium">{d.title}</p>
                      <p className="text-zinc-500 dark:text-zinc-400">${d.value.toLocaleString()} · {d.contact}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {pv && <button title={`Back to ${pv}`} className="rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, pv)}>◀</button>}
                        {nx && <button title={`Advance to ${nx}`} className="rounded border px-1.5 py-0.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, nx)}>▶ {nx}</button>}
                        {d.stage === "Lead" && <button title="Mark lost" className="rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, "Lost")}>✕</button>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <select
                          className="rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                          value={d.stage}
                          onChange={(e) => move(d.id, e.target.value as Deal["stage"])}
                        >
                          {stages.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <button className="ml-auto text-xs text-red-600 hover:underline" onClick={() => update(deals.filter((x) => x.id !== d.id))}>
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">Press Shift + A to ask</p>
    </div>
  );
}
