import { generateToken } from './tokenService';
import { startAgent, stopAgent } from './agentService';

/**
 * Framework-agnostic route handlers.
 * Wire these into Express, Next.js API routes, Hono, etc.
 *
 * Express example:
 *   app.post('/api/token', async (req, res) => {
 *     const result = await handleGenerateToken(req.body);
 *     res.json(result);
 *   });
 */

export async function handleGenerateToken(body: {
  channelName?: string;
  uid?: number;
}): Promise<{ token: string; channel: string; uid: number }> {
  const channelName = body.channelName || `threads-${Date.now()}`;
  const uid = body.uid || Math.floor(Math.random() * 100000) + 1;
  const token = generateToken(channelName, uid);

  return { token, channel: channelName, uid };
}

export async function handleStartAgent(body: {
  channelName: string;
  userUid: number;
  topic?: string;
  systemPrompt?: string;
}): Promise<{ agentId: string }> {
  if (!body.channelName || !body.userUid) {
    throw new Error('channelName and userUid are required');
  }

  const result = await startAgent({
    channelName: body.channelName,
    userUid: body.userUid,
    topic: body.topic,
    systemPrompt: body.systemPrompt,
  });

  return { agentId: result.agentId };
}

export async function handleStopAgent(body: {
  agentId: string;
}): Promise<{ success: boolean }> {
  if (!body.agentId) {
    throw new Error('agentId is required');
  }

  await stopAgent(body.agentId);
  return { success: true };
}
