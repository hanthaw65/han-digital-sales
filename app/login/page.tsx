import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { login, signup } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[#08111f] px-4 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101a2b] p-6 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShoppingBag /></span>
          <div><h1 className="text-xl font-bold">Digital Sales</h1><p className="text-xs text-slate-400">Sales · Stock · Expired</p></div>
        </div>
        <h2 className="mb-5 text-lg font-semibold">Account ဝင်ရန်</h2>
        <form className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-slate-300">Email<input name="email" type="email" required className="h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-base outline-none focus:border-emerald-400" placeholder="name@gmail.com" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Password<input name="password" type="password" minLength={8} required className="h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-base outline-none focus:border-emerald-400" placeholder="အနည်းဆုံး 8 လုံး" /></label>
          <Link href="/forgot-password" className="-mt-2 justify-self-end text-sm font-medium text-emerald-300 hover:text-emerald-200">Password မေ့နေပါသလား?</Link>
          {message && <p className="rounded-xl bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-200">{message}</p>}
          <button formAction={login} className="h-11 rounded-xl bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">Login</button>
          <button formAction={signup} className="h-11 rounded-xl border border-white/12 bg-white/5 font-semibold text-white hover:bg-white/10">Account အသစ်ဖွင့်မယ်</button>
        </form>
      </section>
    </main>
  );
}
