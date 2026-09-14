"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { load, getGoal, type Crm } from "@/lib/crm";
import { card, chip, pageSub, STAGE } from "@/lib/ui";

const stages = ["Lead", "Qualified", "Won", "Lost"] as const;

export default function Dashboard() {
  const [crm, setCrm] = useState<Crm | null>(null);
  const [goal, setGoal] = useState(50000);

  useEffect(() => {
    const reload = () => {
      setCrm(load());
      setGoal(getGoal());
    };
    reload();
    window.addEventListener("crm-changed", reload);
    return () => window.removeEventListener("crm-changed", reload);
  }, []);

  const stats = useMemo(() => {
    if (!crm) return null;
    const pipeline = crm.deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
    const openDeals = crm.deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length;
    const openTasks = crm.tasks.filter((t) => !t.done).length;
    return [
      { label: "Contacts", value: String(crm.contacts.length), href: "/contacts", dot: "bg-violet-500" },
      { label: "Open deals", value: String(openDeals), href: "/deals", dot: "bg-blue-500" },
      { label: "Pipeline $", value: pipeline.toLocaleString(), href: "/deals", dot: "bg-indigo-500" },
      { label: "Tasks due", value: String(openTasks), href: "/tasks", dot: "bg-amber-500" },
    ] as const;
  }, [crm]);

  const chart = useMemo(() => {
    if (!crm) return null;
    const rows = stages.map((s) => {
      const items = crm.deals.filter((d) => d.stage === s);
      return { stage: s, count: items.length, total: items.reduce((sum, d) => sum + d.value, 0) };
    });
    const max = Math.max(1, ...rows.map((r) => r.total));
    return rows.map((r) => ({ ...r, width: Math.max(r.total > 0 ? 4 : 0, (r.total / max) * 100) }));
  }, [crm]);

  const attention = useMemo(() => {
    if (!crm) return null;
    const today = new Date().toISOString().slice(0, 10);
    const overdueTasks = crm.tasks.filter((t) => !t.done && t.due && t.due < today);
    const staleDeals = crm.deals.filter(
      (d) => (d.stage === "Lead" || d.stage === "Qualified") && d.closeDate && d.closeDate < today
    );
    return { overdueTasks, staleDeals };
  }, [crm]);

  if (!crm || !stats || !chart || !attention) return <p>Loading…</p>;

  const wonTotal = crm.deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const pct = Math.min(100, Math.round((wonTotal / goal) * 100));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className={pageSub}>Your pipeline at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            data-spot={s.label}
            href={s.href}
            className={`${card} transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section data-spot="Pipeline chart" className={card}>
          <h2 className="mb-1 font-semibold">Pipeline by stage</h2>
          <p className={`${pageSub} mb-3 text-xs`}>Total value sitting in each stage.</p>
          <div className="flex flex-col gap-2.5">
            {chart.map((r) => (
              <div key={r.stage} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{r.stage}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className={`h-full rounded-full ${STAGE[r.stage].bar}`} style={{ width: `${r.width}%` }} />
                </div>
                <span className="w-28 shrink-0 text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                  ${r.total.toLocaleString()} · {r.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section data-spot="Revenue goal" className={card}>
          <h2 className="mb-1 font-semibold">Revenue goal</h2>
          <p className={`${pageSub} mb-3 text-xs`}>Won revenue vs target. Change it in Settings.</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            ${wonTotal.toLocaleString()}
            <span className="text-sm font-normal text-zinc-500"> of ${goal.toLocaleString()} · {pct}%</span>
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Link href="/settings" className="mt-3 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Adjust goal →
          </Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-2 font-semibold">Recent deals</h2>
          {crm.deals.length === 0 ? (
            <p className="text-sm text-zinc-500">No deals yet — add one on the Deals page.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {crm.deals.slice(-5).reverse().map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-zinc-500 tabular-nums dark:text-zinc-400">${d.value.toLocaleString()}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE[d.stage].pill}`}>{d.stage}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section data-spot="Tasks due" className={card}>
          <h2 className="mb-2 font-semibold">Needs attention</h2>
          {attention.overdueTasks.length === 0 && attention.staleDeals.length === 0 ? (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              All clear — nothing overdue.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {attention.overdueTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950">
                  <span className="truncate">{t.title}</span>
                  <Link href="/tasks" className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-300">
                    Overdue {t.due} →
                  </Link>
                </li>
              ))}
              {attention.staleDeals.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950">
                  <span className="truncate">{d.title}</span>
                  <Link href="/deals" className="shrink-0 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300">
                    Past close date →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={chip}>Press Shift + A to ask, find or act</span>
      </div>
    </div>
  );
}
