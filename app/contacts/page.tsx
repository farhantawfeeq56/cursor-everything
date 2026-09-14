"use client";
import { useEffect, useMemo, useState } from "react";
import { load, save, uid, type Contact } from "@/lib/crm";

const input =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dealCounts, setDealCounts] = useState<Record<string, { open: number; pipeline: number }>>({});
  const [q, setQ] = useState("");
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
        const mine = crm.deals.filter(
          (d) => d.contact && d.contact.toLowerCase() === c.name.toLowerCase()
        );
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
    update([...contacts, { ...form, name: form.name.trim(), id: uid("c") }]);
    setForm({ name: "", email: "", company: "", phone: "" });
  };

  const shown = useMemo(
    () =>
      contacts
        .filter((c) =>
          `${c.name} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase())
        )
        .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))),
    [contacts, q, sortAsc]
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Contacts</h1>

      <div data-spot="Contacts" className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          {contacts.length} total
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          {shown.length} shown
        </span>
        <button
          onClick={() => setSortAsc((v) => !v)}
          className="rounded-full border px-3 py-1 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sort {sortAsc ? "A→Z" : "Z→A"}
        </button>
        {q && (
          <button
            onClick={() => setQ("")}
            className="rounded-full border px-3 py-1 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Clear search ✕
          </button>
        )}
      </div>

      <div data-spot="Contact search" className="flex gap-2">
        <input className={input} placeholder="Search name, email, company or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <form
        data-spot="Add contact form"
        className="grid grid-cols-2 gap-2 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-5 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
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
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {shown.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-center text-sm text-zinc-500 shadow-sm dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          {contacts.length === 0 ? "No contacts yet — add your first one above." : "No contacts match your search."}
        </p>
      ) : (
        <table className="overflow-hidden rounded-lg bg-white text-sm shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
          <thead>
            <tr className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {["Name", "Email", "Company", "Phone", "Deals", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {shown.map((c) => {
              const stats = dealCounts[c.id];
              return (
                <tr key={c.id}>
                  {editing === c.id ? (
                    <>
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
                        <button className="text-sm text-green-600 hover:underline" onClick={() => setEditing(null)}>
                          Done
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">
                        {c.email ? (
                          <a className="text-blue-600 hover:underline" href={`mailto:${c.email}`}>
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{c.company || <span className="text-zinc-400">—</span>}</td>
                      <td className="px-3 py-2">
                        {c.phone ? (
                          <a className="hover:underline" href={`tel:${c.phone}`}>
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {stats && (stats.open > 0 || stats.pipeline > 0)
                          ? `${stats.open} open · $${stats.pipeline.toLocaleString()}`
                          : "No deals"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="mr-3 hover:underline" onClick={() => setEditing(c.id)}>
                          Edit
                        </button>
                        <button className="text-red-600 hover:underline" onClick={() => update(contacts.filter((x) => x.id !== c.id))}>
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-xs text-zinc-500">Press Shift + A to ask</p>
    </div>
  );
}
