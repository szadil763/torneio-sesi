// Painel do professor — Gerenciamento do Torneio (Insígnias por Área).

const CHAVE_SESSAO_AREAS = "torneio-insignias-areas:admin-ok";

function renderLoginAdmin() {
  const app = document.getElementById("admin-app");
  app.innerHTML = `
    <div class="pin-caixa">
      <div class="marca">Gerenciamento do Torneio · Insígnias por Área</div>
      <h2 class="titulo-principal">Digite o PIN</h2>
      <input id="campo-pin" type="password" inputmode="text" maxlength="20" placeholder="PIN">
      <button onclick="tentarEntrar()">Entrar</button>
      <div class="erro" id="erro-pin"></div>
    </div>
  `;
  document.getElementById("campo-pin").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarEntrar();
  });
  document.getElementById("campo-pin").focus();
}

async function tentarEntrar() {
  const valor = document.getElementById("campo-pin").value;
  if (valor === ADMIN_PIN) {
    sessionStorage.setItem(CHAVE_SESSAO_AREAS, "1");
    await carregarInsignias();
    renderPainel();
  } else {
    document.getElementById("erro-pin").textContent = "PIN incorreto.";
  }
}

function alterarQuantidade(areaId, teamId, delta) {
  const estado = lerEstadoAreas();
  if (!estado.conquistas[areaId])  estado.conquistas[areaId]  = {};
  if (!estado.timestamps)          estado.timestamps           = {};

  const atual = quantidadeInsignia(estado, areaId, teamId);
  const nova  = Math.max(0, atual + delta);

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
    if (atual === 0) estado.timestamps[areaId + ':' + teamId] = Date.now();
  }

  salvarLocalmente(estado);
  _pendente = true;
  renderPainel();
}

function pedirPinSalvar() {
  const app = document.getElementById('admin-app');
  app.insertAdjacentHTML('beforeend', `
    <div id="overlay-pin-salvar" class="overlay-pin-salvar" onclick="fecharPinSalvar(event)">
      <div class="pin-salvar-caixa" onclick="event.stopPropagation()">
        <h3 class="pin-salvar-titulo">Confirmar salvamento</h3>
        <p class="pin-salvar-sub">Digite o PIN para salvar as insígnias no servidor</p>
        <input id="pin-salvar-input" type="password" inputmode="text" maxlength="20"
               placeholder="••••" class="pin-salvar-input"
               onkeydown="if(event.key==='Enter') tentarSalvarComPin()">
        <div class="pin-salvar-acoes">
          <button class="pin-salvar-cancelar" onclick="fecharPinSalvar()">Cancelar</button>
          <button class="btn-salvar-firebase" onclick="tentarSalvarComPin()">Salvar</button>
        </div>
        <div id="pin-salvar-erro" class="erro" style="margin-top:8px"></div>
      </div>
    </div>
  `);
  setTimeout(() => document.getElementById('pin-salvar-input')?.focus(), 50);
}

function fecharPinSalvar(e) {
  if (e && e.target !== document.getElementById('overlay-pin-salvar')) return;
  document.getElementById('overlay-pin-salvar')?.remove();
}

async function tentarSalvarComPin() {
  const pin = document.getElementById('pin-salvar-input')?.value;
  if (pin !== ADMIN_PIN) {
    const err = document.getElementById('pin-salvar-erro');
    if (err) err.textContent = 'PIN incorreto.';
    return;
  }
  document.getElementById('overlay-pin-salvar')?.remove();

  const barra = document.getElementById('barra-salvar');
  if (barra) barra.innerHTML = `
    <span class="barra-salvar-msg">💾 Salvando…</span>
    <button class="btn-salvar-firebase" disabled>Aguarde…</button>`;

  const ok = await salvarEstadoAreas(lerEstadoAreas());
  if (ok) {
    _pendente = false;
    renderPainel();
  } else if (barra) {
    barra.innerHTML = `
      <span class="barra-salvar-msg barra-salvar-erro">⚠ Falha ao salvar — verifique a conexão</span>
      <button class="btn-salvar-firebase btn-salvar-erro" onclick="confirmarSalvar()">Tentar novamente</button>`;
  }
}

function confirmarSalvar() {
  pedirPinSalvar();
}

function formatarData(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// 'gerenciar' | 'visao-geral'
let abaAtiva = 'gerenciar';
let _pendente = false;

function trocarAba(aba) {
  abaAtiva = aba;
  renderPainel();
}

function renderPainel() {
  const app    = document.getElementById("admin-app");
  const estado = lerEstadoAreas();
  const ts     = estado.timestamps || {};
  const totalGeral = TEAMS.reduce((sum, t) =>
    sum + AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, t.id), 0), 0);

  const abas = `
    <div class="admin-abas">
      <button class="admin-aba ${abaAtiva === 'gerenciar'   ? 'ativa' : ''}" onclick="trocarAba('gerenciar')">
        ✏️ Insígnias
      </button>
      <button class="admin-aba ${abaAtiva === 'visao-geral' ? 'ativa' : ''}" onclick="trocarAba('visao-geral')">
        📊 Visão geral
      </button>
    </div>`;

  const painelLinks = `
    <details class="painel-links" id="painel-links-detalhe">
      <summary class="painel-links-summary">
        🔗 Links das turmas
        <span class="painel-links-hint">toque para expandir</span>
      </summary>
      <div class="painel-links-grade">
        ${TEAMS.map(t => {
          const url = location.origin + '/insignias/alunos.html?t=' + t.token;
          return `
            <div class="painel-link-card" style="--tc:${t.cor}">
              <span class="painel-link-bolinha" style="background:${t.cor}"></span>
              <div class="painel-link-info">
                <strong class="painel-link-nome">${t.nome}</strong>
                <code class="painel-link-url">${url}</code>
              </div>
              <button class="painel-link-btn" id="pl-${t.token}"
                      onclick="copiarLink('${t.token}')"
                      style="border-color:${t.cor};color:${t.cor}">
                Copiar
              </button>
            </div>`;
        }).join('')}
        <button class="painel-link-todos" onclick="copiarTodosLinks()">📋 Copiar todos os links de uma vez</button>
      </div>
    </details>`;

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sair()">Sair</button>
      <a href="alunos.html" class="voltar" style="text-decoration:none">Ver estojos →</a>
      <a href="admin-comunicados.html" class="voltar" style="text-decoration:none">📢 Comunicados</a>
      <a href="/hub.html"   class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Gerenciamento do Torneio</div>
    <h1 class="titulo-principal">Insígnias por Área</h1>

    ${_pendente ? `
    <div id="barra-salvar" class="barra-salvar">
      <span class="barra-salvar-msg">⚠ Alterações não salvas no servidor</span>
      <button class="btn-salvar-firebase" onclick="confirmarSalvar()">💾 Salvar agora</button>
    </div>` : ''}

    ${painelLinks}
    ${abas}

    <div class="admin-resumo">
      <span>Total de insígnias concedidas:</span>
      <strong>${totalGeral}</strong>
    </div>

    ${abaAtiva === 'gerenciar' ? renderAbaGerenciar(estado, ts) : renderAbaVisaoGeral(estado)}

    <p class="rodape-nota">
      <a href="/hub.html" style="color:var(--muted);text-decoration:none">← Painel principal</a>
    </p>
  `;
}

function copiarLink(token) {
  const url = location.origin + '/insignias/alunos.html?t=' + token;
  navigator.clipboard.writeText(url).then(() => {
    ['btn-link-' + token, 'pl-' + token].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = '✓ Copiado!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }).catch(() => {
    prompt('Copie o link abaixo:', url);
  });
}

function copiarTodosLinks() {
  const texto = TEAMS.map(t =>
    `${t.nome}:\n${location.origin}/insignias/alunos.html?t=${t.token}`
  ).join('\n\n');
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.querySelector('.painel-link-todos');
    if (btn) { btn.textContent = '✓ Todos os links copiados!'; setTimeout(() => { btn.textContent = '📋 Copiar todos os links de uma vez'; }, 2500); }
  }).catch(() => { prompt('Copie os links abaixo:', texto); });
}

function renderAbaGerenciar(estado, ts) {
  return `
    <p class="subtitulo" style="margin-bottom:4px">Use + para adicionar insígnias e − para remover. Compartilhe o link de cada equipe com os pais.</p>
    <div class="tabela-admin">
      ${TEAMS.map(equipe => {
        const totalEquipe      = AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, equipe.id), 0);
        const areasComInsignia = AREAS.filter(a => conquistouArea(estado, a.id, equipe.id)).length;
        return `
          <div class="linha-area-admin">
            <div class="cabecalho-linha">
              <span class="bolinha-cor" style="background:${equipe.cor}"></span>
              <strong>${equipe.nome}</strong>
              <span class="admin-contagem">${areasComInsignia}/${AREAS.length} áreas · ${totalEquipe} insígnias</span>
              <button class="btn-copiar-link" id="btn-link-${equipe.token}"
                      onclick="copiarLink('${equipe.token}')"
                      style="border-color:${equipe.cor};color:${equipe.cor}">
                🔗 Copiar link
              </button>
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
    </div>`;
}

function renderAbaVisaoGeral(estado) {
  const totaisPorArea = AREAS.map(a =>
    TEAMS.reduce((s, t) => s + quantidadeInsignia(estado, a.id, t.id), 0));
  const totalGeralTabela = totaisPorArea.reduce((s, n) => s + n, 0);

  return `
    <p class="subtitulo" style="margin-bottom:16px">Resumo de todas as equipes e áreas. Atualiza automaticamente ao gerenciar.</p>

    <div class="visao-wrap">
      <table class="visao-tabela">
        <thead>
          <tr>
            <th class="vt-equipe">Equipe</th>
            ${AREAS.map(a => `<th class="vt-area">${a.emoji}<br>${a.nome}</th>`).join('')}
            <th class="vt-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${TEAMS.map(t => {
            const totalT = AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, t.id), 0);
            return `
              <tr>
                <td class="vt-equipe-cell">
                  <span class="bolinha-cor" style="background:${t.cor}"></span>
                  ${t.nome}
                </td>
                ${AREAS.map(a => {
                  const qtd = quantidadeInsignia(estado, a.id, t.id);
                  return `<td class="vt-num-cell ${qtd > 0 ? 'vt-ativo' : ''}"
                              style="${qtd > 0 ? `color:${t.cor};background:${t.cor}12` : ''}">
                            ${qtd > 0 ? `<strong>${qtd}</strong>` : '—'}
                          </td>`;
                }).join('')}
                <td class="vt-total-cell" style="${totalT > 0 ? `color:${t.cor}` : ''}">
                  <strong>${totalT}</strong>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td class="vt-foot-label">Total por área</td>
            ${totaisPorArea.map(n => `<td class="vt-foot-num">${n}</td>`).join('')}
            <td class="vt-foot-grand">${totalGeralTabela}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="visao-barras">
      <h3 class="visao-barras-titulo">Progresso por equipe</h3>
      ${TEAMS.map(t => {
        const totalT = AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, t.id), 0);
        const areasT = AREAS.filter(a => conquistouArea(estado, a.id, t.id)).length;
        const pct    = totalGeralTabela > 0
          ? Math.round((totalT / totalGeralTabela) * 100) : 0;
        return `
          <div class="visao-barra-linha">
            <div class="visao-barra-label">
              <span style="color:${t.cor}">${t.nome}</span>
              <span class="visao-barra-info">${areasT}/${AREAS.length} áreas · ${totalT} insígnias (${pct}%)</span>
            </div>
            <div class="visao-barra-track">
              <div class="visao-barra-fill" style="width:${pct}%;background:${t.cor}"></div>
            </div>
          </div>`;
      }).join('')}
    </div>

    <div class="visao-por-area">
      <h3 class="visao-barras-titulo">Destaque por área</h3>
      <div class="visao-area-grid">
        ${AREAS.map(area => {
          const counts = TEAMS.map(t => ({ t, qtd: quantidadeInsignia(estado, area.id, t.id) }))
                             .sort((a, b) => b.qtd - a.qtd);
          return `
            <div class="visao-area-card">
              <div class="visao-area-emoji">${area.emoji}</div>
              <div class="visao-area-nome">${area.nome}</div>
              <div class="visao-area-rows">
                ${counts.map((c, i) => `
                  <div class="visao-area-row ${i === 0 && c.qtd > 0 ? 'lider' : ''}">
                    <span class="visao-area-team" style="${c.qtd > 0 ? `color:${c.t.cor}` : 'opacity:.4'}">${c.t.nome.split('·')[1]?.trim() || c.t.nome}</span>
                    <span class="visao-area-qtd" style="${c.qtd > 0 ? `color:${c.t.cor}` : 'opacity:.3'}">${c.qtd}</span>
                  </div>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function sair() {
  sessionStorage.removeItem(CHAVE_SESSAO_AREAS);
  renderLoginAdmin();
}

window.addEventListener("DOMContentLoaded", async function () {
  await carregarInsignias();
  if (sessionStorage.getItem(CHAVE_SESSAO_AREAS) === "1") {
    renderPainel();
  } else {
    renderLoginAdmin();
  }
});
