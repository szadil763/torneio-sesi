// Módulo: Insígnias por Área — configuração central.
// Sistema paralelo ao estojo por equipe/atividade.
// Compartilha ADMIN_PIN, TEAMS (cor/id) e estilo visual com data.js / style.css.

const ADMIN_PIN = "1234"; // mesmo PIN de data.js

const TEAMS = [
  { id: "vermelha", nome: "Turma A · Vermelha", cor: "#E5484D", corEscura: "#7A1F22" },
  { id: "azul",     nome: "Turma B · Azul",     cor: "#2F8FE0", corEscura: "#164A72" },
  { id: "verde",    nome: "Turma C · Verde",     cor: "#3C9A5F", corEscura: "#1E4E30" },
  { id: "amarela",  nome: "Turma D · Amarela",   cor: "#E0B23C", corEscura: "#7A5D14" },
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

function conquistouArea(estado, areaId, teamId) {
  return !!(estado.conquistas[areaId] && estado.conquistas[areaId][teamId]);
}
