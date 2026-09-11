"use client";

import { FormEvent, useState } from "react";
import { KeyRound, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Onboarding({ email }: { email: string }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Access code မမှန်ပါ");
    else window.location.reload();
    setSaving(false);
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#08111f] px-4 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101a2b] p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShoppingBag /></span>
          <div><h1 className="text-xl font-bold">Digital Sales</h1><p className="text-xs text-slate-400">{email}</p></div>
        </div>
        <h2 className="mb-1 text-lg font-semibold">Workspace ဝင်ရန်</h2>
        <p className="mb-5 text-sm leading-6 text-slate-400">Admin သို့မဟုတ် Staff Access Code ကို ဖြည့်ပါ။</p>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-slate-300">အမည်<Input name="displayName" required placeholder="Han Thaw Min" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Access Code<div className="relative"><KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input name="code" required className="pl-9" placeholder="Access code" /></div></label>
          {error && <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
          <Button disabled={saving} className="h-11 bg-emerald-400 text-slate-950 hover:bg-emerald-300">{saving ? "စစ်ဆေးနေပါတယ်…" : "Workspace ဝင်မယ်"}</Button>
        </form>
      </section>
    </main>
  );
}
