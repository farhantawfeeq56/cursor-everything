"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { load, mutate, uid } from "@/lib/crm";
import { findTarget, findGuide, guides, type Guide } from "@/lib/guide";

/**
 * Global command palette (Shift + A, works on every page).
 * Suggestions are different on every page — a mix of
 * Guide (how do I…), Find (where is…), Ask (answers) and
 * Act (does it) options. Every option really executes.
 */
const pageCmds: Record<string, string[]> = {
  "/": [
    "How do I add a deal?",
    "Where is the pipeline total?",
    "What is my pipeline worth?",
    "Advance Qualified → Won",
    "How many open tasks?",
  ],
  "/deals": [
    "How do I move a deal to Won?",
    "Where is the deal search?",
    "Advance Qualified → Won",
    "Qualify all Leads",
    "What is my biggest open deal?",
  ],
  "/contacts": [
    "How do I add a contact?",
    "Where is the contact search?",
    "Who has the most open deals?",
    "Add demo contact",
    "How many contacts?",
  ],
  "/tasks": [
    "How do I complete a task?",
    "Where are the task filters?",
    "Complete overdue tasks",
    "What is due today?",
    "Clear completed tasks",
  ],
};

const HELP =
  "I can guide you step-by-step (try “how do I…”), find anything on screen (“where is…”), answer questions, and take action. Try a suggestion below.";

function pipelineValue() {
  const crm = load();
  return crm.deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
}

function winRate() {
  const crm = load();
  const decided = crm.deals.filter((d) => d.stage === "Won" || d.stage === "Lost").length;
  if (!decided) return "No closed deals yet, so win rate is —.";
  const won = crm.deals.filter((d) => d.stage === "Won").length;
  return `Win rate ${Math.round((won / decided) * 100)}% (${won} of ${decided} closed deals).`;
}

export default function AskPalette() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [spot, setSpot] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [guide, setGuide] = useState<{ def: Guide; step: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const path = usePathname();
  const cmds = pageCmds[path] ?? pageCmds["/"];

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const highlight = (key: string) => {
    setSpot(key);
    // Flash an outline on the target so it is unmissable, then clean up.
    setTimeout(() => {
      const el = document.querySelector(`[data-spot="${key}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const prev = el.style.outline;
      el.style.outline = "3px solid #f59e0b";
      el.style.outlineOffset = "2px";
      setTimeout(() => {
        el.style.outline = prev;
        el.style.outlineOffset = "";
      }, 2500);
    }, 350);
  };

  useEffect(() => {
    if (!spot) {
      setCursor(null);
      return;
    }
    const el = document.querySelector(`[data-spot="${spot}"]`);
    const pal = palRef.current?.getBoundingClientRect();
    const start = pal
      ? { x: pal.left + pal.width / 2, y: pal.top + pal.height / 2 }
      : { x: innerWidth / 2, y: innerHeight / 3 };
    setCursor(start);
    const t = setTimeout(() => {
      const r = el?.getBoundingClientRect();
      if (r) setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }, 50);
    return () => clearTimeout(t);
  }, [spot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setGuide(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const say = (query: string, answer: string) => {
    setMsgs((m) => [...m, `❯ ${query}`, answer]);
    setToast(answer);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const startGuide = (def: Guide) => {
    setOpen(false);
    setGuide({ def, step: 0 });
    const s = def.steps[0];
    say(def.title, `${def.title} — ${s.text}`);
    if (s.go !== path) router.push(s.go);
    highlight(s.spot);
  };

  const stepGuide = (dir: 1 | -1) => {
    setGuide((g) => {
      if (!g) return g;
      const next = Math.min(Math.max(g.step + dir, 0), g.def.steps.length - 1);
      const s = g.def.steps[next];
      say(dir > 0 ? "Next step" : "Previous step", s.text);
      if (s.go !== path) router.push(s.go);
      highlight(s.spot);
      return { ...g, step: next };
    });
  };

  const run = (label: string) => {
    const q = label.toLowerCase().trim();
    const crm = load();
    let answer = "";
    let go: string | null = null;
    let mark: string | null = null;

    const isGuideQuery =
      q.startsWith("how do i") || q.startsWith("how to") || q.includes("guide me") || q.includes("show me how");
    const isFindQuery =
      q.startsWith("where is") || q.startsWith("where are") || q.startsWith("where's") || q.startsWith("find ");
    const isAdvanceWon =
      (q.includes("advance") && q.includes("won")) ||
      (q.includes("qualified") && q.includes("won") && (q.includes("advance") || q.includes("move") || q.includes("all")));
    const isQualifyLeads = q.includes("qualify") && q.includes("lead");
    const isClearLost = q.includes("clear") && q.includes("lost");
    const isCompleteOverdue = q.includes("overdue") || (q.includes("complete") && q.includes("task"));
    const isClearDone = q.includes("clear") && q.includes("complet");
    const isDueToday = q.includes("due today");
    const isBiggest = q.includes("biggest");
    const isMostDeals = q.includes("most") && q.includes("deal");
    const isAddContact = q.includes("add") && q.includes("contact");
    const isHelp = q.includes("what can you") || q === "help";
    const markMatch = q.match(/^mark\s+(.+?)\s+as\s+(won|lost|qualified|lead)$/);

    if (isGuideQuery) {
      const def = findGuide(q);
      if (def) {
        startGuide(def);
        return;
      }
      say(label, `I can walk you through: ${guides.map((g) => g.title.toLowerCase()).join(", ")}.`);
      setOpen(false);
      return;
    }

    if (isFindQuery) {
      const t = findTarget(q);
      if (t) {
        answer = `${t.label}: ${t.hint}.`;
        say(label, answer);
        if (t.page !== path) router.push(t.page);
        highlight(t.key);
        setOpen(false);
        return;
      }
      say(label, "I couldn't find that. Try “where is the search?” or “where is the pipeline total?”.");
      setOpen(false);
      return;
    }

    if (markMatch) {
      const [, title, stageRaw] = markMatch;
      const stage = (stageRaw.charAt(0).toUpperCase() + stageRaw.slice(1)) as "Won" | "Lost" | "Qualified" | "Lead";
      const found = crm.deals.find((d) => d.title.toLowerCase().includes(title.trim()));
      if (found) {
        mutate((c) => ({ ...c, deals: c.deals.map((d) => (d.id === found.id ? { ...d, stage } : d)) }));
        answer = `Marked "${found.title}" as ${stage}.`;
      } else {
        answer = `No deal matching "${title.trim()}".`;
      }
      mark = "Open deals";
    } else if (isAdvanceWon) {
      const n = crm.deals.filter((d) => d.stage === "Qualified").length;
      if (n) mutate((c) => ({ ...c, deals: c.deals.map((d) => (d.stage === "Qualified" ? { ...d, stage: "Won" as const } : d)) }));
      answer = n ? `Moved ${n} deal${n > 1 ? "s" : ""} Qualified → Won.` : "No Qualified deals to advance.";
      mark = "Pipeline $";
    } else if (isQualifyLeads) {
      const n = crm.deals.filter((d) => d.stage === "Lead").length;
      if (n) mutate((c) => ({ ...c, deals: c.deals.map((d) => (d.stage === "Lead" ? { ...d, stage: "Qualified" as const } : d)) }));
      answer = n ? `Qualified ${n} lead${n > 1 ? "s" : ""}.` : "No Leads to qualify.";
      mark = "Open deals";
    } else if (isClearLost) {
      const n = crm.deals.filter((d) => d.stage === "Lost").length;
      if (n) mutate((c) => ({ ...c, deals: c.deals.filter((d) => d.stage !== "Lost") }));
      answer = n ? `Cleared ${n} lost deal${n > 1 ? "s" : ""}.` : "No lost deals to clear.";
      mark = "Open deals";
    } else if (q.includes("pipeline") || q.includes("worth")) {
      const open = crm.deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length;
      answer = `Pipeline $${pipelineValue().toLocaleString()} across ${open} open deals.`;
      go = "/deals";
      mark = "Pipeline $";
    } else if (q.includes("win rate")) {
      answer = winRate();
      if (path !== "/deals") go = "/deals";
      mark = "Pipeline $";
    } else if (isBiggest) {
      const open = crm.deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified");
      if (open.length) {
        const top = open.reduce((a, b) => (b.value > a.value ? b : a));
        answer = `Biggest open deal: "${top.title}" at $${top.value.toLocaleString()} (${top.stage}).`;
      } else {
        answer = "No open deals right now.";
      }
      if (path !== "/deals") go = "/deals";
      mark = "Open deals";
    } else if (isMostDeals) {
      const counts = new Map<string, number>();
      for (const d of crm.deals) {
        if (d.stage === "Lead" || d.stage === "Qualified") counts.set(d.contact, (counts.get(d.contact) ?? 0) + 1);
      }
      if (counts.size) {
        const [name, n] = [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
        answer = `${name} has the most open deals (${n}).`;
      } else {
        answer = "No open deals right now.";
      }
      if (path !== "/contacts") go = "/contacts";
      mark = "Contacts";
    } else if (isDueToday) {
      const today = new Date().toISOString().slice(0, 10);
      const due = crm.tasks.filter((t) => !t.done && t.due === today);
      answer = due.length ? `Due today: ${due.map((t) => `"${t.title}"`).join(", ")}.` : "Nothing due today.";
      if (path !== "/tasks") go = "/tasks";
      mark = "Tasks due";
    } else if (isCompleteOverdue) {
      const today = new Date().toISOString().slice(0, 10);
      const n = crm.tasks.filter((t) => !t.done && t.due && t.due < today).length;
      if (n) {
        mutate((c) => ({
          ...c,
          tasks: c.tasks.map((t) => (!t.done && t.due && t.due < today ? { ...t, done: true } : t)),
        }));
      }
      answer = n ? `Completed ${n} overdue task${n > 1 ? "s" : ""}.` : "No overdue tasks.";
      mark = "Tasks due";
    } else if (isClearDone) {
      const n = crm.tasks.filter((t) => t.done).length;
      if (n) mutate((c) => ({ ...c, tasks: c.tasks.filter((t) => !t.done) }));
      answer = n ? `Cleared ${n} completed task${n > 1 ? "s" : ""}.` : "No completed tasks to clear.";
      mark = "Tasks due";
    } else if (q.includes("how many") && q.includes("task")) {
      const n = crm.tasks.filter((t) => !t.done).length;
      answer = `${n} open task${n === 1 ? "" : "s"}.`;
      if (path !== "/tasks") go = "/tasks";
      mark = "Tasks due";
    } else if (q.includes("how many") && q.includes("contact")) {
      answer = `${crm.contacts.length} contact${crm.contacts.length === 1 ? "" : "s"}.`;
      if (path !== "/contacts") go = "/contacts";
      mark = "Contacts";
    } else if (isAddContact) {
      mutate((c) => ({
        ...c,
        contacts: [...c.contacts, { id: uid("c"), name: "Demo Contact", email: "demo@example.com", company: "Demo", phone: "555-0100" }],
      }));
      answer = "Added Demo Contact.";
      if (path !== "/contacts") go = "/contacts";
      mark = "Contacts";
    } else if (isHelp) {
      answer = HELP;
    } else if (q.includes("contact")) {
      answer = `${crm.contacts.length} contacts.`;
      if (path !== "/contacts") go = "/contacts";
      mark = "Contacts";
    } else if (q.includes("deal") || q.includes("lead")) {
      const n = crm.deals.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length;
      answer = `${n} open deals.`;
      if (path !== "/deals") go = "/deals";
      mark = "Open deals";
    } else if (q.includes("task")) {
      const n = crm.tasks.filter((t) => !t.done).length;
      answer = `${n} open tasks.`;
      if (path !== "/tasks") go = "/tasks";
      mark = "Tasks due";
    } else {
      answer = HELP;
    }

    say(label, answer);
    if (mark) highlight(mark);
    if (go) router.push(go);
    setOpen(false);
  };

  return (
    <>
      <p className="fixed bottom-3 right-4 z-30 rounded-full bg-zinc-900 px-3 py-1 text-xs text-white shadow dark:bg-white dark:text-zinc-900">
        Shift + A to ask
      </p>
      {cursor && spot && (
        <span
          className="pointer-events-none fixed z-50 transition-all duration-1000 ease-in-out"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" className="drop-shadow-lg">
            <path d="M6 3l14 8-6.5 1.5L10 19z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-32" onClick={() => setOpen(false)}>
          <div
            ref={palRef}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800"
          >
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                run(draft.trim());
                setDraft("");
              }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                placeholder='Try "how do I add a deal?" or "where is…"'
                className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {cmds.map((c) => (
                <button
                  key={c}
                  onClick={() => run(c)}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {c}
                </button>
              ))}
            </div>
            {msgs.length > 0 && (
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
                {msgs.map((m, i) => (
                  <li
                    key={i}
                    className={`rounded px-2 py-1 ${m.startsWith("❯") ? "bg-zinc-100 dark:bg-zinc-800" : "bg-green-50 dark:bg-green-950"}`}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {guide && (
        <div className="fixed bottom-3 left-4 z-40 w-80 rounded-xl bg-white p-3 text-sm shadow-2xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-700">
          <p className="font-semibold">{guide.def.title}</p>
          <p className="mt-1">{guide.def.steps[guide.step].text}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => stepGuide(-1)}
              disabled={guide.step === 0}
              className="rounded border px-2 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← Back
            </button>
            <button
              onClick={() => stepGuide(1)}
              disabled={guide.step === guide.def.steps.length - 1}
              className="rounded border px-2 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Next →
            </button>
            <span className="text-xs text-zinc-500">
              Step {guide.step + 1} of {guide.def.steps.length}
            </span>
            <button
              onClick={() => {
                setGuide(null);
                setSpot(null);
              }}
              className="ml-auto text-xs text-zinc-500 hover:underline"
            >
              Exit ✕
            </button>
          </div>
        </div>
      )}
      {toast && !guide && (
        <div className="fixed bottom-3 left-4 z-40 max-w-sm rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white shadow-2xl dark:bg-white dark:text-zinc-900">
          {toast}
        </div>
      )}
    </>
  );
}
