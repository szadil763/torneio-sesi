// Módulo: Insígnias por Área — configuração central.
// Sistema paralelo ao estojo por equipe/atividade.
// Compartilha ADMIN_PIN, TEAMS (cor/id) e estilo visual com data.js / style.css.

const ADMIN_PIN = "1234"; // mesmo PIN de data.js

const TEAMS = [
  { id: "vermelha", nome: "Turma A · Vermelha", cor: "#E5484D", corEscura: "#7A1F22", token: "tA9rV2" },
  { id: "azul",     nome: "Turma B · Azul",     cor: "#2F8FE0", corEscura: "#164A72", token: "bX4kL8" },
  { id: "verde",    nome: "Turma C · Verde",     cor: "#3C9A5F", corEscura: "#1E4E30", token: "cG7mN3" },
  { id: "amarela",  nome: "Turma D · Amarela",   cor: "#E0B23C", corEscura: "#7A5D14", token: "dY1pQ5" },
];

const AREAS = [
  { id: "robotica",        nome: "Robótica",        emoji: "🤖", imagem: "assets/insignias/robotica.jpg" },
  { id: "ingles",          nome: "Inglês",           emoji: "🌎", imagem: "assets/insignias/ingles.jpg" },
  { id: "artes",           nome: "Artes",            emoji: "🎨", imagem: "assets/insignias/artes.jpg" },
  { id: "educacao-fisica", nome: "Educação Física",  emoji: "⚽", imagem: "assets/insignias/educacao-fisica.jpg" },
];

// Chave própria — não conflita com o estojo por equipe/atividade (STORAGE_KEY = "torneio-insignias:v1")
const STORAGE_KEY_AREAS = "torneio-insignias-areas:v1";
const RTDB_INSIGNIAS_URL = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com/insignias.json";

let _insigniasCache = null;

// Retorna cache em memória ou localStorage (sync — carregarInsignias() deve ter sido chamado antes)
function lerEstadoAreas() {
  if (_insigniasCache) return _insigniasCache;
  try {
    const bruto = localStorage.getItem(STORAGE_KEY_AREAS);
    return bruto ? JSON.parse(bruto) : { conquistas: {} };
  } catch {
    return { conquistas: {} };
  }
}

// Busca do Firebase e atualiza cache. Chamar no início de cada página.
async function carregarInsignias() {
  try {
    const resp = await fetch(RTDB_INSIGNIAS_URL);
    if (resp.ok) {
      const data = await resp.json();
      _insigniasCache = (data && data.conquistas) ? data : { conquistas: {} };
      localStorage.setItem(STORAGE_KEY_AREAS, JSON.stringify(_insigniasCache));
      return _insigniasCache;
    }
  } catch (_) {}
  // Fallback: usa cache local
  try {
    const bruto = localStorage.getItem(STORAGE_KEY_AREAS);
    _insigniasCache = bruto ? JSON.parse(bruto) : { conquistas: {} };
  } catch (_) { _insigniasCache = { conquistas: {} }; }
  return _insigniasCache;
}

// Salva no Firebase e atualiza cache local (fire-and-forget para o Firebase).
function salvarEstadoAreas(estado) {
  _insigniasCache = estado;
  localStorage.setItem(STORAGE_KEY_AREAS, JSON.stringify(estado));
  fetch(RTDB_INSIGNIAS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(estado)
  }).catch(() => {});
}

// Retorna a quantidade de insígnias que a equipe tem nessa área (0 = nenhuma)
function quantidadeInsignia(estado, areaId, teamId) {
  const val = estado.conquistas[areaId] && estado.conquistas[areaId][teamId];
  if (!val) return 0;
  if (val === true) return 1; // compatibilidade com dados antigos (boolean)
  return typeof val === 'number' ? Math.max(0, val) : 0;
}

// Retorna true se a equipe tem pelo menos 1 insígnia nessa área
function conquistouArea(estado, areaId, teamId) {
  return quantidadeInsignia(estado, areaId, teamId) > 0;
}

// ── Boletim do Torneio ────────────────────────────────────────────
// Armazenado no Firebase RTDB para ser visível em todos os dispositivos.
const STORAGE_KEY_BOLETIM = "torneio-boletim:v1"; // cache local
const RTDB_BOLETIM_URL = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com/boletim.json";

let _boletimCache = null;

// Retorna o cache local (carregarBoletim() deve ter sido chamado antes)
function lerBoletim() {
  if (_boletimCache) return _boletimCache;
  try {
    const bruto = localStorage.getItem(STORAGE_KEY_BOLETIM);
    return bruto ? JSON.parse(bruto) : { itens: [] };
  } catch { return { itens: [] }; }
}

// Busca do Firebase e atualiza cache. Sempre chamar antes de exibir o boletim.
async function carregarBoletim() {
  try {
    const resp = await fetch(RTDB_BOLETIM_URL);
    if (resp.ok) {
      const data = await resp.json();
      _boletimCache = (data && Array.isArray(data.itens)) ? data : { itens: [] };
      localStorage.setItem(STORAGE_KEY_BOLETIM, JSON.stringify(_boletimCache));
      return _boletimCache;
    }
  } catch (_) {}
  // Fallback: usa cache local
  _boletimCache = lerBoletim();
  return _boletimCache;
}

// Salva no Firebase e atualiza cache local.
async function salvarBoletim(dados) {
  _boletimCache = dados;
  localStorage.setItem(STORAGE_KEY_BOLETIM, JSON.stringify(dados));
  try {
    await fetch(RTDB_BOLETIM_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
  } catch (_) {} // Falha silenciosa — localStorage mantém cópia
}

// ── Recados dos Professores ───────────────────────────────────────
const RTDB_RECADOS_URL = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com/recados.json";
const STORAGE_KEY_RECADOS = "torneio-recados:v1";
let _recadosCache = null;

function lerRecados() {
  if (_recadosCache) return _recadosCache;
  try { const b = localStorage.getItem(STORAGE_KEY_RECADOS); return b ? JSON.parse(b) : { itens: [] }; }
  catch { return { itens: [] }; }
}

async function carregarRecados() {
  try {
    const resp = await fetch(RTDB_RECADOS_URL);
    if (resp.ok) {
      const data = await resp.json();
      _recadosCache = (data && Array.isArray(data.itens)) ? data : { itens: [] };
      localStorage.setItem(STORAGE_KEY_RECADOS, JSON.stringify(_recadosCache));
      return _recadosCache;
    }
  } catch (_) {}
  _recadosCache = lerRecados();
  return _recadosCache;
}

async function salvarRecados(dados) {
  _recadosCache = dados;
  localStorage.setItem(STORAGE_KEY_RECADOS, JSON.stringify(dados));
  try {
    await fetch(RTDB_RECADOS_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  } catch (_) {}
}

// ── Dicas ─────────────────────────────────────────────────────────
const RTDB_DICAS_URL = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com/dicas.json";
const STORAGE_KEY_DICAS = "torneio-dicas:v1";
let _dicasCache = null;

function lerDicas() {
  if (_dicasCache) return _dicasCache;
  try { const b = localStorage.getItem(STORAGE_KEY_DICAS); return b ? JSON.parse(b) : { itens: [] }; }
  catch { return { itens: [] }; }
}

async function carregarDicas() {
  try {
    const resp = await fetch(RTDB_DICAS_URL);
    if (resp.ok) {
      const data = await resp.json();
      _dicasCache = (data && Array.isArray(data.itens)) ? data : { itens: [] };
      localStorage.setItem(STORAGE_KEY_DICAS, JSON.stringify(_dicasCache));
      return _dicasCache;
    }
  } catch (_) {}
  _dicasCache = lerDicas();
  return _dicasCache;
}

async function salvarDicas(dados) {
  _dicasCache = dados;
  localStorage.setItem(STORAGE_KEY_DICAS, JSON.stringify(dados));
  try {
    await fetch(RTDB_DICAS_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  } catch (_) {}
}

function detectarTipoMidia(url) {
  if (/youtu\.be\/|youtube\.com\/(watch|shorts|embed)/.test(url)) return 'youtube';
  if (/^data:video\//.test(url)) return 'video';
  if (/\.(mp4|webm|mov|avi|mkv|ogg|m4v|3gp|ts|mts|m2ts|flv|wmv|ogv)(\?|$)/i.test(url)) return 'video';
  return 'imagem';
}

function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Renderiza um card de notícia estilo G1/UOL para uso em alunos.js e admin preview
function renderNoticiaCard(item) {
  const dataFmt = new Date(item.ts || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Suporta array de imagens (novo) ou imagem única (compatibilidade)
  const imgs = item.imagens && item.imagens.length
    ? item.imagens
    : (item.imagem ? [item.imagem] : []);
  const n = imgs.length;

  // Colagem baseada no número de fotos
  let colagem = '';
  if (n === 1) {
    colagem = `
      <div class="bol-hero" style="background-image:url('${imgs[0]}')">
        <div class="bol-hero-overlay">
          ${item.chapeu ? `<span class="bol-chapeu">${item.chapeu}</span>` : ''}
          <div class="bol-manchete-hero">${item.manchete}</div>
        </div>
      </div>`;
  } else if (n === 2) {
    colagem = `
      <div class="bol-colagem-2">
        <div class="bol-col-esq" style="background-image:url('${imgs[0]}')">
          <div class="bol-col-overlay">
            ${item.chapeu ? `<span class="bol-chapeu">${item.chapeu}</span>` : ''}
            <div class="bol-manchete-hero bol-manchete-sm">${item.manchete}</div>
          </div>
        </div>
        <div class="bol-col-dir" style="background-image:url('${imgs[1]}')"></div>
      </div>`;
  } else if (n >= 3) {
    colagem = `
      <div class="bol-colagem-3">
        <div class="bol-col3-grande" style="background-image:url('${imgs[0]}')">
          ${item.chapeu ? `<span class="bol-chapeu" style="position:absolute;top:12px;left:12px">${item.chapeu}</span>` : ''}
        </div>
        <div class="bol-col3-lateral">
          <div style="background-image:url('${imgs[1]}')"></div>
          <div style="background-image:url('${imgs[2]}')"></div>
        </div>
      </div>`;
  }

  // Parágrafos com pull-quote após o 1º
  const paragrafos = item.corpo || [];
  let corpoHtml = '';
  paragrafos.forEach((p, i) => {
    corpoHtml += `<p class="bol-noticia-p">${p}</p>`;
    if (i === 0 && item.pullquote) {
      corpoHtml += `<blockquote class="bol-pullquote">${item.pullquote}</blockquote>`;
    }
  });

  // Se sem foto: manchete no corpo em destaque
  const mancheteCorpo = n === 0
    ? `<div class="bol-manchete-texto">${item.manchete}</div>`
    : (n >= 2 ? '' : '');  // n===1: manchete já está no hero

  return `
    <div class="bol-noticia-card">
      <div class="bol-noticia-header">
        <span class="bol-noticia-brand">📺 SESI TORNEIO NOTÍCIAS</span>
        <span class="bol-noticia-data">${dataFmt}</span>
      </div>
      ${colagem}
      <div class="bol-noticia-corpo">
        ${item.chapeu && n === 0 ? `<span class="bol-chapeu bol-chapeu-inline">${item.chapeu}</span>` : ''}
        ${mancheteCorpo}
        ${n >= 2 ? `<div class="bol-manchete-texto">${item.manchete}</div>` : ''}
        <div class="bol-noticia-subtitulo">${item.subtitulo || ''}</div>
        <div class="bol-noticia-meta">
          <span class="bol-noticia-reporter">Por <strong>${item.reporter || 'Redação SESI'}</strong></span>
          <span class="bol-noticia-sep">·</span>
          <span class="bol-noticia-data-meta">${dataFmt}</span>
        </div>
        <div class="bol-noticia-divisor"></div>
        ${corpoHtml}
      </div>
    </div>`;
}
