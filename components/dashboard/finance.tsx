"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type FinanceEntry = { id: number; kind: "capital" | "stock_expense"; label: string; amount: number; entryDate: string; paymentMethod: string; note: string; automatic: boolean };
export type FinanceSummary = { capital: number; stockSpending: number; received: number };
type Submit = (e: FormEvent<HTMLFormElement>, close: (v: boolean) => void) => Promise<void>;
const money = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} Ks`;

export function Finance({ entries, summary, isAdmin, saving, onSubmit }: { entries: FinanceEntry[]; summary: FinanceSummary; isAdmin: boolean; saving: boolean; onSubmit: Submit }) {
  return <section className="space-y-5">
    <h3 className="font-semibold text-white">အရင်းနှင့် Stock ဝယ်ငွေ</h3>
    <div className="grid grid-cols-2 gap-3">
      {[["ထည့်ဝင်အရင်း စုစုပေါင်း", summary.capital], ["Stock ဝယ်ကုန်ကျငွေ", summary.stockSpending], ["အရောင်းက ရရှိငွေ", summary.received], ["စာရင်းအရ လက်ကျန်ငွေ", summary.capital + summary.received - summary.stockSpending]].map(([label, amount]) => <article key={String(label)} className="rounded-2xl border border-white/10 bg-[#101a2b] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-lg font-bold text-emerald-300">{money(Number(amount))}</p></article>)}
    </div>
    <p className="rounded-xl bg-cyan-400/10 p-3 text-xs leading-6 text-cyan-200">လက်ကျန် = အရင်း + ရရှိငွေ − Stock ဝယ်ငွေ။ အမြတ်နဲ့ မတူပါ။ ဒီမှာမှတ်ထားတဲ့ ငွေဝင်/ငွေထွက်ကိုသာ တွက်ထားပါတယ်။ အရင်း 30,000 Ks စီကို Han နဲ့ Partner အဖြစ် မှတ်ထားပြီး Admin က နာမည်နဲ့ရက်စွဲ ပြင်နိုင်ပါတယ်။</p>
    {isAdmin && <div className="flex flex-wrap gap-2"><EntryDialog kind="capital" saving={saving} onSubmit={onSubmit} /><EntryDialog kind="stock_expense" saving={saving} onSubmit={onSubmit} /></div>}
    <p className="text-xs leading-6 text-slate-400">Product/Stock ထည့်ခြင်းနဲ့ ငွေစာရင်းက သီးခြားဖြစ်ပါတယ်။ ဝယ်ယူကုန်ကျငွေကို “Stock ဝယ်ငွေထည့်ရန်” မှာ တစ်ကြိမ်သာဖြည့်ပါ။ ဒီနေရာက ငွေစာရင်းထည့်ခြင်းသည် Stock အရေအတွက်ကို မပြောင်းပါ။</p>
    <div className="space-y-3">{entries.map(entry => <article key={entry.id} className="rounded-2xl border border-white/10 bg-[#101a2b] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-slate-400">{entry.kind === "capital" ? "ထည့်ဝင်အရင်း" : "Stock ဝယ်ငွေ"}{entry.automatic ? " · Auto" : ""}</p><h4 className="mt-1 break-words font-semibold text-white">{entry.label}</h4></div><p className={`shrink-0 font-bold ${entry.kind === "capital" ? "text-emerald-300" : "text-amber-300"}`}>{money(entry.amount)}</p></div><p className="mt-3 text-xs text-slate-400">{entry.entryDate} · {entry.paymentMethod}</p>{entry.note && <p className="mt-2 break-words text-xs leading-5 text-slate-500">{entry.note}</p>}{isAdmin && <div className="mt-3"><EntryDialog kind={entry.kind} entry={entry} saving={saving} onSubmit={onSubmit} /></div>}</article>)}{!entries.length && <p className="py-8 text-center text-slate-400">ငွေစာရင်း မရှိသေးပါ</p>}</div>
    <p className="text-xs text-slate-500">နောက်ဆုံး မှတ်တမ်း 250 ခုကိုပြထားပြီး စုစုပေါင်းက မှတ်တမ်းအားလုံးကို တွက်ထားပါတယ်။</p>
  </section>;
}

function EntryDialog({ kind, entry, saving, onSubmit }: { kind: FinanceEntry["kind"]; entry?: FinanceEntry; saving: boolean; onSubmit: Submit }) {
  const [open, setOpen] = useState(false);
  const title = entry ? "ငွေစာရင်းပြင်ရန်" : kind === "capital" ? "အရင်းထည့်ရန်" : "Stock ဝယ်ငွေထည့်ရန်";
  const deleteSubmit = (e: FormEvent<HTMLFormElement>) => { if (!window.confirm("ဒီငွေစာရင်းကို ဖျက်မှာ သေချာပါသလား?")) { e.preventDefault(); return; } void onSubmit(e, setOpen); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="border-white/10 bg-white/5 text-white">{entry ? "ပြင်ရန်" : title}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#101a2b] text-white"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>ပမာဏအားလုံးကို Ks ဖြင့်ဖြည့်ပါ။ Stock အရေအတွက် မပြောင်းပါ။</DialogDescription></DialogHeader><form onSubmit={e => void onSubmit(e, setOpen)} className="form-grid"><input type="hidden" name="action" value={entry ? "edit-finance" : "add-finance"} /><input type="hidden" name="kind" value={kind} />{entry && <input type="hidden" name="id" value={entry.id} />}<label className="grid gap-2 text-sm">{kind === "capital" ? "ထည့်ဝင်သူအမည်" : "Product / ဝယ်ယူသည့်အကြောင်းအရာ"}<Input name="label" defaultValue={entry?.label} required /></label><label className="grid gap-2 text-sm">ပမာဏ (Ks)<Input name="amount" type="number" inputMode="numeric" min="1" step="1" defaultValue={entry?.amount ?? (kind === "capital" ? 30000 : undefined)} required /></label><label className="grid gap-2 text-sm">ရက်စွဲ<Input name="entryDate" type="date" defaultValue={entry?.entryDate ?? new Date().toISOString().slice(0, 10)} required /></label><label className="grid gap-2 text-sm">ငွေပေးချေမှု<select name="paymentMethod" defaultValue={entry?.paymentMethod ?? "Cash"} className="h-11 rounded-xl border border-white/10 bg-[#101a2b] px-3">{["Cash", "KPay", "Wave", "Bank", "USDT"].map(method => <option key={method}>{method}</option>)}</select></label><label className="grid gap-2 text-sm">မှတ်ချက်<Input name="note" defaultValue={entry?.note} /></label><Button disabled={saving} className="h-11 bg-emerald-400 text-slate-950">{saving ? "သိမ်းနေပါတယ်…" : "သိမ်းမယ်"}</Button></form>{entry && <form onSubmit={deleteSubmit} className="mt-2 border-t border-white/10 pt-4"><input type="hidden" name="action" value="delete-finance" /><input type="hidden" name="id" value={entry.id} /><Button disabled={saving} variant="outline" className="w-full border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20">ငွေစာရင်းဖျက်မယ်</Button></form>}</DialogContent></Dialog>;
}
