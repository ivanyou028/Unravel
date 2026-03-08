export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export type AgentStatus = 'silent' | 'listening' | 'thinking' | 'speaking';

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

export interface AgentConfig {
  channelName: string;
  userUid: number;
  systemPrompt?: string;
  topic?: string;
}

export interface StartAgentResponse {
  agentId: string;
  createTs: number;
  status: string;
}

export interface TokenResponse {
  token: string;
  channel: string;
  uid: number;
}

export interface VoiceSessionCallbacks {
  onEvent?: (event: VoiceEvent) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
  onAgentStatusChange?: (status: AgentStatus) => void;
}
