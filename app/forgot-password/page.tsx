import Link from "next/link";
import { KeyRound, ShoppingBag } from "lucide-react";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; email?: string }>;
}) {
  const { message, email } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#08111f] px-4 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101a2b] p-6 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShoppingBag /></span>
          <div><h1 className="text-xl font-bold">Digital Sales</h1><p className="text-xs text-slate-400">Password ပြန်သတ်မှတ်ရန်</p></div>
        </div>
        <div className="mb-5 flex items-center gap-2">
          <KeyRound className="size-5 text-emerald-300" />
          <h2 className="text-lg font-semibold">Password မေ့နေပါသလား?</h2>
        </div>
        <p className="mb-5 text-sm leading-6 text-slate-400">Account ဖွင့်ထားတဲ့ Email ထည့်ပါ။ Password အသစ်သတ်မှတ်ရန် link ပို့ပေးပါမယ်။</p>
        <form className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-slate-300">Email<input name="email" type="email" required defaultValue={email ?? ""} className="h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-base outline-none focus:border-emerald-400" placeholder="name@gmail.com" /></label>
          {message && <p className="rounded-xl bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-200">{message}</p>}
          <button formAction={requestPasswordReset} className="h-11 rounded-xl bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">Reset link ပို့မယ်</button>
          <Link href="/login" className="grid h-11 place-items-center rounded-xl border border-white/12 bg-white/5 text-sm font-semibold hover:bg-white/10">Login သို့ပြန်သွားမယ်</Link>
        </form>
      </section>
    </main>
  );
}
