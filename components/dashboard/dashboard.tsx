"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, Boxes, CalendarClock, CircleDollarSign, Clock3, LogOut, PackagePlus, Plus, RefreshCcw, Search, ShoppingBag, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type User = { displayName: string; email: string; role: "admin" | "staff" };
type Product = { id: number; name: string; packageName: string; purchasePrice: number; defaultSalePrice: number; stock: number; lowStockAt: number; supplier: string };
type Sale = { id: number; productName: string; customerName: string; customerContact: string; quantity: number; purchasePrice: number; salePrice: number; paidAmount: number; paymentMethod: string; paymentStatus: "paid" | "partial" | "unpaid"; saleDate: string; expiryDate: string; staffName: string; note: string };
type Data = { user: User; products: Product[]; sales: Sale[] };

const money = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} Ks`;
const today = () => new Date().toISOString().slice(0, 10);
const inThirtyDays = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
const dayDiff = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000);

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saleOpen, setSaleOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true); setError("");
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "စာရင်းဖွင့်လို့မရပါ"); else setData(body);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "read_sales_summary",
        title: "Read sales summary",
        description: "Read the current monthly revenue, profit, stock, unpaid balance, and expiring account counts.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        async execute() {
          const response = await fetch("/api/dashboard", { cache: "no-store" });
          if (!response.ok) throw new Error("Dashboard data is unavailable");
          const current = await response.json() as Data;
          const month = today().slice(0, 7);
          const monthSales = current.sales.filter(s => s.saleDate.startsWith(month));
          return {
            month,
            revenue: monthSales.reduce((a, s) => a + s.salePrice * s.quantity, 0),
            profit: current.user.role === "admin" ? monthSales.reduce((a, s) => a + (s.salePrice - s.purchasePrice) * s.quantity, 0) : null,
            stock: current.products.reduce((a, p) => a + p.stock, 0),
            expiringWithin7Days: current.sales.filter(s => dayDiff(s.expiryDate) >= 0 && dayDiff(s.expiryDate) <= 7).length,
          };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "create_sale",
        title: "Create sale",
        description: "Record a completed digital product sale and reduce its stock.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "integer" }, customerName: { type: "string", minLength: 1 }, customerContact: { type: "string" },
            quantity: { type: "integer", minimum: 1 }, salePrice: { type: "integer", minimum: 0 }, paidAmount: { type: "integer", minimum: 0 },
            paymentMethod: { type: "string", enum: ["KPay", "Wave", "Bank", "Cash", "USDT"] }, saleDate: { type: "string" }, expiryDate: { type: "string" }, note: { type: "string" },
          },
          required: ["productId", "customerName", "quantity", "salePrice", "paidAmount", "paymentMethod", "saleDate", "expiryDate"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          if (!input || typeof input !== "object") throw new Error("Valid sale details are required");
          const values = input as Record<string, unknown>;
          if (!Number.isInteger(values.productId) || !String(values.customerName ?? "").trim()) throw new Error("productId and customerName are required");
          const response = await fetch("/api/dashboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add-sale", ...values }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Sale could not be saved");
          await load();
          return { id: result.sale.id, status: "saved", customerName: result.sale.customerName, productName: result.sale.productName };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const metrics = useMemo(() => {
    const sales = data?.sales ?? [];
    const month = today().slice(0, 7);
    const monthly = sales.filter(s => s.saleDate.startsWith(month));
    return {
      revenue: monthly.reduce((a, s) => a + s.salePrice * s.quantity, 0),
      profit: monthly.reduce((a, s) => a + (s.salePrice - s.purchasePrice) * s.quantity, 0),
      stock: (data?.products ?? []).reduce((a, p) => a + p.stock, 0),
      expiring: sales.filter(s => dayDiff(s.expiryDate) >= 0 && dayDiff(s.expiryDate) <= 7).length,
      unpaid: sales.reduce((a, s) => a + Math.max(0, s.salePrice * s.quantity - s.paidAmount), 0),
    };
  }, [data]);

  const filteredSales = (data?.sales ?? []).filter(s => `${s.customerName} ${s.productName} ${s.customerContact}`.toLowerCase().includes(search.toLowerCase()));

  async function submit(e: FormEvent<HTMLFormElement>, close: (v: boolean) => void) {
    e.preventDefault(); setSaving(true); setError("");
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch("/api/dashboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "သိမ်းလို့မရပါ"); else { close(false); await load(); }
    setSaving(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  if (loading && !data) return <Loading />;

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--foreground)] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0b1220]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShoppingBag className="size-5" /></div>
            <div><h1 className="text-[17px] font-bold tracking-tight text-white">Digital Sales</h1><p className="text-xs text-slate-400">{data?.user.displayName} · {data?.user.role === "admin" ? "Admin" : "Staff"}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => void load()} aria-label="Refresh" className="text-slate-300 hover:bg-white/8 hover:text-white"><RefreshCcw className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Logout" className="text-slate-300 hover:bg-white/8 hover:text-white"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-5 md:px-8 md:pt-8">
        {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
        <section className="mb-6 flex items-end justify-between gap-4">
          <div><p className="mb-1 text-sm text-slate-400">ဒီလစာရင်း</p><h2 className="text-2xl font-bold text-white md:text-3xl">အရောင်း Dashboard</h2></div>
          <div className="hidden gap-2 md:flex"><ProductDialog open={productOpen} setOpen={setProductOpen} onSubmit={submit} saving={saving} isAdmin={data?.user.role === "admin"} /><SaleDialog open={saleOpen} setOpen={setSaleOpen} onSubmit={submit} saving={saving} products={data?.products ?? []} /></div>
        </section>

        <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric icon={CircleDollarSign} label="ရောင်းရငွေ" value={money(metrics.revenue)} tone="emerald" />
          <Metric icon={ArrowDownLeft} label="အမြတ်" value={money(metrics.profit)} tone="cyan" adminOnly={data?.user.role !== "admin"} />
          <Metric icon={Boxes} label="Stock" value={`${metrics.stock} ခု`} tone="violet" />
          <Metric icon={CalendarClock} label="7 ရက်အတွင်းကုန်မည်" value={`${metrics.expiring} ခု`} tone="amber" />
          <Metric icon={WalletCards} label="ရရန်ကျန်ငွေ" value={money(metrics.unpaid)} tone="rose" />
        </section>

        <Tabs defaultValue="sales" className="gap-5">
          <TabsList className="fixed inset-x-3 bottom-3 z-40 mx-auto grid h-16 max-w-md grid-cols-3 rounded-2xl border border-white/10 bg-[#111b2d]/95 p-1.5 shadow-2xl backdrop-blur-xl md:static md:mx-0 md:h-11 md:w-fit md:grid-cols-3 md:rounded-xl">
            <TabsTrigger value="sales" className="rounded-xl text-xs md:text-sm"><ShoppingBag /> အရောင်း</TabsTrigger>
            <TabsTrigger value="stock" className="rounded-xl text-xs md:text-sm"><Boxes /> Stock</TabsTrigger>
            <TabsTrigger value="expiry" className="rounded-xl text-xs md:text-sm"><Clock3 /> Expired</TabsTrigger>
          </TabsList>
          <TabsContent value="sales"><SalesList sales={filteredSales} search={search} setSearch={setSearch} isAdmin={data?.user.role === "admin"} /></TabsContent>
          <TabsContent value="stock"><StockList products={data?.products ?? []} isAdmin={data?.user.role === "admin"} /></TabsContent>
          <TabsContent value="expiry"><ExpiryList sales={data?.sales ?? []} /></TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-24 right-4 z-30 flex flex-col gap-2 md:hidden">
        {data?.user.role === "admin" && <ProductDialog open={productOpen} setOpen={setProductOpen} onSubmit={submit} saving={saving} isAdmin />}
        <SaleDialog open={saleOpen} setOpen={setSaleOpen} onSubmit={submit} saving={saving} products={data?.products ?? []} compact />
      </div>
    </main>
  );
}

function Loading() { return <main className="grid min-h-screen place-items-center bg-[#08111f] text-slate-300"><div className="text-center"><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-emerald-400/20 border-t-emerald-400" /><p>စာရင်းဖွင့်နေပါတယ်…</p></div></main>; }
function Metric({ icon: Icon, label, value, tone, adminOnly }: { icon: typeof Boxes; label: string; value: string; tone: string; adminOnly?: boolean }) { return <article className={`metric-card metric-${tone}`}><div className="mb-4 flex items-center justify-between"><span className="metric-icon"><Icon className="size-4" /></span><span className="text-[11px] text-slate-500">ဒီလ</span></div><p className="mb-1 text-xs text-slate-400">{label}</p><p className="truncate text-lg font-bold text-white">{adminOnly ? "••••••" : value}</p></article>; }

function SalesList({ sales, search, setSearch, isAdmin }: { sales: Sale[]; search: string; setSearch: (s: string) => void; isAdmin: boolean }) { return <section><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold text-white">နောက်ဆုံးအရောင်းများ</h3><div className="relative w-48 md:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Customer ရှာရန်" className="border-white/10 bg-white/5 pl-9 text-white" /></div></div><div className="space-y-3">{sales.length ? sales.map(s => <SaleCard key={s.id} sale={s} isAdmin={isAdmin} />) : <Empty text="အရောင်းစာရင်း မရှိသေးပါ" />}</div></section>; }
function SaleCard({ sale: s, isAdmin }: { sale: Sale; isAdmin: boolean }) { const remaining = s.salePrice * s.quantity - s.paidAmount; return <article className="rounded-2xl border border-white/8 bg-[#101a2b] p-4 transition hover:border-white/15"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><h4 className="truncate font-semibold text-white">{s.customerName}</h4><Status status={s.paymentStatus} /></div><p className="truncate text-sm text-slate-400">{s.productName} · {s.quantity} ခု</p></div><p className="shrink-0 font-bold text-emerald-300">{money(s.salePrice * s.quantity)}</p></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/7 pt-3 text-xs text-slate-500 md:grid-cols-4"><span>ဝယ်ရက် · {s.saleDate}</span><span>ကုန်ရက် · {s.expiryDate}</span><span>{s.paymentMethod}{remaining > 0 ? ` · ${money(remaining)} ကျန်` : ""}</span><span className="md:text-right">{s.staffName}</span></div>{isAdmin && <p className="mt-2 text-xs text-cyan-300/80">အမြတ် {money((s.salePrice - s.purchasePrice) * s.quantity)}</p>}</article>; }
function StockList({ products, isAdmin }: { products: Product[]; isAdmin: boolean }) { return <section><h3 className="mb-4 font-semibold text-white">Product & Stock</h3><div className="grid gap-3 md:grid-cols-2">{products.length ? products.map(p => <article key={p.id} className="rounded-2xl border border-white/8 bg-[#101a2b] p-4"><div className="flex items-start justify-between"><div><h4 className="font-semibold text-white">{p.name}</h4><p className="text-sm text-slate-500">{p.packageName || "Package မသတ်မှတ်ထား"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.stock <= p.lowStockAt ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/12 text-emerald-300"}`}>{p.stock} ခု</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-500">ရောင်းဈေး</p><p className="mt-1 text-slate-200">{money(p.defaultSalePrice)}</p></div>{isAdmin && <div><p className="text-xs text-slate-500">ဝယ်ဈေး</p><p className="mt-1 text-slate-200">{money(p.purchasePrice)}</p></div>}</div>{p.stock <= p.lowStockAt && <p className="mt-4 flex items-center gap-1.5 text-xs text-amber-300"><AlertTriangle className="size-3.5" />Stock ပြန်ဖြည့်ရန်လိုပါပြီ</p>}</article>) : <Empty text="Product မထည့်ရသေးပါ" />}</div></section>; }
function ExpiryList({ sales }: { sales: Sale[] }) { const sorted = [...sales].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)); return <section><h3 className="mb-4 font-semibold text-white">သက်တမ်းကုန်ဆုံးမှု</h3><div className="space-y-3">{sorted.length ? sorted.map(s => { const days = dayDiff(s.expiryDate); const tone = days < 0 ? "bg-red-400/15 text-red-300" : days <= 7 ? "bg-amber-400/15 text-amber-300" : "bg-cyan-400/10 text-cyan-300"; return <article key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#101a2b] p-4"><div className="min-w-0"><h4 className="truncate font-semibold text-white">{s.customerName}</h4><p className="truncate text-sm text-slate-500">{s.productName} · {s.expiryDate}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{days < 0 ? `${Math.abs(days)} ရက်ကျော်` : days === 0 ? "ဒီနေ့ကုန်" : `${days} ရက်ကျန်`}</span></article>; }) : <Empty text="Expired စာရင်းမရှိသေးပါ" />}</div></section>; }
function Status({ status }: { status: Sale["paymentStatus"] }) { const map = { paid: ["Paid", "bg-emerald-400/12 text-emerald-300"], partial: ["Partial", "bg-amber-400/15 text-amber-300"], unpaid: ["Unpaid", "bg-red-400/15 text-red-300"] } as const; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[status][1]}`}>{map[status][0]}</span>; }
function Empty({ text }: { text: string }) { return <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500"><Boxes className="mx-auto mb-3 size-7 opacity-50" />{text}</div>; }

type Submit = (e: FormEvent<HTMLFormElement>, close: (v: boolean) => void) => Promise<void>;
function ProductDialog({ open, setOpen, onSubmit, saving, isAdmin }: { open: boolean; setOpen: (v: boolean) => void; onSubmit: Submit; saving: boolean; isAdmin?: boolean }) { if (!isAdmin) return null; return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10"><PackagePlus /> <span className="hidden md:inline">Product ထည့်ရန်</span></Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#101a2b] text-white"><DialogHeader><DialogTitle>Product အသစ်ထည့်ရန်</DialogTitle><DialogDescription>ဈေးနှုန်းနဲ့ Stock ကို တစ်ခါတည်းသတ်မှတ်ပါ။</DialogDescription></DialogHeader><form onSubmit={e => void onSubmit(e, setOpen)} className="form-grid"><input type="hidden" name="action" value="add-product" /><Field label="Product Name"><Input name="name" placeholder="ဥပမာ Gemini Pro" required /></Field><Field label="Package"><Input name="packageName" placeholder="ဥပမာ 1 Month" /></Field><div className="grid grid-cols-2 gap-3"><Field label="ဝယ်ဈေး"><Input name="purchasePrice" type="number" inputMode="numeric" min="0" required /></Field><Field label="ရောင်းဈေး"><Input name="defaultSalePrice" type="number" inputMode="numeric" min="0" required /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Stock"><Input name="stock" type="number" inputMode="numeric" min="0" required /></Field><Field label="Low Stock Alert"><Input name="lowStockAt" type="number" defaultValue="5" min="0" /></Field></div><Field label="Supplier"><Input name="supplier" placeholder="Supplier name / contact" /></Field><Button disabled={saving} className="mt-2 h-11 bg-emerald-400 text-slate-950 hover:bg-emerald-300">{saving ? "သိမ်းနေပါတယ်…" : "Product သိမ်းမယ်"}</Button></form></DialogContent></Dialog>; }
function SaleDialog({ open, setOpen, onSubmit, saving, products, compact }: { open: boolean; setOpen: (v: boolean) => void; onSubmit: Submit; saving: boolean; products: Product[]; compact?: boolean }) { const [selected, setSelected] = useState(""); const product = products.find(p => String(p.id) === selected); return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button disabled={!products.length} size={compact ? "icon-lg" : "default"} className="rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15 hover:bg-emerald-300"><Plus />{!compact && "အရောင်းအသစ်"}</Button></DialogTrigger><DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101a2b] text-white"><DialogHeader><DialogTitle>အရောင်းအသစ်မှတ်ရန်</DialogTitle><DialogDescription>Customer၊ ငွေပေးချေမှုနဲ့ Expired Date ကိုဖြည့်ပါ။</DialogDescription></DialogHeader><form onSubmit={e => void onSubmit(e, setOpen)} className="form-grid"><input type="hidden" name="action" value="add-sale" /><input type="hidden" name="productId" value={selected} /><Field label="Product"><Select value={selected} onValueChange={setSelected} required><SelectTrigger className="w-full"><SelectValue placeholder="Product ရွေးပါ" /></SelectTrigger><SelectContent>{products.filter(p => p.stock > 0).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}{p.packageName ? ` · ${p.packageName}` : ""} ({p.stock})</SelectItem>)}</SelectContent></Select></Field><Field label="Customer Name"><Input name="customerName" required /></Field><Field label="ဖုန်း / Telegram"><Input name="customerContact" placeholder="Optional" /></Field><div className="grid grid-cols-2 gap-3"><Field label="အရေအတွက်"><Input name="quantity" type="number" defaultValue="1" min="1" max={product?.stock || 1} /></Field><Field label="ရောင်းဈေး (တစ်ခု)"><Input name="salePrice" type="number" defaultValue={product?.defaultSalePrice || ""} key={product?.id} min="0" required /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="ရောင်းသည့်ရက်"><Input name="saleDate" type="date" defaultValue={today()} required /></Field><Field label="Expired Date"><Input name="expiryDate" type="date" defaultValue={inThirtyDays()} required /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="ရရှိငွေ"><Input name="paidAmount" type="number" min="0" defaultValue={product?.defaultSalePrice || ""} key={`paid-${product?.id}`} /></Field><Field label="ငွေပေးချေမှု"><Select name="paymentMethod" defaultValue="KPay"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KPay">KPay</SelectItem><SelectItem value="Wave">Wave</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="USDT">USDT</SelectItem></SelectContent></Select></Field></div><Field label="မှတ်ချက်"><Input name="note" placeholder="Optional" /></Field><Button disabled={saving || !selected} className="mt-2 h-11 bg-emerald-400 text-slate-950 hover:bg-emerald-300">{saving ? "သိမ်းနေပါတယ်…" : "အရောင်းသိမ်းမယ်"}</Button></form></DialogContent></Dialog>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm text-slate-300"><span>{label}</span>{children}</label>; }
