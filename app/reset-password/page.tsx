import { KeyRound, ShoppingBag } from "lucide-react";
import { updatePassword } from "../login/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#08111f] px-4 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101a2b] p-6 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-slate-950"><ShoppingBag /></span>
          <div><h1 className="text-xl font-bold">Digital Sales</h1><p className="text-xs text-slate-400">Password အသစ်သတ်မှတ်ရန်</p></div>
        </div>
        <div className="mb-5 flex items-center gap-2">
          <KeyRound className="size-5 text-emerald-300" />
          <h2 className="text-lg font-semibold">Password အသစ်ထည့်ပါ</h2>
        </div>
        <form className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-slate-300">Password အသစ်<input name="password" type="password" minLength={8} required autoComplete="new-password" className="h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-base outline-none focus:border-emerald-400" placeholder="အနည်းဆုံး 8 လုံး" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Password အသစ် ထပ်ထည့်ပါ<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className="h-11 rounded-xl border border-white/12 bg-white/5 px-3 text-base outline-none focus:border-emerald-400" placeholder="Password ကို ထပ်ရိုက်ပါ" /></label>
          {message && <p className="rounded-xl bg-rose-400/10 p-3 text-sm leading-6 text-rose-200">{message}</p>}
          <button formAction={updatePassword} className="h-11 rounded-xl bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">Password ပြောင်းမယ်</button>
        </form>
      </section>
    </main>
  );
}
