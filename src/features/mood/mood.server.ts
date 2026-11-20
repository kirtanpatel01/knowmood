import { eq, sql } from 'drizzle-orm';
import { db } from '#/db';
import { userProfiles, bonds } from '#/db/schema';
import { sendUserEvent } from '#/lib/events';

export async function updateMood(userId: string, newMood: 'happy' | 'unhappy') {
  if (newMood !== 'happy' && newMood !== 'unhappy') {
    throw new Error("Invalid mood state. Allowed: 'happy' or 'unhappy'.");
  }

  const [updated] = await db
    .update(userProfiles)
    .set({
      currentMood: newMood,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning();

  // Check if user has an active bond and notify partner in real-time
  const activeBond = await db
    .select()
    .from(bonds)
    .where(
      sql`(${bonds.userAId} = ${userId} OR ${bonds.userBId} = ${userId}) AND ${bonds.status} IN ('active', 'break_pending')`
    )
    .limit(1);

  if (activeBond.length > 0) {
    const partnerUserId = activeBond[0].userAId === userId ? activeBond[0].userBId : activeBond[0].userAId;
    sendUserEvent(partnerUserId, {
      type: 'PARTNER_MOOD_CHANGED',
      partnerUserId: userId,
      mood: newMood,
      updatedAt: new Date().toISOString(),
    });
  }

  return updated;
}
