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

// Qual aba está ativa: 'gerenciar' | 'visao-geral' | 'boletim'
let abaAtiva = 'gerenciar';

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
  const boletim = lerBoletim();

  const abas = `
    <div class="admin-abas">
      <button class="admin-aba ${abaAtiva === 'gerenciar'   ? 'ativa' : ''}" onclick="trocarAba('gerenciar')">
        ✏️ Insígnias
      </button>
      <button class="admin-aba ${abaAtiva === 'visao-geral' ? 'ativa' : ''}" onclick="trocarAba('visao-geral')">
        📊 Visão geral
      </button>
      <button class="admin-aba ${abaAtiva === 'boletim'     ? 'ativa' : ''}" onclick="trocarAba('boletim')">
        📸 Boletim
      </button>
    </div>`;

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sair()">Sair</button>
      <a href="alunos.html" class="voltar" style="text-decoration:none">Ver estojos →</a>
      <a href="/hub.html"   class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Painel do professor</div>
    <h1 class="titulo-principal">Insígnias por Área</h1>

    ${abas}

    ${abaAtiva !== 'boletim' ? `<div class="admin-resumo">
      <span>Total de insígnias concedidas:</span>
      <strong>${totalGeral}</strong>
    </div>` : ''}

    ${abaAtiva === 'gerenciar'  ? renderAbaGerenciar(estado, ts)
    : abaAtiva === 'visao-geral' ? renderAbaVisaoGeral(estado)
    : renderAbaBoletim(boletim)}

    <p class="rodape-nota">
      <a href="/hub.html" style="color:var(--muted);text-decoration:none">← Painel principal</a>
    </p>
  `;
}

function copiarLink(token) {
  const url = location.origin + '/insignias/alunos.html?t=' + token;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-link-' + token);
    if (btn) { btn.textContent = '✓ Copiado!'; setTimeout(() => { btn.textContent = '🔗 Copiar link'; }, 2000); }
  }).catch(() => {
    prompt('Copie o link abaixo:', location.origin + '/insignias/alunos.html?t=' + token);
  });
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
  // Totais por área (coluna)
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

    <!-- Barras de progresso por equipe -->
    <div class="visao-barras">
      <h3 class="visao-barras-titulo">Progresso por equipe</h3>
      ${TEAMS.map(t => {
        const totalT  = AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, t.id), 0);
        const areasT  = AREAS.filter(a => conquistouArea(estado, a.id, t.id)).length;
        const maxPoss = AREAS.length * Math.max(1, ...TEAMS.map(tt =>
          AREAS.reduce((s, a) => s + quantidadeInsignia(estado, a.id, tt.id), 0)));
        const pct     = totalGeralTabela > 0
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

    <!-- Ranking por área -->
    <div class="visao-por-area">
      <h3 class="visao-barras-titulo">Destaque por área</h3>
      <div class="visao-area-grid">
        ${AREAS.map(area => {
          const counts  = TEAMS.map(t => ({ t, qtd: quantidadeInsignia(estado, area.id, t.id) }))
                               .sort((a, b) => b.qtd - a.qtd);
          const lider   = counts[0];
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

// ── Aba Boletim ───────────────────────────────────────────────────
function renderAbaBoletim(boletim) {
  const itens = boletim.itens || [];
  return `
    <div class="boletim-admin">
      <p class="subtitulo" style="margin-bottom:16px">
        Adicione fotos e vídeos do torneio. Cole o link da imagem ou do YouTube — os pais e alunos verão no estojo.
      </p>

      <div class="boletim-form">
        <input id="bol-url"     type="url"  placeholder="Link da foto ou vídeo do YouTube"  class="boletim-input">
        <input id="bol-titulo"  type="text" placeholder="Título (opcional)"                  class="boletim-input">
        <input id="bol-legenda" type="text" placeholder="Legenda (opcional)"                 class="boletim-input">
        <button class="boletim-btn-add" onclick="boletimAdicionar()">+ Adicionar</button>
      </div>
      <div id="bol-erro" class="erro" style="margin-top:8px"></div>

      ${itens.length === 0
        ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum item ainda. Adicione o primeiro!</p>`
        : `<div class="boletim-lista-admin">
            ${itens.map((item, i) => {
              const tipo = detectarTipoMidia(item.url);
              const thumb = tipo === 'youtube'
                ? `<img src="https://img.youtube.com/vi/${youtubeId(item.url)}/mqdefault.jpg" class="bol-thumb" onerror="this.src=''">`
                : `<img src="${item.url}" class="bol-thumb" onerror="this.style.display='none'">`;
              return `
                <div class="bol-item-admin">
                  <div class="bol-item-preview">${thumb}
                    ${tipo === 'youtube' ? '<span class="bol-play-badge">▶ Vídeo</span>' : ''}
                  </div>
                  <div class="bol-item-info">
                    <strong class="bol-item-titulo">${item.titulo || '(sem título)'}</strong>
                    <span class="bol-item-legenda">${item.legenda || ''}</span>
                    <span class="bol-item-url">${item.url.length > 48 ? item.url.slice(0,48)+'…' : item.url}</span>
                  </div>
                  <div class="bol-item-acoes">
                    ${i > 0 ? `<button class="bol-btn-ord" onclick="boletimMover(${i},-1)" title="Subir">↑</button>` : ''}
                    ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="boletimMover(${i},+1)" title="Descer">↓</button>` : ''}
                    <button class="bol-btn-rem" onclick="boletimRemover(${i})" title="Remover">🗑</button>
                  </div>
                </div>`;
            }).join('')}
          </div>`
      }
    </div>`;
}

function boletimAdicionar() {
  const url     = document.getElementById('bol-url').value.trim();
  const titulo  = document.getElementById('bol-titulo').value.trim();
  const legenda = document.getElementById('bol-legenda').value.trim();
  const erro    = document.getElementById('bol-erro');

  if (!url) { erro.textContent = 'Informe um link.'; return; }
  try { new URL(url); } catch { erro.textContent = 'Link inválido.'; return; }

  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), url, titulo, legenda, ts: Date.now() });
  salvarBoletim(dados);
  renderPainel();
}

function boletimRemover(idx) {
  if (!confirm('Remover este item do boletim?')) return;
  const dados = lerBoletim();
  dados.itens.splice(idx, 1);
  salvarBoletim(dados);
  renderPainel();
}

function boletimMover(idx, delta) {
  const dados = lerBoletim();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  salvarBoletim(dados);
  renderPainel();
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
