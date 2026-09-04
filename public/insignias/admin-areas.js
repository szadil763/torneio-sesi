// Painel do professor — Insígnias por Área.
// Organizado por EQUIPE; cada área tem um contador +/− de insígnias.

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
  document.getElementById("campo-pin").addEventListener("keydown", e => {
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

// Incrementa ou decrementa a quantidade de insígnias de uma área/equipe
function alterarQuantidade(areaId, teamId, delta) {
  const estado = lerEstadoAreas();
  if (!estado.conquistas[areaId])  estado.conquistas[areaId]  = {};
  if (!estado.timestamps)          estado.timestamps           = {};

  const atual = quantidadeInsignia(estado, areaId, teamId);
  const nova  = Math.max(0, atual + delta);

  // Confirmação ao remover a última insígnia
  if (nova === 0 && atual > 0) {
    const areaNome   = (AREAS.find(a => a.id === areaId)  || {}).nome || areaId;
    const equipeNome = (TEAMS.find(t => t.id === teamId)  || {}).nome || teamId;
    if (!confirm(`Remover todas as insígnias de "${areaNome}" da ${equipeNome}?`)) return;
  }

  if (nova === 0) {
    delete estado.conquistas[areaId][teamId];
    delete estado.timestamps[areaId + ':' + teamId];
  } else {
    estado.conquistas[areaId][teamId] = nova;
    // Registra timestamp apenas na primeira insígnia adicionada
    if (atual === 0) estado.timestamps[areaId + ':' + teamId] = Date.now();
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

  // Total geral de insígnias (soma de todos os contadores)
  const totalGeral = TEAMS.reduce((sum, t) =>
    sum + AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, t.id), 0), 0);

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sair()">Sair</button>
      <a href="areas.html" class="voltar" style="text-decoration:none">Ver estojos →</a>
      <a href="/hub.html"  class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Painel do professor</div>
    <h1 class="titulo-principal">Liberar insígnias por área</h1>
    <p class="subtitulo">Use + para adicionar insígnias e − para remover. A quantidade aparece no estojo público em tempo real.</p>

    <div class="admin-resumo">
      <span>Total de insígnias concedidas:</span>
      <strong>${totalGeral}</strong>
    </div>

    <div class="tabela-admin">
      ${TEAMS.map(equipe => {
        const totalEquipe = AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, equipe.id), 0);
        const areasComInsignia = AREAS.filter(a => conquistouArea(estado, a.id, equipe.id)).length;
        return `
          <div class="linha-area-admin">
            <div class="cabecalho-linha">
              <span class="bolinha-cor" style="background:${equipe.cor}"></span>
              <strong>${equipe.nome}</strong>
              <span class="admin-contagem">${areasComInsignia}/${AREAS.length} áreas · ${totalEquipe} insígnias</span>
            </div>
            <div class="counters-grid">
              ${AREAS.map(area => {
                const qtd    = quantidadeInsignia(estado, area.id, equipe.id);
                const quando = ts[area.id + ':' + equipe.id];
                return `
                  <div class="area-counter ${qtd > 0 ? 'ativo' : ''}" style="--pill-c:${equipe.cor}">
                    <div class="area-counter-top">
                      <span class="area-counter-emoji">${area.emoji}</span>
                      <span class="area-counter-nome">${area.nome}</span>
                    </div>
                    <div class="area-counter-controles">
                      <button class="counter-btn minus"
                              onclick="alterarQuantidade('${area.id}','${equipe.id}',-1)"
                              ${qtd === 0 ? 'disabled' : ''}>−</button>
                      <span class="counter-num" style="${qtd > 0 ? `color:${equipe.cor}` : ''}">${qtd}</span>
                      <button class="counter-btn plus"
                              onclick="alterarQuantidade('${area.id}','${equipe.id}',+1)"
                              style="${qtd > 0 ? `background:${equipe.cor}` : ''}">+</button>
                    </div>
                    ${qtd > 0 && quando ? `<div class="area-counter-ts">desde ${formatarData(quando)}</div>` : ''}
                  </div>
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
