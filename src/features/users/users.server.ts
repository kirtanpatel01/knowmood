import { eq, and, sql, not, ilike } from 'drizzle-orm';
import { db } from '#/db';
import { user, userProfiles, bonds } from '#/db/schema';

export async function ensureUserProfile(userId: string, usernameStr: string) {
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(userProfiles)
    .values({
      userId,
      username: usernameStr,
      usernameLower: usernameStr.toLowerCase(),
      currentMood: 'happy',
    })
    .returning();

  return created;
}

export async function getUserProfile(userId: string) {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    // If not found in userProfiles, look up in user table
    const u = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (u.length > 0) {
      return ensureUserProfile(userId, u[0].username || u[0].name);
    }
    return null;
  }

  return rows[0];
}

export async function updateUsername(userId: string, newUsername: string) {
  const trimmed = newUsername.trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    throw new Error('Username must be between 3 and 24 characters.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Username can only contain letters, numbers, underscores, and dashes.');
  }

  const lower = trimmed.toLowerCase();

  // Check case-insensitive uniqueness against other users
  const conflict = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.usernameLower, lower), not(eq(userProfiles.userId, userId))))
    .limit(1);

  if (conflict.length > 0) {
    throw new Error('This username is already taken.');
  }

  // Update userProfiles table
  const [updatedProfile] = await db
    .update(userProfiles)
    .set({
      username: trimmed,
      usernameLower: lower,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning();

  // Also keep Better Auth user record in sync
  await db
    .update(user)
    .set({
      username: trimmed,
      name: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  return updatedProfile;
}

export async function searchUsers(query: string, currentUserId: string) {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 2) {
    return [];
  }

  // Find users whose usernames match query (case-insensitive)
  // Exclude current user
  const matchingProfiles = await db
    .select({
      userId: userProfiles.userId,
      username: userProfiles.username,
      currentMood: userProfiles.currentMood,
    })
    .from(userProfiles)
    .where(
      and(
        ilike(userProfiles.usernameLower, `%${clean}%`),
        not(eq(userProfiles.userId, currentUserId))
      )
    )
    .limit(8);

  if (matchingProfiles.length === 0) return [];

  // Exclude users who already have an active or break_pending bond
  const activeBonds = await db
    .select({
      userAId: bonds.userAId,
      userBId: bonds.userBId,
    })
    .from(bonds)
    .where(sql`${bonds.status} IN ('active', 'break_pending')`);

  const bondedUserIds = new Set<string>();
  for (const b of activeBonds) {
    bondedUserIds.add(b.userAId);
    bondedUserIds.add(b.userBId);
  }

  return matchingProfiles.filter((p) => !bondedUserIds.has(p.userId));
}
