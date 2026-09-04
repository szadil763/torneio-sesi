// Painel do professor — Insígnias por Área.
// Mesmo padrão de PIN e estrutura do admin.js do torneio-insignias.

const CHAVE_SESSAO_AREAS = "torneio-insignias-areas:admin-ok";

function renderLoginAdmin() {
  const app = document.getElementById("admin-app");
  app.innerHTML = `
    <div class="pin-caixa">
      <div class="marca">Painel do professor · Insígnias por Área</div>
      <h2 class="titulo-principal">Digite o PIN</h2>
      <input id="campo-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••">
      <button onclick="tentarEntrar()">Entrar</button>
      <div class="erro" id="erro-pin"></div>
    </div>
  `;
  document.getElementById("campo-pin").addEventListener("keydown", function (e) {
    if (e.key === "Enter") tentarEntrar();
  });
  document.getElementById("campo-pin").focus();
}

function tentarEntrar() {
  const valor = document.getElementById("campo-pin").value;
  if (valor === ADMIN_PIN) {
    sessionStorage.setItem(CHAVE_SESSAO_AREAS, "1");
    renderPainel();
  } else {
    document.getElementById("erro-pin").textContent = "PIN incorreto.";
  }
}

function alternarConquistaArea(areaId, teamId, marcado) {
  const estado = lerEstadoAreas();
  if (!estado.conquistas[areaId]) estado.conquistas[areaId] = {};
  estado.conquistas[areaId][teamId] = marcado;
  salvarEstadoAreas(estado);
}

function renderPainel() {
  const app = document.getElementById("admin-app");
  const estado = lerEstadoAreas();

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sair()">Sair</button>
      <a href="areas.html" class="voltar" style="text-decoration:none">Ver público</a>
    </div>
    <div class="marca">Painel do professor</div>
    <h1 class="titulo-principal">Insígnias por Área</h1>
    <p class="subtitulo">Marque a equipe assim que ela vencer a competição daquela área. A insígnia aparece na hora no estojo público.</p>
    <div class="tabela-admin">
      ${AREAS.map(area => `
        <div class="linha-area-admin">
          <div class="cabecalho-linha">
            <span style="font-size:1.4rem">${area.emoji}</span>
            <strong>${area.nome}</strong>
          </div>
          <div class="checks">
            ${TEAMS.map(t => {
              const ativo = !!(estado.conquistas[area.id] && estado.conquistas[area.id][t.id]);
              return `
                <label class="check-pill ${ativo ? "ativo" : ""}" style="--pill-c:${t.cor}">
                  <input type="checkbox" ${ativo ? "checked" : ""}
                    onchange="alternarConquistaArea('${area.id}','${t.id}', this.checked); renderPainel();">
                  ${t.nome}
                </label>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
    <p class="rodape-nota">
      <a href="../" style="color:var(--muted);text-decoration:none">← Prova da Propulsão</a>
    </p>
  `;
}

function sair() {
  sessionStorage.removeItem(CHAVE_SESSAO_AREAS);
  renderLoginAdmin();
}

window.addEventListener("DOMContentLoaded", function () {
  if (sessionStorage.getItem(CHAVE_SESSAO_AREAS) === "1") {
    renderPainel();
  } else {
    renderLoginAdmin();
  }
});
