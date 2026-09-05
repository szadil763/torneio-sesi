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
      <a href="/hub.html"   class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Painel do professor</div>
    <h1 class="titulo-principal">Insígnias por Área</h1>

    ${painelLinks}
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
    // Atualiza qualquer botão com esse token (painel fixo ou aba gerenciar)
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
let bolAbaAtiva = 'midia'; // 'midia' | 'noticia'

function renderAbaBoletim(boletim) {
  const itens = boletim.itens || [];
  return `
    <div class="boletim-admin">

      <div class="bol-sub-abas">
        <button class="bol-sub-aba ${bolAbaAtiva === 'midia'   ? 'ativa' : ''}" onclick="bolTrocarAba('midia')">📷 Foto / Vídeo</button>
        <button class="bol-sub-aba ${bolAbaAtiva === 'noticia' ? 'ativa' : ''}" onclick="bolTrocarAba('noticia')">📰 Criar Notícia</button>
      </div>

      ${bolAbaAtiva === 'midia' ? `
        <div class="boletim-form">
          <div class="bol-upload-opcoes">
            <label class="bol-upload-btn" for="bol-file-camera">
              <span>📸</span> Tirar foto agora
            </label>
            <input id="bol-file-camera" type="file" accept="image/*" capture="environment" style="display:none" onchange="boletimHandleFile(this)">

            <label class="bol-upload-btn bol-upload-btn-sec" for="bol-file-input">
              <span>🖼️</span> Escolher da galeria
            </label>
            <input id="bol-file-input" type="file" accept="image/*" style="display:none" onchange="boletimHandleFile(this)">
          </div>

          <div class="bol-separador"><span>ou cole um link</span></div>

          <input id="bol-url"     type="url"  placeholder="Link da foto ou vídeo do YouTube" class="boletim-input">
          <input id="bol-titulo"  type="text" placeholder="Título (opcional)"                 class="boletim-input">
          <input id="bol-legenda" type="text" placeholder="Legenda (opcional)"                class="boletim-input">
          <button class="boletim-btn-add" onclick="boletimAdicionar()">+ Adicionar por link</button>
        </div>
        <div id="bol-erro" class="erro" style="margin-top:8px"></div>
      ` : `
        <div class="boletim-form">
          <p style="font-size:13px;color:var(--muted);margin-bottom:4px">
            Descreva o momento — a IA gera manchete, parágrafos e citação. Adicione até 3 fotos para criar a colagem.
          </p>
          <textarea id="not-descricao" class="boletim-input boletim-textarea"
            placeholder="Ex: A equipe verde venceu o desafio de robótica com um robô que desviou todos os obstáculos..." rows="3"></textarea>

          <p style="font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;letter-spacing:.04em">FOTOS DA COLAGEM (até 3)</p>
          <div class="not-slots-grade">
            ${[0,1,2].map(i => `
              <div class="not-slot" id="not-thumb-${i}">
                <span class="not-slot-label">${i === 0 ? 'Principal' : 'Foto ' + (i+1)}</span>
                <div class="not-slot-btns">
                  <label class="not-slot-btn" for="not-cam-${i}" title="Câmera">📸
                    <input id="not-cam-${i}" type="file" accept="image/*" capture="environment"
                           style="display:none" onchange="noticiaHandleFile(this,${i})">
                  </label>
                  <label class="not-slot-btn not-slot-btn-sec" for="not-gal-${i}" title="Galeria">🖼️
                    <input id="not-gal-${i}" type="file" accept="image/*"
                           style="display:none" onchange="noticiaHandleFile(this,${i})">
                  </label>
                </div>
              </div>`).join('')}
          </div>

          <input id="not-foto" type="url" placeholder="Ou cole link de uma foto extra" class="boletim-input" style="margin-top:4px">
          <button class="boletim-btn-add boletim-btn-noticia" onclick="boletimGerarNoticia()">✨ Gerar Notícia</button>
        </div>
        <div id="not-erro" class="erro" style="margin-top:8px"></div>
        <div id="not-preview" style="margin-top:16px"></div>
      `}

      ${itens.length === 0
        ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum item ainda. Adicione o primeiro!</p>`
        : `<div class="boletim-lista-admin">
            ${itens.map((item, i) => {
              let thumb, badge;
              if (item.tipo === 'noticia') {
                const fotoSrc = item.imagem || '';
                thumb = fotoSrc
                  ? `<img src="${fotoSrc.startsWith('data:') ? fotoSrc : fotoSrc}" class="bol-thumb">`
                  : `<div class="bol-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--card-line)">📰</div>`;
                badge = '<span class="bol-play-badge" style="background:#c0392b">📰 Notícia</span>';
              } else {
                const tipo = detectarTipoMidia(item.url || '');
                thumb = tipo === 'youtube'
                  ? `<img src="https://img.youtube.com/vi/${youtubeId(item.url)}/mqdefault.jpg" class="bol-thumb" onerror="this.src=''">`
                  : `<img src="${item.url}" class="bol-thumb" onerror="this.style.display='none'">`;
                badge = tipo === 'youtube' ? '<span class="bol-play-badge">▶ Vídeo</span>' : '';
              }
              const tituloExibido = item.tipo === 'noticia' ? item.manchete : (item.titulo || '(sem título)');
              return `
                <div class="bol-item-admin">
                  <div class="bol-item-preview">${thumb}${badge}</div>
                  <div class="bol-item-info">
                    <strong class="bol-item-titulo">${tituloExibido}</strong>
                    <span class="bol-item-legenda">${item.legenda || item.subtitulo || ''}</span>
                  </div>
                  <div class="bol-item-acoes">
                    ${i > 0 ? `<button class="bol-btn-ord" onclick="boletimMover(${i},-1)">↑</button>` : ''}
                    ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="boletimMover(${i},+1)">↓</button>` : ''}
                    <button class="bol-btn-rem" onclick="boletimRemover(${i})">🗑</button>
                  </div>
                </div>`;
            }).join('')}
          </div>`
      }
    </div>`;
}

function bolTrocarAba(aba) {
  bolAbaAtiva = aba;
  renderPainel();
}

// ── Upload de imagem do dispositivo ──────────────────────────────
function comprimirImagem(file, maxW, qualidade) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function boletimHandleFile(input) {
  const file = input.files[0];
  if (!file) return;
  const dataUrl = await comprimirImagem(file, 1400, 0.80);
  const dados = lerBoletim();
  dados.itens.unshift({
    id: Date.now().toString(36),
    tipo: 'imagem',
    url: dataUrl,
    titulo: '',
    legenda: '',
    ts: Date.now()
  });
  await salvarBoletim(dados);
  renderPainel();
}

// Até 3 fotos por notícia
let _noticiaFotos = [null, null, null];

function noticiaHandleFile(input, slot) {
  const file = input.files[0];
  if (!file) return;
  comprimirImagem(file, 1400, 0.82).then(dataUrl => {
    _noticiaFotos[slot] = dataUrl;
    const thumb = document.getElementById('not-thumb-' + slot);
    if (thumb) {
      thumb.style.backgroundImage = `url('${dataUrl}')`;
      thumb.classList.add('carregada');
      thumb.querySelector('.not-slot-label').textContent = '✓';
    }
  });
}

// ── Adicionar mídia por URL ───────────────────────────────────────
async function boletimAdicionar() {
  const url     = (document.getElementById('bol-url')?.value || '').trim();
  const titulo  = (document.getElementById('bol-titulo')?.value || '').trim();
  const legenda = (document.getElementById('bol-legenda')?.value || '').trim();
  const erro    = document.getElementById('bol-erro');

  if (!url) { if(erro) erro.textContent = 'Informe um link.'; return; }
  try { new URL(url); } catch { if(erro) erro.textContent = 'Link inválido.'; return; }

  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), url, titulo, legenda, ts: Date.now() });
  await salvarBoletim(dados);
  renderPainel();
}

// ── Gerador de notícia estilo SESI Torneio Notícias ──────────────
function gerarNoticia(descricao) {
  const d   = descricao.trim();
  const low = d.toLowerCase();

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // Detecção de tema
  const temVitoria  = /venc|ganhou|conquist|campe|primeiro|1[oº°] lugar|vitori|dominou/.test(low);
  const temRobotica = /rob[oôó]|tecnol|program|arduino|sensor|código|algoritm/.test(low);
  const temIngles   = /ingl[eê]|english|idioma|língua|vocabul|pronúnc/.test(low);
  const temArtes    = /arte|desenh|pintur|criativ|escultur|música|dança|teatro/.test(low);
  const temEdf      = /educa.{0,5}f[ií]sic|esport|jog[ao]|futebol|corrida|moviment|atletism/.test(low);
  const temEquipe   = /equipe|turma|grupo|time/.test(low);
  const temAluno    = /alun|criança|estudante|participante|jovem/.test(low);

  // Adjetivos e advérbios dramáticos
  const adjs  = ['HISTÓRICA', 'IMPRESSIONANTE', 'INÉDITA', 'EXTRAORDINÁRIA', 'ÉPICA', 'EMOCIONANTE', 'SURPREENDENTE'];
  const adj   = pick(adjs);
  const adjs2 = ['histórica', 'marcante', 'inesquecível', 'espetacular', 'sem precedentes'];
  const adj2  = pick(adjs2);

  // Área em destaque
  const areaLabel = temRobotica ? 'Robótica'
    : temIngles ? 'Inglês'
    : temArtes  ? 'Artes'
    : temEdf    ? 'Educação Física'
    : 'Torneio SESI';

  // Manchete
  const manchetes = temVitoria ? [
    `VITÓRIA ${adj}! ${d.replace(/[.!?]+$/, '').toUpperCase()}`,
    `CONQUISTA ÉPICA: EQUIPE DO SESI DOMINA O ${areaLabel.toUpperCase()} E FAZ HISTÓRIA`,
    `EXPLOSÃO DE ALEGRIA NO TORNEIO! ${d.replace(/[.!?]+$/, '').toUpperCase()}`
  ] : [
    `TORNEIO SESI: PERFORMANCE ${adj} EM ${areaLabel.toUpperCase()} DEIXA TODOS DE BOCA ABERTA`,
    `${areaLabel.toUpperCase()} NO FOCO! ALUNOS DO SESI PROTAGONIZAM MOMENTO ${adj}`,
    `EXCLUSIVO: O QUE ACONTECEU NO ${areaLabel.toUpperCase()} DO TORNEIO VAI TE SURPREENDER`
  ];
  const manchete = pick(manchetes);

  // Subtítulo (chapéu)
  const subtitulos = [
    `Estudantes surpreenderam professores e familiares com desempenho acima do esperado`,
    `Momento ${adj2} marcou mais uma etapa do Torneio SESI Infantil`,
    `${temEquipe ? 'Equipes inteiras' : 'Participantes'} se superaram e deixaram o público em êxtase`,
    `O que todos esperavam aconteceu — e foi ainda melhor do que o previsto`
  ];
  const subtitulo = pick(subtitulos);

  // Repórteres fictícios
  const reporters = ['Ana Paula Ferreira', 'Carlos Eduardo Lima', 'Juliana Mendes', 'Roberto Souza', 'Mariana Costa'];
  const reporter  = pick(reporters);

  // Corpo da notícia — 3 parágrafos
  const intro = `Em mais um capítulo empolgante do Torneio SESI Infantil, ${d.replace(/[.!?]+$/, '').charAt(0).toLowerCase() + d.replace(/[.!?]+$/, '').slice(1)}. A cena arrancou aplausos da plateia e ficará marcada na memória de todos os presentes.`;

  const contextos = [
    `A atividade faz parte do projeto de educação integral do SESI, que busca desenvolver competências do século XXI nos estudantes. Segundo os organizadores, o nível de engajamento desta edição superou todas as expectativas: "Nunca vimos tanto entusiasmo e dedicação", revelou um dos professores responsáveis pela dinâmica.`,
    `O Torneio SESI Infantil reúne turmas de diferentes perfis em desafios interdisciplinares que estimulam criatividade, trabalho em equipe e pensamento crítico. Nesta edição, a organização notou um salto significativo na qualidade das apresentações e na maturidade dos participantes.`,
    `De acordo com a coordenação pedagógica, momentos como este reforçam o valor do torneio como ferramenta de aprendizado ativo. "Quando os alunos vivenciam o conhecimento na prática, o impacto é completamente diferente", destacou a equipe.`
  ];
  const para2 = pick(contextos);

  const fechamentos = [
    `O torneio continua com mais etapas previstas, e a expectativa é de que o nível de desempenho só aumente. Fique de olho no Boletim do Torneio para não perder nenhum momento!`,
    `Com cada rodada, fica mais evidente o potencial dos jovens talentos do SESI. A comunidade escolar vibra — e tem muito mais por vir!`,
    `Se esta etapa já foi assim, imagina o que está por vir! O Torneio SESI Infantil promete emoções até o grand finale. Não perca!`
  ];
  const para3 = pick(fechamentos);

  // Chapéu (categoria)
  const chapeus = temRobotica ? ['🤖 ROBÓTICA', '💡 TECNOLOGIA', '⚙️ INOVAÇÃO']
    : temIngles  ? ['🌎 INGLÊS', '📚 IDIOMAS', '🗣️ LINGUAGEM']
    : temArtes   ? ['🎨 ARTES', '✨ CRIATIVIDADE', '🎭 CULTURA']
    : temEdf     ? ['⚽ ESPORTES', '🏃 MOVIMENTO', '💪 SAÚDE']
    : temVitoria ? ['🏆 DESTAQUE', '🥇 VITÓRIA', '⭐ CAMPEÕES']
    : ['📢 TORNEIO', '🔥 EXCLUSIVO', '📰 DESTAQUES'];
  const chapeu = pick(chapeus);

  // Pull-quote em destaque
  const pullquotes = [
    `"Nunca vi tanto talento reunido em uma única atividade do torneio"`,
    `"Foi um momento que nenhum dos presentes vai esquecer tão cedo"`,
    `"O nível de dedicação dos alunos superou todas as nossas expectativas"`,
    `"Este é o tipo de momento que justifica todo o esforço que depositamos no torneio"`,
    `"A energia que tomou conta do ambiente foi simplesmente indescritível"`
  ];
  const pullquote = pick(pullquotes);

  return { manchete, subtitulo, reporter, chapeu, pullquote, corpo: [intro, para2, para3] };
}

function boletimGerarNoticia() {
  const descricao = (document.getElementById('not-descricao')?.value || '').trim();
  const fotoUrl   = (document.getElementById('not-foto')?.value    || '').trim();
  const erro      = document.getElementById('not-erro');
  const preview   = document.getElementById('not-preview');

  if (!descricao) { if(erro) erro.textContent = 'Descreva o momento antes de gerar.'; return; }
  if(erro) erro.textContent = '';

  const noticia = gerarNoticia(descricao);

  // Monta array de imagens (fotos carregadas + URL extra)
  const imagens = _noticiaFotos.filter(Boolean);
  if (fotoUrl) { try { new URL(fotoUrl); imagens.push(fotoUrl); } catch(_) {} }

  const rascunho = { ...noticia, imagens, tipo: 'noticia' };

  if (preview) {
    preview.innerHTML = `
      <div class="not-preview-card">
        <p style="font-size:11px;color:var(--muted);margin-bottom:10px;font-weight:600;letter-spacing:.05em">PRÉ-VISUALIZAÇÃO · ${imagens.length} foto(s)</p>
        ${renderNoticiaCard(rascunho)}
        <button class="boletim-btn-add" style="margin-top:14px;width:100%" onclick="boletimPublicarNoticia()">
          📢 Publicar no Boletim
        </button>
      </div>`;
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window._noticiaRascunho = rascunho;
}

async function boletimPublicarNoticia() {
  if (!window._noticiaRascunho) return;
  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), ts: Date.now(), ...window._noticiaRascunho });
  await salvarBoletim(dados);
  window._noticiaRascunho = null;
  _noticiaFotos = [null, null, null];
  renderPainel();
}

async function boletimRemover(idx) {
  if (!confirm('Remover este item do boletim?')) return;
  const dados = lerBoletim();
  dados.itens.splice(idx, 1);
  await salvarBoletim(dados);
  renderPainel();
}

async function boletimMover(idx, delta) {
  const dados = lerBoletim();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  await salvarBoletim(dados);
  renderPainel();
}

function sair() {
  sessionStorage.removeItem(CHAVE_SESSAO_AREAS);
  renderLoginAdmin();
}

window.addEventListener("DOMContentLoaded", async function () {
  await carregarBoletim();
  if (sessionStorage.getItem(CHAVE_SESSAO_AREAS) === "1") {
    renderPainel();
  } else {
    renderLoginAdmin();
  }
});
