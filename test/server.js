import 'dotenv/config';
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

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n  Test server running at http://localhost:${PORT}`);
  console.log(`  Open http://localhost:${PORT}/test.html in your browser\n`);
});
