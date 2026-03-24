import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserAuthProfileById } from "@/services/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = await getUserAuthProfileById(session.id);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
