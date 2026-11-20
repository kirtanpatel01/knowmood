import { eq, and, sql } from 'drizzle-orm';
import { db } from '#/db';
import { bonds, bondRequests, userProfiles } from '#/db/schema';
import { sendUserEvent } from '#/lib/events';
import type { BondStateResponse } from '#/types';

export type { BondStateResponse };

export async function getBondStatus(userId: string): Promise<BondStateResponse> {
  // 1. Check for active or break_pending bond
  const activeBonds = await db
    .select()
    .from(bonds)
    .where(
      sql`(${bonds.userAId} = ${userId} OR ${bonds.userBId} = ${userId}) AND ${bonds.status} IN ('active', 'break_pending')`
    )
    .limit(1);

  if (activeBonds.length > 0) {
    const bond = activeBonds[0];
    const partnerId = bond.userAId === userId ? bond.userBId : bond.userAId;

    const partnerProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, partnerId))
      .limit(1);

    let requesterUsername: string | null = null;
    if (bond.breakRequestedByUserId) {
      if (bond.breakRequestedByUserId === userId) {
        requesterUsername = 'You';
      } else if (partnerProfile.length > 0) {
        requesterUsername = partnerProfile[0].username;
      }
    }

    return {
      state: 'bonded',
      activeBond: {
        id: bond.id,
        partnerUserId: partnerId,
        partnerUsername: partnerProfile[0]?.username ?? 'Your Partner',
        partnerMood: partnerProfile[0]?.currentMood ?? 'happy',
        status: bond.status as 'active' | 'break_pending',
        breakRequestedByUserId: bond.breakRequestedByUserId,
        breakRequestedByUsername: requesterUsername,
        breakRequestedAt: bond.breakRequestedAt ? bond.breakRequestedAt.toISOString() : null,
        createdAt: bond.createdAt.toISOString(),
      },
      incomingRequests: [],
    };
  }

  // 2. Check for outgoing pending request
  const outgoing = await db
    .select({
      id: bondRequests.id,
      recipientUserId: bondRequests.recipientUserId,
      createdAt: bondRequests.createdAt,
      recipientUsername: userProfiles.username,
    })
    .from(bondRequests)
    .innerJoin(userProfiles, eq(bondRequests.recipientUserId, userProfiles.userId))
    .where(and(eq(bondRequests.senderUserId, userId), eq(bondRequests.status, 'pending')))
    .limit(1);

  // 3. Check for incoming pending requests
  const incoming = await db
    .select({
      id: bondRequests.id,
      senderUserId: bondRequests.senderUserId,
      createdAt: bondRequests.createdAt,
      senderUsername: userProfiles.username,
      senderMood: userProfiles.currentMood,
    })
    .from(bondRequests)
    .innerJoin(userProfiles, eq(bondRequests.senderUserId, userProfiles.userId))
    .where(and(eq(bondRequests.recipientUserId, userId), eq(bondRequests.status, 'pending')));

  const incomingList = incoming.map((req) => ({
    id: req.id,
    senderUserId: req.senderUserId,
    senderUsername: req.senderUsername,
    senderMood: req.senderMood as 'happy' | 'unhappy',
    createdAt: req.createdAt.toISOString(),
  }));

  if (outgoing.length > 0) {
    return {
      state: 'outgoing_pending',
      outgoingRequest: {
        id: outgoing[0].id,
        recipientUserId: outgoing[0].recipientUserId,
        recipientUsername: outgoing[0].recipientUsername,
        createdAt: outgoing[0].createdAt.toISOString(),
      },
      incomingRequests: incomingList,
    };
  }

  if (incomingList.length > 0) {
    return {
      state: 'incoming_pending',
      incomingRequests: incomingList,
    };
  }

  return {
    state: 'unbonded',
    incomingRequests: [],
  };
}

export async function sendBondRequest(senderUserId: string, recipientUserId: string) {
  if (senderUserId === recipientUserId) {
    throw new Error('You cannot bond with yourself.');
  }

  // Verify sender has no active bond
  const senderBond = await db
    .select()
    .from(bonds)
    .where(
      sql`(${bonds.userAId} = ${senderUserId} OR ${bonds.userBId} = ${senderUserId}) AND ${bonds.status} IN ('active', 'break_pending')`
    )
    .limit(1);

  if (senderBond.length > 0) {
    throw new Error('You already have an active bond. End your current bond first.');
  }

  // Verify sender has no pending outgoing request
  const existingOutgoing = await db
    .select()
    .from(bondRequests)
    .where(and(eq(bondRequests.senderUserId, senderUserId), eq(bondRequests.status, 'pending')))
    .limit(1);

  if (existingOutgoing.length > 0) {
    throw new Error('You already have an outgoing pending request. Wait or cancel it first.');
  }

  // Verify recipient has no active bond
  const recipientBond = await db
    .select()
    .from(bonds)
    .where(
      sql`(${bonds.userAId} = ${recipientUserId} OR ${bonds.userBId} = ${recipientUserId}) AND ${bonds.status} IN ('active', 'break_pending')`
    )
    .limit(1);

  if (recipientBond.length > 0) {
    throw new Error('This user is already bonded with someone else.');
  }

  // Insert bond request
  const [request] = await db
    .insert(bondRequests)
    .values({
      senderUserId,
      recipientUserId,
      status: 'pending',
    })
    .returning();

  // Fetch sender profile info for notification
  const senderProfile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, senderUserId))
    .limit(1);

  sendUserEvent(recipientUserId, {
    type: 'BOND_REQUEST_RECEIVED',
    senderUserId,
    senderUsername: senderProfile[0]?.username ?? 'Someone',
    senderMood: senderProfile[0]?.currentMood ?? 'happy',
  });

  return request;
}

export async function cancelBondRequest(requestId: string, senderUserId: string) {
  const req = await db
    .select()
    .from(bondRequests)
    .where(and(eq(bondRequests.id, requestId), eq(bondRequests.senderUserId, senderUserId)))
    .limit(1);

  if (req.length === 0) {
    throw new Error('Request not found or not owned by you.');
  }

  if (req[0].status !== 'pending') {
    throw new Error('This request is no longer pending.');
  }

  const [updated] = await db
    .update(bondRequests)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
      respondedAt: new Date(),
    })
    .where(eq(bondRequests.id, requestId))
    .returning();

  sendUserEvent(req[0].recipientUserId, {
    type: 'BOND_REQUEST_UPDATED',
    status: 'cancelled',
  });

  return updated;
}

export async function declineBondRequest(requestId: string, recipientUserId: string) {
  const req = await db
    .select()
    .from(bondRequests)
    .where(and(eq(bondRequests.id, requestId), eq(bondRequests.recipientUserId, recipientUserId)))
    .limit(1);

  if (req.length === 0) {
    throw new Error('Request not found.');
  }

  if (req[0].status !== 'pending') {
    throw new Error('This request is no longer pending.');
  }

  const [updated] = await db
    .update(bondRequests)
    .set({
      status: 'declined',
      updatedAt: new Date(),
      respondedAt: new Date(),
    })
    .where(eq(bondRequests.id, requestId))
    .returning();

  sendUserEvent(req[0].senderUserId, {
    type: 'BOND_REQUEST_UPDATED',
    status: 'declined',
  });

  return updated;
}

export async function acceptBondRequest(requestId: string, recipientUserId: string) {
  return await db.transaction(async (tx) => {
    // 1. Lock and fetch request
    const req = await tx
      .select()
      .from(bondRequests)
      .where(and(eq(bondRequests.id, requestId), eq(bondRequests.recipientUserId, recipientUserId)))
      .limit(1);

    if (req.length === 0) {
      throw new Error('Request not found.');
    }

    if (req[0].status !== 'pending') {
      throw new Error('This request is no longer pending.');
    }

    const senderUserId = req[0].senderUserId;

    // 2. Verify neither user is already bonded
    const existingSenderBond = await tx
      .select()
      .from(bonds)
      .where(
        sql`(${bonds.userAId} = ${senderUserId} OR ${bonds.userBId} = ${senderUserId}) AND ${bonds.status} IN ('active', 'break_pending')`
      )
      .limit(1);

    if (existingSenderBond.length > 0) {
      throw new Error('The requester is already bonded with someone else.');
    }

    const existingRecipientBond = await tx
      .select()
      .from(bonds)
      .where(
        sql`(${bonds.userAId} = ${recipientUserId} OR ${bonds.userBId} = ${recipientUserId}) AND ${bonds.status} IN ('active', 'break_pending')`
      )
      .limit(1);

    if (existingRecipientBond.length > 0) {
      throw new Error('You already have an active bond.');
    }

    // 3. Mark request as accepted
    await tx
      .update(bondRequests)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
        respondedAt: new Date(),
      })
      .where(eq(bondRequests.id, requestId));

    // 4. Canonical order for User A and User B
    const userAId = senderUserId < recipientUserId ? senderUserId : recipientUserId;
    const userBId = senderUserId < recipientUserId ? recipientUserId : senderUserId;

    // 5. Create active bond
    const [newBond] = await tx
      .insert(bonds)
      .values({
        userAId,
        userBId,
        status: 'active',
      })
      .returning();

    // 6. Cancel any other pending requests for either user
    await tx
      .update(bondRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`(${bondRequests.senderUserId} IN (${senderUserId}, ${recipientUserId}) OR ${bondRequests.recipientUserId} IN (${senderUserId}, ${recipientUserId}))`,
          eq(bondRequests.status, 'pending')
        )
      );

    // Fetch profile details for real-time notifications
    const [senderProfile] = await tx
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, senderUserId))
      .limit(1);

    const [recipientProfile] = await tx
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, recipientUserId))
      .limit(1);

    // Notify sender in real-time
    sendUserEvent(senderUserId, {
      type: 'BOND_ACCEPTED',
      partnerUserId: recipientUserId,
      partnerUsername: recipientProfile?.username ?? 'Partner',
      partnerMood: recipientProfile?.currentMood ?? 'happy',
    });

    // Notify recipient in real-time
    sendUserEvent(recipientUserId, {
      type: 'BOND_ACCEPTED',
      partnerUserId: senderUserId,
      partnerUsername: senderProfile?.username ?? 'Partner',
      partnerMood: senderProfile?.currentMood ?? 'happy',
    });

    return newBond;
  });
}

export async function requestEndBond(bondId: string, userId: string) {
  const bond = await db
    .select()
    .from(bonds)
    .where(
      and(
        eq(bonds.id, bondId),
        sql`(${bonds.userAId} = ${userId} OR ${bonds.userBId} = ${userId})`,
        eq(bonds.status, 'active')
      )
    )
    .limit(1);

  if (bond.length === 0) {
    throw new Error('Active bond not found or you are not a participant.');
  }

  const [updated] = await db
    .update(bonds)
    .set({
      status: 'break_pending',
      breakRequestedByUserId: userId,
      breakRequestedAt: new Date(),
    })
    .where(eq(bonds.id, bondId))
    .returning();

  const partnerId = bond[0].userAId === userId ? bond[0].userBId : bond[0].userAId;

  const [userProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  sendUserEvent(partnerId, {
    type: 'BOND_BREAK_REQUESTED',
    requestedByUserId: userId,
    requestedByUsername: userProfile?.username ?? 'Partner',
  });

  return updated;
}

export async function agreeEndBond(bondId: string, userId: string) {
  return await db.transaction(async (tx) => {
    const bond = await tx
      .select()
      .from(bonds)
      .where(
        and(
          eq(bonds.id, bondId),
          sql`(${bonds.userAId} = ${userId} OR ${bonds.userBId} = ${userId})`,
          eq(bonds.status, 'break_pending')
        )
      )
      .limit(1);

    if (bond.length === 0) {
      throw new Error('Pending break request not found.');
    }

    if (bond[0].breakRequestedByUserId === userId) {
      throw new Error('You cannot agree to your own break request. Wait for your partner.');
    }

    const [endedBond] = await tx
      .update(bonds)
      .set({
        status: 'ended',
        endedAt: new Date(),
      })
      .where(eq(bonds.id, bondId))
      .returning();

    const partnerId = bond[0].userAId === userId ? bond[0].userBId : bond[0].userAId;

    // Both users are now disconnected
    sendUserEvent(userId, { type: 'BOND_ENDED' });
    sendUserEvent(partnerId, { type: 'BOND_ENDED' });

    return endedBond;
  });
}

export async function cancelOrDeclineEndBond(bondId: string, userId: string) {
  const bond = await db
    .select()
    .from(bonds)
    .where(
      and(
        eq(bonds.id, bondId),
        sql`(${bonds.userAId} = ${userId} OR ${bonds.userBId} = ${userId})`,
        eq(bonds.status, 'break_pending')
      )
    )
    .limit(1);

  if (bond.length === 0) {
    throw new Error('Pending break request not found.');
  }

  const [resetBond] = await db
    .update(bonds)
    .set({
      status: 'active',
      breakRequestedByUserId: null,
      breakRequestedAt: null,
    })
    .where(eq(bonds.id, bondId))
    .returning();

  const partnerId = bond[0].userAId === userId ? bond[0].userBId : bond[0].userAId;

  sendUserEvent(userId, { type: 'BOND_BREAK_CANCELLED' });
  sendUserEvent(partnerId, { type: 'BOND_BREAK_CANCELLED' });

  return resetBond;
}
