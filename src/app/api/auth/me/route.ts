import { NextResponse } from "next/server";
import { getResolvedSession, getUserAuthProfileById } from "@/services/auth";

export async function GET() {
  const session = await getResolvedSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = await getUserAuthProfileById(session.id);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}
