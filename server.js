// CERBERUS BACKEND — OPTIMISED + CLEAN

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json({ limit: '10kb' }));

app.get('/', (_req, res) => res.send('Cerberus backend online'));

// Pre-serialise into a Buffer — avoids re-encoding per client
function broadcast(obj) {
    const buf = Buffer.from(JSON.stringify(obj));
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(buf);
        }
    }
}

wss.on('connection', ws => {
    let _username = null;
    let _jobId    = null;

    ws.on('message', data => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'presence_join' && msg.username && msg.job_id) {
            _username = msg.username;
            _jobId    = msg.job_id;
            broadcast({ type: 'presence_join', username: _username, job_id: _jobId });
            return;
        }

        broadcast(msg);
    });

    ws.on('close', () => {
        if (_username && _jobId) {
            broadcast({ type: 'presence_leave', username: _username, job_id: _jobId });
        }
    });
});

app.post('/submit', (req, res) => {
    const b = req.body;
    if (!b?.name) return res.status(400).json({ error: 'Missing name' });

    broadcast({
        type:     "brainrot",
        name:     b.name,
        gen:      b.gen      || "?",
        mutation: b.mutation || "None",
        value:    b.value    || 0,
        job_id:   b.job_id   || "",
        place_id: b.place_id || ""
    });

    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Cerberus backend running on port", PORT));

// Keep-alive: ping all clients every 20s so Render never idles
setInterval(() => {
    const buf = Buffer.from(JSON.stringify({ type: "ping" }));
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(buf);
    }
}, 20000);
