"use client";
import { useEffect, useState } from "react";
import { load, save, uid, type Task } from "@/lib/crm";

const input = "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => setTasks(load().tasks), []);
  const update = (next: Task[]) => {
    setTasks(next);
    save({ ...load(), tasks: next });
  };
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <form
        className="flex gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          update([...tasks, { id: uid("t"), title, done: false, due }]);
          setTitle("");
          setDue("");
        }}
      >
        <input className={input} placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="shrink-0 rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add</button>
      </form>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
            <input type="checkbox" checked={t.done} onChange={() => update(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
            <span className={t.done ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>{t.title}</span>
            <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{t.due}</span>
            <button className="text-xs text-red-600 hover:underline" onClick={() => update(tasks.filter((x) => x.id !== t.id))}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
