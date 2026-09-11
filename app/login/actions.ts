"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function loginUrl(message: string) {
  return `/login?message=${encodeURIComponent(message)}`;
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
  const origin = (await headers()).get("origin") ?? "";
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
