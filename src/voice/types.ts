export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export type VoiceEventType =
  | 'agent_joined'
  | 'agent_left'
  | 'agent_state_change'
  | 'transcript'
  | 'ai_debug'
  | 'error';

export interface VoiceEvent {
  type: VoiceEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface VoiceSessionCallbacks {
  onEvent?: (event: VoiceEvent) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
}
