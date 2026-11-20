import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '#/lib/auth';
import { ensureUserProfile, searchUsers, updateUsername } from '#/features/users/users.server';
import { updateMood } from '#/features/mood/mood.server';
import {
  getBondStatus,
  sendBondRequest,
  cancelBondRequest,
  declineBondRequest,
  acceptBondRequest,
  requestEndBond,
  agreeEndBond,
  cancelOrDeclineEndBond,
} from '#/features/bonds/bonds.server';

async function getAuthSession() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export const getAppStateFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthSession();
  const userId = session.user.id;
  const usernameStr = session.user.username || session.user.name || 'User';

  const profile = await ensureUserProfile(userId, usernameStr);
  const bondStatus = await getBondStatus(userId);

  return {
    user: {
      id: userId,
      username: profile.username,
      currentMood: profile.currentMood as 'happy' | 'unhappy',
    },
    bondStatus,
  };
});

export const updateMoodFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const mood = (data as any)?.mood;
    if (mood !== 'happy' && mood !== 'unhappy') {
      throw new Error('Invalid mood');
    }
    return { mood: mood as 'happy' | 'unhappy' };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await updateMood(session.user.id, data.mood);
  });

export const searchUsersFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    return { query: String((data as any)?.query || '') };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await searchUsers(data.query, session.user.id);
  });

export const sendBondRequestFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const recipientUserId = (data as any)?.recipientUserId;
    if (!recipientUserId) throw new Error('Missing recipientUserId');
    return { recipientUserId: String(recipientUserId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await sendBondRequest(session.user.id, data.recipientUserId);
  });

export const cancelBondRequestFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const requestId = (data as any)?.requestId;
    if (!requestId) throw new Error('Missing requestId');
    return { requestId: String(requestId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await cancelBondRequest(data.requestId, session.user.id);
  });

export const declineBondRequestFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const requestId = (data as any)?.requestId;
    if (!requestId) throw new Error('Missing requestId');
    return { requestId: String(requestId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await declineBondRequest(data.requestId, session.user.id);
  });

export const acceptBondRequestFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const requestId = (data as any)?.requestId;
    if (!requestId) throw new Error('Missing requestId');
    return { requestId: String(requestId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await acceptBondRequest(data.requestId, session.user.id);
  });

export const requestEndBondFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const bondId = (data as any)?.bondId;
    if (!bondId) throw new Error('Missing bondId');
    return { bondId: String(bondId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await requestEndBond(data.bondId, session.user.id);
  });

export const agreeEndBondFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const bondId = (data as any)?.bondId;
    if (!bondId) throw new Error('Missing bondId');
    return { bondId: String(bondId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await agreeEndBond(data.bondId, session.user.id);
  });

export const cancelOrDeclineEndBondFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const bondId = (data as any)?.bondId;
    if (!bondId) throw new Error('Missing bondId');
    return { bondId: String(bondId) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await cancelOrDeclineEndBond(data.bondId, session.user.id);
  });

export const updateUsernameFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const newUsername = (data as any)?.newUsername;
    if (!newUsername) throw new Error('Missing newUsername');
    return { newUsername: String(newUsername) };
  })
  .handler(async ({ data }) => {
    const session = await getAuthSession();
    return await updateUsername(session.user.id, data.newUsername);
  });
