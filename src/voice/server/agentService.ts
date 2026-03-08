import { generateToken } from './tokenService';
import { buildSystemPrompt, GREETING_MESSAGE, FAILURE_MESSAGE } from '../prompts';
import type { AgentConfig, StartAgentResponse } from '../types';

const AGORA_APP_ID = process.env.AGORA_APP_ID!;
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const LLM_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-6';

const TTS_VENDOR = process.env.TTS_VENDOR || 'microsoft';
const MICROSOFT_TTS_KEY = process.env.MICROSOFT_TTS_KEY;
const MICROSOFT_TTS_REGION = process.env.MICROSOFT_TTS_REGION || 'eastus';
const MICROSOFT_TTS_VOICE = process.env.MICROSOFT_TTS_VOICE || 'en-US-AndrewMultilingualNeural';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

const AGENT_UID = 999;
const BASE_URL = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}`;

function getAuthHeader(): string {
  const credentials = `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

function buildTtsConfig() {
  if (TTS_VENDOR === 'elevenlabs') {
    return {
      vendor: 'elevenlabs',
      params: {
        key: ELEVENLABS_API_KEY,
        model_id: 'eleven_flash_v2_5',
        voice_id: ELEVENLABS_VOICE_ID,
        sample_rate: 24000,
        speed: 1.0,
      },
    };
  }

  return {
    vendor: 'microsoft',
    params: {
      key: MICROSOFT_TTS_KEY,
      region: MICROSOFT_TTS_REGION,
      voice_name: MICROSOFT_TTS_VOICE,
      speed: 1.0,
      volume: 70,
      sample_rate: 24000,
    },
  };
}

export async function startAgent(config: AgentConfig): Promise<StartAgentResponse> {
  const agentToken = generateToken(config.channelName, AGENT_UID);
  const systemPrompt = config.systemPrompt || buildSystemPrompt(config.topic);
  const agentName = `threads-${config.channelName}-${Date.now()}`;

  const body = {
    name: agentName,
    properties: {
      channel: config.channelName,
      token: agentToken,
      agent_rtc_uid: String(AGENT_UID),
      remote_rtc_uids: [String(config.userUid)],
      idle_timeout: 300,
      asr: {
        language: 'en-US',
        task: 'conversation',
      },
      llm: {
        url: 'https://api.anthropic.com/v1/messages',
        api_key: ANTHROPIC_API_KEY,
        headers: JSON.stringify({ 'anthropic-version': '2023-06-01' }),
        style: 'anthropic',
        system_messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
        ],
        max_history: 50,
        greeting_message: GREETING_MESSAGE,
        failure_message: FAILURE_MESSAGE,
        params: {
          model: LLM_MODEL,
          max_tokens: 256,
        },
        input_modalities: ['text'],
        output_modalities: ['text'],
      },
      tts: buildTtsConfig(),
      vad: {
        silence_duration_ms: 480,
        speech_duration_ms: 15000,
        threshold: 0.5,
        interrupt_duration_ms: 160,
        prefix_padding_ms: 300,
      },
    },
  };

  const response = await fetch(`${BASE_URL}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start agent (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    agentId: data.agent_id,
    createTs: data.create_ts,
    status: data.status,
  };
}

export async function stopAgent(agentId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/agents/${agentId}/leave`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to stop agent (${response.status}): ${errorText}`);
  }
}

export async function getAgentStatus(agentId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/agents/${agentId}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get agent status (${response.status})`);
  }

  const data = await response.json();
  return data.status;
}
