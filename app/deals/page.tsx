"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, STAGE_ODDS, type Deal, type DealStage } from "@/lib/crm";
import { input, card, chip, btnGhost, btnPrimary, pageSub, STAGE } from "@/lib/ui";

const stages: DealStage[] = ["Lead", "Qualified", "Won", "Lost"];
const nextStage = (s: DealStage): DealStage | null =>
  s === "Lead" ? "Qualified" : s === "Qualified" ? "Won" : null;
const prevStage = (s: DealStage): DealStage | null =>
  s === "Qualified" ? "Lead" : s === "Won" ? "Qualified" : null;

type SortKey = "value-desc" | "value-asc" | "close" | "newest";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState({ title: "", value: "", contact: "", closeDate: "" });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("value-desc");
  const [hidden, setHidden] = useState<Set<DealStage>>(new Set());
  const [closingSoonOnly, setClosingSoonOnly] = useState(false);
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

  const move = (id: string, stage: DealStage) =>
    update(deals.map((x) => (x.id === id ? { ...x, stage } : x)));

  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

  const shown = useMemo(() => {
    const filtered = deals.filter((d) => {
      if (closingSoonOnly) {
        if (!(d.stage === "Lead" || d.stage === "Qualified")) return false;
        if (!d.closeDate || d.closeDate > soonCutoff) return false;
      }
      return `${d.title} ${d.contact} ${d.stage}`.toLowerCase().includes(q.toLowerCase());
    });
    const by: Record<SortKey, (a: Deal, b: Deal) => number> = {
      "value-desc": (a, b) => b.value - a.value,
      "value-asc": (a, b) => a.value - b.value,
      close: (a, b) => (a.closeDate || "9999").localeCompare(b.closeDate || "9999"),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return filtered.sort(by[sort]);
  }, [deals, q, sort, closingSoonOnly, soonCutoff]);

  const pipeline = deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
  const weighted = Math.round(deals.reduce((s, d) => s + d.value * STAGE_ODDS[d.stage], 0));
  const wonTotal = deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const openCount = deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length;
  const decided = deals.filter((d) => d.stage === "Won" || d.stage === "Lost").length;
  const winRate = decided ? Math.round((deals.filter((d) => d.stage === "Won").length / decided) * 100) : null;
  const avgDeal = deals.length ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;
  const leadCount = deals.filter((d) => d.stage === "Lead").length;
  const qualifiedCount = deals.filter((d) => d.stage === "Qualified").length;
  const closingSoonCount = deals.filter(
    (d) => (d.stage === "Lead" || d.stage === "Qualified") && d.closeDate && d.closeDate <= soonCutoff
  ).length;

  const toggleHidden = (s: DealStage) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
        <p className={pageSub}>Drag through stages with ◀ ▶, or use the dropdown. Click Edit for dates and notes.</p>
      </div>

      <div data-spot="Pipeline $" className="flex flex-wrap gap-2 text-sm">
        <span className={chip}>Pipeline ${pipeline.toLocaleString()}</span>
        <span className={chip} title="Value × stage probability">Weighted ${weighted.toLocaleString()}</span>
        <span className={chip}>Won ${wonTotal.toLocaleString()}</span>
        <span className={chip}>Open {openCount}</span>
        <span className={chip}>Win rate {winRate === null ? "—" : `${winRate}%`}</span>
        <span className={chip}>Avg ${avgDeal.toLocaleString()}</span>
      </div>

      <form
        data-spot="Add deal form"
        className={`${card} grid grid-cols-2 gap-2 lg:grid-cols-5`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          update([
            ...deals,
            {
              id: uid("d"),
              title: form.title.trim(),
              value: Number(form.value) || 0,
              stage: "Lead",
              contact: form.contact.trim(),
              closeDate: form.closeDate,
              note: "",
              createdAt: new Date().toISOString(),
            },
          ]);
          setForm({ title: "", value: "", contact: "", closeDate: "" });
        }}
      >
        <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="Value $" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <input className={input} placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <input className={input} type="date" title="Expected close date" value={form.closeDate} onChange={(e) => setForm({ ...form, closeDate: e.target.value })} />
        <button className={btnPrimary}>Add deal</button>
      </form>

      <div data-spot="Deal search" className="flex flex-wrap items-center gap-2">
        <input className={`${input} max-w-xs`} placeholder="Search deals…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} max-w-44`} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} title="Sort cards">
          <option value="value-desc">Value high → low</option>
          <option value="value-asc">Value low → high</option>
          <option value="close">Close date</option>
          <option value="newest">Newest first</option>
        </select>
        <button
          onClick={() => setClosingSoonOnly((v) => !v)}
          className={`${btnGhost} ${closingSoonOnly ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white" : ""}`}
        >
          Closing ≤14d ({closingSoonCount})
        </button>
        {q && (
          <button onClick={() => setQ("")} className={btnGhost}>
            Clear search ✕
          </button>
        )}
      </div>

      <div data-spot="Bulk actions" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-zinc-500">Bulk:</span>
        <button onClick={() => update(deals.map((d) => (d.stage === "Lead" ? { ...d, stage: "Qualified" as const } : d)))} disabled={!leadCount} className={btnGhost}>
          Qualify all Leads ({leadCount})
        </button>
        <button onClick={() => update(deals.map((d) => (d.stage === "Qualified" ? { ...d, stage: "Won" as const } : d)))} disabled={!qualifiedCount} className={btnGhost}>
          Advance Qualified → Won ({qualifiedCount})
        </button>
        <button onClick={() => update(deals.filter((d) => d.stage !== "Lost"))} className={btnGhost}>
          Clear Lost
        </button>
        <span className="ml-2 text-xs text-zinc-500">Columns:</span>
        {stages.map((s) => (
          <button key={s} onClick={() => toggleHidden(s)} className={`${btnGhost} ${hidden.has(s) ? "opacity-40 line-through" : ""}`}>
            {s}
          </button>
        ))}
      </div>

      <div data-spot="Open deals" className="grid items-start gap-4 lg:grid-cols-4">
        {stages
          .filter((s) => !hidden.has(s))
          .map((s) => {
            const cards = shown.filter((d) => d.stage === s);
            const total = cards.reduce((sum, d) => sum + d.value, 0);
            return (
              <section key={s} className={card}>
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${STAGE[s].dot}`} />
                  {s} ({cards.length}) · ${total.toLocaleString()}
                </h2>
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    No {s} deals{q || closingSoonOnly ? " matching filters" : ""}.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cards.map((d) => {
                      const nx = nextStage(d.stage);
                      const pv = prevStage(d.stage);
                      const pastDue = d.closeDate && d.closeDate < today && (d.stage === "Lead" || d.stage === "Qualified");
                      if (editing === d.id) {
                        return (
                          <li key={d.id} className="flex flex-col gap-1.5 rounded-lg border border-indigo-300 p-2 text-sm dark:border-indigo-700">
                            <input autoFocus className={input} value={d.title} onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x)))} placeholder="Title" />
                            <div className="flex gap-1.5">
                              <input className={input} type="number" min="0" value={d.value} onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, value: Number(e.target.value) || 0 } : x)))} placeholder="$" />
                              <input className={input} value={d.contact} onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, contact: e.target.value } : x)))} placeholder="Contact" />
                            </div>
                            <input className={input} type="date" value={d.closeDate} onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, closeDate: e.target.value } : x)))} title="Close date" />
                            <textarea className={input} rows={2} value={d.note} onChange={(e) => update(deals.map((x) => (x.id === d.id ? { ...x, note: e.target.value } : x)))} placeholder="Notes…" />
                            <button className="mt-0.5 text-xs font-medium text-green-600 hover:underline" onClick={() => setEditing(null)}>
                              Done
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li key={d.id} className="rounded-lg border border-zinc-200 p-2.5 text-sm transition hover:shadow-sm dark:border-zinc-700">
                          <p className="font-medium leading-snug">{d.title}</p>
                          <p className="mt-0.5 text-zinc-500 tabular-nums dark:text-zinc-400">
                            ${d.value.toLocaleString()} · {d.contact || "No contact"}
                          </p>
                          {d.closeDate && (
                            <p className={`mt-0.5 text-xs ${pastDue ? "font-semibold text-red-600" : "text-zinc-500 dark:text-zinc-400"}`}>
                              {pastDue ? `Past due ${d.closeDate}` : `Closes ${d.closeDate}`}
                            </p>
                          )}
                          {d.note && <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">“{d.note}”</p>}
                          <div data-spot="Deal actions" className="mt-2 flex items-center gap-1">
                            {pv && (
                              <button title={`Back to ${pv}`} className="rounded-md border px-1.5 py-0.5 text-xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, pv)}>
                                ◀
                              </button>
                            )}
                            {nx && (
                              <button title={`Advance to ${nx}`} className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900" onClick={() => move(d.id, nx)}>
                                ▶ {nx}
                              </button>
                            )}
                            {d.stage === "Lead" && (
                              <button title="Mark lost" className="rounded-md border px-1.5 py-0.5 text-xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, "Lost")}>
                                ✕
                              </button>
                            )}
                            {d.stage === "Lost" && (
                              <button title="Reopen as Lead" className="rounded-md border px-1.5 py-0.5 text-xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={() => move(d.id, "Lead")}>
                                Reopen
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <select
                              className="rounded-md border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                              value={d.stage}
                              onChange={(e) => move(d.id, e.target.value as DealStage)}
                            >
                              {stages.map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                            <button className="text-xs hover:underline" onClick={() => setEditing(d.id)}>
                              Edit
                            </button>
                            <button className="ml-auto text-xs text-red-600 hover:underline" onClick={() => update(deals.filter((x) => x.id !== d.id))}>
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
      <p className="text-xs text-zinc-500">Press Shift + A to ask, find or act.</p>
    </div>
  );
}
