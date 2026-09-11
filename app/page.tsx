import { Dashboard } from "../components/dashboard/dashboard";
import { Onboarding } from "../components/dashboard/onboarding";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const { data: member } = await supabase
    .from("members")
    .select("role, display_name, workspace_id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  if (!member) return <Onboarding email={String(data.claims.email ?? "")} />;
  return <Dashboard />;
}
