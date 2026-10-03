/**
 * Servidor local Torneio SESI
 * Substitui o Firebase durante provas sem internet.
 * Uso: node servidor.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── QR Code (opcional) ────────────────────────────────────────────
let QRCode;
try { QRCode = require('qrcode'); } catch (_) {}

// ── Estado Kahoot ─────────────────────────────────────────────────
let kahoot_active = null;
let kahoot_buzz   = null;
let kahoot_pts    = {};

// ── Store genérico (Propulsão, Ponte, etc.) ───────────────────────
let genericStore = {};

// ── Arquivo de persistência unificado ────────────────────────────
const DATA_FILE = path.join(__dirname, 'torneio-data.json');
try {
  const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (d) {
    if (d.kahoot_pts && typeof d.kahoot_pts === 'object') kahoot_pts = d.kahoot_pts;
    if (d.store && typeof d.store === 'object') genericStore = d.store;
    console.log('  Dados restaurados:', Object.keys(genericStore).length, 'registros + kahoot_pts');
  }
} catch (_) {}

function salvarDados() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ kahoot_pts, store: genericStore }, null, 2));
  } catch (_) {}
}

// ── IP local ──────────────────────────────────────────────────────
function getLocalIP() {
  const all = [];
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family === 'IPv4' && !i.internal) all.push(i.address);
  return all.find(ip => ip.startsWith('192.168.137.')) || all[0] || '127.0.0.1';
}

const PUBLIC = path.join(__dirname, 'public');
const DIST   = path.join(__dirname, 'dist');
const PORT   = 3000;
const IP     = getLocalIP();

const TEAMS_KAHOOT = [
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
  '.gif':  'image/gif',
  '.pdf':  'application/pdf',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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
  if (req.method === 'GET') { sendJSON(res, 200, getter()); return; }
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
  if (req.method === 'DELETE') { setter(null); sendJSON(res, 200, null); return; }
  res.writeHead(405); res.end();
}

// ── Rota genérica /db/{key}.json ─────────────────────────────────
function dbRoute(req, res, key) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET') {
    sendJSON(res, 200, genericStore[key] !== undefined ? genericStore[key] : null);
    return;
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try { genericStore[key] = processVal(JSON.parse(body)); }
      catch (_) { genericStore[key] = null; }
      salvarDados();
      sendJSON(res, 200, genericStore[key]);
    });
    return;
  }
  if (req.method === 'DELETE') {
    delete genericStore[key];
    salvarDados();
    sendJSON(res, 200, null);
    return;
  }
  res.writeHead(405); res.end();
}

// ── Página de setup com QR codes ─────────────────────────────────
async function setupHTML() {
  let cards = '';
  for (const t of TEAMS_KAHOOT) {
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
<title>SESI · Servidor Local — Modo Offline</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#fff;padding:28px 16px}
h1{text-align:center;font-size:22px;font-weight:900;color:#f8fafc;margin-bottom:6px}
.sub{text-align:center;color:#94a3b8;font-size:13px;margin-bottom:24px}
.badge{display:inline-block;background:#16a34a;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:.06em;margin-bottom:20px;text-align:center;width:100%}
.links{max-width:500px;margin:0 auto 24px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.btn{display:block;padding:14px 22px;border-radius:12px;text-align:center;text-decoration:none;font-weight:900;font-size:15px}
.btn-blue{background:#004B8D;color:#fff}
.btn-orange{background:#F5821F;color:#fff}
.btn-gray{background:#1e293b;color:#94a3b8;border:1px solid #334155}
.ip-box{max-width:500px;margin:0 auto 28px;background:#1e293b;border-radius:12px;padding:14px 20px;text-align:center;font-size:13px;color:#94a3b8}
.ip-box strong{color:#f8fafc;font-size:15px}
.section-title{max-width:920px;margin:0 auto 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#475569}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;max-width:920px;margin:0 auto}
.card{background:#1e293b;border-radius:16px;padding:20px;text-align:center}
.tname{font-size:14px;font-weight:800;margin-bottom:14px;letter-spacing:.03em}
.qr svg{max-width:180px;height:auto;background:#fff;padding:8px;border-radius:8px;display:block;margin:0 auto}
.qr-fallback{color:#64748b;font-size:12px;padding:20px;line-height:1.7}
.qr-fallback code{background:#0f172a;padding:2px 6px;border-radius:4px;color:#94a3b8}
.url{display:block;margin-top:12px;font-size:11px;color:#94a3b8;word-break:break-all;text-decoration:none}
.url:hover{color:#60a5fa}
</style></head><body>
<h1>🏆 Torneio SESI — Servidor Local</h1>
<p class="sub">Modo 100% offline ativo — todas as provas funcionam sem internet</p>
<div class="badge">● MODO OFFLINE — SEM INTERNET NECESSÁRIA</div>

<div class="links">
  <a class="btn btn-blue" href="/gerenciador/">📊 Gerenciador de Provas</a>
  <a class="btn btn-orange" href="/monitor">🖥️ Monitor Kahoot English</a>
  <a class="btn btn-gray" href="/guia-ginasio.html">📖 Guia de Setup</a>
</div>

<div class="ip-box">
  IP do servidor: <strong>${IP}</strong> &nbsp;·&nbsp; Porta: <strong>${PORT}</strong><br>
  <span style="font-size:11px;margin-top:4px;display:block">Todos os dispositivos devem estar conectados ao hotspot Wi-Fi deste notebook</span>
</div>

<div class="section-title">Botoeiras Kahoot English — escaneie o QR code</div>
<div class="grid">${cards}</div>
</body></html>`;
}

// ── Servir arquivo estático ───────────────────────────────────────
function serveFile(res, filepath) {
  fs.readFile(filepath, (err, d) => {
    if (err) { res.writeHead(404); res.end('Não encontrado'); return; }
    const mime = MIMES[path.extname(filepath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(d);
  });
}

// ── Servidor HTTP ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);

  // ── API Kahoot ────────────────────────────────────────────────
  if (pathname === '/kahoot_active.json') {
    apiRoute(req, res, () => kahoot_active, v => { kahoot_active = v; }); return;
  }
  if (pathname === '/kahoot_buzz.json') {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method === 'GET') { sendJSON(res, 200, kahoot_buzz); return; }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        if (kahoot_buzz === null) { // primeiro a chegar ganha — ignora os demais
          try { kahoot_buzz = processVal(JSON.parse(body)); } catch (_) {}
        }
        sendJSON(res, 200, kahoot_buzz);
      });
      return;
    }
    if (req.method === 'DELETE') { kahoot_buzz = null; sendJSON(res, 200, null); return; }
    res.writeHead(405); res.end();
    return;
  }
  if (pathname === '/kahoot_pts.json') {
    apiRoute(req, res, () => kahoot_pts, v => {
      kahoot_pts = v || {};
      salvarDados();
    }); return;
  }

  // ── API Genérica /db/{key}.json ───────────────────────────────
  const dbMatch = pathname.match(/^\/db\/(.+)\.json$/);
  if (dbMatch) {
    const key = decodeURIComponent(dbMatch[1]);
    dbRoute(req, res, key);
    return;
  }

  // ── Gerenciador React (app compilado em dist/) ────────────────
  if (pathname === '/gerenciador' || pathname === '/gerenciador/') {
    const indexFile = path.join(DIST, 'index.html');
    if (fs.existsSync(indexFile)) {
      serveFile(res, indexFile); return;
    }
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#fff;padding:40px;text-align:center">
      <h2>⚙️ App não compilado</h2>
      <p style="color:#94a3b8;margin-top:12px">Execute <code style="background:#1e293b;padding:4px 10px;border-radius:6px">npm run build</code> antes de iniciar o servidor.</p>
      <a href="/" style="display:inline-block;margin-top:20px;color:#60a5fa">← Voltar ao início</a>
    </body></html>`);
    return;
  }

  // Arquivos do dist/ (assets do React: /assets/index-xxx.js etc)
  if (pathname.startsWith('/assets/') || pathname === '/favicon.ico') {
    const fp = path.resolve(path.join(DIST, pathname));
    if (fp.startsWith(DIST) && fs.existsSync(fp)) { serveFile(res, fp); return; }
  }

  // ── Monitor Kahoot ────────────────────────────────────────────
  if (pathname === '/monitor' || pathname === '/monitor/') {
    serveFile(res, path.join(PUBLIC, 'monitor-kahoot-local.html')); return;
  }

  // ── Setup / raiz ──────────────────────────────────────────────
  if (pathname === '/' || pathname === '/setup' || pathname === '/setup/') {
    try {
      const html = await setupHTML();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) { res.writeHead(500); res.end('Erro interno'); }
    return;
  }

  // ── Arquivos estáticos de public/ ────────────────────────────
  const fp = path.resolve(path.join(PUBLIC, pathname));
  if (!fp.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  serveFile(res, fp);
});

server.listen(PORT, '0.0.0.0', () => {
  const sep = '─'.repeat(60);
  console.log(`\n┌${sep}┐`);
  console.log(`│  TORNEIO SESI — SERVIDOR LOCAL (MODO OFFLINE)${' '.repeat(14)}│`);
  console.log(`├${sep}┤`);
  console.log(`│  Gerenciador:  http://localhost:${PORT}/gerenciador/${' '.repeat(13)}│`);
  console.log(`│  Monitor:      http://localhost:${PORT}/monitor${' '.repeat(18)}│`);
  console.log(`│  Setup/QR:     http://localhost:${PORT}/${' '.repeat(23)}│`);
  console.log(`├${sep}┤`);
  console.log(`│  IP do hotspot: ${IP}${' '.repeat(60 - 19 - IP.length)}│`);
  for (const t of TEAMS_KAHOOT) {
    const url = `http://${IP}:${PORT}/buzzer-phone.html?team=${t.id}`;
    console.log(`│  ${url}${' '.repeat(Math.max(0, 59 - url.length))}│`);
  }
  console.log(`├${sep}┤`);
  if (!QRCode) {
    console.log(`│  DICA: gere QR codes com: npm install qrcode${' '.repeat(15)}│`);
    console.log(`├${sep}┤`);
  }
  const distOk = fs.existsSync(path.join(DIST, 'index.html'));
  if (!distOk) {
    console.log(`│  ⚠  ATENÇÃO: execute "npm run build" para o gerenciador.${' '.repeat(4)}│`);
    console.log(`├${sep}┤`);
  }
  console.log(`│  Pressione Ctrl+C para encerrar.${' '.repeat(27)}│`);
  console.log(`└${sep}┘\n`);
});
