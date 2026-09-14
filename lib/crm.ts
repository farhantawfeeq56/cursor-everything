export type Contact = { id: string; name: string; email: string; company: string; phone: string; notes: string };
export type DealStage = "Lead" | "Qualified" | "Won" | "Lost";
export type Deal = { id: string; title: string; value: number; stage: DealStage; contact: string; closeDate: string; note: string; createdAt: string };
export type TaskPriority = "High" | "Medium" | "Low";
export type Task = { id: string; title: string; done: boolean; due: string; priority: TaskPriority };
export type Crm = { contacts: Contact[]; deals: Deal[]; tasks: Task[] };

export const STAGE_ODDS: Record<DealStage, number> = { Lead: 0.1, Qualified: 0.4, Won: 1, Lost: 0 };

const now = () => new Date().toISOString();

export const seed: Crm = {
  contacts: [
    { id: "c1", name: "Ava Stone", email: "ava@acme.co", company: "Acme", phone: "555-0101", notes: "Decision maker for renewal." },
    { id: "c2", name: "Liam Fox", email: "liam@globex.com", company: "Globex", phone: "555-0102", notes: "" },
    { id: "c3", name: "Mia Chen", email: "mia@initech.io", company: "Initech", phone: "555-0103", notes: "Prefers email over calls." },
  ],
  deals: [
    { id: "d1", title: "Acme renewal", value: 12000, stage: "Qualified", contact: "Ava Stone", closeDate: "2026-09-30", note: "Legal review pending.", createdAt: now() },
    { id: "d2", title: "Globex onboarding", value: 8000, stage: "Lead", contact: "Liam Fox", closeDate: "2026-10-15", note: "", createdAt: now() },
    { id: "d3", title: "Initech pilot", value: 4500, stage: "Won", contact: "Mia Chen", closeDate: "2026-09-05", note: "Expand to full rollout in Q4.", createdAt: now() },
  ],
  tasks: [
    { id: "t1", title: "Follow up with Ava", done: false, due: "2026-09-12", priority: "High" },
    { id: "t2", title: "Send Globex proposal", done: true, due: "2026-09-10", priority: "Medium" },
  ],
};

const KEY = "crm-v1";
const GOAL_KEY = "crm-goal";
export const uid = (p: string) => `${p}${Date.now().toString(36)}`;

/** Fill in fields that older saved data doesn't have yet. */
function normalize(raw: { contacts?: Partial<Contact>[]; deals?: Partial<Deal>[]; tasks?: Partial<Task>[] }): Crm {
  return {
    contacts: (raw.contacts ?? seed.contacts).map((c) => ({ notes: "", ...c }) as Contact),
    deals: (raw.deals ?? seed.deals).map((d) => ({ closeDate: "", note: "", createdAt: now(), ...d }) as Deal),
    tasks: (raw.tasks ?? seed.tasks).map((t) => ({ priority: "Medium", ...t }) as Task),
  };
}

export function load(): Crm {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    return normalize({ ...seed, ...JSON.parse(raw) });
  } catch {
    return seed;
  }
}

export function save(crm: Crm) {
  localStorage.setItem(KEY, JSON.stringify(crm));
}

export function notify() {
  window.dispatchEvent(new Event("crm-changed"));
}

/** Load, transform, save and broadcast in one step. Returns the updated CRM. */
export function mutate(fn: (crm: Crm) => Crm): Crm {
  const next = fn(load());
  save(next);
  notify();
  return next;
}

export function exportData(): string {
  return JSON.stringify(load(), null, 2);
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed.contacts) || !Array.isArray(parsed.deals) || !Array.isArray(parsed.tasks)) return false;
    save(normalize(parsed));
    notify();
    return true;
  } catch {
    return false;
  }
}

export function resetData() {
  save(seed);
  notify();
}

export function storageSize(): number {
  try {
    return (localStorage.getItem(KEY) ?? "").length;
  } catch {
    return 0;
  }
}

export function getGoal(): number {
  if (typeof window === "undefined") return 50000;
  const raw = localStorage.getItem(GOAL_KEY);
  const n = raw ? Number(raw) : 50000;
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

export function setGoal(v: number) {
  localStorage.setItem(GOAL_KEY, String(v));
  notify();
}

export function download(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
