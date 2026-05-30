import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-side sign out to ensure Supabase auth cookies are cleared
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
