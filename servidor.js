/**
 * Servidor local Kahoot English — SESI
 * Substitui o Firebase durante provas sem internet.
 * Uso: node servidor.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── QR Code (opcional — instale com: npm install qrcode) ──────────
let QRCode;
try { QRCode = require('qrcode'); } catch (_) {}

// ── Estado do jogo ────────────────────────────────────────────────
let kahoot_active = null;
let kahoot_buzz   = null;
let kahoot_pts    = {};

// Restaura pontuação salva em arquivo (persiste entre reinicios)
const SCORES_FILE = path.join(__dirname, 'kahoot-scores.json');
try {
  const d = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  if (d && typeof d.kahoot_pts === 'object') {
    kahoot_pts = d.kahoot_pts;
    console.log('  Pontuação restaurada:', JSON.stringify(kahoot_pts));
  }
} catch (_) {}

function salvarPontuacao() {
  try { fs.writeFileSync(SCORES_FILE, JSON.stringify({ kahoot_pts }, null, 2)); } catch (_) {}
}

// ── IP local ──────────────────────────────────────────────────────
function getLocalIP() {
  // Prioriza adaptador de hotspot do Windows (192.168.137.x)
  const all = [];
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family === 'IPv4' && !i.internal) all.push(i.address);
  return all.find(ip => ip.startsWith('192.168.137.')) || all[0] || '127.0.0.1';
}

// ── Constantes ───────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, 'public');
const PORT   = 3000;
const IP     = getLocalIP();

const TEAMS = [
  { id: 'vermelha', label: 'Equipe A — Vermelha', color: '#E5484D' },
  { id: 'azul',     label: 'Equipe B — Azul',     color: '#2F8FE0' },
  { id: 'verde',    label: 'Equipe C — Verde',     color: '#3C9A5F' },
  { id: 'amarela',  label: 'Equipe D — Amarela',   color: '#E0B23C' },
];

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

// ── Helpers ───────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Resolve {'.sv':'timestamp'} igual ao Firebase
function processVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  if (v['.sv'] === 'timestamp') return Date.now();
  const o = {};
  for (const k of Object.keys(v)) o[k] = processVal(v[k]);
  return o;
}

function sendJSON(res, code, val) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(val == null ? null : val));
}

// ── Rota de API (imita Firebase REST) ────────────────────────────
function apiRoute(req, res, getter, setter) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET') {
    sendJSON(res, 200, getter()); return;
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try { setter(processVal(JSON.parse(body))); }
      catch (_) { setter(null); }
      sendJSON(res, 200, getter());
    });
    return;
  }
  if (req.method === 'DELETE') {
    setter(null); sendJSON(res, 200, null); return;
  }
  res.writeHead(405); res.end();
}

// ── Página de setup com QR codes ─────────────────────────────────
async function setupHTML() {
  let cards = '';
  for (const t of TEAMS) {
    const url = `http://${IP}:${PORT}/buzzer-phone.html?team=${t.id}`;
    let qrBlock = '';
    if (QRCode) {
      try {
        const svg = await QRCode.toString(url, { type: 'svg', width: 180, margin: 1 });
        qrBlock = `<div class="qr">${svg}</div>`;
      } catch (_) {}
    }
    if (!qrBlock) {
      qrBlock = `<div class="qr-fallback">Para gerar QR codes:<br><code>npm install qrcode</code><br>e reinicie o servidor.</div>`;
    }
    cards += `
    <div class="card" style="border-top:5px solid ${t.color}">
      <div class="tname" style="color:${t.color}">${t.label}</div>
      ${qrBlock}
      <a class="url" href="${url}" target="_blank">${url}</a>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup — Kahoot Local SESI</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#fff;padding:28px 16px}
h1{text-align:center;font-size:22px;font-weight:900;color:#f8fafc;margin-bottom:6px}
.sub{text-align:center;color:#94a3b8;font-size:13px;margin-bottom:24px}
.badge{display:inline-block;background:#16a34a;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:.06em;margin-bottom:20px;text-align:center;width:100%}
.monitor-btn{display:block;max-width:380px;margin:0 auto 24px;padding:16px 28px;background:#004B8D;color:#fff;border-radius:14px;text-align:center;text-decoration:none;font-weight:900;font-size:16px}
.ip-box{max-width:500px;margin:0 auto 28px;background:#1e293b;border-radius:12px;padding:14px 20px;text-align:center;font-size:13px;color:#94a3b8}
.ip-box strong{color:#f8fafc;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;max-width:920px;margin:0 auto}
.card{background:#1e293b;border-radius:16px;padding:20px;text-align:center}
.tname{font-size:14px;font-weight:800;margin-bottom:14px;letter-spacing:.03em}
.qr svg{max-width:180px;height:auto;background:#fff;padding:8px;border-radius:8px;display:block;margin:0 auto}
.qr-fallback{color:#64748b;font-size:12px;padding:20px;line-height:1.7}
.qr-fallback code{background:#0f172a;padding:2px 6px;border-radius:4px;color:#94a3b8}
.url{display:block;margin-top:12px;font-size:11px;color:#94a3b8;word-break:break-all;text-decoration:none}
.url:hover{color:#60a5fa}
</style></head><body>
<h1>🏆 Kahoot English — Servidor Local</h1>
<p class="sub">Configure as botoeiras escaneando os QR codes abaixo</p>
<div class="badge">● MODO OFFLINE — SEM INTERNET NECESSÁRIA</div>
<a class="monitor-btn" href="/monitor">▶ Abrir Monitor do Mediador</a>
<div class="ip-box">
  IP do servidor: <strong>${IP}</strong> &nbsp;·&nbsp; Porta: <strong>${PORT}</strong><br>
  <span style="font-size:11px;margin-top:4px;display:block">Todos os celulares devem estar conectados ao hotspot Wi-Fi deste notebook</span>
</div>
<div class="grid">${cards}</div>
</body></html>`;
}

// ── Servidor HTTP ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);

  // API Kahoot
  if (pathname === '/kahoot_active.json') {
    apiRoute(req, res, () => kahoot_active, v => { kahoot_active = v; }); return;
  }
  if (pathname === '/kahoot_buzz.json') {
    apiRoute(req, res, () => kahoot_buzz, v => { kahoot_buzz = v; }); return;
  }
  if (pathname === '/kahoot_pts.json') {
    apiRoute(req, res, () => kahoot_pts, v => { kahoot_pts = v || {}; salvarPontuacao(); }); return;
  }

  // Caminhos do buzzer normal — responde null (não usado no ginásio)
  if (pathname.startsWith('/buzzer')) {
    sendJSON(res, 200, null); return;
  }

  // Monitor
  if (pathname === '/monitor' || pathname === '/monitor/') {
    const fp = path.join(PUBLIC, 'monitor-kahoot-local.html');
    fs.readFile(fp, (err, d) => {
      if (err) { res.writeHead(404); res.end('monitor-kahoot-local.html não encontrado'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(d);
    });
    return;
  }

  // Setup / raiz
  if (pathname === '/' || pathname === '/setup') {
    try {
      const html = await setupHTML();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) { res.writeHead(500); res.end('Erro interno'); }
    return;
  }

  // Arquivos estáticos de public/
  const fp = path.resolve(path.join(PUBLIC, pathname));
  if (!fp.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, d) => {
    if (err) { res.writeHead(404); res.end('Não encontrado'); return; }
    const mime = MIMES[path.extname(fp).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(d);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const sep = '─'.repeat(58);
  console.log(`\n┌${sep}┐`);
  console.log(`│  SERVIDOR KAHOOT LOCAL — SESI${' '.repeat(28)}│`);
  console.log(`├${sep}┤`);
  console.log(`│  Monitor:   http://localhost:${PORT}/monitor${' '.repeat(14)}│`);
  console.log(`│  Setup/QR:  http://localhost:${PORT}/${' '.repeat(20)}│`);
  console.log(`├${sep}┤`);
  console.log(`│  Botoeiras (IP do hotspot: ${IP})${' '.repeat(58 - 30 - IP.length)}│`);
  for (const t of TEAMS) {
    const url = `http://${IP}:${PORT}/buzzer-phone.html?team=${t.id}`;
    console.log(`│  ${url}${' '.repeat(Math.max(0, 57 - url.length))}│`);
  }
  console.log(`├${sep}┤`);
  if (!QRCode) {
    console.log(`│  DICA: gere QR codes com:  npm install qrcode${' '.repeat(11)}│`);
    console.log(`├${sep}┤`);
  }
  console.log(`│  Pressione Ctrl+C para encerrar.${' '.repeat(24)}│`);
  console.log(`└${sep}┘\n`);
});
