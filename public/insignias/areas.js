// Página pública — Insígnias por Área.
// Cada equipe tem seu estojo com 4 slots (um por área).
// Ao abrir o estojo: tampa 3D se abre e insígnias encaixam nos slots.

// SVG do emblema na tampa — círculo tipo Pokéball com estrela dourada
function emblemaLid(corEquipe) {
  return `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="rgba(0,0,0,0.5)" stroke-width="4"/>
    <rect x="10" y="47" width="80" height="6" fill="rgba(0,0,0,0.4)" rx="3"/>
    <circle cx="50" cy="50" r="13" fill="rgba(0,0,0,0.3)" stroke="rgba(0,0,0,0.5)" stroke-width="4"/>
    <path d="M50 16 L60 47 L50 42 L40 47 Z"
          fill="rgba(220,168,0,0.75)" stroke="rgba(180,130,0,0.6)" stroke-width="1"/>
    <circle cx="50" cy="50" r="5" fill="rgba(220,168,0,0.8)"/>
    <circle cx="50" cy="50" r="2.5" fill="rgba(255,220,80,0.9)"/>
  </svg>`;
}

// Chave "vistos" para detectar insígnias novas (animação extra)
function chaveVistosEquipe(teamId) {
  return `torneio-insignias-areas:vistos:${teamId}`;
}
function marcarVistosEquipe(teamId, areaIds) {
  localStorage.setItem(chaveVistosEquipe(teamId), JSON.stringify(areaIds));
}
function idsJaVistosEquipe(teamId) {
  try { return JSON.parse(localStorage.getItem(chaveVistosEquipe(teamId)) || "[]"); }
  catch { return []; }
}

function totalConquistadoEquipe(estado, teamId) {
  return AREAS.filter(a => conquistouArea(estado, a.id, teamId)).length;
}

// ── Tela inicial: grade das 4 equipes ────────────────────────────
function renderHome() {
  const app = document.getElementById("app");
  const estado = lerEstadoAreas();

  app.innerHTML = `
    <div class="marca">SESI · Torneio Infantil — Insígnias por Área</div>
    <h1 class="titulo-principal">Estojo de Insígnias</h1>
    <p class="subtitulo">Toque na sua equipe para abrir o estojo e ver as insígnias conquistadas.</p>

    <div class="grade-equipes-btn">
      ${TEAMS.map(t => {
        const total = totalConquistadoEquipe(estado, t.id);
        const slots = AREAS.map(a => {
          const ganhou = conquistouArea(estado, a.id, t.id);
          return `<span class="mini-slot ${ganhou ? 'conquistado' : ''}"
                        style="${ganhou ? `background:${t.cor}22;border-color:${t.cor}` : ''}">
                    ${ganhou ? a.emoji : '🔒'}
                  </span>`;
        }).join("");
        return `
          <button class="equipe-btn"
                  style="--c:${t.cor}; --cd:${t.corEscura}"
                  onclick="location.hash='#/equipe/${t.id}'">
            <div class="equipe-btn-topo" style="background:linear-gradient(135deg,${t.cor},${t.corEscura})">
              <span class="equipe-btn-nome">${t.nome}</span>
              <span class="equipe-btn-badge">${total}/${AREAS.length}</span>
            </div>
            <div class="equipe-btn-slots">${slots}</div>
            <div class="equipe-btn-cta">Abrir estojo →</div>
          </button>`;
      }).join("")}
    </div>

    <p class="rodape-nota" style="margin-top:32px">
      <a href="../" style="color:var(--muted);text-decoration:none">← Prova da Propulsão</a>
    </p>`;
}

// ── Estojo da equipe: tampa 3D abre → slots aparecem ─────────────
function renderEstojoEquipe(teamId) {
  const equipe = TEAMS.find(t => t.id === teamId);
  const app = document.getElementById("app");
  if (!equipe) { location.hash = "#/"; return; }

  const estado = lerEstadoAreas();
  const vistosAntes = new Set(idsJaVistosEquipe(teamId));
  const conquistadasAgora = AREAS
    .filter(a => conquistouArea(estado, a.id, teamId))
    .map(a => a.id);
  const total = conquistadasAgora.length;

  // Gera os 4 slots (um por área)
  const slots = AREAS.map(area => {
    const ganhou = conquistouArea(estado, area.id, teamId);
    const nova   = ganhou && !vistosAntes.has(area.id);
    return `
      <div class="slot ${ganhou ? 'conquistada' : ''} ${nova ? 'recem-aberta' : ''}"
           style="--c:${equipe.cor}">
        <div class="slot-label" style="background:${equipe.cor}">${area.nome}</div>
        <div class="slot-corpo">
          ${ganhou
            ? `<img src="${area.imagem}"
                    alt="Insígnia ${area.nome}"
                    class="slot-insignia ${nova ? 'recem-conquistada' : ''}"
                    onerror="this.parentNode.innerHTML='<div class=\\'slot-fallback\\'>${area.emoji}</div>'">`
            : `<div class="slot-cadeado" style="color:${equipe.cor}">
                 <span class="icone" style="width:30px;height:30px;display:block">${ICONS.cadeado}</span>
                 <span class="nome-insignia">${area.nome}</span>
               </div>`
          }
        </div>
      </div>`;
  }).join("");

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="location.hash='#/'">← Equipes</button>
    </div>

    <!-- Cena 3D -->
    <div class="case-scene">
      <div class="case-3d">

        <!-- Base: sempre visível, contém os slots -->
        <div class="case-base">
          <div class="estojo-topo">
            <span class="equipe-nome-estojo" style="color:${equipe.cor}">${equipe.nome}</span>
            <span class="contagem-badge">${total}/${AREAS.length}</span>
          </div>
          <div class="estojo-corpo">${slots}</div>
        </div>

        <!-- Tampa: cobre a base, anima para abrir em 3D -->
        <div class="case-lid" style="--c:${equipe.cor}; --cd:${equipe.corEscura}">

          <!-- Face exterior da tampa (design da capa) -->
          <div class="lid-front">
            <div class="lid-emblem">${emblemaLid(equipe.cor)}</div>
          </div>

          <!-- Face interior da tampa (visível enquanto abre) -->
          <div class="lid-back">
            <span class="lid-back-mark">SESI</span>
          </div>

        </div><!-- /case-lid -->
      </div><!-- /case-3d -->
    </div><!-- /case-scene -->

    <p class="rodape-nota">
      As insígnias são liberadas pelo professor após cada competição por área.
    </p>`;

  // Marca as insígnias como vistas (para remover animação em próximas visitas)
  marcarVistosEquipe(teamId, conquistadasAgora);
}

// ── Roteador por hash ─────────────────────────────────────────────
function rotear() {
  const partes = location.hash.replace(/^#\//, "").split("/");
  if (partes[0] === "equipe" && partes[1]) {
    renderEstojoEquipe(partes[1]);
  } else {
    renderHome();
  }
}

window.addEventListener("hashchange", rotear);
window.addEventListener("DOMContentLoaded", rotear);
