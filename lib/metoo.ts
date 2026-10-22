import { prisma } from "@/lib/db";

// Fail-soft counter: if the MeToo table is not created yet (or the DB
// hiccups), pages simply show 0 instead of breaking.
export async function meTooCount(phone: string): Promise<number> {
  try {
    return await prisma.meToo.count({ where: { phone } });
  } catch {
    return 0;
  }
}
