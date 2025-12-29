export interface Participant {
  id: string;
  displayName: string;
  isMuted: boolean;
  isSpeaking?: boolean; // Derived from audio level, not necessarily stored in DB
}

export interface Room {
  id: string;
  createdBy: string;
  createdAt: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer';
  sdp: string;
  from: string;
}

export interface IceCandidateMessage {
  candidate: RTCIceCandidateInit;
  from: string;
}
