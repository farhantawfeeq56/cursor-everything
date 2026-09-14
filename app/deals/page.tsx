"use client";
import { useEffect, useState } from "react";
import { load, save, uid, type Deal } from "@/lib/crm";

const input = "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";
const stages: Deal["stage"][] = ["Lead", "Qualified", "Won", "Lost"];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState({ title: "", value: "", contact: "" });
  useEffect(() => setDeals(load().deals), []);
  const update = (next: Deal[]) => {
    setDeals(next);
    save({ ...load(), deals: next });
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Deals</h1>
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
      <div className="grid gap-4 lg:grid-cols-4">
        {stages.map((s) => (
          <section key={s} className="rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
            <h2 className="mb-2 text-sm font-semibold">{s} ({deals.filter((d) => d.stage === s).length})</h2>
            <ul className="flex flex-col gap-2">
              {deals.filter((d) => d.stage === s).map((d) => (
                <li key={d.id} className="rounded border border-zinc-200 p-2 text-sm dark:border-zinc-700">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">${d.value.toLocaleString()} · {d.contact}</p>
                  <div className="mt-2 flex gap-1">
                    <select
                      className="rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      value={d.stage}
                      onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, stage: e.target.value as Deal["stage"] } : x)))}
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
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
