"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { load, type Crm } from "@/lib/crm";

export default function Dashboard() {
  const [crm, setCrm] = useState<Crm | null>(null);
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
          <Link key={label} data-spot={label} href={href} className="rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
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
        <section data-spot="Tasks due" className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
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
      <p className="text-xs text-zinc-500">Press Shift + A to ask</p>
    </div>
  );
}
