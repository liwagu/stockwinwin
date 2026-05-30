import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const supabaseCookies = allCookies.filter(c =>
    c.name.startsWith('sb-') || c.name.includes('supabase')
  );

  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookies: supabaseCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0,
    })),
    allCookieNames: allCookies.map(c => c.name),
  });
}
