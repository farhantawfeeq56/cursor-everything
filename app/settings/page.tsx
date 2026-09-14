"use client";
import { useEffect, useRef, useState } from "react";
import { load, exportData, importData, resetData, storageSize, getGoal, setGoal } from "@/lib/crm";
import { download } from "@/lib/crm";
import { input, card, btnPrimary, pageSub } from "@/lib/ui";

export default function SettingsPage() {
  const [goal, setGoalState] = useState(50000);
  const [counts, setCounts] = useState({ contacts: 0, deals: 0, tasks: 0 });
  const [size, setSize] = useState(0);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const crm = load();
    setCounts({ contacts: crm.contacts.length, deals: crm.deals.length, tasks: crm.tasks.length });
    setSize(storageSize());
    setGoalState(getGoal());
  };

  useEffect(() => {
    refresh();
    window.addEventListener("crm-changed", refresh);
    return () => window.removeEventListener("crm-changed", refresh);
  }, []);

  const saveGoal = () => {
    if (goal > 0) {
      setGoal(goal);
      setMsg(`Goal set to $${goal.toLocaleString()}.`);
    }
  };

  const doExport = () => {
    download(`crm-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData());
    setMsg("Backup downloaded.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result ?? ""));
      setMsg(ok ? `Imported ${file.name} — data replaced.` : "That file is not a valid CRM backup.");
      refresh();
    };
    reader.readAsText(file);
  };

  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    resetData();
    setConfirmReset(false);
    setMsg("Demo data restored.");
    refresh();
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div data-spot="Settings">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className={pageSub}>
          {counts.contacts} contacts · {counts.deals} deals · {counts.tasks} tasks · {(size / 1024).toFixed(1)} KB stored locally
        </p>
      </div>

      <section data-spot="Revenue goal" className={card}>
        <h2 className="font-semibold">Revenue goal</h2>
        <p className={`${pageSub} mb-3 text-xs`}>Target for won revenue, shown on the dashboard.</p>
        <div className="flex gap-2">
          <input className={input} type="number" min="1" value={goal} onChange={(e) => setGoalState(Number(e.target.value) || 0)} />
          <button onClick={saveGoal} className={btnPrimary}>
            Save
          </button>
        </div>
      </section>

      <section data-spot="Data backup" className={card}>
        <h2 className="font-semibold">Backup & restore</h2>
        <p className={`${pageSub} mb-3 text-xs`}>Your data lives in this browser. Export a backup before switching devices.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={doExport} className={btnPrimary}>
            Export backup ⬇
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Import backup ⬆
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className={`${card} border-red-200 dark:border-red-900`}>
        <h2 className="font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
        <p className={`${pageSub} mb-3 text-xs`}>Replace everything with the original demo data. This cannot be undone.</p>
        <button
          onClick={doReset}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition ${confirmReset ? "bg-red-700" : "bg-red-500 hover:bg-red-600"}`}
        >
          {confirmReset ? "Click again to confirm reset" : "Reset to demo data"}
        </button>
      </section>

      {msg && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">{msg}</p>
      )}
      <p className="text-xs text-zinc-500">Press Shift + A to ask, find or act.</p>
    </div>
  );
}
