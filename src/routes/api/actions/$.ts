import { createFileRoute } from '@tanstack/react-router';
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

export const Route = createFileRoute('/api/actions/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const action = params._splat;

        if (action === 'state') {
          const profile = await ensureUserProfile(
            session.user.id,
            session.user.username || session.user.name || 'User'
          );
          const bondStatus = await getBondStatus(session.user.id);
          return new Response(
            JSON.stringify({
              user: {
                id: session.user.id,
                username: profile.username,
                currentMood: profile.currentMood,
              },
              bondStatus,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Not found', { status: 404 });
      },
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const action = params._splat;
        const body = await request.json().catch(() => ({}));

        try {
          let result;
          if (action === 'mood') {
            result = await updateMood(session.user.id, body.mood);
          } else if (action === 'search-users') {
            result = await searchUsers(body.query, session.user.id);
          } else if (action === 'send-request') {
            result = await sendBondRequest(session.user.id, body.recipientUserId);
          } else if (action === 'cancel-request') {
            result = await cancelBondRequest(body.requestId, session.user.id);
          } else if (action === 'decline-request') {
            result = await declineBondRequest(body.requestId, session.user.id);
          } else if (action === 'accept-request') {
            result = await acceptBondRequest(body.requestId, session.user.id);
          } else if (action === 'request-end-bond') {
            result = await requestEndBond(body.bondId, session.user.id);
          } else if (action === 'agree-end-bond') {
            result = await agreeEndBond(body.bondId, session.user.id);
          } else if (action === 'cancel-end-bond') {
            result = await cancelOrDeclineEndBond(body.bondId, session.user.id);
          } else if (action === 'update-username') {
            result = await updateUsername(session.user.id, body.newUsername);
          } else {
            return new Response('Action not found', { status: 404 });
          }

          return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Operation failed' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
