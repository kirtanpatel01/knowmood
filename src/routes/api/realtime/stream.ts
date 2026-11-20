import { createFileRoute } from '@tanstack/react-router';
import { auth } from '#/lib/auth';
import { eventBus, type RealtimeEvent } from '#/lib/events';

export const Route = createFileRoute('/api/realtime/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
          return new Response('Unauthorized', { status: 401 });
        }

        const userId = session.user.id;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', userId })}\n\n`));

            const listener = (event: RealtimeEvent) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              } catch {
                // Stream closed
              }
            };

            const userChannel = `user:${userId}`;
            eventBus.on(userChannel, listener);

            // Heartbeat to keep connection alive
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
              } catch {
                clearInterval(heartbeat);
              }
            }, 15000);

            request.signal.addEventListener('abort', () => {
              clearInterval(heartbeat);
              eventBus.off(userChannel, listener);
              try {
                controller.close();
              } catch {}
            });
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      },
    },
  },
});
