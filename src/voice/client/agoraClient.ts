import AgoraRTC, { type IAgoraRTCClient } from 'agora-rtc-sdk-ng';

let client: IAgoraRTCClient | null = null;

export function getAgoraClient(): IAgoraRTCClient {
  if (!client) {
    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }
  return client;
}

export function getAppId(): string {
  const appId = import.meta.env.VITE_AGORA_APP_ID;
  if (!appId) {
    throw new Error('VITE_AGORA_APP_ID is not set');
  }
  return appId;
}
