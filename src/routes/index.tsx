import { useState, useEffect, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { authClient } from '#/lib/auth-client';
import { AppHeader } from '#/components/layout/app-header';
import { AppActions } from '#/components/layout/app-actions';
import { MoodDoll } from '#/components/doll/mood-doll';
import { MoodDialog } from '#/components/dialogs/mood-dialog';
import { ProfileDialog } from '#/components/dialogs/profile-dialog';
import { SettingsDialog } from '#/components/dialogs/settings-dialog';
import type { BondStateResponse } from '#/types';
import { HeartHandshake, Loader2 } from 'lucide-react';
import { Button } from '#/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  // Authentication & User State
  const [sessionUser, setSessionUser] = useState<{ id: string; username: string } | null>(null);
  const [currentMood, setCurrentMood] = useState<'happy' | 'unhappy'>('happy');
  const [bondState, setBondState] = useState<BondStateResponse>({
    state: 'unbonded',
    incomingRequests: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Dialog Controls
  const [moodDialogOpen, setMoodDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Fetch complete app state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/actions/state');
      if (res.status === 401) {
        navigate({ to: '/login' });
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSessionUser(data.user);
        setCurrentMood(data.user.currentMood);
        setBondState(data.bondStatus);
      }
    } catch (err) {
      console.error('Failed to fetch state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Initial load & authentication guard
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Tab visibility revalidation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchState();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchState]);

  // Real-time Server-Sent Events (SSE) Listener
  useEffect(() => {
    if (!sessionUser) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      eventSource = new EventSource('/api/realtime/stream');

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'PARTNER_MOOD_CHANGED') {
            setBondState((prev) => {
              if (prev.state === 'bonded' && prev.activeBond) {
                return {
                  ...prev,
                  activeBond: {
                    ...prev.activeBond,
                    partnerMood: event.mood,
                  },
                };
              }
              return prev;
            });
          } else if (
            event.type === 'BOND_REQUEST_RECEIVED' ||
            event.type === 'BOND_REQUEST_UPDATED' ||
            event.type === 'BOND_ACCEPTED' ||
            event.type === 'BOND_BREAK_REQUESTED' ||
            event.type === 'BOND_BREAK_CANCELLED' ||
            event.type === 'BOND_ENDED'
          ) {
            // Re-sync relationship state immediately
            fetchState();
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [sessionUser, fetchState]);

  // Action Handlers
  const handleSaveMood = async (newMood: 'happy' | 'unhappy') => {
    const res = await fetch('/api/actions/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: newMood }),
    });
    if (res.ok) {
      setCurrentMood(newMood);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update mood');
    }
  };

  const handleSearchUsers = async (query: string) => {
    const res = await fetch('/api/actions/search-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  };

  const handleSendRequest = async (recipientUserId: string) => {
    const res = await fetch('/api/actions/send-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send request');
    }
    await fetchState();
  };

  const handleCancelRequest = async (requestId: string) => {
    const res = await fetch('/api/actions/cancel-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to cancel request');
    }
    await fetchState();
  };

  const handleAcceptRequest = async (requestId: string) => {
    const res = await fetch('/api/actions/accept-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to accept invitation');
    }
    await fetchState();
  };

  const handleDeclineRequest = async (requestId: string) => {
    const res = await fetch('/api/actions/decline-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to decline request');
    }
    await fetchState();
  };

  const handleRequestEndBond = async (bondId: string) => {
    const res = await fetch('/api/actions/request-end-bond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bondId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to request break');
    }
    await fetchState();
  };

  const handleAgreeEndBond = async (bondId: string) => {
    const res = await fetch('/api/actions/agree-end-bond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bondId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to agree to breakup');
    }
    await fetchState();
  };

  const handleCancelEndBond = async (bondId: string) => {
    const res = await fetch('/api/actions/cancel-end-bond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bondId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to cancel breakup');
    }
    await fetchState();
  };

  const handleUpdateUsername = async (newUsername: string) => {
    const res = await fetch('/api/actions/update-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update username');
    }
    const data = await res.json();
    setSessionUser((prev) => (prev ? { ...prev, username: data.data.username } : null));
  };

  const handleLogout = async () => {
    await authClient.signOut();
    navigate({ to: '/login' });
  };

  if (isLoading) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--doll-pink)]" />
      </div>
    );
  }

  const isBonded = bondState.state === 'bonded' && bondState.activeBond;
  const hasNotifications =
    (bondState.incomingRequests && bondState.incomingRequests.length > 0) ||
    (isBonded &&
      bondState.activeBond!.status === 'break_pending' &&
      bondState.activeBond!.breakRequestedByUsername !== 'You');

  return (
    <main className="relative h-dvh w-full overflow-hidden flex flex-col items-center justify-center bg-[var(--background)]">
      {/* Top Header */}
      <AppHeader
        currentMood={currentMood}
        onOpenMoodDialog={() => setMoodDialogOpen(true)}
      />

      {/* Main Viewport: The Bonded Person's 3D Doll (or Cozy Empty State) */}
      <section className="relative w-full h-full flex flex-col items-center justify-center px-4">
        {isBonded ? (
          /* ==================== ACTIVE BOND STATE ==================== */
          <div className="flex flex-col items-center justify-center animate-in fade-in duration-700">
            {/* The Large 3D Doll */}
            <MoodDoll
              mood={bondState.activeBond!.partnerMood}
              size="lg"
              interactive={true}
              showRotateButtons={true}
            />

            {/* Username and Subtle Mood Caption */}
            <div className="flex flex-col items-center mt-3 text-center select-none">
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[var(--text-main)] tracking-tight">
                @{bondState.activeBond!.partnerUsername}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-normal">
                {bondState.activeBond!.partnerMood === 'happy'
                  ? 'is feeling happy today'
                  : 'is feeling unhappy today'}
              </p>

              {bondState.activeBond!.status === 'break_pending' && (
                <span className="mt-2 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                  Breakup request pending
                </span>
              )}
            </div>
          </div>
        ) : (
          /* ==================== UNBONDED EMPTY STATE ==================== */
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            {/* Friendly Placeholder Doll */}
            <MoodDoll
              mood={currentMood}
              size="md"
              interactive={true}
              showRotateButtons={true}
            />

            <div className="flex flex-col items-center mt-4 max-w-xs">
              <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">
                Your person is not here yet.
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Knowmood is made for two. Connect with your partner or best friend to see each other's mood.
              </p>

              <Button
                type="button"
                onClick={() => setProfileDialogOpen(true)}
                className="mt-4 h-10 px-5 rounded-2xl bg-[var(--text-main)] hover:bg-black text-white text-xs font-medium flex items-center gap-2 shadow-sm plush-press"
              >
                <HeartHandshake className="w-4 h-4 text-[var(--doll-pink)]" />
                <span>Find someone to bond with</span>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Actions Bar */}
      <AppActions
        onOpenProfile={() => setProfileDialogOpen(true)}
        onOpenSettings={() => setSettingsDialogOpen(true)}
        hasNotification={hasNotifications}
      />

      {/* Dialogs */}
      <MoodDialog
        open={moodDialogOpen}
        onOpenChange={setMoodDialogOpen}
        currentMood={currentMood}
        onSaveMood={handleSaveMood}
      />

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        currentUsername={sessionUser?.username || 'You'}
        bondState={bondState}
        onSearchUsers={handleSearchUsers}
        onSendRequest={handleSendRequest}
        onCancelRequest={handleCancelRequest}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onRequestEndBond={handleRequestEndBond}
        onAgreeEndBond={handleAgreeEndBond}
        onCancelEndBond={handleCancelEndBond}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        currentUsername={sessionUser?.username || 'You'}
        onUpdateUsername={handleUpdateUsername}
        onLogout={handleLogout}
      />
    </main>
  );
}
