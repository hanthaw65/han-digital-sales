"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function loginUrl(message: string) {
  return `/login?message=${encodeURIComponent(message)}`;
}

function forgotUrl(message: string, email = "") {
  const params = new URLSearchParams({ message });
  if (email) params.set("email", email);
  return `/forgot-password?${params.toString()}`;
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : "";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(loginUrl("Email သို့မဟုတ် Password မမှန်ပါ"));
  redirect("/");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect(loginUrl("Password အနည်းဆုံး 8 လုံးထားပါ"));
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined },
  });
  if (error) redirect(loginUrl(error.message));
  if (data.session) redirect("/");
  redirect(loginUrl("Email ထဲက Confirm link ကိုနှိပ်ပြီး ပြန်ဝင်ပါ"));
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect(forgotUrl("Email ထည့်ပေးပါ"));

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/confirm?next=/reset-password` : undefined,
  });

  if (error) redirect(forgotUrl("Email ပို့မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ", email));
  redirect(forgotUrl("Password ပြောင်းရန် link ကို Email ထဲပို့ထားပါတယ်", email));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) redirect("/reset-password?message=" + encodeURIComponent("Password အနည်းဆုံး 8 လုံးထားပါ"));
  if (password !== confirmPassword) redirect("/reset-password?message=" + encodeURIComponent("Password နှစ်ခု မတူပါ"));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?message=" + encodeURIComponent("Password ပြောင်းမရသေးပါ။ Email link ကို ပြန်ဖွင့်ပါ"));

  await supabase.auth.signOut();
  redirect(loginUrl("Password အသစ်ပြောင်းပြီးပါပြီ။ Password အသစ်နဲ့ Login ဝင်ပါ"));
}
