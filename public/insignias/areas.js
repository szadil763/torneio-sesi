// Página pública — Insígnias por Área.
// Lógica: seleciona uma área, abre estojo com 4 slots (um por equipe).

function chaveVistosAreas(areaId) {
  return `torneio-insignias-areas:vistos:${areaId}`;
}

function marcarVistosArea(areaId, teamIds) {
  localStorage.setItem(chaveVistosAreas(areaId), JSON.stringify(teamIds));
}

function idsJaVistosArea(areaId) {
  try {
    return JSON.parse(localStorage.getItem(chaveVistosAreas(areaId)) || "[]");
  } catch {
    return [];
  }
}

function renderHome() {
  const app = document.getElementById("app");
  const estado = lerEstadoAreas();

  app.innerHTML = `
    <div class="marca">SESI · Torneio Infantil — Insígnias por Área</div>
    <h1 class="titulo-principal">Insígnias por Área</h1>
    <p class="subtitulo">Toque em uma área para ver quais equipes já conquistaram a insígnia.</p>
    <div class="grade-areas">
      ${AREAS.map(a => {
        const conquistadas = TEAMS.filter(t => conquistouArea(estado, a.id, t.id)).length;
        return `
          <button class="area-tile" onclick="location.hash='#/area/${a.id}'">
            <span class="emoji">${a.emoji}</span>
            <span class="area-nome">${a.nome}</span>
            <span class="area-hint">${conquistadas}/${TEAMS.length} equipes</span>
          </button>
        `;
      }).join("")}
    </div>
    <p class="rodape-nota" style="margin-top:32px">
      <a href="../" style="color:var(--muted);text-decoration:none">← Prova da Propulsão</a>
    </p>
  `;
}

function renderEstojoArea(areaId) {
  const area = AREAS.find(a => a.id === areaId);
  const app = document.getElementById("app");
  if (!area) { location.hash = "#/"; return; }

  const estado = lerEstadoAreas();
  const vistosAntes = new Set(idsJaVistosArea(areaId));
  const conquistadasAgora = TEAMS.filter(t => conquistouArea(estado, areaId, t.id)).map(t => t.id);

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="location.hash='#/'">← Áreas</button>
    </div>
    <div class="estojo visivel" style="--c:${AREAS.indexOf(area) % 2 === 0 ? '#2F8FE0' : '#3C9A5F'}; --cd:#12141b">
      <div class="estojo-topo">${area.emoji} ${area.nome}</div>
      <div class="estojo-corpo">
        ${TEAMS.map(t => {
          const ganhou = conquistouArea(estado, areaId, t.id);
          const novaAgora = ganhou && !vistosAntes.has(t.id);
          return `
            <div class="slot ${ganhou ? 'conquistada' : ''}"
                 style="--c:${t.cor}; --ct:#fff; border-color:${ganhou ? t.cor : 'var(--card-line)'}">
              <div class="slot-label" style="background:${t.cor}">${t.nome}</div>
              <div class="slot-corpo">
                ${ganhou
                  ? `<img src="${area.imagem}" alt="Insígnia ${area.nome}" class="slot-insignia ${novaAgora ? 'recem-conquistada' : ''}"
                         onerror="this.parentNode.innerHTML='<div style=\\'font-size:3rem;text-align:center\\'>${area.emoji}</div>'">`
                  : `<div class="slot-cadeado" style="color:${t.cor}">
                       <span class="icone" style="width:28px;height:28px">${ICONS.cadeado}</span>
                       <span>não conquistada</span>
                     </div>`
                }
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
    <p class="rodape-nota">As insígnias são liberadas pelo professor após cada competição.</p>
  `;

  marcarVistosArea(areaId, conquistadasAgora);
}

function rotear() {
  const partes = location.hash.replace(/^#\//, "").split("/");
  if (partes[0] === "area" && partes[1]) {
    renderEstojoArea(partes[1]);
  } else {
    renderHome();
  }
}

window.addEventListener("hashchange", rotear);
window.addEventListener("DOMContentLoaded", rotear);
