"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, type Task } from "@/lib/crm";

const input =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";
const filters = ["All", "Open", "Done"] as const;

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
  onSave: (title: string, due: string) => void;
}) {
  const [title, setTitle] = useState(t.title);
  const [due, setDue] = useState(t.due);
  if (!editing) {
    return (
      <li
        className={`flex items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800 ${
          overdue ? "ring-2 ring-red-400" : ""
        }`}
      >
        <input type="checkbox" checked={t.done} onChange={onToggle} aria-label={`Mark ${t.title} ${t.done ? "open" : "done"}`} />
        <span className={t.done ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>{t.title}</span>
        <span className={`ml-auto text-xs ${overdue ? "font-semibold text-red-600" : "text-zinc-500 dark:text-zinc-400"}`}>
          {overdue ? `Overdue ${t.due}` : t.due || "No date"}
        </span>
        <button className="text-xs hover:underline" onClick={onEdit}>
          Edit
        </button>
        <button className="text-xs text-red-600 hover:underline" onClick={onDelete}>
          Delete
        </button>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
      <input autoFocus className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
      <div className="flex gap-2">
        <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button
          className="shrink-0 rounded bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-zinc-900"
          onClick={() => {
            if (title.trim()) onSave(title.trim(), due);
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
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
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

  const shown = useMemo(
    () =>
      tasks
        .filter((t) => (filter === "All" ? true : filter === "Open" ? !t.done : t.done))
        .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.title.localeCompare(b.title)),
    [tasks, filter]
  );

  const open = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - open;
  const overdueCount = tasks.filter(isOverdue).length;
  const todayCount = tasks.filter(isToday).length;

  const groups = useMemo(() => {
    if (filter !== "All") return null;
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
    onSave: (newTitle: string, newDue: string) => {
      update(tasks.map((x) => (x.id === t.id ? { ...x, title: newTitle, due: newDue } : x)));
      setEditing(null);
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Tasks</h1>

      <div data-spot="Task filters" className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">{open} open</span>
        <span className="rounded-full bg-white px-3 py-1 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">{doneCount} done</span>
        {overdueCount > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">
            {overdueCount} overdue
          </span>
        )}
        {todayCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {todayCount} due today
          </span>
        )}
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900 ${
              filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""
            }`}
          >
            {f}
          </button>
        ))}
        {doneCount > 0 && (
          <button
            onClick={() => update(tasks.filter((t) => !t.done))}
            className="rounded-full border px-3 py-1 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Clear done ✕
          </button>
        )}
      </div>

      <form
        data-spot="Add task form"
        className="flex gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          update([...tasks, { id: uid("t"), title: title.trim(), done: false, due }]);
          setTitle("");
          setDue("");
        }}
      >
        <input className={input} placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="shrink-0 rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add</button>
      </form>

      {shown.length === 0 ? (
        <p data-spot="Tasks due" className="rounded-lg bg-white p-6 text-center text-sm text-zinc-500 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          {tasks.length === 0 ? "No tasks yet — add your first one above." : `No ${filter.toLowerCase()} tasks.`}
        </p>
      ) : groups ? (
        <div data-spot="Tasks due">
          {groups.map((g) => (
          <section key={g.name}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.name}</h2>
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
      <p className="text-xs text-zinc-500">Press Shift + A to ask</p>
    </div>
  );
}
