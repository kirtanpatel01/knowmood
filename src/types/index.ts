export type Mood = 'happy' | 'unhappy';

export interface BondStateResponse {
  state: 'unbonded' | 'outgoing_pending' | 'incoming_pending' | 'bonded';
  activeBond?: {
    id: string;
    partnerUserId: string;
    partnerUsername: string;
    partnerMood: Mood;
    status: 'active' | 'break_pending';
    breakRequestedByUserId: string | null;
    breakRequestedByUsername?: string | null;
    breakRequestedAt: string | null;
    createdAt: string;
  };
  outgoingRequest?: {
    id: string;
    recipientUserId: string;
    recipientUsername: string;
    createdAt: string;
  };
  incomingRequests: Array<{
    id: string;
    senderUserId: string;
    senderUsername: string;
    senderMood: Mood;
    createdAt: string;
  }>;
}

export interface SearchUserResult {
  userId: string;
  username: string;
  currentMood: Mood;
}
