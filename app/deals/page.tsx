"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, type Deal } from "@/lib/crm";

const input =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";
const stages: Deal["stage"][] = ["Lead", "Qualified", "Won", "Lost"];
const nextStage = (s: Deal["stage"]): Deal["stage"] | null =>
  s === "Lead" ? "Qualified" : s === "Qualified" ? "Won" : null;
const prevStage = (s: Deal["stage"]): Deal["stage"] | null =>
  s === "Qualified" ? "Lead" : s === "Won" ? "Qualified" : null;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState({ title: "", value: "", contact: "" });
  const [q, setQ] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [hidden, setHidden] = useState<Set<Deal["stage"]>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => setDeals(load().deals);
    reload();
    window.addEventListener("crm-changed", reload);
    return () => window.removeEventListener("crm-changed", reload);
  }, []);

  const update = (next: Deal[]) => {
    setDeals(next);
    save({ ...load(), deals: next });
  };

  const move = (id: string, stage: Deal["stage"]) =>
    update(deals.map((x) => (x.id === id ? { ...x, stage } : x)));

  const qualifyAll = () =>
    update(deals.map((d) => (d.stage === "Lead" ? { ...d, stage: "Qualified" as const } : d)));

  const advanceAll = () =>
    update(deals.map((d) => (d.stage === "Qualified" ? { ...d, stage: "Won" as const } : d)));

  const clearLost = () => update(deals.filter((d) => d.stage !== "Lost"));

  const toggleHidden = (s: Deal["stage"]) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const shown = useMemo(
    () =>
      deals.filter((d) =>
        `${d.title} ${d.contact} ${d.stage}`.toLowerCase().includes(q.toLowerCase())
      ),
    [deals, q]
  );

  const pipeline = deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
  const wonTotal = deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const openCount = deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length;
  const decided = deals.filter((d) => d.stage === "Won" || d.stage === "Lost").length;
  const winRate = decided ? Math.round((deals.filter((d) => d.stage === "Won").length / decided) * 100) : null;
  const avgDeal = deals.length ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;
  const leadCount = deals.filter((d) => d.stage === "Lead").length;
  const qualifiedCount = deals.filter((d) => d.stage === "Qualified").length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Deals</h1>

      <div data-spot="Pipeline $" className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          Pipeline ${pipeline.toLocaleString()}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          Won ${wonTotal.toLocaleString()}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          Open {openCount}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          Win rate {winRate === null ? "—" : `${winRate}%`}
        </span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          Avg ${avgDeal.toLocaleString()}
        </span>
      </div>

      <form
        data-spot="Add deal form"
        className="grid grid-cols-2 gap-2 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-4 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          update([
            ...deals,
            { id: uid("d"), title: form.title.trim(), value: Number(form.value) || 0, stage: "Lead", contact: form.contact.trim() },
          ]);
          setForm({ title: "", value: "", contact: "" });
        }}
      >
        <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="Value $" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className={input} placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add deal</button>
      </form>

      <div data-spot="Deal search" className="flex flex-wrap items-center gap-2">
        <input className={`${input} max-w-xs`} placeholder="Search deals…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="rounded-full border px-3 py-1 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Value {sortDesc ? "high → low" : "low → high"}
        </button>
        {q && (
          <button
            onClick={() => setQ("")}
            className="rounded-full border px-3 py-1 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Clear search ✕
          </button>
        )}
      </div>

      <div data-spot="Bulk actions" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-zinc-500">Bulk:</span>
        <button
          onClick={qualifyAll}
          disabled={!leadCount}
          className="rounded-full border px-3 py-1 hover:bg-white disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Qualify all Leads ({leadCount})
        </button>
        <button
          onClick={advanceAll}
          disabled={!qualifiedCount}
          className="rounded-full border px-3 py-1 hover:bg-white disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Advance Qualified → Won ({qualifiedCount})
        </button>
        <button
          onClick={clearLost}
          className="rounded-full border px-3 py-1 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Clear Lost
        </button>
        <span className="ml-2 text-xs text-zinc-500">Columns:</span>
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => toggleHidden(s)}
            className={`rounded-full border px-3 py-1 ${hidden.has(s) ? "opacity-40 line-through" : ""} hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900`}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        Tip: move cards Lead → Qualified → Won with the ◀ ▶ buttons or the dropdown. Click Edit to change title, value or contact.
      </p>

      <div data-spot="Open deals" className="grid gap-4 lg:grid-cols-4">
        {stages
          .filter((s) => !hidden.has(s))
          .map((s) => {
            const cards = shown
              .filter((d) => d.stage === s)
              .sort((a, b) => (sortDesc ? b.value - a.value : a.value - b.value));
            const total = cards.reduce((sum, d) => sum + d.value, 0);
            return (
              <section
                key={s}
                className="rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
              >
                <h2 className="mb-2 text-sm font-semibold">
                  {s} ({cards.length}) · ${total.toLocaleString()}
                </h2>
                {cards.length === 0 ? (
                  <p className="rounded border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    No {s} deals{q ? " matching search" : ""}.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cards.map((d) => {
                      const nx = nextStage(d.stage);
                      const pv = prevStage(d.stage);
                      const isEditing = editing === d.id;
                      return (
                        <li key={d.id} className="rounded border border-zinc-200 p-2 text-sm dark:border-zinc-700">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                autoFocus
                                className={input}
                                value={d.title}
                                onChange={(e) =>
                                  update(deals.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x)))
                                }
                              />
                              <div className="flex gap-1">
                                <input
                                  className={input}
                                  type="number"
                                  min="0"
                                  value={d.value}
                                  onChange={(e) =>
                                    update(deals.map((x) => (x.id === d.id ? { ...x, value: Number(e.target.value) || 0 } : x)))
                                  }
                                />
                                <input
                                  className={input}
                                  value={d.contact}
                                  onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, contact: e.target.value } : x)))}
                                />
                              </div>
                              <button className="mt-1 text-xs font-medium text-green-600 hover:underline" onClick={() => setEditing(null)}>
                                Done
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">{d.title}</p>
                              <p className="text-zinc-500 dark:text-zinc-400">
                                ${d.value.toLocaleString()} · {d.contact || "No contact"}
                              </p>
                              <div data-spot="Deal actions" className="mt-2 flex items-center gap-1">
                                {pv && (
                                  <button
                                    title={`Back to ${pv}`}
                                    className="rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    onClick={() => move(d.id, pv)}
                                  >
                                    ◀
                                  </button>
                                )}
                                {nx && (
                                  <button
                                    title={`Advance to ${nx}`}
                                    className="rounded border px-1.5 py-0.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    onClick={() => move(d.id, nx)}
                                  >
                                    ▶ {nx}
                                  </button>
                                )}
                                {d.stage === "Lead" && (
                                  <button
                                    title="Mark lost"
                                    className="rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    onClick={() => move(d.id, "Lost")}
                                  >
                                    ✕
                                  </button>
                                )}
                                {d.stage === "Lost" && (
                                  <button
                                    title="Reopen as Lead"
                                    className="rounded border px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    onClick={() => move(d.id, "Lead")}
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>
                              <div className="mt-2 flex items-center gap-1">
                                <select
                                  className="rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                                  value={d.stage}
                                  onChange={(e) => move(d.id, e.target.value as Deal["stage"])}
                                >
                                  {stages.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                                <button className="text-xs hover:underline" onClick={() => setEditing(d.id)}>
                                  Edit
                                </button>
                                <button
                                  className="ml-auto text-xs text-red-600 hover:underline"
                                  onClick={() => update(deals.filter((x) => x.id !== d.id))}
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
      <p className="text-xs text-zinc-500">Press Shift + A to ask</p>
    </div>
  );
}
