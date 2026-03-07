import dotenv from 'dotenv'
dotenv.config({ override: true })
import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { handleSessionSocket } from './ws/sessionHandler.js'
import { SessionManager } from './services/session.js'

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws/session' })

const sessionManager = new SessionManager()

// --- REST endpoints ---

app.post('/api/session', (req, res) => {
  const { topic } = req.body ?? {}
  const session = sessionManager.create(topic)
  res.json({ sessionId: session.id })
})

app.delete('/api/session/:id', (req, res) => {
  try {
    sessionManager.destroy(req.params.id)
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'Session not found' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      deepgram: !!process.env.DEEPGRAM_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
    },
  })
})

// --- WebSocket ---

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    ws.close(4000, 'Missing sessionId query parameter')
    return
  }

  try {
    sessionManager.get(sessionId) // validate exists
    handleSessionSocket(ws, sessionId, sessionManager)
  } catch {
    ws.close(4001, 'Invalid sessionId')
  }
})

// --- Start ---

const PORT = process.env.SERVER_PORT || 3001
server.listen(PORT, () => {
  console.log(`\n  Server running at http://localhost:${PORT}`)
  console.log(`  WebSocket at ws://localhost:${PORT}/ws/session\n`)
})
