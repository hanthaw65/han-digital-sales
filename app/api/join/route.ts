import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return Response.json({ error: "Login လုပ်ရန်လိုပါသည်" }, { status: 401 });
  const body = await request.json();
  const code = String(body.code ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  if (!code || !displayName) return Response.json({ error: "အမည်နဲ့ Access Code ဖြည့်ပါ" }, { status: 400 });
  const { data, error } = await supabase.rpc("join_han_workspace", { p_code: code, p_display_name: displayName });
  if (error) return Response.json({ error: error.message.includes("Invalid") ? "Access Code မမှန်ပါ" : error.message }, { status: 400 });
  return Response.json({ membership: data?.[0] ?? null });
}
