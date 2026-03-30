// CERBERUS BACKEND — OPTIMISED + CLEAN

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/', (_req, res) => {
  res.send('Cerberus backend online');
});

// Broadcast helper
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Track presence: jobId -> Set of usernames
const jobPresence = {};

// WebSocket relay (presence + brainrot)
wss.on('connection', ws => {
  let _username = null;
  let _jobId    = null;

  ws.on('message', data => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    // Handle presence join
    if (msg.type === 'presence_join' && msg.username && msg.job_id) {
      _username = msg.username;
      _jobId    = msg.job_id;

      if (!jobPresence[_jobId]) jobPresence[_jobId] = new Set();
      jobPresence[_jobId].add(_username);

      // Tell everyone in that job a new user joined
      broadcast({ type: 'presence_join', username: _username, job_id: _jobId });
      return;
    }

    // Relay everything else (brainrot, etc.)
    broadcast(msg);
  });

  ws.on('close', () => {
    if (_username && _jobId && jobPresence[_jobId]) {
      jobPresence[_jobId].delete(_username);
      if (jobPresence[_jobId].size === 0) delete jobPresence[_jobId];
      // Tell everyone they left
      broadcast({ type: 'presence_leave', username: _username, job_id: _jobId });
    }
  });
});

// Brainrot scanner endpoint
app.post('/submit', (req, res) => {
  const b = req.body;

  if (!b || !b.name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const payload = {
    type:     "brainrot",
    name:     b.name,
    gen:      b.gen || "?",
    mutation: b.mutation || "None",
    value:    b.value || 0,
    job_id:   b.job_id || "",
    place_id: b.place_id || ""
  };

  broadcast(payload);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Cerberus backend running on port", PORT);
});
