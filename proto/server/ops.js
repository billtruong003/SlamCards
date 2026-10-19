// Operator controls on a loopback-only port that nginx never proxies (so nobody outside the VPS
// can reach it, whatever Host header they send): is anyone playing, drain before a deploy, undo.
//   curl -s 127.0.0.1:8197/status
//   curl -s -X POST '127.0.0.1:8197/drain?minutes=3'
//   curl -s -X POST 127.0.0.1:8197/undrain
import http from 'node:http';

const MAX_DRAIN_MINUTES = 60;

export function startAdmin({ port, status, drain, undrain }) {
  const admin = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const reply = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && url.pathname === '/status') return reply(200, status());
    if (req.method === 'POST' && url.pathname === '/drain') {
      const minutes = Number(url.searchParams.get('minutes') ?? 3);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_DRAIN_MINUTES) return reply(400, { error: `minutes: 0-${MAX_DRAIN_MINUTES}` });
      drain(minutes * 60000);
      return reply(200, status());
    }
    if (req.method === 'POST' && url.pathname === '/undrain') {
      undrain();
      return reply(200, status());
    }
    return reply(404, { error: 'GET /status, POST /drain?minutes=N, POST /undrain' });
  });
  // a busy port (a second copy of the server, a test) costs the controls, never the game
  admin.on('error', (err) => console.error(`[ops] admin port ${port}: ${err.message}`));
  admin.listen(port, '127.0.0.1', () => console.log(`[ops] admin on http://127.0.0.1:${port}`));
  return admin;
}
