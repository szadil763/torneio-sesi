// Painel do professor — Insígnias por Área.
// Organizado por EQUIPE (professor marca quais áreas cada equipe conquistou).

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

function alternarConquistaArea(areaId, teamId, marcado, el) {
  // Confirmação antes de remover
  if (!marcado) {
    const areaNome   = (AREAS.find(a => a.id === areaId)  || {}).nome || areaId;
    const equipeNome = (TEAMS.find(t => t.id === teamId)  || {}).nome || teamId;
    if (!confirm(`Remover a insígnia "${areaNome}" da ${equipeNome}?\n\nEssa ação pode ser desfeita desmarcando e depois remarcando.`)) {
      el.checked = true; // reverte checkbox
      return;
    }
  }

  const estado = lerEstadoAreas();
  if (!estado.conquistas[areaId])  estado.conquistas[areaId]  = {};
  if (!estado.timestamps)          estado.timestamps           = {};

  estado.conquistas[areaId][teamId] = marcado;

  const tsKey = areaId + ':' + teamId;
  if (marcado) {
    estado.timestamps[tsKey] = Date.now();
  } else {
    delete estado.timestamps[tsKey];
  }

  salvarEstadoAreas(estado);
  renderPainel();
}

function formatarData(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderPainel() {
  const app    = document.getElementById("admin-app");
  const estado = lerEstadoAreas();
  const ts     = estado.timestamps || {};

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sair()">Sair</button>
      <a href="areas.html" class="voltar" style="text-decoration:none">Ver estojo →</a>
      <a href="/hub.html"  class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Painel do professor</div>
    <h1 class="titulo-principal">Liberar insígnias por área</h1>
    <p class="subtitulo">Marque a área assim que a equipe vencer a competição. A insígnia aparece na hora no estojo público.</p>
    <div class="tabela-admin">
      ${TEAMS.map(equipe => {
        const conquistadas = AREAS.filter(a => conquistouArea(estado, a.id, equipe.id)).length;
        return `
          <div class="linha-area-admin">
            <div class="cabecalho-linha">
              <span class="bolinha-cor" style="background:${equipe.cor}"></span>
              <strong>${equipe.nome}</strong>
              <span class="admin-contagem">${conquistadas}/${AREAS.length} insígnias</span>
            </div>
            <div class="checks">
              ${AREAS.map(area => {
                const ativo = conquistouArea(estado, area.id, equipe.id);
                const quando = ts[area.id + ':' + equipe.id];
                return `
                  <label class="check-pill ${ativo ? 'ativo' : ''}" style="--pill-c:${equipe.cor}">
                    <input type="checkbox" ${ativo ? 'checked' : ''}
                      onchange="alternarConquistaArea('${area.id}','${equipe.id}', this.checked, this);">
                    <span class="pill-conteudo">
                      <span>${area.emoji} ${area.nome}</span>
                      ${ativo && quando ? `<span class="pill-ts">${formatarData(quando)}</span>` : ''}
                    </span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <p class="rodape-nota">
      <a href="/hub.html" style="color:var(--muted);text-decoration:none">← Painel principal</a>
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
