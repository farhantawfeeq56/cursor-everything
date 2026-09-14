import type { DealStage, TaskPriority } from "./crm";

/** Shared design tokens — one accent system for the whole app. */

export const input =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm w-full outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-900";

export const card =
  "rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800";

export const btnPrimary =
  "rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700";

export const chip =
  "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800";

export const btnGhost =
  "rounded-full border border-zinc-300 px-3 py-1 text-sm transition hover:bg-white disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900";

export const pageSub = "text-sm text-zinc-500 dark:text-zinc-400";

export const STAGE: Record<DealStage, { bar: string; pill: string; dot: string }> = {
  Lead: {
    bar: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
  Qualified: {
    bar: "bg-blue-500",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  Won: {
    bar: "bg-green-500",
    pill: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    dot: "bg-green-500",
  },
  Lost: {
    bar: "bg-red-400",
    pill: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-400",
  },
};

export const PRIORITY: Record<TaskPriority, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};
