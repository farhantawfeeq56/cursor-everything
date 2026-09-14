export type Contact = { id: string; name: string; email: string; company: string; phone: string };
export type Deal = { id: string; title: string; value: number; stage: "Lead" | "Qualified" | "Won" | "Lost"; contact: string };
export type Task = { id: string; title: string; done: boolean; due: string };
export type Crm = { contacts: Contact[]; deals: Deal[]; tasks: Task[] };

export const seed: Crm = {
  contacts: [
    { id: "c1", name: "Ava Stone", email: "ava@acme.co", company: "Acme", phone: "555-0101" },
    { id: "c2", name: "Liam Fox", email: "liam@globex.com", company: "Globex", phone: "555-0102" },
    { id: "c3", name: "Mia Chen", email: "mia@initech.io", company: "Initech", phone: "555-0103" },
  ],
  deals: [
    { id: "d1", title: "Acme renewal", value: 12000, stage: "Qualified", contact: "Ava Stone" },
    { id: "d2", title: "Globex onboarding", value: 8000, stage: "Lead", contact: "Liam Fox" },
    { id: "d3", title: "Initech pilot", value: 4500, stage: "Won", contact: "Mia Chen" },
  ],
  tasks: [
    { id: "t1", title: "Follow up with Ava", done: false, due: "2026-09-12" },
    { id: "t2", title: "Send Globex proposal", done: true, due: "2026-09-10" },
  ],
};

const KEY = "crm-v1";
export const uid = (p: string) => `${p}${Date.now().toString(36)}`;

export function load(): Crm {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...seed, ...JSON.parse(raw) } : seed;
  } catch {
    return seed;
  }
}

export function save(crm: Crm) {
  localStorage.setItem(KEY, JSON.stringify(crm));
}
