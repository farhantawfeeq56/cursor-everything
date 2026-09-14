"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, type Task, type TaskPriority } from "@/lib/crm";
import { input, card, chip, btnGhost, btnPrimary, pageSub, PRIORITY } from "@/lib/ui";

const filters = ["All", "Open", "Done"] as const;
const priorities: TaskPriority[] = ["High", "Medium", "Low"];

function TaskRow({
  t,
  overdue,
  editing,
  onToggle,
  onDelete,
  onEdit,
  onSave,
}: {
  t: Task;
  overdue: boolean;
  editing: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (title: string, due: string, priority: TaskPriority) => void;
}) {
  const [title, setTitle] = useState(t.title);
  const [due, setDue] = useState(t.due);
  const [priority, setPriority] = useState<TaskPriority>(t.priority);
  if (!editing) {
    return (
      <li
        className={`flex items-center gap-3 rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-zinc-200/80 transition hover:shadow dark:bg-zinc-900 dark:ring-zinc-800 ${
          overdue ? "ring-2 ring-red-400" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={t.done}
          onChange={onToggle}
          aria-label={`Mark ${t.title} ${t.done ? "open" : "done"}`}
          className="h-4 w-4 accent-indigo-600"
        />
        <span className={t.done ? "line-through text-zinc-400 dark:text-zinc-500" : "font-medium"}>{t.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY[t.priority]}`}>{t.priority}</span>
        <span className={`ml-auto shrink-0 text-xs ${overdue ? "font-semibold text-red-600" : "text-zinc-500 dark:text-zinc-400"}`}>
          {overdue ? `Overdue ${t.due}` : t.due || "No date"}
        </span>
        <button className="shrink-0 text-xs hover:underline" onClick={onEdit}>
          Edit
        </button>
        <button className="shrink-0 text-xs text-red-600 hover:underline" onClick={onDelete}>
          Delete
        </button>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white p-3 text-sm shadow-sm ring-2 ring-indigo-300 dark:bg-zinc-900 dark:ring-indigo-700">
      <input autoFocus className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
      <div className="flex gap-2">
        <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <select className={input} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          className={`${btnPrimary} shrink-0 !py-1`}
          onClick={() => {
            if (title.trim()) onSave(title.trim(), due, priority);
          }}
        >
          Save
        </button>
      </div>
    </li>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskPriority>("All");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => setTasks(load().tasks);
    reload();
    window.addEventListener("crm-changed", reload);
    return () => window.removeEventListener("crm-changed", reload);
  }, []);

  const update = (next: Task[]) => {
    setTasks(next);
    save({ ...load(), tasks: next });
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t: Task) => !t.done && !!t.due && t.due < today;
  const isToday = (t: Task) => !t.done && t.due === today;
  const rank: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

  const shown = useMemo(
    () =>
      tasks
        .filter((t) => (filter === "All" ? true : filter === "Open" ? !t.done : t.done))
        .filter((t) => (priorityFilter === "All" ? true : t.priority === priorityFilter))
        .filter((t) => t.title.toLowerCase().includes(q.toLowerCase()))
        .sort(
          (a, b) =>
            (a.due || "9999").localeCompare(b.due || "9999") || rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, filter, priorityFilter, q]
  );

  const open = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - open;
  const overdueCount = tasks.filter(isOverdue).length;
  const todayCount = tasks.filter(isToday).length;

  const groups = useMemo(() => {
    if (filter !== "All" || priorityFilter !== "All" || q) return null;
    const overdue = shown.filter(isOverdue);
    const dueToday = shown.filter(isToday);
    const upcoming = shown.filter((t) => !t.done && t.due && t.due > today);
    const noDate = shown.filter((t) => !t.done && !t.due);
    const done = shown.filter((t) => t.done);
    return [
      { name: "Overdue", items: overdue },
      { name: "Due today", items: dueToday },
      { name: "Upcoming", items: upcoming },
      { name: "No date", items: noDate },
      { name: "Done", items: done },
    ].filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const rowProps = (t: Task) => ({
    overdue: isOverdue(t),
    editing: editing === t.id,
    onToggle: () => update(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))),
    onDelete: () => update(tasks.filter((x) => x.id !== t.id)),
    onEdit: () => setEditing(t.id),
    onSave: (newTitle: string, newDue: string, newPriority: TaskPriority) => {
      update(tasks.map((x) => (x.id === t.id ? { ...x, title: newTitle, due: newDue, priority: newPriority } : x)));
      setEditing(null);
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className={pageSub}>Grouped by urgency. Set a priority and a due date on everything.</p>
      </div>

      <div data-spot="Task filters" className="flex flex-wrap gap-2 text-sm">
        <span className={chip}>{open} open</span>
        <span className={chip}>{doneCount} done</span>
        {overdueCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {overdueCount} overdue
          </span>
        )}
        {todayCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {todayCount} due today
          </span>
        )}
        {filters.map((f) => (
          <button
            key={f}
            data-spot={f === "Open" ? "tasks-open-filter" : undefined}
            onClick={() => setFilter(f)}
            className={`${btnGhost} ${filter === f ? "!border-indigo-600 !bg-indigo-600 !text-white dark:!border-indigo-500 dark:!bg-indigo-600" : ""}`}
          >
            {f}
          </button>
        ))}
        {doneCount > 0 && (
          <button onClick={() => update(tasks.filter((t) => !t.done))} className={btnGhost}>
            Clear done ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input className={`${input} max-w-55`} placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} max-w-40`} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as "All" | TaskPriority)} title="Filter by priority">
          <option value="All">All priorities</option>
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {(q || priorityFilter !== "All") && (
          <button
            onClick={() => {
              setQ("");
              setPriorityFilter("All");
            }}
            className={btnGhost}
          >
            Clear ✕
          </button>
        )}
      </div>

      <form
        data-spot="Add task form"
        className={`${card} flex flex-wrap gap-2`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          update([...tasks, { id: uid("t"), title: title.trim(), done: false, due, priority }]);
          setTitle("");
          setDue("");
          setPriority("Medium");
        }}
      >
        <input className={`${input} min-w-40 flex-1`} placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={`${input} max-w-40`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <select className={`${input} max-w-32`} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} title="Priority">
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button className={btnPrimary}>Add</button>
      </form>

      {shown.length === 0 ? (
        <p data-spot="Tasks due" className={`${card} text-center text-sm text-zinc-500`}>
          {tasks.length === 0 ? "No tasks yet — add your first one above." : "No tasks match your filters."}
        </p>
      ) : groups ? (
        <div data-spot="Tasks due" className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.name}>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">{g.name}</h2>
              <ul className="flex flex-col gap-2">
                {g.items.map((t) => (
                  <TaskRow key={t.id} t={t} {...rowProps(t)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul data-spot="Tasks due" className="flex flex-col gap-2">
          {shown.map((t) => (
            <TaskRow key={t.id} t={t} {...rowProps(t)} />
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-500">Press Shift + A to ask, find or act.</p>
    </div>
  );
}
