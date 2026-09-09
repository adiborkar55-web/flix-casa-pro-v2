import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kzwcibrkcufjwckcwdfv.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dtCg5DbXwd5vCxnfmJiAWA_BDmvFai9";

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "flixcasa-supabase-auth",
  },
});

export async function getSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}