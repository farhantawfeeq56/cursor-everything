/** Registry of findable UI targets and step-by-step guides.
 *  Pages expose these via data-spot attributes; the palette
 *  searches this list for "where is…" and walks guides for "how do I…". */

export type GuideTarget = {
  key: string;
  page: string;
  label: string;
  hint: string;
  keywords: string[];
};

export const targets: GuideTarget[] = [
  { key: "Add deal form", page: "/deals", label: "Add deal form", hint: "at the top of the Deals page — fill Title, Value, Contact, then Add deal", keywords: ["add deal", "new deal", "create deal", "deal form"] },
  { key: "Deal search", page: "/deals", label: "Deal search", hint: "right under the add-deal form on the Deals page", keywords: ["search deals", "find deal", "deal search", "search box"] },
  { key: "Bulk actions", page: "/deals", label: "Bulk actions", hint: "the row of Qualify / Advance / Clear buttons on the Deals page", keywords: ["bulk", "qualify all", "advance all", "clear lost"] },
  { key: "Deal actions", page: "/deals", label: "Deal card buttons", hint: "on each deal card — ◀ goes back a stage, ▶ advances, ✕ marks lost", keywords: ["advance button", "move deal", "deal button", "card button", "arrow"] },
  { key: "Pipeline $", page: "/deals", label: "Pipeline total", hint: "the stat chips at the top of the Deals page", keywords: ["pipeline total", "pipeline stat", "totals", "win rate"] },
  { key: "Open deals", page: "/deals", label: "Deals board", hint: "the kanban board with Lead / Qualified / Won / Lost columns", keywords: ["board", "columns", "kanban", "open deals"] },
  { key: "Add contact form", page: "/contacts", label: "Add contact form", hint: "below the search box on the Contacts page", keywords: ["add contact", "new contact", "create contact", "contact form"] },
  { key: "Contact search", page: "/contacts", label: "Contact search", hint: "at the top of the Contacts page", keywords: ["search contacts", "find contact", "contact search"] },
  { key: "Contacts", page: "/contacts", label: "Contacts table", hint: "the main table on the Contacts page — Edit inline, Delete per row", keywords: ["contacts table", "contact list", "all contacts"] },
  { key: "Add task form", page: "/tasks", label: "Add task form", hint: "below the counters on the Tasks page — title plus due date", keywords: ["add task", "new task", "create task", "task form"] },
  { key: "Task filters", page: "/tasks", label: "Task filters", hint: "the All / Open / Done buttons on the Tasks page", keywords: ["filter tasks", "task filter", "all open done"] },
  { key: "Tasks due", page: "/tasks", label: "Task list", hint: "the task list itself — tick the box to complete, Edit to change", keywords: ["task list", "my tasks", "checkbox"] },
  { key: "Pipeline chart", page: "/", label: "Pipeline chart", hint: "on the dashboard — value per stage as bars", keywords: ["chart", "pipeline chart", "bars", "graph"] },
  { key: "Revenue goal", page: "/", label: "Revenue goal", hint: "on the dashboard — won revenue vs target (change it in Settings)", keywords: ["goal", "target", "revenue goal"] },
  { key: "Data backup", page: "/settings", label: "Backup & restore", hint: "in Settings — export or import your data", keywords: ["backup", "export", "import", "restore", "download data"] },
  { key: "Settings", page: "/settings", label: "Settings", hint: "the Settings page — goal, backup, reset", keywords: ["settings page", "preferences"] },
];

export function findTarget(query: string): GuideTarget | null {
  const q = query.toLowerCase();
  let best: GuideTarget | null = null;
  let bestScore = 0;
  for (const t of targets) {
    let score = 0;
    if (q.includes(t.key.toLowerCase())) score += 3;
    for (const k of t.keywords) if (q.includes(k)) score += k.length;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore > 0 ? best : null;
}

export type GuideStep = { text: string; go: string; spot: string };
export type Guide = { id: string; title: string; keywords: string[]; steps: GuideStep[] };

export const guides: Guide[] = [
  {
    id: "add-deal",
    title: "How to add a deal",
    keywords: ["add deal", "new deal", "create deal"],
    steps: [
      { text: "Step 1 of 3 — Go to the Deals page.", go: "/deals", spot: "Open deals" },
      { text: "Step 2 of 3 — Fill in Title, Value ($) and Contact in the Add deal form at the top.", go: "/deals", spot: "Add deal form" },
      { text: "Step 3 of 3 — Click Add deal. The new card appears in the Lead column.", go: "/deals", spot: "Add deal form" },
    ],
  },
  {
    id: "advance-deal",
    title: "How to move a deal to Won",
    keywords: ["move deal", "advance deal", "deal to won", "win deal", "qualified to won", "change lead"],
    steps: [
      { text: "Step 1 of 3 — Open the Deals page and find the card.", go: "/deals", spot: "Open deals" },
      { text: "Step 2 of 3 — On the card, click ▶ to advance one stage: Lead → Qualified → Won.", go: "/deals", spot: "Deal actions" },
      { text: "Step 3 of 3 — Check the Won column and the pipeline totals to confirm.", go: "/deals", spot: "Pipeline $" },
    ],
  },
  {
    id: "add-contact",
    title: "How to add a contact",
    keywords: ["add contact", "new contact", "create contact"],
    steps: [
      { text: "Step 1 of 3 — Go to the Contacts page.", go: "/contacts", spot: "Contacts" },
      { text: "Step 2 of 3 — Fill in name, email, company and phone in the Add form.", go: "/contacts", spot: "Add contact form" },
      { text: "Step 3 of 3 — Click Add. The new row appears in the table.", go: "/contacts", spot: "Contacts" },
    ],
  },
  {
    id: "complete-task",
    title: "How to complete a task",
    keywords: ["complete task", "finish task", "do task", "check task"],
    steps: [
      { text: "Step 1 of 3 — Go to the Tasks page.", go: "/tasks", spot: "Tasks due" },
      { text: "Step 2 of 3 — Tick the checkbox next to the task.", go: "/tasks", spot: "Tasks due" },
      { text: "Step 3 of 3 — Switch the filter to Done to verify it moved there.", go: "/tasks", spot: "Task filters" },
    ],
  },
  {
    id: "backup-data",
    title: "How to back up my data",
    keywords: ["back up", "backup", "export data", "save data"],
    steps: [
      { text: "Step 1 of 2 — Go to the Settings page.", go: "/settings", spot: "Settings" },
      { text: "Step 2 of 2 — Click Export backup to download a JSON file. Import it back any time.", go: "/settings", spot: "Data backup" },
    ],
  },
];

export function findGuide(query: string): Guide | null {
  // ponytail: strip articles so "add a deal" matches keyword "add deal"
  const q = query.toLowerCase().replace(/\b(a|an|the|my)\b/g, "").replace(/\s+/g, " ");
  let best: Guide | null = null;
  let bestScore = 0;
  for (const g of guides) {
    let score = 0;
    if (q.includes(g.title.toLowerCase())) score += 5;
    for (const k of g.keywords) if (q.includes(k)) score += k.length;
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return bestScore > 0 ? best : null;
}
