// The signed-in person's own profile. Scoped to their user id, like entries.ts.
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Db } from "@/lib/db";

/** Saves the first name (already checked with firstNameSchema). */
export async function setFirstName(db: Db, userId: string, name: string): Promise<void> {
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId));
}
