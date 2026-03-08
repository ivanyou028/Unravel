// Optional: load .env.local first, then .env when dotenv is installed.
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // no-op
}
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const graphEvents = [];

function buildHeuristicDecision(newText) {
  const normalized = (newText || '').trim();
  if (!normalized) {
    return { shouldAddNode: false };
  }

  // Simple fallback: propose a node for substantial thought-like chunks.
  const shouldAddNode =
    normalized.length >= 40 &&
    /[.!?]$/.test(normalized);

  if (!shouldAddNode) {
    return { shouldAddNode: false };
  }

  return {
    shouldAddNode: true,
    node: {
      title: normalized.slice(0, 60),
      summary: normalized,
      source: 'heuristic',
    },
  };
}

async function callClaudeForNodeDecision(newText, fullTranscript) {
  if (!ANTHROPIC_API_KEY) {
    return buildHeuristicDecision(newText);
  }

  const systemPrompt =
    'You decide whether newly spoken transcript text should create a new brainstorm node. ' +
    'Return ONLY valid JSON matching this schema: ' +
    '{"shouldAddNode": boolean, "node": {"title": string, "summary": string, "source": "claude"}}. ' +
    'If no node should be added, return {"shouldAddNode": false}. ' +
    'Use concise titles (<= 8 words).';

  const userPrompt = [
    `New finalized transcript chunk: """${newText}"""`,
    `Full transcript so far: """${fullTranscript || ''}"""`,
    'Create a new node only when the new chunk adds a distinct idea, decision, question, or action item.',
  ].join('\n\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const text = payload?.content?.find((part) => part.type === 'text')?.text ?? '';

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.shouldAddNode !== 'boolean') {
      throw new Error('Invalid Claude decision shape');
    }
    if (!parsed.shouldAddNode) {
      return { shouldAddNode: false };
    }
    const title = parsed?.node?.title?.trim() || newText.slice(0, 60);
    const summary = parsed?.node?.summary?.trim() || newText;
    return {
      shouldAddNode: true,
      node: {
        title,
        summary,
        source: 'claude',
      },
    };
  } catch {
    // If model returns malformed JSON, fall back gracefully.
    return buildHeuristicDecision(newText);
  }
}

app.post('/api/claude/decide', async (req, res) => {
  const { newText = '', fullTranscript = '' } = req.body ?? {};

  if (typeof newText !== 'string' || !newText.trim()) {
    return res.status(400).json({ error: 'newText is required' });
  }

  try {
    const decision = await callClaudeForNodeDecision(newText, fullTranscript);
    return res.json(decision);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Failed to get Claude decision',
    });
  }
});

app.post('/api/graph/event', (req, res) => {
  const event = req.body ?? {};
  graphEvents.push({
    ...event,
    createdAt: new Date().toISOString(),
  });
  return res.json({ ok: true });
});

app.get('/api/graph/events', (_req, res) => {
  return res.json(graphEvents);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/transcribe' });

wss.on('connection', (clientWs) => {
  console.log('[ws] Client connected');

  // Open a WebSocket to Deepgram
  const dgUrl =
    'wss://api.deepgram.com/v1/listen?' +
    new URLSearchParams({
      model: 'nova-3',
      language: 'en',
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true',
      endpointing: '300',
    }).toString();

  const dgWs = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  });

  dgWs.on('open', () => {
    console.log('[deepgram] Connected');
    clientWs.send(JSON.stringify({ type: 'status', message: 'Deepgram connected' }));
  });

  dgWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'Results') {
        const transcript = msg.channel?.alternatives?.[0]?.transcript;
        if (transcript) {
          const isFinal = msg.is_final;
          clientWs.send(JSON.stringify({
            type: 'transcript',
            transcript,
            is_final: isFinal,
            speech_final: msg.speech_final ?? false,
          }));
          if (isFinal) {
            console.log(`[transcript] ${transcript}`);
          }
        }
      } else if (msg.type === 'UtteranceEnd') {
        clientWs.send(JSON.stringify({ type: 'utterance_end' }));
      }
    } catch {
      // ignore parse errors
    }
  });

  dgWs.on('close', () => {
    console.log('[deepgram] Disconnected');
    clientWs.send(JSON.stringify({ type: 'status', message: 'Deepgram disconnected' }));
  });

  dgWs.on('error', (err) => {
    console.error('[deepgram] Error:', err.message);
    clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
  });

  // Forward audio from browser to Deepgram
  clientWs.on('message', (data, isBinary) => {
    if (isBinary && dgWs.readyState === WebSocket.OPEN) {
      dgWs.send(data);
    }
  });

  clientWs.on('close', () => {
    console.log('[ws] Client disconnected');
    if (dgWs.readyState === WebSocket.OPEN) {
      dgWs.close();
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`\n  Test server running at http://localhost:${PORT}`);
  console.log(`  Open http://localhost:${PORT}/test.html in your browser\n`);
});
