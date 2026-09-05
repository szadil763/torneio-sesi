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

function lerEstadoAreas() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY_AREAS);
    return bruto ? JSON.parse(bruto) : { conquistas: {} };
  } catch {
    return { conquistas: {} };
  }
}

function salvarEstadoAreas(estado) {
  localStorage.setItem(STORAGE_KEY_AREAS, JSON.stringify(estado));
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
const STORAGE_KEY_BOLETIM = "torneio-boletim:v1";

function lerBoletim() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY_BOLETIM);
    return bruto ? JSON.parse(bruto) : { itens: [] };
  } catch { return { itens: [] }; }
}

function salvarBoletim(dados) {
  localStorage.setItem(STORAGE_KEY_BOLETIM, JSON.stringify(dados));
}

function detectarTipoMidia(url) {
  if (/youtu\.be\/|youtube\.com\/(watch|shorts|embed)/.test(url)) return 'youtube';
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url)) return 'imagem';
  return 'imagem'; // tenta como imagem por padrão
}

function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
