// Módulo: Insígnias por Área — configuração central
// Sistema paralelo ao estojo por equipe/atividade.
// Compartilha apenas a lógica de equipes e PIN de admin.

const TEAMS = [
  { id: "2A", nome: "2º A", cor: "#D92B2B", corTexto: "#fff" },
  { id: "2B", nome: "2º B", cor: "#004B8D", corTexto: "#fff" },
  { id: "2C", nome: "2º C", cor: "#2E9E4F", corTexto: "#fff" },
  { id: "2D", nome: "2º D", cor: "#F0B800", corTexto: "#222" },
];

const AREAS = [
  { id: "robotica",        nome: "Robótica",         emoji: "🤖", imagem: "assets/insignias/robotica.jpg" },
  { id: "ingles",          nome: "Inglês",            emoji: "🌎", imagem: "assets/insignias/ingles.jpg" },
  { id: "artes",           nome: "Artes",             emoji: "🎨", imagem: "assets/insignias/artes.jpg" },
  { id: "educacao-fisica", nome: "Educação Física",   emoji: "⚽", imagem: "assets/insignias/educacao-fisica.jpg" },
];

const ADMIN_PIN = "1234"; // altere conforme necessário

// Chave própria — não conflita com o estojo por equipe/atividade
const STORAGE_KEY_AREAS = "torneio-insignias-areas:v1";

const ICONS = {
  cadeado: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
    <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/>
  </svg>`,
};

// Carrega estado salvo do localStorage
function carregarEstado() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_AREAS) || "{}");
  } catch {
    return {};
  }
}

// Salva estado no localStorage
function salvarEstado(estado) {
  localStorage.setItem(STORAGE_KEY_AREAS, JSON.stringify(estado));
}

// Verifica se uma equipe já conquistou uma área
function conquistou(estado, areaId, teamId) {
  return !!(estado[areaId] && estado[areaId][teamId]);
}
