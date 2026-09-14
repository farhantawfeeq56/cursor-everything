"use client";
import { useEffect, useState } from "react";
import { load, save, uid, type Contact } from "@/lib/crm";

const input = "rounded border border-zinc-300 bg-white px-2 py-1 text-sm w-full dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "" });
  useEffect(() => setContacts(load().contacts), []);
  const update = (next: Contact[]) => {
    setContacts(next);
    const crm = load();
    save({ ...crm, contacts: next });
  };
  const shown = contacts.filter((c) => `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Contacts</h1>
      <div className="flex gap-2">
        <input className={input} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <form
        className="grid grid-cols-2 gap-2 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-5 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          update([...contacts, { ...form, id: uid("c") }]);
          setForm({ name: "", email: "", company: "", phone: "" });
        }}
      >
        {(["name", "email", "company", "phone"] as const).map((k) => (
          <input key={k} className={input} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-zinc-900">Add</button>
      </form>
      <table className="overflow-hidden rounded-lg bg-white text-sm shadow-sm dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
        <thead>
          <tr className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {["Name", "Email", "Company", "Phone", ""].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {shown.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 font-medium">{c.name}</td>
              <td className="px-3 py-2">{c.email}</td>
              <td className="px-3 py-2">{c.company}</td>
              <td className="px-3 py-2">{c.phone}</td>
              <td className="px-3 py-2 text-right">
                <button className="text-red-600 hover:underline" onClick={() => update(contacts.filter((x) => x.id !== c.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
