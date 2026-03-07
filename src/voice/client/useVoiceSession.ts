import { useState, useCallback, useRef } from 'react';
import AgoraRTC, { type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { getAgoraClient, getAppId } from './agoraClient';
import type {
  VoiceSessionStatus,
  VoiceSessionCallbacks,
  VoiceEvent,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export function useVoiceSession(callbacks?: VoiceSessionCallbacks) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const agentIdRef = useRef<string | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const channelRef = useRef<string | null>(null);

  const emitEvent = useCallback(
    (event: VoiceEvent) => {
      callbacks?.onEvent?.(event);
    },
    [callbacks],
  );

  const updateStatus = useCallback(
    (newStatus: VoiceSessionStatus) => {
      setStatus(newStatus);
      callbacks?.onStatusChange?.(newStatus);
    },
    [callbacks],
  );

  const connect = useCallback(
    async (topic?: string) => {
      const client = getAgoraClient();
      updateStatus('connecting');

      try {
        // 1. Get token from server
        const tokenRes = await fetch(`${API_BASE}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!tokenRes.ok) throw new Error('Failed to get token');
        const { token, channel, uid } = await tokenRes.json();
        channelRef.current = channel;

        // 2. Join the Agora RTC channel
        await client.join(getAppId(), channel, token, uid);

        // 3. Create and publish microphone track
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        micTrackRef.current = micTrack;
        await client.publish([micTrack]);

        // 4. Listen for the AI agent's audio
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'audio') {
            user.audioTrack?.play();
            emitEvent({
              type: 'agent_joined',
              timestamp: Date.now(),
              data: { uid: user.uid },
            });
          }
        });

        client.on('user-left', (user) => {
          emitEvent({
            type: 'agent_left',
            timestamp: Date.now(),
            data: { uid: user.uid },
          });
        });

        // 5. Start the AI agent via server
        const agentRes = await fetch(`${API_BASE}/api/agent/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelName: channel,
            userUid: uid,
            topic,
          }),
        });
        if (!agentRes.ok) throw new Error('Failed to start agent');
        const { agentId } = await agentRes.json();
        agentIdRef.current = agentId;

        updateStatus('connected');
      } catch (error) {
        emitEvent({
          type: 'error',
          timestamp: Date.now(),
          data: { error: String(error) },
        });
        updateStatus('disconnected');
        throw error;
      }
    },
    [updateStatus, emitEvent],
  );

  const disconnect = useCallback(async () => {
    const client = getAgoraClient();

    // Stop agent
    if (agentIdRef.current) {
      try {
        await fetch(`${API_BASE}/api/agent/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agentIdRef.current }),
        });
      } catch {
        // Best-effort — agent will auto-stop on idle timeout
      }
      agentIdRef.current = null;
    }

    // Clean up mic track
    if (micTrackRef.current) {
      micTrackRef.current.close();
      micTrackRef.current = null;
    }

    // Leave channel
    client.removeAllListeners();
    await client.leave();

    channelRef.current = null;
    setIsMuted(false);
    updateStatus('disconnected');
  }, [updateStatus]);

  const toggleMute = useCallback(() => {
    if (micTrackRef.current) {
      const newMuted = !isMuted;
      micTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  return {
    status,
    isMuted,
    connect,
    disconnect,
    toggleMute,
  };
}
