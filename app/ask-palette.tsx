"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const cmds = ["Where are my contacts?", "Where are my deals?", "Where are my tasks?", "What is my pipeline worth?", "What can you do?"];

export default function AskPalette() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [spot, setSpot] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const palRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!spot) { setCursor(null); return; }
    const el = document.querySelector(`[data-spot="${spot}"]`);
    const pal = palRef.current?.getBoundingClientRect();
    const start = pal ? { x: pal.left + pal.width / 2, y: pal.top + pal.height / 2 } : { x: innerWidth / 2, y: innerHeight / 3 };
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
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (label: string) => {
    setMsgs((m) => [...m, label]);
    const q = label.toLowerCase();
    if (q.includes("contact")) { setSpot("Contacts"); router.push("/contacts"); }
    else if (q.includes("deal") && !q.includes("worth") && !q.includes("pipeline")) { setSpot("Open deals"); router.push("/deals"); }
    else if (q.includes("task")) { setSpot("Tasks due"); router.push("/tasks"); }
    else if (q.includes("pipeline") || q.includes("worth")) { setSpot("Pipeline $"); router.push("/deals"); }
    else setSpot(null);
    setTimeout(() => setOpen(false), 300);
  };

  return (
    <>
      <p className="fixed bottom-3 right-4 z-30 rounded-full bg-zinc-900 px-3 py-1 text-xs text-white shadow dark:bg-white dark:text-zinc-900">
        Shift + A to ask
      </p>
      {cursor && spot && (
        <span className="pointer-events-none fixed z-50 transition-all duration-1000 ease-in-out" style={{ left: cursor.x, top: cursor.y }}>
          <svg width="28" height="28" viewBox="0 0 24 24" className="drop-shadow-lg"><path d="M6 3l14 8-6.5 1.5L10 19z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </span>
      )}
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-32" onClick={() => setOpen(false)}>
          <div ref={palRef} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; run(draft.trim()); setDraft(""); }}>
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} placeholder="Type anything…" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {cmds.map((c) => (
                <button key={c} onClick={() => run(c)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">{c}</button>
              ))}
            </div>
            {msgs.length > 0 && (
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
                {msgs.map((m, i) => (
                  <li key={i} className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
