import type { Session } from "next-auth";
import {prisma} from "@/lib/prisma";

export async function getOrCreateUser(session: Session) {
  if (!session?.user?.email) throw new Error("No user email in session");

  return prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: { email: session.user.email },
  });
}
