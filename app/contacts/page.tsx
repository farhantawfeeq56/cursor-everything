"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { load, save, uid, download, type Contact } from "@/lib/crm";
import { input, card, chip, btnGhost, btnPrimary, pageSub } from "@/lib/ui";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dealCounts, setDealCounts] = useState<Record<string, { open: number; pipeline: number }>>({});
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const reload = () => {
      const crm = load();
      setContacts(crm.contacts);
      const counts: Record<string, { open: number; pipeline: number }> = {};
      for (const c of crm.contacts) {
        const mine = crm.deals.filter((d) => d.contact && d.contact.toLowerCase() === c.name.toLowerCase());
        counts[c.id] = {
          open: mine.filter((d) => d.stage === "Lead" || d.stage === "Qualified").length,
          pipeline: mine.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0),
        };
      }
      setDealCounts(counts);
    };
    reload();
    window.addEventListener("crm-changed", reload);
    return () => window.removeEventListener("crm-changed", reload);
  }, []);

  const update = (next: Contact[]) => {
    setContacts(next);
    const crm = load();
    save({ ...crm, contacts: next });
  };

  const addContact = () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("That email address looks invalid.");
      return;
    }
    if (contacts.some((c) => c.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setError("A contact with that name already exists.");
      return;
    }
    setError("");
    update([...contacts, { ...form, name: form.name.trim(), id: uid("c"), notes: "" }]);
    setForm({ name: "", email: "", company: "", phone: "" });
  };

  const exportCsv = () => {
    const rows = [["Name", "Email", "Company", "Phone", "Notes"], ...contacts.map((c) => [c.name, c.email, c.company, c.phone, c.notes])];
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    download("contacts.csv", csv, "text/csv");
  };

  const companies = useMemo(() => [...new Set(contacts.map((c) => c.company).filter(Boolean))].sort(), [contacts]);

  const shown = useMemo(
    () =>
      contacts
        .filter((c) => (company === "All" ? true : c.company === company))
        .filter((c) => `${c.name} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))),
    [contacts, q, company, sortAsc]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className={pageSub}>Everyone you do business with. Click Edit for inline changes and notes.</p>
        </div>
        <button onClick={exportCsv} className={btnGhost} title="Download all contacts as CSV">
          Export CSV ⬇
        </button>
      </div>

      <div data-spot="Contacts" className="flex flex-wrap items-center gap-2">
        <span className={chip}>{contacts.length} total</span>
        <span className={chip}>{shown.length} shown</span>
        <button onClick={() => setSortAsc((v) => !v)} className={btnGhost}>
          Sort {sortAsc ? "A→Z" : "Z→A"}
        </button>
        {(q || company !== "All") && (
          <button
            onClick={() => {
              setQ("");
              setCompany("All");
            }}
            className={btnGhost}
          >
            Clear filters ✕
          </button>
        )}
      </div>

      <div data-spot="Contact search" className="flex flex-wrap gap-2">
        <input className={`${input} max-w-xs`} placeholder="Search name, email, company or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} max-w-44`} value={company} onChange={(e) => setCompany(e.target.value)} title="Filter by company">
          <option>All</option>
          {companies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <form
        data-spot="Add contact form"
        className={`${card} grid grid-cols-2 gap-2 lg:grid-cols-5`}
        onSubmit={(e) => {
          e.preventDefault();
          addContact();
        }}
      >
        {(["name", "email", "company", "phone"] as const).map((k) => (
          <input
            key={k}
            className={input}
            placeholder={k}
            type={k === "email" ? "email" : "text"}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        ))}
        <button className={btnPrimary}>Add</button>
      </form>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {shown.length === 0 ? (
        <p className={`${card} text-center text-sm text-zinc-500`}>
          {contacts.length === 0 ? "No contacts yet — add your first one above." : "No contacts match your filters."}
        </p>
      ) : (
        <table className="overflow-hidden rounded-xl bg-white text-sm shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800">
          <thead>
            <tr className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {["Name", "Email", "Company", "Phone", "Deals", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {shown.map((c) => {
              const stats = dealCounts[c.id];
              const initial = c.name.trim().charAt(0).toUpperCase() || "?";
              return editing === c.id ? (
                <Fragment key={c.id}>
                  <tr key={`${c.id}-edit`}>
                    <td className="px-3 py-2">
                      <input autoFocus className={input} value={c.name} onChange={(e) => update(contacts.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={input} value={c.email} onChange={(e) => update(contacts.map((x) => (x.id === c.id ? { ...x, email: e.target.value } : x)))} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={input} value={c.company} onChange={(e) => update(contacts.map((x) => (x.id === c.id ? { ...x, company: e.target.value } : x)))} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={input} value={c.phone} onChange={(e) => update(contacts.map((x) => (x.id === c.id ? { ...x, phone: e.target.value } : x)))} />
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right">
                      <button className="text-sm font-medium text-green-600 hover:underline" onClick={() => setEditing(null)}>
                        Done
                      </button>
                    </td>
                  </tr>
                  <tr key={`${c.id}-notes`}>
                    <td colSpan={6} className="px-3 pb-3">
                      <textarea
                        className={input}
                        rows={2}
                        value={c.notes}
                        onChange={(e) => update(contacts.map((x) => (x.id === c.id ? { ...x, notes: e.target.value } : x)))}
                        placeholder="Notes about this contact…"
                      />
                    </td>
                  </tr>
                </Fragment>
              ) : (
                <tr key={c.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {initial}
                      </span>
                      <span>
                        <span className="block font-medium leading-tight">{c.name}</span>
                        {c.notes && <span className="block max-w-48 truncate text-xs italic text-zinc-400">{c.notes}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {c.email ? (
                      <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={`mailto:${c.email}`}>
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.company ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {c.company}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.phone ? (
                      <a className="hover:underline" href={`tel:${c.phone}`}>
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-zinc-500">
                    {stats && (stats.open > 0 || stats.pipeline > 0) ? `${stats.open} open · $${stats.pipeline.toLocaleString()}` : "No deals"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="mr-3 hover:underline" onClick={() => setEditing(c.id)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => update(contacts.filter((x) => x.id !== c.id))}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-xs text-zinc-500">Press Shift + A to ask, find or act.</p>
    </div>
  );
}
