import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { MoodDoll } from '../doll/mood-doll';
import type { BondStateResponse } from '#/types';
import {
  Search,
  UserPlus,
  X,
  Check,
  HeartCrack,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
  bondState: BondStateResponse;
  onSearchUsers: (query: string) => Promise<Array<{ userId: string; username: string; currentMood: 'happy' | 'unhappy' }>>;
  onSendRequest: (recipientUserId: string) => Promise<void>;
  onCancelRequest: (requestId: string) => Promise<void>;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onDeclineRequest: (requestId: string) => Promise<void>;
  onRequestEndBond: (bondId: string) => Promise<void>;
  onAgreeEndBond: (bondId: string) => Promise<void>;
  onCancelEndBond: (bondId: string) => Promise<void>;
}

export function ProfileDialog({
  open,
  onOpenChange,
  currentUsername,
  bondState,
  onSearchUsers,
  onSendRequest,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRequestEndBond,
  onAgreeEndBond,
  onCancelEndBond,
}: ProfileDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ userId: string; username: string; currentMood: 'happy' | 'unhappy' }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await onSearchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearchUsers]);

  const handleSend = async (userId: string) => {
    try {
      setActionLoading(userId);
      setFeedbackMessage(null);
      await onSendRequest(userId);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Could not send request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await onAcceptRequest(requestId);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Could not accept invitation.');
    } finally {
      setActionLoading(null);
    }
  };

  const isBonded = bondState.state === 'bonded' && bondState.activeBond;
  const isOutgoing = bondState.state === 'outgoing_pending' && bondState.outgoingRequest;
  const hasIncoming = bondState.incomingRequests && bondState.incomingRequests.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[92vw] max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl p-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-[var(--border-soft)] shadow-2xl">
        <DialogHeader className="text-left pb-2 border-b border-[var(--border-soft)]">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-lg font-semibold text-[var(--text-main)]">
              Profile & Bond
            </DialogTitle>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-surface-soft)] text-[var(--text-muted)] font-mono">
              @{currentUsername}
            </span>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Connect exclusively with your one person.
          </DialogDescription>
        </DialogHeader>

        {feedbackMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        <div className="flex flex-col gap-5 py-2">
          {/* ==================== STATE 4: ACTIVE BOND ==================== */}
          {isBonded && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-cozy)] dark:bg-zinc-800/50 border border-[var(--border-soft)]">
                <div className="w-12 h-12 shrink-0">
                  <MoodDoll
                    mood={bondState.activeBond!.partnerMood}
                    size="sm"
                    interactive={false}
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Bonded with</span>
                  <span className="text-sm font-semibold text-[var(--text-main)] truncate">
                    @{bondState.activeBond!.partnerUsername}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Feeling {bondState.activeBond!.partnerMood === 'happy' ? 'Happy' : 'Unhappy'}
                  </span>
                </div>
              </div>

              {/* Mutual Bond Termination Logic */}
              {bondState.activeBond!.status === 'break_pending' ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col gap-3">
                  {bondState.activeBond!.breakRequestedByUsername === 'You' ? (
                    <>
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                        <Clock className="w-4 h-4 shrink-0 animate-spin" />
                        Breakup requested. Waiting for @{bondState.activeBond!.partnerUsername} to agree...
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelEndBond(bondState.activeBond!.id)}
                        className="rounded-xl text-xs h-9 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                      >
                        Cancel Request
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        @{bondState.activeBond!.partnerUsername} requested to break the bond. Do you agree?
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onAgreeEndBond(bondState.activeBond!.id)}
                          className="flex-1 rounded-xl text-xs h-9"
                        >
                          Agree & Disconnect
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelEndBond(bondState.activeBond!.id)}
                          className="flex-1 rounded-xl text-xs h-9"
                        >
                          Keep Bond
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRequestEndBond(bondState.activeBond!.id)}
                  className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-xs font-medium plush-press"
                >
                  <HeartCrack className="w-4 h-4" />
                  Request to End Bond
                </Button>
              )}
            </div>
          )}

          {/* ==================== STATE 2: OUTGOING REQUEST PENDING ==================== */}
          {isOutgoing && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--doll-blue-tint)] dark:bg-zinc-800/60 border border-[var(--border-soft)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Outgoing Invitation</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--doll-blue)]">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> Pending
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--text-main)]">
                Waiting for @{bondState.outgoingRequest!.recipientUsername}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCancelRequest(bondState.outgoingRequest!.id)}
                className="w-full h-9 rounded-xl text-xs border-[var(--border-soft)] text-[var(--text-muted)] hover:text-rose-500"
              >
                Cancel Invitation
              </Button>
            </div>
          )}

          {/* ==================== INCOMING INVITATIONS ==================== */}
          {hasIncoming && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Incoming Requests ({bondState.incomingRequests.length})
              </span>
              <div className="flex flex-col gap-2">
                {bondState.incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 shrink-0">
                        <MoodDoll mood={req.senderMood} size="sm" interactive={false} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                          @{req.senderUsername}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {req.senderMood === 'happy' ? 'Happy' : 'Unhappy'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(isOutgoing) || Boolean(isBonded) || actionLoading === req.id}
                        onClick={() => handleAccept(req.id)}
                        className="h-8 px-3 rounded-xl bg-[var(--doll-pink)] hover:bg-[var(--doll-pink-hover)] text-white text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeclineRequest(req.id)}
                        className="h-8 w-8 p-0 rounded-xl text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== STATE 1: SEARCH & CONNECT (When Unbonded) ==================== */}
          {!isBonded && !isOutgoing && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-[var(--text-muted)]">Find your person</span>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  type="text"
                  placeholder="Enter exact username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 rounded-2xl bg-[var(--bg-surface-soft)] border-[var(--border-soft)] text-sm"
                />
              </div>

              {/* Search Results */}
              {isSearching ? (
                <div className="flex items-center justify-center py-4 text-xs text-[var(--text-muted)] gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col gap-2 mt-1">
                  {searchResults.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-soft)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 shrink-0">
                          <MoodDoll mood={user.currentMood} size="sm" interactive={false} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-main)]">
                          @{user.username}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={actionLoading === user.userId}
                        onClick={() => handleSend(user.userId)}
                        className="h-8 px-3 rounded-xl bg-[var(--text-main)] text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Send Request
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                  No available users found matching "@{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
