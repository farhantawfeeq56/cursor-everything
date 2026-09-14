"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { load, mutate, uid, exportData, download, getGoal } from "@/lib/crm";
import { findTarget, findGuide, guides, type Guide } from "@/lib/guide";

/**
 * Global command palette (Shift + A, works on every page).
 * Same 4 suggestions everywhere. Answers show as a toast;
 * targets pulse with an on-brand ring (no history, no cursor).
 */
const FIXED_CMDS = [
  "Where is the settings?",
  "How to import backup?",
  "How to get all my open tasks?",
  "I want to edit the contact details of Liam Fox",
];

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
  const [draft, setDraft] = useState("");
  const [spot, setSpot] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [guide, setGuide] = useState<{ def: Guide; step: number } | null>(null);
  type ToastMsg = { text: string; action?: { label: string; go: string; spot?: string } };
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Second half of a chained highlight (e.g. sidebar → import button),
  // fired on arrival so a click mid-chain never loses the next step.
  const pendingRef = useRef<{ go: string; spot: string; at: number } | null>(null);
  const router = useRouter();
  const path = usePathname();
  const cmds = FIXED_CMDS;

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const clearPulse = () => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = null;
    document.querySelectorAll(".guide-pulse").forEach((el) => el.classList.remove("guide-pulse"));
    setSpot(null);
    setCursor(null);
  };

  // Retries so post-navigation targets still show when the new page
  // hasn't rendered yet; a click mid-chain only clears the old step.
  const pulse = (key: string, attempt = 0) => {
    clearPulse();
    const el = document.querySelector(`[data-spot="${key}"]`) as HTMLElement | null;
    if (!el) {
      // ponytail: bounded poll, gives up silently if the target never renders
      if (attempt < 15) pulseTimer.current = setTimeout(() => pulse(key, attempt + 1), 200);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.classList.add("guide-pulse");
    setSpot(key);
    // Cursor starts near the top-center (where the palette was) then flies to the target.
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight * 0.25 });
    const move = () => {
      const r = document.querySelector(`[data-spot="${key}"]`)?.getBoundingClientRect();
      if (r) setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };
    setTimeout(move, 60);
    setTimeout(move, 450);
    pulseTimer.current = setTimeout(clearPulse, 3000);
  };

  // Suggestions only highlight what's on screen — never navigate, never act.
  // The toast may offer a button; going there is the user's tap, not autonomous.
  const showOnly = (key: string | null, answer: string, query: string, action?: { label: string; go: string; spot?: string }) => {
    setToast({ text: answer, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
    setOpen(false);
    pendingRef.current = action?.spot ? { go: action.go, spot: action.spot, at: Date.now() } : null;
    if (key) pulse(key);
  };

  const goThere = (action: { label: string; go: string; spot?: string }) => {
    router.push(action.go);
    setToast((t) => (t ? { text: t.text } : t));
  };

  // Finish a chained highlight the moment its target appears in the DOM —
  // covers the toast tap, manual sidebar nav, and slow renders alike.
  // (Presence-based, so no dependence on router timing.)
  useEffect(() => {
    const t = setInterval(() => {
      const p = pendingRef.current;
      if (!p || Date.now() - p.at > 60000) {
        if (p) pendingRef.current = null;
        return;
      }
      if (document.querySelector(`[data-spot="${p.spot}"]`)) {
        pendingRef.current = null;
        pulse(p.spot);
      }
    }, 300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: no click-to-dismiss — a click mid-chain (toast tap, Next/Back,
  // sidebar nav) must not kill the highlight; pulses end on their timer,
  // on arrival of the next step, or via Escape / Shift+A / Exit.

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        // Shift+A while pulsing only stops the pulse — it doesn't reopen the modal.
        if (spot) {
          clearPulse();
          pendingRef.current = null;
          return;
        }
        setOpen((v) => {
          if (!v) setDraft("");
          return !v;
        });
      }
      if (e.key === "Escape") {
        setOpen(false);
        setGuide(null);
        clearPulse();
        pendingRef.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spot]);

  const say = (query: string, answer: string) => {
    setToast({ text: answer });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const startGuide = (def: Guide) => {
    setOpen(false);
    pendingRef.current = null;
    setGuide({ def, step: 0 });
    const s = def.steps[0];
    say(def.title, `${def.title} — ${s.text}`);
    if (s.go !== path) router.push(s.go);
    setTimeout(() => pulse(s.spot), s.go !== path ? 600 : 0);
  };

  const stepGuide = (dir: 1 | -1) => {
    setGuide((g) => {
      if (!g) return g;
      const next = Math.min(Math.max(g.step + dir, 0), g.def.steps.length - 1);
      const s = g.def.steps[next];
      say(dir > 0 ? "Next step" : "Previous step", s.text);
      if (s.go !== path) router.push(s.go);
      setTimeout(() => pulse(s.spot), s.go !== path ? 600 : 0);
      return { ...g, step: next };
    });
  };

  const run = (label: string) => {
    const q = label.toLowerCase().trim();

    // The 4 fixed questions — handled first with chained pulsing nav → target.
    const isSettingsQ = q.includes("setting") && (q.startsWith("where") || q.includes("where"));
    const isLiamQ = q.includes("liam") && (q.includes("edit") || q.includes("contact"));
    const isBackupQ = !isLiamQ && (q.includes("backup") || q.includes("back up") || q.includes("export") || q.includes("import"));
    const isOpenTasksQ = !isLiamQ && !isBackupQ && q.includes("task") && (q.includes("open") || q.includes("all") || q.includes("get") || q.includes("my"));

    if (isSettingsQ) {
      if (path === "/settings") {
        say(label, "You're already on the Settings page — goal, backup and reset are all here.");
        setOpen(false);
      } else {
        showOnly("nav-settings", "Settings lives in the sidebar — highlighted for you.", label, {
          label: "Open Settings",
          go: "/settings",
        });
      }
      return;
    }
    if (isBackupQ) {
      const wantsImport = q.includes("import");
      const target = wantsImport ? "import-backup-btn" : "export-backup-btn";
      const verb = wantsImport ? "Import backup" : "Export backup";
      if (path === "/settings") {
        showOnly(target, `Click the highlighted ${verb} button.`, label);
      } else {
        showOnly("nav-settings", `${verb} lives in Settings — highlighted in the sidebar.`, label, {
          label: "Open Settings",
          go: "/settings",
          spot: target,
        });
      }
      return;
    }
    if (isOpenTasksQ) {
      if (path === "/tasks") {
        showOnly("tasks-open-filter", "Click the highlighted Open button to see all your open tasks.", label);
      } else {
        showOnly("nav-tasks", "Open tasks live under Tasks — highlighted in the sidebar.", label, {
          label: "Open Tasks",
          go: "/tasks",
          spot: "tasks-open-filter",
        });
      }
      return;
    }
    if (isLiamQ) {
      if (path === "/contacts") {
        showOnly("edit-contact-Liam Fox", "Click the highlighted Edit button on Liam Fox's row.", label);
      } else {
        showOnly("nav-contacts", "Liam Fox is in Contacts — highlighted in the sidebar.", label, {
          label: "Open Contacts",
          go: "/contacts",
          spot: "edit-contact-Liam Fox",
        });
      }
      return;
    }

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
    const mentionsOverdue = q.includes("overdue");
    const isCompleteOverdue =
      mentionsOverdue &&
      (q.includes("complete") || q.includes("finish") || q.includes("mark") || q.includes("done") || q.includes("clear"));
    const isClearDone = q.includes("clear") && q.includes("complet");
    const isDueToday = q.includes("due today");
    const isClosing = q.includes("closing") || q.includes("close date");
    const isExport =
      q.includes("export") || q.includes("backup") || q.includes("back up") || q.includes("download");
    const isGoal = q.includes("goal") || q.includes("target");
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
        setOpen(false);
        if (t.page !== path) {
          router.push(t.page);
          setTimeout(() => pulse(t.key), 600);
        } else {
          pulse(t.key);
        }
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
    } else if (isClosing) {
      const cutoff = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
      const closing = crm.deals.filter(
        (d) => (d.stage === "Lead" || d.stage === "Qualified") && d.closeDate && d.closeDate <= cutoff
      );
      answer = closing.length
        ? `Closing within 14 days: ${closing.map((d) => `"${d.title}" (${d.closeDate})`).join(", ")}.`
        : "Nothing closing in the next 14 days.";
      if (path !== "/deals") go = "/deals";
      mark = "Open deals";
    } else if (isExport) {
      download(`crm-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData());
      answer = "Backup downloaded as JSON.";
    } else if (isGoal) {
      const target = getGoal();
      const won = crm.deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
      const pct = Math.min(100, Math.round((won / target) * 100));
      answer = `$${won.toLocaleString()} won of $${target.toLocaleString()} goal (${pct}%).`;
      if (path !== "/") go = "/";
      mark = "Revenue goal";
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
    } else if (mentionsOverdue) {
      const today = new Date().toISOString().slice(0, 10);
      if (isCompleteOverdue) {
        const n = crm.tasks.filter((t) => !t.done && t.due && t.due < today).length;
        if (n) {
          mutate((c) => ({
            ...c,
            tasks: c.tasks.map((t) => (!t.done && t.due && t.due < today ? { ...t, done: true } : t)),
          }));
        }
        answer = n ? `Completed ${n} overdue task${n > 1 ? "s" : ""}.` : "No overdue tasks.";
      } else {
        const overdueTasks = crm.tasks.filter((t) => !t.done && t.due && t.due < today);
        const staleDeals = crm.deals.filter(
          (d) => (d.stage === "Lead" || d.stage === "Qualified") && d.closeDate && d.closeDate < today
        );
        if (!overdueTasks.length && !staleDeals.length) {
          answer = "Nothing overdue — all clear.";
        } else {
          const parts: string[] = [];
          if (overdueTasks.length)
            parts.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}: ${overdueTasks.map((t) => `"${t.title}"`).join(", ")}.`);
          if (staleDeals.length)
            parts.push(`${staleDeals.length} deal${staleDeals.length > 1 ? "s" : ""} past close date: ${staleDeals.map((d) => `"${d.title}"`).join(", ")}.`);
          answer = parts.join(" ");
        }
      }
      if (path !== "/tasks") go = "/tasks";
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
        contacts: [...c.contacts, { id: uid("c"), name: "Demo Contact", email: "demo@example.com", company: "Demo", phone: "555-0100", notes: "" }],
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
    if (mark) setTimeout(() => pulse(mark), go ? 600 : 0);
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
          className="pointer-events-none fixed z-50 transition-all duration-700 ease-in-out"
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
                clearPulse();
              }}
              className="ml-auto text-xs text-zinc-500 hover:underline"
            >
              Exit ✕
            </button>
          </div>
        </div>
      )}
      {toast && !guide && (
        <div className="toast-slide-in fixed bottom-3 left-4 z-40 max-w-sm rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white shadow-2xl dark:bg-white dark:text-zinc-900">
          <span>{toast.text}</span>
          {(() => {
            const a = toast.action;
            return a ? (
              <button onClick={() => goThere(a)} className="ml-2 font-medium underline underline-offset-2 hover:opacity-80">
                {a.label} →
              </button>
            ) : null;
          })()}
        </div>
      )}
    </>
  );
}
