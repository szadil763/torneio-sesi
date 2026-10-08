// Painel de Gerenciamento de Comunicados — Boletim, Recados e Dicas.

const CHAVE_SESSAO_COM = "torneio-insignias-areas:admin-ok"; // compartilha PIN com admin-areas

function renderLoginCom() {
  const app = document.getElementById("admin-app");
  app.innerHTML = `
    <div class="pin-caixa">
      <div class="marca">Gerenciamento de Comunicados</div>
      <h2 class="titulo-principal">Digite o PIN</h2>
      <input id="campo-pin" type="password" inputmode="text" maxlength="20" placeholder="PIN">
      <button onclick="tentarEntrarCom()">Entrar</button>
      <div class="erro" id="erro-pin"></div>
    </div>
  `;
  document.getElementById("campo-pin").addEventListener("keydown", e => {
    if (e.key === "Enter") tentarEntrarCom();
  });
  document.getElementById("campo-pin").focus();
}

function tentarEntrarCom() {
  const valor = document.getElementById("campo-pin").value;
  if (valor === ADMIN_PIN) {
    sessionStorage.setItem(CHAVE_SESSAO_COM, "1");
    renderPainelCom();
  } else {
    document.getElementById("erro-pin").textContent = "PIN incorreto.";
  }
}

// ── Abas ──────────────────────────────────────────────────────────
let abaComAtiva = 'boletim'; // 'boletim' | 'comunicados'

// ── Estado de edição inline ────────────────────────────────────────
let _editRecadoIdx = null;
let _editDicaIdx   = null;
let _editBolIdx    = null;

function trocarAbaCom(aba) { abaComAtiva = aba; _editRecadoIdx = null; _editDicaIdx = null; _editBolIdx = null; renderPainelCom(); }

function renderPainelCom() {
  const app     = document.getElementById("admin-app");
  const boletim = lerBoletim();
  const urlPub  = location.origin + '/insignias/comunicados.html';

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="sairCom()">Sair</button>
      <a href="/insignias/admin-areas.html" class="voltar" style="text-decoration:none">✏️ Insígnias →</a>
      <a href="/hub.html" class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">Gerenciamento de Comunicados</div>
    <h1 class="titulo-principal">Boletim · Recados · Dicas</h1>

    <div style="background:var(--card);border:1.5px solid var(--card-line);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:2px">Link público para pais e alunos</div>
        <code style="font-size:11px;word-break:break-all;color:var(--text)">${urlPub}</code>
      </div>
      <button onclick="copiarLinkComunicados()" id="btn-link-com"
        style="flex-shrink:0;border:1.5px solid #004B8D;color:#004B8D;background:transparent;border-radius:9px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer">
        📋 Copiar link
      </button>
    </div>

    <div class="admin-abas">
      <button class="admin-aba ${abaComAtiva === 'boletim'     ? 'ativa' : ''}" onclick="trocarAbaCom('boletim')">📸 Boletim</button>
      <button class="admin-aba ${abaComAtiva === 'comunicados' ? 'ativa' : ''}" onclick="trocarAbaCom('comunicados')">📢 Recados e Dicas</button>
      <button class="admin-aba ${abaComAtiva === 'fotos'       ? 'ativa' : ''}" onclick="trocarAbaCom('fotos')">📷 Fotos</button>
      <button class="admin-aba ${abaComAtiva === 'shorts'      ? 'ativa' : ''}" onclick="trocarAbaCom('shorts')">▶️ Shorts</button>
    </div>

    ${abaComAtiva === 'boletim'     ? renderAbaBoletimCom(boletim)
    : abaComAtiva === 'comunicados' ? renderAbaComunicadosCom()
    : abaComAtiva === 'fotos'       ? renderAbaFotosAdmin()
    :                                  renderAbaShortsAdmin()}

    <p class="rodape-nota">
      <a href="/hub.html" style="color:var(--muted);text-decoration:none">← Painel principal</a>
    </p>
  `;
}

function _carregarStatsAdmin() {
  carregarStats().then(stats => {
    const visitas = stats.visitas || 0;
    const unicos  = stats['visitantes-unicos'] || 0;
    const online  = stats.online ? Object.values(stats.online).filter(ts => ts > Date.now() - 300_000).length : 0;
    const sv = document.getElementById('stat-visitas');
    const su = document.getElementById('stat-unicos');
    const so = document.getElementById('stat-online');
    if (sv) sv.textContent = `${visitas} visita${visitas !== 1 ? 's' : ''}`;
    if (su) su.textContent = `${unicos} família${unicos !== 1 ? 's' : ''} única${unicos !== 1 ? 's' : ''}`;
    if (so) so.innerHTML   = `<span style="color:${online > 0 ? '#2E9E4F' : 'var(--muted)'}">● ${online} online agora</span>`;
  }).catch(() => {});
}

// ── Painel de notificações push (Opção A) ────────────────────────
const RTDB_FCM_TOKENS_ADMIN = 'https://torneio-sesi-20de0-default-rtdb.firebaseio.com/fcm-tokens';

async function _carregarPainelPush() {
  const inner = document.getElementById('push-admin-inner');
  if (!inner) return;
  try {
    const res   = await fetch(`${RTDB_FCM_TOKENS_ADMIN}.json`);
    const dados = res.ok ? await res.json() : null;
    const total = dados && typeof dados === 'object' ? Object.keys(dados).length : 0;

    inner.innerHTML = total === 0
      ? `<p style="font-size:12px;color:var(--muted);margin:0">
           Nenhum dispositivo inscrito ainda. Os pais precisam abrir a página de comunicados
           e clicar em <strong>"🔔 Receber novidades"</strong>.
         </p>`
      : `<p style="font-size:12px;color:var(--muted);margin:0 0 12px">
           <strong style="color:var(--text)">${total} dispositivo${total !== 1 ? 's' : ''}</strong> inscrito${total !== 1 ? 's' : ''}.
           Para enviar uma notificação, rode o script abaixo no seu computador:
         </p>
         <div style="background:rgba(0,0,0,.18);border-radius:9px;padding:12px 14px;font-size:11px;font-family:monospace;white-space:pre-wrap;color:#7dd3fc;overflow-x:auto">node scripts/enviar-push.cjs "Título" "Mensagem"</div>
         <p style="font-size:11px;color:var(--muted);margin:8px 0 0">
           📌 Instale uma vez: <code style="font-size:10px">npm install web-push</code> na pasta do projeto.
           Preencha as chaves VAPID em <code style="font-size:10px">scripts/enviar-push.cjs</code>.<br>
           💡 Para envio automático pelo Firebase, faça upgrade para o Plano Blaze (gratuito para este volume).
         </p>`;
  } catch (_) {
    if (inner) inner.textContent = '⚠ Não foi possível carregar inscrições.';
  }
}

// Carrega contagem de tokens quando o painel renderiza
function _agendarCarregarPush() {
  setTimeout(_carregarPainelPush, 0);
}

function copiarLinkComunicados() {
  const url = location.origin + '/insignias/comunicados.html';
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-link-com');
    if (btn) { btn.textContent = '✓ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar link'; }, 2000); }
  }).catch(() => { prompt('Copie o link abaixo:', url); });
}

// ── Aba Boletim ───────────────────────────────────────────────────
let bolAbaAtiva = 'midia';
let _pendingMedia = null; // imagem: { dataUrl, tipo:'imagem' } | video: { blob, blobUrl, tipo:'video' }

function renderAbaBoletimCom(boletim) {
  const itens = boletim.itens || [];
  return `
    <div class="boletim-admin">
      <div class="bol-sub-abas">
        <button class="bol-sub-aba ${bolAbaAtiva === 'midia'   ? 'ativa' : ''}" onclick="bolTrocarAba('midia')">📷 Foto / Vídeo</button>
        <button class="bol-sub-aba ${bolAbaAtiva === 'noticia' ? 'ativa' : ''}" onclick="bolTrocarAba('noticia')">📰 Criar Notícia</button>
      </div>

      ${bolAbaAtiva === 'midia' ? `
        <div class="boletim-form">

          ${_pendingMedia ? `
            <!-- Preview da mídia pendente -->
            <div class="bol-pending-wrap">
              ${_pendingMedia.tipo === 'video'
                ? `<video src="${_pendingMedia.blobUrl}" class="bol-pending-preview" muted playsinline controls preload="metadata"></video>`
                : `<img src="${_pendingMedia.dataUrl}" class="bol-pending-preview">`}
              <button class="bol-pending-cancel" onclick="boletimCancelarPendente()">✕ Cancelar</button>
            </div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:4px">Adicione título e legenda para essa mídia antes de publicar.</p>
          ` : `
            <div class="bol-upload-opcoes">
              <label class="bol-upload-btn" for="bol-file-camera"><span>📸</span> Tirar foto agora</label>
              <input id="bol-file-camera" type="file" accept="image/*" capture="environment" style="display:none" onchange="boletimHandleFile(this)">
              <label class="bol-upload-btn bol-upload-btn-sec" for="bol-file-input"><span>🖼️</span> Foto da galeria</label>
              <input id="bol-file-input" type="file" accept="image/*" style="display:none" onchange="boletimHandleFile(this)">
              <label class="bol-upload-btn bol-upload-btn-vid" for="bol-file-video"><span>📹</span> Vídeo (até 2 min)</label>
              <input id="bol-file-video" type="file" accept="video/*" style="display:none" onchange="boletimHandleVideo(this)">
            </div>
            <div id="bol-video-aviso" style="display:none;font-size:12px;color:var(--muted);margin-top:6px;text-align:center">⏳ Verificando vídeo…</div>
            <div class="bol-separador"><span>ou cole um link</span></div>
            <input id="bol-url" type="url" placeholder="Link da foto ou vídeo do YouTube" class="boletim-input">
          `}

          <input id="bol-titulo"  type="text" placeholder="Título (opcional)"  class="boletim-input">
          <input id="bol-legenda" type="text" placeholder="Legenda (opcional)" class="boletim-input">
          ${_seletorInicio('bol-inicio')}
          ${_seletorArea('bol-area', '📍 APÓS A INÍCIO, FICARÁ EM QUAL ÁREA?')}

          ${_pendingMedia
            ? `<button class="boletim-btn-add" style="margin-top:12px" onclick="boletimConfirmarPendente()">✅ Adicionar ao boletim</button>`
            : `<button class="boletim-btn-add" style="margin-top:12px" onclick="boletimAdicionar()">+ Adicionar por link</button>`}

          <div class="bol-separador ia-separador"><span>✨ gere título e legenda com IA</span></div>
          <p style="font-size:12px;color:var(--muted);margin-bottom:4px">Descreva o que aparece na foto ou no vídeo e a IA sugere título e legenda.</p>
          <textarea id="bol-ia-desc" class="boletim-input boletim-textarea" rows="2"
            placeholder="Ex: A equipe azul apresentou o robô que desviou todos os obstáculos e ganhou aplausos..."></textarea>
          <button class="boletim-btn-noticia" onclick="midiaGerarIA()" style="margin-top:6px">✨ Gerar título e legenda</button>
          <div id="bol-ia-resultado" style="display:none;font-size:12px;background:color-mix(in srgb,#2F8FE0 10%,var(--card));border:1px solid #2F8FE0;border-radius:10px;padding:10px 12px;margin-top:8px;color:var(--text)"></div>
        </div>
        <div id="bol-erro" class="erro" style="margin-top:8px"></div>
      ` : `
        <div class="boletim-form">
          <p style="font-size:13px;color:var(--muted);margin-bottom:4px">
            Descreva o momento — a IA gera manchete, parágrafos e citação. Adicione fotos à vontade.
          </p>
          <textarea id="not-descricao" class="boletim-input boletim-textarea"
            placeholder="Ex: A equipe verde venceu o desafio de robótica..." rows="3"></textarea>
          <p style="font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;letter-spacing:.04em">FOTOS DA COLAGEM</p>
          <div class="not-slots-grade" id="not-slots-grade">
            ${[0,1,2].map(i => _noticiaSlotHTML(i)).join('')}
          </div>
          <button type="button" onclick="noticiaAdicionarSlot()"
            style="margin-top:6px;background:none;border:1.5px dashed var(--muted);border-radius:8px;width:100%;padding:8px;font-size:13px;color:var(--muted);cursor:pointer">
            ＋ Adicionar foto
          </button>
          <input id="not-foto" type="url" placeholder="Ou cole link de uma foto extra" class="boletim-input" style="margin-top:4px">
          <input id="not-reporter" type="text" placeholder="Seu nome para créditos (opcional — padrão: Redação SESI)" class="boletim-input" style="margin-top:4px">
          ${_seletorInicio('not-inicio')}
          <button class="boletim-btn-add boletim-btn-noticia" onclick="boletimGerarNoticia()">✨ Gerar Notícia</button>
        </div>
        <div id="not-erro" class="erro" style="margin-top:8px"></div>
        <div id="not-preview" style="margin-top:16px"></div>
      `}

      ${itens.length === 0
        ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum item ainda.</p>`
        : `<div class="boletim-lista-admin">
            ${itens.map((item, i) => {
              if (_editBolIdx === i) {
                const tituloEdit = item.tipo === 'noticia' ? (item.manchete||'') : (item.titulo||'');
                const legendaEdit = item.legenda || item.subtitulo || '';
                return `
                  <div class="bol-item-admin" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px">
                    <div style="font-size:11px;font-weight:700;color:#004B8D;letter-spacing:.05em;text-transform:uppercase">✏️ Editando item do boletim</div>
                    ${_seletorModalidade('bol-edit-modalidade', 'boletim')}
                    <input id="bol-edit-titulo" type="text" class="boletim-input" style="margin:0" value="${tituloEdit.replace(/"/g,'&quot;')}" placeholder="Título">
                    <input id="bol-edit-legenda" type="text" class="boletim-input" style="margin:0" value="${legendaEdit.replace(/"/g,'&quot;')}" placeholder="Legenda">
                    ${_seletorInicio('bol-edit-inicio', item.inicioAte)}
                    ${_seletorArea('bol-edit-area', '📍 APÓS A INÍCIO, FICARÁ EM QUAL ÁREA?', item.area)}
                    <div style="display:flex;gap:8px;margin-top:4px">
                      <button class="boletim-btn-add" style="flex:1;margin:0" onclick="boletimSalvarEdicao(${i})">💾 Salvar</button>
                      <button class="boletim-btn-noticia" style="flex:1;margin:0" onclick="_editBolIdx=null;renderPainelCom()">✕ Cancelar</button>
                    </div>
                  </div>`;
              }
              let thumb, badge;
              if (item.tipo === 'noticia') {
                const fotoSrc = item.imagem || '';
                thumb = fotoSrc
                  ? `<img src="${fotoSrc}" class="bol-thumb">`
                  : `<div class="bol-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--card-line)">📰</div>`;
                badge = '<span class="bol-play-badge" style="background:#c0392b">📰 Notícia</span>';
              } else {
                const tipo = detectarTipoMidia(item.url || '');
                if (tipo === 'youtube') {
                  thumb = `<img src="https://img.youtube.com/vi/${youtubeId(item.url)}/mqdefault.jpg" class="bol-thumb" onerror="this.src=''">`
                  badge = '<span class="bol-play-badge">▶ YouTube</span>';
                } else if (tipo === 'video') {
                  thumb = `<video src="${item.url}" class="bol-thumb" style="object-fit:cover" muted playsinline preload="metadata"></video>`;
                  badge = '<span class="bol-play-badge" style="background:#c0392b">🎬 Vídeo</span>';
                } else {
                  thumb = `<img src="${item.url}" class="bol-thumb" onerror="this.style.display='none'">`;
                  badge = '';
                }
              }
              const tituloExibido = item.tipo === 'noticia' ? item.manchete : (item.titulo || '(sem título)');
              return `
                <div class="bol-item-admin">
                  <div class="bol-item-preview">${thumb}${badge}</div>
                  <div class="bol-item-info">
                    <strong class="bol-item-titulo">${tituloExibido}${_badgeAreaAdmin(item.area)}${_badgeInicioAdmin(item.inicioAte)}</strong>
                    <span class="bol-item-legenda">${item.legenda || item.subtitulo || ''}</span>
                  </div>
                  <div class="bol-item-acoes">
                    ${i > 0               ? `<button class="bol-btn-ord" onclick="boletimMover(${i},-1)">↑</button>` : ''}
                    ${i < itens.length-1  ? `<button class="bol-btn-ord" onclick="boletimMover(${i},+1)">↓</button>` : ''}
                    <button class="bol-btn-ord" onclick="_editBolIdx=${i};_editRecadoIdx=null;_editDicaIdx=null;renderPainelCom()" title="Editar">✏️</button>
                    <button class="bol-btn-rem" onclick="boletimRemover(${i})">🗑</button>
                  </div>
                </div>`;
            }).join('')}
          </div>`}
    </div>`;
}

function bolTrocarAba(aba) { bolAbaAtiva = aba; renderPainelCom(); }

// ── Aba Recados e Dicas ───────────────────────────────────────────
let comSubAba = 'recados';

function renderAbaComunicadosCom() {
  const recados = lerRecados();
  const dicas   = lerDicas();
  return `
    <div class="boletim-admin">
      <div class="bol-sub-abas">
        <button class="bol-sub-aba ${comSubAba === 'recados' ? 'ativa' : ''}" onclick="comTrocarSubAba('recados')">📢 Recados</button>
        <button class="bol-sub-aba ${comSubAba === 'dicas'   ? 'ativa' : ''}" onclick="comTrocarSubAba('dicas')">💡 Dicas</button>
      </div>
      ${comSubAba === 'recados' ? renderSubRecadosCom(recados) : renderSubDicasCom(dicas)}
    </div>`;
}

function renderSubRecadosCom(recados) {
  const itens = recados.itens || [];
  return `
    <div class="boletim-form">
      <div class="bol-separador ia-separador" style="margin-top:0"><span>✨ Gerar recado com IA</span></div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:4px">Descreva o assunto e a IA escreve o recado completo para pais e alunos.</p>
      <textarea id="rec-ia-desc" class="boletim-input boletim-textarea" rows="2"
        placeholder="Ex: Lembrar os pais que na sexta tem apresentação das equipes às 14h na quadra..."></textarea>
      <button class="boletim-btn-noticia" onclick="recadoGerarIA()" style="margin-bottom:4px">✨ Gerar recado</button>
      <div id="rec-ia-resultado" style="display:none;font-size:12px;background:color-mix(in srgb,#2F8FE0 10%,var(--card));border:1px solid #2F8FE0;border-radius:10px;padding:10px 12px;margin-bottom:8px;color:var(--text)"></div>

      <div class="bol-separador"><span>ou escreva diretamente</span></div>
      <input id="rec-titulo" type="text" placeholder="Título do recado (opcional)" class="boletim-input">
      <textarea id="rec-texto" class="boletim-input boletim-textarea" rows="4"
        placeholder="Digite o recado para pais e alunos..."></textarea>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0 4px;cursor:pointer">
        <input type="checkbox" id="rec-destaque"> Destacar este recado (laranja)
      </label>
      ${_seletorInicio('rec-inicio')}
      ${_seletorArea('rec-area')}
      <button class="boletim-btn-add" style="margin-top:12px" onclick="recadoAdicionar()">📢 Publicar recado</button>
    </div>
    <div id="rec-erro" class="erro" style="margin-top:8px"></div>
    ${itens.length === 0
      ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum recado ainda.</p>`
      : `<div class="boletim-lista-admin" style="margin-top:16px">
          ${itens.map((item, i) => _editRecadoIdx === i ? `
            <div class="bol-item-admin" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px">
              <div style="font-size:11px;font-weight:700;color:#004B8D;letter-spacing:.05em;text-transform:uppercase">✏️ Editando recado</div>
              ${_seletorModalidade('rec-edit-modalidade', 'recado')}
              <input id="rec-edit-titulo" type="text" class="boletim-input" style="margin:0" value="${(item.titulo||'').replace(/"/g,'&quot;')}" placeholder="Título (opcional)">
              <textarea id="rec-edit-texto" class="boletim-input boletim-textarea" rows="3" style="margin:0">${item.texto||''}</textarea>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
                <input type="checkbox" id="rec-edit-destaque" ${item.destaque?'checked':''}> Destacar (laranja)
              </label>
              ${_seletorInicio('rec-edit-inicio', item.inicioAte)}
              ${_seletorArea('rec-edit-area', undefined, item.area)}
              <div style="display:flex;gap:8px;margin-top:4px">
                <button class="boletim-btn-add" style="flex:1;margin:0" onclick="recadoSalvarEdicao(${i})">💾 Salvar</button>
                <button class="boletim-btn-noticia" style="flex:1;margin:0" onclick="_editRecadoIdx=null;renderPainelCom()">✕ Cancelar</button>
              </div>
            </div>` : `
            <div class="bol-item-admin">
              <div class="bol-item-info" style="flex:1">
                <strong class="bol-item-titulo">${item.titulo || '(sem título)'}${_badgeAreaAdmin(item.area)}${_badgeInicioAdmin(item.inicioAte)}</strong>
                <span class="bol-item-legenda" style="white-space:pre-line;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.texto}</span>
              </div>
              <div class="bol-item-acoes">
                ${i > 0              ? `<button class="bol-btn-ord" onclick="recadoMover(${i},-1)">↑</button>` : ''}
                ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="recadoMover(${i},+1)">↓</button>` : ''}
                <button class="bol-btn-ord" onclick="_editRecadoIdx=${i};_editDicaIdx=null;_editBolIdx=null;renderPainelCom()" title="Editar">✏️</button>
                <button class="bol-btn-rem" onclick="recadoRemover(${i})">🗑</button>
              </div>
            </div>`).join('')}
        </div>`}`;
}

function renderSubDicasCom(dicas) {
  const itens = dicas.itens || [];
  return `
    <div class="boletim-form">
      <div class="bol-separador ia-separador" style="margin-top:0"><span>✨ Gerar dica com IA</span></div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:4px">Descreva o tema da dica e a IA escolhe o emoji e escreve o texto certo.</p>
      <textarea id="dic-ia-desc" class="boletim-input boletim-textarea" rows="2"
        placeholder="Ex: Tomar água durante as atividades para manter o foco e a energia nas provas..."></textarea>
      <button class="boletim-btn-noticia" onclick="dicaGerarIA()" style="margin-bottom:4px">✨ Gerar dica</button>
      <div id="dic-ia-resultado" style="display:none;font-size:12px;background:color-mix(in srgb,#2F8FE0 10%,var(--card));border:1px solid #2F8FE0;border-radius:10px;padding:10px 12px;margin-bottom:8px;color:var(--text)"></div>

      <div class="bol-separador"><span>ou escreva diretamente</span></div>
      <input id="dic-titulo" type="text" placeholder="Título / manchete (opcional)" class="boletim-input">
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="dic-icone" type="text" placeholder="💡" class="boletim-input" style="width:70px;text-align:center;font-size:20px;flex-shrink:0">
        <textarea id="dic-texto" rows="2" placeholder="Texto da dica" class="boletim-input boletim-textarea" style="flex:1;margin:0"></textarea>
      </div>
      ${_inputMidiaDica('dic-midia', 'dic-midia-url', '')}
      ${_seletorInicio('dic-inicio')}
      ${_seletorArea('dic-area')}
      <button class="boletim-btn-add" style="margin-top:12px" onclick="dicaAdicionar()">+ Adicionar dica</button>
    </div>
    <div id="dic-erro" class="erro" style="margin-top:8px"></div>
    ${itens.length === 0
      ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhuma dica ainda.</p>`
      : `<div class="boletim-lista-admin" style="margin-top:16px">
          ${itens.map((item, i) => _editDicaIdx === i ? `
            <div class="bol-item-admin" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px">
              <div style="font-size:11px;font-weight:700;color:#004B8D;letter-spacing:.05em;text-transform:uppercase">✏️ Editando dica</div>
              ${_seletorModalidade('dic-edit-modalidade', 'dica')}
              <input id="dic-edit-titulo" type="text" class="boletim-input" placeholder="Título / manchete (opcional)" value="${(item.titulo||'').replace(/"/g,'&quot;')}">
              <div style="display:flex;gap:8px;margin-top:8px">
                <input id="dic-edit-icone" type="text" class="boletim-input" style="width:70px;text-align:center;font-size:20px;flex-shrink:0;margin:0" value="${item.icone||'💡'}">
                <textarea id="dic-edit-texto" rows="2" class="boletim-input boletim-textarea" style="flex:1;margin:0">${(item.texto||'').replace(/</g,'&lt;')}</textarea>
              </div>
              ${_inputMidiaDica('dic-edit-midia', 'dic-edit-midia-url', item.imagem||'')}
              ${_seletorInicio('dic-edit-inicio', item.inicioAte)}
              ${_seletorArea('dic-edit-area', undefined, item.area)}
              <div style="display:flex;gap:8px;margin-top:4px">
                <button class="boletim-btn-add" style="flex:1;margin:0" onclick="dicaSalvarEdicao(${i})">💾 Salvar</button>
                <button class="boletim-btn-noticia" style="flex:1;margin:0" onclick="_editDicaIdx=null;renderPainelCom()">✕ Cancelar</button>
              </div>
            </div>` : `
            <div class="bol-item-admin">
              <div style="font-size:24px;flex-shrink:0">${item.icone || '💡'}</div>
              <div class="bol-item-info" style="flex:1">
                <span class="bol-item-titulo">${item.texto}${_badgeAreaAdmin(item.area)}${_badgeInicioAdmin(item.inicioAte)}</span>
              </div>
              <div class="bol-item-acoes">
                ${i > 0              ? `<button class="bol-btn-ord" onclick="dicaMover(${i},-1)">↑</button>` : ''}
                ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="dicaMover(${i},+1)">↓</button>` : ''}
                <button class="bol-btn-ord" onclick="_editDicaIdx=${i};_editRecadoIdx=null;_editBolIdx=null;renderPainelCom()" title="Editar">✏️</button>
                <button class="bol-btn-rem" onclick="dicaRemover(${i})">🗑</button>
              </div>
            </div>`).join('')}
        </div>`}`;
}

function comTrocarSubAba(sub) { comSubAba = sub; _editRecadoIdx = null; _editDicaIdx = null; renderPainelCom(); }

// ── Helpers de formulário ─────────────────────────────────────────
function _seletorArea(id, label, valorAtual) {
  const v = valorAtual || '';
  return `
    <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin:10px 0 4px;letter-spacing:.04em">${label || '📍 APÓS A INÍCIO, FICARÁ EM QUAL ÁREA?'}</label>
    <select id="${id}" class="boletim-input" style="margin-top:0">
      <option value=""        ${v === ''               ? 'selected' : ''}>— Todas as áreas (visível para todos) —</option>
      <option value="robotica"       ${v === 'robotica'       ? 'selected' : ''}>🤖 Robótica</option>
      <option value="ingles"         ${v === 'ingles'         ? 'selected' : ''}>🌎 Inglês</option>
      <option value="artes"          ${v === 'artes'          ? 'selected' : ''}>🎨 Artes</option>
      <option value="educacao-fisica"${v === 'educacao-fisica'? 'selected' : ''}>⚽ Ed. Física</option>
    </select>`;
}

function _seletorModalidade(id, modalidadeAtual) {
  const opts = [
    { v: 'boletim', label: '📸 Boletim' },
    { v: 'recado',  label: '📢 Recado'  },
    { v: 'dica',    label: '💡 Dica'    },
  ];
  return `
    <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin:0 0 4px;letter-spacing:.04em">🔄 MODALIDADE</label>
    <select id="${id}" class="boletim-input" style="margin-top:0">
      ${opts.map(o => `<option value="${o.v}" ${modalidadeAtual === o.v ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>`;
}

function _inputMidiaDica(idFile, idUrl, imagemAtual) {
  const preview = imagemAtual
    ? `<div style="margin-top:6px;position:relative;display:inline-block">
         <img src="${imagemAtual}" style="max-width:100%;max-height:140px;border-radius:10px;display:block">
         <button type="button" onclick="dicaRemoverImagem('${idFile}','${idUrl}')"
           style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer;line-height:1">✕</button>
       </div>`
    : '';
  return `
    <div style="margin-top:6px">
      <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;letter-spacing:.04em">🖼️ IMAGEM (opcional)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="boletim-btn-noticia" style="cursor:pointer;padding:8px 12px;font-size:13px;margin:0" title="Câmera">
          📸 Câmera
          <input id="${idFile}-cam" type="file" accept="image/*" capture="environment" style="display:none" onchange="dicaHandleImagem(this,'${idFile}','${idUrl}')">
        </label>
        <label class="boletim-btn-noticia" style="cursor:pointer;padding:8px 12px;font-size:13px;margin:0" title="Galeria">
          🖼️ Galeria
          <input id="${idFile}-gal" type="file" accept="image/*" style="display:none" onchange="dicaHandleImagem(this,'${idFile}','${idUrl}')">
        </label>
      </div>
      <input id="${idUrl}" type="url" class="boletim-input" style="margin-top:6px" placeholder="Ou cole link de uma imagem (https://…)" value="">
      <div id="${idFile}-preview">${preview}</div>
    </div>`;
}

function _inicioAteParaDias(inicioAte) {
  if (inicioAte == null) return '0';
  if (inicioAte === -1) return '-1';
  const diasRestantes = Math.round((inicioAte - Date.now()) / 86_400_000);
  const opcoes = [1, 3, 7, 14];
  const closest = opcoes.reduce((prev, curr) =>
    Math.abs(curr - diasRestantes) < Math.abs(prev - diasRestantes) ? curr : prev
  );
  return String(closest);
}

function _seletorInicio(id, inicioAteAtual) {
  const v = inicioAteAtual !== undefined ? _inicioAteParaDias(inicioAteAtual) : '0';
  return `
    <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin:10px 0 4px;letter-spacing:.04em">🏠 POR QUANTO TEMPO APARECE NA PÁGINA INÍCIO?</label>
    <select id="${id}" class="boletim-input" style="margin-top:0">
      <option value="0"  ${v === '0'  ? 'selected' : ''}>✅ Sempre visível na Início</option>
      <option value="1"  ${v === '1'  ? 'selected' : ''}>⏱ Por 1 dia, depois vai para a área escolhida</option>
      <option value="3"  ${v === '3'  ? 'selected' : ''}>⏱ Por 3 dias, depois vai para a área escolhida</option>
      <option value="7"  ${v === '7'  ? 'selected' : ''}>⏱ Por 7 dias, depois vai para a área escolhida</option>
      <option value="14" ${v === '14' ? 'selected' : ''}>⏱ Por 14 dias, depois vai para a área escolhida</option>
      <option value="-1" ${v === '-1' ? 'selected' : ''}>🚫 Não exibir na Início (só na área escolhida)</option>
    </select>`;
}

function _calcInicioAte(dias) {
  const d = parseInt(dias, 10);
  if (d === -1) return -1;           // nunca mostrar na Início
  if (d === 0)  return null;         // sempre mostrar
  return Date.now() + d * 86_400_000;
}

function _badgeAreaAdmin(area) {
  const cores = { robotica:'#7C3AED', ingles:'#2E9E4F', artes:'#E53E3E', 'educacao-fisica':'#F5821F' };
  const nomes = { robotica:'🤖 Robótica', ingles:'🌎 Inglês', artes:'🎨 Artes', 'educacao-fisica':'⚽ Ed. Física' };
  if (!area || !nomes[area]) return '';
  return `<span style="font-size:10px;font-weight:800;color:#fff;background:${cores[area]};padding:2px 8px;border-radius:100px;margin-left:6px">${nomes[area]}</span>`;
}

function _badgeInicioAdmin(inicioAte) {
  if (inicioAte === -1) return `<span style="font-size:10px;color:var(--muted);margin-left:6px">🚫 Não na Início</span>`;
  if (!inicioAte)       return `<span style="font-size:10px;color:#2E9E4F;margin-left:6px">✅ Sempre na Início</span>`;
  const restante = inicioAte - Date.now();
  if (restante <= 0)    return `<span style="font-size:10px;color:var(--muted);margin-left:6px">⏱ Expirou da Início</span>`;
  const dias = Math.ceil(restante / 86_400_000);
  return `<span style="font-size:10px;color:#F5821F;margin-left:6px">⏱ Na Início por mais ${dias}d</span>`;
}

// ── Geradores de IA ───────────────────────────────────────────────
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function gerarLegendaMidia(descricao) {
  const d   = descricao.trim();
  const low = d.toLowerCase();
  const temVitoria  = /venc|ganhou|conquist|campe|vitóri|primeiro/.test(low);
  const temRobotica = /rob[oôó]|tecnol|arduino|sensor/.test(low);
  const temIngles   = /ingl[eê]|english/.test(low);
  const temArtes    = /arte|desenh|pintur|criativ/.test(low);
  const temEdf      = /educa.{0,5}f[ií]sic|esport|jog[ao]/.test(low);

  const emoji = temVitoria ? '🏆' : temRobotica ? '🤖' : temIngles ? '🌎' : temArtes ? '🎨' : temEdf ? '⚽' : '📸';

  const titulos = temVitoria
    ? [`${emoji} Momento de vitória!`, `${emoji} Conquista inesquecível`, `${emoji} Campeões em ação!`]
    : [`${emoji} Registro do Torneio SESI`, `${emoji} ${d.slice(0,42).replace(/[.!?,;]+$/,'')}`,
       `${emoji} Momento especial no torneio`, `${emoji} Talentos em destaque`];

  const legendas = [
    `${d} — Torneio SESI Infantil 🏅`,
    `${d.charAt(0).toUpperCase() + d.slice(1).replace(/[.!?]+$/,'')}. Um momento para guardar para sempre!`,
    `Mais um registro especial do nosso torneio: ${d.toLowerCase().replace(/[.!?]+$/,'')}.`,
    `${d.replace(/[.!?]+$/,'')} — que turma incrível! 🌟`
  ];

  return { titulo: _pick(titulos), legenda: _pick(legendas) };
}

function midiaGerarIA() {
  const descricao = (document.getElementById('bol-ia-desc')?.value || '').trim();
  const resultado = document.getElementById('bol-ia-resultado');
  if (!descricao) { if(resultado) { resultado.style.display='block'; resultado.textContent='Descreva a mídia antes de gerar.'; } return; }

  const { titulo, legenda } = gerarLegendaMidia(descricao);

  const campoTitulo  = document.getElementById('bol-titulo');
  const campoLegenda = document.getElementById('bol-legenda');
  if (campoTitulo)  campoTitulo.value  = titulo;
  if (campoLegenda) campoLegenda.value = legenda;

  if (resultado) {
    resultado.style.display = 'block';
    resultado.innerHTML = `<strong>Título:</strong> ${titulo}<br><strong>Legenda:</strong> ${legenda}<br><span style="color:var(--muted);font-size:11px">Campos preenchidos acima — edite se quiser antes de adicionar.</span>`;
  }
  campoTitulo?.focus();
}

function gerarRecadoConteudo(descricao) {
  const d   = descricao.trim();
  const low = d.toLowerCase();
  const temAtencao  = /atenção|impor|obrigat|necessá|urgent|lembr|aviso/.test(low);
  const temParabens = /parabéns|conquist|vitória|campe|destaque/.test(low);

  const titulos = temAtencao
    ? ['⚠️ Atenção, famílias!', '📌 Informação importante', '🔔 Aviso da coordenação']
    : temParabens
    ? ['🏆 Parabéns às equipes!', '🎉 Destaque do torneio', '⭐ Reconhecimento especial']
    : ['📢 Comunicado do torneio', '📝 Recado para as famílias', '🏅 Informativo SESI Torneio', '👨‍👩‍👧 Mensagem para pais e alunos'];

  const aberturas = [
    'Prezadas famílias,\n\n',
    'Olá, comunidade SESI!\n\n',
    'Caros pais e responsáveis,\n\n',
    'Queridas famílias,\n\n'
  ];

  const fechamentos = [
    '\n\nContamos com a participação de todos! 💙🧡',
    '\n\nCaso tenham dúvidas, fiquem à vontade para entrar em contato. 😊',
    '\n\nAgradecemos a compreensão e apoio de todas as famílias! 🙏',
    '\n\nJuntos fazemos um torneio ainda mais especial! 🏆'
  ];

  const corpoBase = d.charAt(0).toUpperCase() + d.slice(1).replace(/[.!?]+$/, '') + '.';
  return { titulo: _pick(titulos), texto: _pick(aberturas) + corpoBase + _pick(fechamentos) };
}

function recadoGerarIA() {
  const descricao = (document.getElementById('rec-ia-desc')?.value || '').trim();
  const resultado = document.getElementById('rec-ia-resultado');
  if (!descricao) { if(resultado) { resultado.style.display='block'; resultado.textContent='Descreva o assunto do recado antes de gerar.'; } return; }

  const { titulo, texto } = gerarRecadoConteudo(descricao);

  const campoTitulo = document.getElementById('rec-titulo');
  const campoTexto  = document.getElementById('rec-texto');
  if (campoTitulo) campoTitulo.value = titulo;
  if (campoTexto)  campoTexto.value  = texto;

  if (resultado) {
    resultado.style.display = 'block';
    resultado.innerHTML = `<strong>${titulo}</strong><br><span style="white-space:pre-line;font-size:11px">${texto}</span><br><span style="color:var(--muted);font-size:11px">Campos preenchidos abaixo — edite antes de publicar.</span>`;
  }
  campoTexto?.focus();
}

function gerarDicaConteudo(descricao) {
  const d   = descricao.trim();
  const low = d.toLowerCase();
  const temSaude    = /saúd|agua|aliment|descanso|sono|exerc/.test(low);
  const temEstudo   = /estud|aprender|praticar|treinar|preparar/.test(low);
  const temEquipe   = /equipe|time|colega|juntos|colabor/.test(low);
  const temConcentr = /foco|concentr|atenção|calma|respir/.test(low);

  const icones = temSaude    ? ['💧','🥗','🏃','😴','🍎']
    : temEstudo   ? ['📚','✏️','🧠','💡','📖']
    : temEquipe   ? ['🤝','👥','💪','🎯','⭐']
    : temConcentr ? ['🎯','🧘','🌬️','💆','🔍']
    : ['💡','✨','🏅','🌟','👊','🎖️','🔥'];

  const icone = _pick(icones);
  const texto = d.charAt(0).toUpperCase() + d.slice(1).replace(/[.!?]+$/, '') + '!';
  return { icone, texto };
}

function dicaGerarIA() {
  const descricao = (document.getElementById('dic-ia-desc')?.value || '').trim();
  const resultado = document.getElementById('dic-ia-resultado');
  if (!descricao) { if(resultado) { resultado.style.display='block'; resultado.textContent='Descreva o tema da dica antes de gerar.'; } return; }

  const { icone, texto } = gerarDicaConteudo(descricao);

  const campoIcone = document.getElementById('dic-icone');
  const campoTexto = document.getElementById('dic-texto');
  if (campoIcone) campoIcone.value = icone;
  if (campoTexto) campoTexto.value = texto;

  if (resultado) {
    resultado.style.display = 'block';
    resultado.innerHTML = `${icone} <strong>${texto}</strong><br><span style="color:var(--muted);font-size:11px">Campos preenchidos abaixo — edite antes de adicionar.</span>`;
  }
  campoTexto?.focus();
}

// ── Imagem / Compressão ───────────────────────────────────────────
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
  _pendingMedia = { dataUrl, tipo: 'imagem' };
  renderPainelCom();
}

function _getVideoMeta(file) {
  return new Promise(resolve => {
    const blobUrl = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
    };
    v.onerror = () => { URL.revokeObjectURL(blobUrl); resolve({ duration: 0, w: 0, h: 0 }); };
    v.src = blobUrl;
  });
}

// Comprime vídeo via canvas + MediaRecorder.
// Captura áudio via video.captureStream() (sem AudioContext — mais compatível com mobile).
// Falha rápido se browser não suporta captureStream/MediaRecorder e usa o arquivo original.
function _comprimirVideo(file, meta, onProgress) {
  return new Promise((resolve, reject) => {
    // Verificações de suporte antes de qualquer coisa
    if (typeof document.createElement('canvas').captureStream !== 'function') {
      return reject(new Error('captureStream não suportado'));
    }
    if (typeof MediaRecorder === 'undefined') {
      return reject(new Error('MediaRecorder não suportado'));
    }

    // Inclui opus para gravar áudio; iOS falha no captureStream antes de chegar aqui
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';

    if (!mimeType) return reject(new Error('Nenhum codec suportado'));

    const MAX_W = 480;
    const scale = Math.min(1, MAX_W / (meta.w || MAX_W));
    const w = Math.max(2, Math.round((meta.w || MAX_W) * scale));
    const h = Math.max(2, Math.round((meta.h || 360) * scale));

    const blobUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = blobUrl;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    let frameId = null;
    let recorder = null;
    let settled = false;
    let timeoutId = null;

    function cleanup() {
      if (timeoutId) clearTimeout(timeoutId);
      if (frameId) cancelAnimationFrame(frameId);
      try { video.pause(); } catch (_) {}
      URL.revokeObjectURL(blobUrl);
    }

    function done(result) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    }

    function fail(err) {
      if (settled) return;
      settled = true;
      cleanup();
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      reject(err);
    }

    // Timeout: duração do vídeo + 30s de margem
    const timeoutMs = ((meta.duration || 120) + 30) * 1000;
    timeoutId = setTimeout(() => fail(new Error('Timeout na compressão')), timeoutMs);

    video.oncanplaythrough = () => {
      let canvasStream;
      try {
        canvasStream = canvas.captureStream(24);
      } catch (e) {
        return fail(e);
      }

      // Tenta capturar áudio direto do elemento de vídeo (sem AudioContext)
      let stream = canvasStream;
      try {
        if (typeof video.captureStream === 'function') {
          const videoMediaStream = video.captureStream();
          const audioTracks = videoMediaStream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...audioTracks
            ]);
          }
        }
      } catch (_) { /* áudio indisponível — continua só com vídeo */ }

      const recOpts = { videoBitsPerSecond: 300_000, audioBitsPerSecond: 96_000 };
      if (mimeType) recOpts.mimeType = mimeType;

      try {
        recorder = new MediaRecorder(stream, recOpts);
      } catch (e) {
        return fail(e);
      }

      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => done(new Blob(chunks, { type: mimeType || 'video/webm' }));
      recorder.onerror = e => fail(e.error || new Error('MediaRecorder error'));

      const draw = () => {
        if (settled) return;
        if (!video.ended && !video.paused) {
          ctx.drawImage(video, 0, 0, w, h);
          if (onProgress && meta.duration) onProgress(video.currentTime / meta.duration);
        }
        frameId = requestAnimationFrame(draw);
      };

      video.onplay  = () => { frameId = requestAnimationFrame(draw); };
      video.onended = () => {
        cancelAnimationFrame(frameId);
        if (recorder.state !== 'inactive') recorder.stop();
      };
      video.onerror = () => fail(new Error('Erro ao reproduzir vídeo'));

      recorder.start(200);
      video.play().then(() => {}).catch(e => fail(e));
    };

    video.onerror = () => fail(new Error('Erro ao carregar vídeo'));
  });
}

function _avisoComp(html) {
  const el = document.getElementById('bol-video-aviso');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = html;
}

async function boletimHandleVideo(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';

  _avisoComp('⏳ Verificando vídeo…');

  const MAX_SEG = 120;
  const meta = await _getVideoMeta(file);
  if (meta.duration > MAX_SEG) {
    const min = Math.floor(meta.duration / 60), seg = Math.round(meta.duration % 60);
    alert(`Vídeo muito longo (${min}m ${seg}s). Limite: 2 minutos.\nPara vídeos mais longos, envie para o YouTube e cole o link.`);
    const el = document.getElementById('bol-video-aviso');
    if (el) el.style.display = 'none';
    return;
  }

  // Upload é feito em chunks — sem limite de tamanho por requisição.
  // Pula compressão para arquivos já pequenos (< 20 MB).
  const SKIP_SIZE = 20_000_000;
  let blob;
  if (file.size <= SKIP_SIZE) {
    _avisoComp('⏳ Vídeo já compacto, carregando…');
    blob = file;
  } else {
    _avisoComp(`
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px">
        ⚙️ Comprimindo vídeo — aguarde…
        <span id="bol-comp-pct" style="font-weight:700">0%</span>
      </div>
      <div style="height:5px;background:var(--card-line);border-radius:999px;overflow:hidden">
        <div id="bol-comp-fill" style="height:100%;background:#2F8FE0;width:0%;transition:width .4s"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">
        Comprimindo para envio — leva até ${Math.ceil(meta.duration)}s.
      </div>`);

    try {
      blob = await _comprimirVideo(file, meta, pct => {
        const fill = document.getElementById('bol-comp-fill');
        const txt  = document.getElementById('bol-comp-pct');
        if (fill) fill.style.width = Math.round(pct * 100) + '%';
        if (txt)  txt.textContent  = Math.round(pct * 100) + '%';
      });
    } catch (e) {
      console.warn('Compressão falhou, usando arquivo original:', e);
      _avisoComp('⏳ Carregando vídeo original…');
      blob = file;
    }
  }

  // Revoga blobUrl anterior se existir
  if (_pendingMedia && _pendingMedia.blobUrl) URL.revokeObjectURL(_pendingMedia.blobUrl);

  const avEl = document.getElementById('bol-video-aviso');
  if (avEl) avEl.style.display = 'none';

  _pendingMedia = { blob, blobUrl: URL.createObjectURL(blob), tipo: 'video' };
  renderPainelCom();
}

async function boletimConfirmarPendente() {
  if (!_pendingMedia) return;
  const titulo  = (document.getElementById('bol-titulo')?.value  || '').trim();
  const legenda = (document.getElementById('bol-legenda')?.value || '').trim();

  // Feedback visual: desabilita botão e mostra progresso
  const btn = document.querySelector('[onclick="boletimConfirmarPendente()"]');
  const erroEl = document.getElementById('bol-erro');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando…'; }
  if (erroEl) erroEl.textContent = '';

  const id = Date.now().toString(36);
  let url = _pendingMedia.dataUrl || '';
  let videoId = null;

  try {
    if (_pendingMedia.tipo === 'video') {
      if (btn) btn.textContent = '⏳ Enviando vídeo…';
      await salvarVideoBoletim(id, _pendingMedia.blob, (atual, total) => {
        if (btn) btn.textContent = `⏳ Enviando vídeo (${atual}/${total})…`;
      });
      if (_pendingMedia.blobUrl) URL.revokeObjectURL(_pendingMedia.blobUrl);
      videoId = id;
      url = '';
    }

    const area       = document.getElementById('bol-area')?.value || '';
    const inicioDias = document.getElementById('bol-inicio')?.value ?? '0';
    const inicioAte  = _calcInicioAte(inicioDias);
    const dados = lerBoletim();
    dados.itens.unshift({ id, tipo: _pendingMedia.tipo, url, videoId, titulo, legenda, area: area || undefined, inicioAte, ts: Date.now() });
    if (btn) btn.textContent = '⏳ Salvando boletim…';
    await salvarBoletim(dados);

    _pendingMedia = null;
    renderPainelCom();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Adicionar ao boletim'; }
    if (erroEl) erroEl.textContent = '⚠ Falha ao salvar. Verifique a conexão e tente novamente.';
  }
}

function boletimCancelarPendente() {
  if (_pendingMedia && _pendingMedia.blobUrl) URL.revokeObjectURL(_pendingMedia.blobUrl);
  _pendingMedia = null;
  renderPainelCom();
}

let _noticiaFotos = [null, null, null];

function _noticiaSlotHTML(i) {
  return `
    <div class="not-slot" id="not-thumb-${i}">
      <span class="not-slot-label">${i === 0 ? 'Principal' : 'Foto ' + (i + 1)}</span>
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
    </div>`;
}

function noticiaAdicionarSlot() {
  const grade = document.getElementById('not-slots-grade');
  if (!grade) return;
  const i = _noticiaFotos.length;
  _noticiaFotos.push(null);
  const div = document.createElement('div');
  div.innerHTML = _noticiaSlotHTML(i).trim();
  grade.appendChild(div.firstElementChild);
}

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

async function boletimAdicionar() {
  const url     = (document.getElementById('bol-url')?.value || '').trim();
  const titulo  = (document.getElementById('bol-titulo')?.value || '').trim();
  const legenda = (document.getElementById('bol-legenda')?.value || '').trim();
  const area       = document.getElementById('bol-area')?.value || '';
  const inicioDias = document.getElementById('bol-inicio')?.value ?? '0';
  const inicioAte  = _calcInicioAte(inicioDias);
  const erro    = document.getElementById('bol-erro');
  if (!url) { if(erro) erro.textContent = 'Informe um link.'; return; }
  try { new URL(url); } catch { if(erro) erro.textContent = 'Link inválido.'; return; }
  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), url, titulo, legenda, area: area || undefined, inicioAte, ts: Date.now() });
  try {
    await salvarBoletim(dados);
    renderPainelCom();
  } catch(e) {
    if (erro) erro.textContent = '⚠ Falha ao salvar no servidor. Verifique a conexão e tente novamente.';
    console.error('[admin] boletimAdicionar falhou:', e);
  }
}

async function _mudarModalidade(deMod, idx, paraMod) {
  // Lê os valores do formulário de edição atual
  let titulo = '', legenda = '', texto = '', icone = '💡', area = '', inicioAte;
  if (deMod === 'boletim') {
    titulo    = (document.getElementById('bol-edit-titulo')?.value  || '').trim();
    legenda   = (document.getElementById('bol-edit-legenda')?.value || '').trim();
    area      = document.getElementById('bol-edit-area')?.value  || '';
    inicioAte = _calcInicioAte(document.getElementById('bol-edit-inicio')?.value ?? '0');
    texto     = legenda || titulo;
  } else if (deMod === 'recado') {
    titulo    = (document.getElementById('rec-edit-titulo')?.value || '').trim();
    texto     = (document.getElementById('rec-edit-texto')?.value  || '').trim();
    legenda   = texto;
    area      = document.getElementById('rec-edit-area')?.value  || '';
    inicioAte = _calcInicioAte(document.getElementById('rec-edit-inicio')?.value ?? '0');
  } else if (deMod === 'dica') {
    icone     = (document.getElementById('dic-edit-icone')?.value || '').trim() || '💡';
    texto     = (document.getElementById('dic-edit-texto')?.value || '').trim();
    titulo    = texto.slice(0, 60);
    legenda   = texto;
    area      = document.getElementById('dic-edit-area')?.value  || '';
    inicioAte = _calcInicioAte(document.getElementById('dic-edit-inicio')?.value ?? '0');
  }
  const id = Date.now().toString(36);
  const ts = Date.now();

  // Remove da coleção de origem (boletim com mídia permanece — apenas cria cópia na nova modalidade)
  if (deMod === 'boletim') {
    const itemOrig = lerBoletim().itens[idx];
    const temMidia = !!(itemOrig?.url || itemOrig?.videoId || itemOrig?.imagem);
    if (!temMidia) { const d = lerBoletim(); d.itens.splice(idx, 1); await salvarBoletim(d); }
    _editBolIdx = null;
  } else if (deMod === 'recado') {
    const d = lerRecados(); d.itens.splice(idx, 1); await salvarRecados(d); _editRecadoIdx = null;
  } else if (deMod === 'dica') {
    const d = lerDicas(); d.itens.splice(idx, 1); await salvarDicas(d); _editDicaIdx = null;
  }

  // Adiciona na coleção de destino e navega até ela
  if (paraMod === 'boletim') {
    const d = lerBoletim();
    d.itens.unshift({ id, tipo: 'link', url: '', titulo, legenda, area: area || undefined, inicioAte, ts });
    await salvarBoletim(d);
    abaComAtiva = 'boletim';
  } else if (paraMod === 'recado') {
    const d = lerRecados();
    d.itens.unshift({ id, titulo, texto: texto || legenda, destaque: false, area: area || undefined, inicioAte, ts });
    await salvarRecados(d);
    abaComAtiva = 'comunicados'; comSubAba = 'recados';
  } else if (paraMod === 'dica') {
    const d = lerDicas();
    d.itens.push({ id, icone, texto: texto || titulo, area: area || undefined, inicioAte });
    await salvarDicas(d);
    abaComAtiva = 'comunicados'; comSubAba = 'dicas';
  }

  renderPainelCom();
}

async function boletimSalvarEdicao(idx) {
  const novaMod = document.getElementById('bol-edit-modalidade')?.value || 'boletim';
  if (novaMod !== 'boletim') { await _mudarModalidade('boletim', idx, novaMod); return; }
  const dados = lerBoletim();
  const item  = dados.itens[idx];
  if (!item) return;
  const titulo     = (document.getElementById('bol-edit-titulo')?.value  || '').trim();
  const legenda    = (document.getElementById('bol-edit-legenda')?.value || '').trim();
  const area       = document.getElementById('bol-edit-area')?.value || '';
  const inicioDias = document.getElementById('bol-edit-inicio')?.value ?? '0';
  if (item.tipo === 'noticia') { item.manchete  = titulo; item.subtitulo = legenda; }
  else                         { item.titulo    = titulo; item.legenda   = legenda; }
  item.area     = area || undefined;
  item.inicioAte = _calcInicioAte(inicioDias);
  try {
    await salvarBoletim(dados);
    _editBolIdx = null;
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao salvar edição. Verifique a conexão e tente novamente.');
    console.error('[admin] boletimSalvarEdicao falhou:', e);
  }
}

async function boletimRemover(idx) {
  if (!confirm('Remover este item do boletim?')) return;
  const dados = lerBoletim();
  const [removido] = dados.itens.splice(idx, 1);
  if (removido?.videoId) removerVideoBoletim(removido.videoId);
  try {
    await salvarBoletim(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao remover. Verifique a conexão e tente novamente.');
    console.error('[admin] boletimRemover falhou:', e);
  }
}

async function boletimMover(idx, delta) {
  const dados = lerBoletim();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  try {
    await salvarBoletim(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao reordenar. Verifique a conexão e tente novamente.');
    console.error('[admin] boletimMover falhou:', e);
  }
}

// ── Gerador de notícia ────────────────────────────────────────────
function gerarNoticia(descricao) {
  const d   = descricao.trim();
  const low = d.toLowerCase();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const temVitoria  = /venc|ganhou|conquist|campe|primeiro|1[oº°] lugar|vitori|dominou/.test(low);
  const temRobotica = /rob[oôó]|tecnol|program|arduino|sensor|código|algoritm/.test(low);
  const temIngles   = /ingl[eê]|english|idioma|língua|vocabul|pronúnc/.test(low);
  const temArtes    = /arte|desenh|pintur|criativ|escultur|música|dança|teatro/.test(low);
  const temEdf      = /educa.{0,5}f[ií]sic|esport|jog[ao]|futebol|corrida|moviment|atletism/.test(low);

  const adjs  = ['HISTÓRICA','IMPRESSIONANTE','INÉDITA','EXTRAORDINÁRIA','ÉPICA','EMOCIONANTE','SURPREENDENTE'];
  const adj   = pick(adjs);
  const adjs2 = ['histórica','marcante','inesquecível','espetacular','sem precedentes'];
  const adj2  = pick(adjs2);

  const areaLabel = temRobotica ? 'Robótica' : temIngles ? 'Inglês' : temArtes ? 'Artes' : temEdf ? 'Educação Física' : 'Torneio SESI';

  const manchetes = temVitoria ? [
    `VITÓRIA ${adj}! ${d.replace(/[.!?]+$/,'').toUpperCase()}`,
    `CONQUISTA ÉPICA: EQUIPE DO SESI DOMINA O ${areaLabel.toUpperCase()} E FAZ HISTÓRIA`,
    `EXPLOSÃO DE ALEGRIA NO TORNEIO! ${d.replace(/[.!?]+$/,'').toUpperCase()}`
  ] : [
    `TORNEIO SESI: PERFORMANCE ${adj} EM ${areaLabel.toUpperCase()} DEIXA TODOS DE BOCA ABERTA`,
    `${areaLabel.toUpperCase()} NO FOCO! ALUNOS DO SESI PROTAGONIZAM MOMENTO ${adj}`,
    `EXCLUSIVO: O QUE ACONTECEU NO ${areaLabel.toUpperCase()} DO TORNEIO VAI TE SURPREENDER`
  ];
  const manchete  = pick(manchetes);
  const subtitulo = pick([
    `Estudantes surpreenderam professores e familiares com desempenho acima do esperado`,
    `Momento ${adj2} marcou mais uma etapa do Torneio SESI Infantil`,
    `Participantes se superaram e deixaram o público em êxtase`,
    `O que todos esperavam aconteceu — e foi ainda melhor do que o previsto`
  ]);

  const reporter = 'Redação SESI';

  const intro = `Em mais um capítulo empolgante do Torneio SESI Infantil, ${d.replace(/[.!?]+$/,'').charAt(0).toLowerCase()+d.replace(/[.!?]+$/,'').slice(1)}. A cena arrancou aplausos da plateia e ficará marcada na memória de todos os presentes.`;
  const para2 = pick([
    `A atividade faz parte do projeto de educação integral do SESI, que busca desenvolver competências do século XXI nos estudantes. Segundo os organizadores, o nível de engajamento desta edição superou todas as expectativas: "Nunca vimos tanto entusiasmo e dedicação", revelou um dos professores.`,
    `O Torneio SESI Infantil reúne turmas em desafios interdisciplinares que estimulam criatividade, trabalho em equipe e pensamento crítico. Nesta edição, a organização notou um salto significativo na qualidade das apresentações.`,
    `De acordo com a coordenação pedagógica, momentos como este reforçam o valor do torneio como ferramenta de aprendizado ativo. "Quando os alunos vivenciam o conhecimento na prática, o impacto é completamente diferente", destacou a equipe.`
  ]);
  const para3 = pick([
    `O torneio continua com mais etapas previstas, e a expectativa é de que o nível de desempenho só aumente. Fique de olho no Boletim do Torneio para não perder nenhum momento!`,
    `Com cada rodada, fica mais evidente o potencial dos jovens talentos do SESI. A comunidade escolar vibra — e tem muito mais por vir!`,
    `Se esta etapa já foi assim, imagina o que está por vir! O Torneio SESI Infantil promete emoções até o grand finale.`
  ]);

  const chapeus = temRobotica ? ['🤖 ROBÓTICA','💡 TECNOLOGIA','⚙️ INOVAÇÃO']
    : temIngles  ? ['🌎 INGLÊS','📚 IDIOMAS','🗣️ LINGUAGEM']
    : temArtes   ? ['🎨 ARTES','✨ CRIATIVIDADE','🎭 CULTURA']
    : temEdf     ? ['⚽ ESPORTES','🏃 MOVIMENTO','💪 SAÚDE']
    : temVitoria ? ['🏆 DESTAQUE','🥇 VITÓRIA','⭐ CAMPEÕES']
    : ['📢 TORNEIO','🔥 EXCLUSIVO','📰 DESTAQUES'];
  const chapeu = pick(chapeus);

  const pullquote = pick([
    `"Nunca vi tanto talento reunido em uma única atividade do torneio"`,
    `"Foi um momento que nenhum dos presentes vai esquecer tão cedo"`,
    `"O nível de dedicação dos alunos superou todas as nossas expectativas"`,
    `"Este é o tipo de momento que justifica todo o esforço que depositamos no torneio"`
  ]);

  return { manchete, subtitulo, reporter, chapeu, pullquote, corpo: [intro, para2, para3] };
}

function boletimGerarNoticia() {
  const descricao      = (document.getElementById('not-descricao')?.value  || '').trim();
  const fotoUrl        = (document.getElementById('not-foto')?.value       || '').trim();
  const reporterNome   = (document.getElementById('not-reporter')?.value   || '').trim();
  const erro           = document.getElementById('not-erro');
  const preview        = document.getElementById('not-preview');

  if (!descricao) { if(erro) erro.textContent = 'Descreva o momento antes de gerar.'; return; }
  if(erro) erro.textContent = '';

  const noticia = gerarNoticia(descricao);
  if (reporterNome) noticia.reporter = reporterNome;
  const imagens = _noticiaFotos.filter(Boolean);
  if (fotoUrl) { try { new URL(fotoUrl); imagens.push(fotoUrl); } catch(_) {} }

  const rascunho = { ...noticia, imagens, tipo: 'noticia' };

  if (preview) {
    const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    preview.innerHTML = `
      <div class="not-preview-card">
        <p style="font-size:11px;color:var(--muted);margin-bottom:10px;font-weight:600;letter-spacing:.05em">
          ✏️ EDITE ANTES DE PUBLICAR · ${imagens.length} foto(s)
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">CHAPÉU</label>
          <input id="not-edit-chapeu" class="boletim-input" style="margin:0;font-size:13px"
            value="${escHtml(rascunho.chapeu||'')}">
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">MANCHETE</label>
          <textarea id="not-edit-manchete" class="boletim-input boletim-textarea" rows="2"
            style="margin:0;font-size:13px;font-weight:700">${escHtml(rascunho.manchete||'')}</textarea>
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">SUBTÍTULO</label>
          <textarea id="not-edit-subtitulo" class="boletim-input boletim-textarea" rows="2"
            style="margin:0;font-size:13px">${escHtml(rascunho.subtitulo||'')}</textarea>
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">CITAÇÃO EM DESTAQUE</label>
          <textarea id="not-edit-pullquote" class="boletim-input boletim-textarea" rows="2"
            style="margin:0;font-size:13px;font-style:italic">${escHtml(rascunho.pullquote||'')}</textarea>
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">PARÁGRAFO 1</label>
          <textarea id="not-edit-p0" class="boletim-input boletim-textarea" rows="3"
            style="margin:0;font-size:13px">${escHtml((rascunho.corpo||[])[0]||'')}</textarea>
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">PARÁGRAFO 2</label>
          <textarea id="not-edit-p1" class="boletim-input boletim-textarea" rows="3"
            style="margin:0;font-size:13px">${escHtml((rascunho.corpo||[])[1]||'')}</textarea>
          <label style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.05em">PARÁGRAFO 3</label>
          <textarea id="not-edit-p2" class="boletim-input boletim-textarea" rows="3"
            style="margin:0;font-size:13px">${escHtml((rascunho.corpo||[])[2]||'')}</textarea>
        </div>
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
  const inicioDias = document.getElementById('not-inicio')?.value ?? '0';
  const inicioAte  = _calcInicioAte(inicioDias);

  const g = id => (document.getElementById(id)?.value || '').trim();
  const corpo = [g('not-edit-p0'), g('not-edit-p1'), g('not-edit-p2')].filter(Boolean);
  const editado = {
    ...window._noticiaRascunho,
    chapeu:    g('not-edit-chapeu')    || window._noticiaRascunho.chapeu,
    manchete:  g('not-edit-manchete')  || window._noticiaRascunho.manchete,
    subtitulo: g('not-edit-subtitulo') || window._noticiaRascunho.subtitulo,
    pullquote: g('not-edit-pullquote') || window._noticiaRascunho.pullquote,
    corpo:     corpo.length ? corpo : window._noticiaRascunho.corpo,
  };

  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), ts: Date.now(), inicioAte, ...editado });
  try {
    await salvarBoletim(dados);
    window._noticiaRascunho = null;
    _noticiaFotos = [null, null, null];
    renderPainelCom();
  } catch(e) {
    const erroEl = document.getElementById('not-erro') || document.querySelector('.bol-erro-publicar');
    if (erroEl) erroEl.textContent = '⚠ Falha ao publicar. Verifique a conexão e tente novamente.';
    else alert('⚠ Falha ao publicar a notícia. Verifique a conexão e tente novamente.');
    console.error('[admin] boletimPublicarNoticia falhou:', e);
  }
}

// ── Recados ───────────────────────────────────────────────────────
async function recadoAdicionar() {
  const titulo    = (document.getElementById('rec-titulo')?.value || '').trim();
  const texto     = (document.getElementById('rec-texto')?.value  || '').trim();
  const destaque  = document.getElementById('rec-destaque')?.checked || false;
  const area      = document.getElementById('rec-area')?.value || '';
  const inicioDias = document.getElementById('rec-inicio')?.value ?? '0';
  const inicioAte = _calcInicioAte(inicioDias);
  const erro      = document.getElementById('rec-erro');
  if (!texto) { if(erro) erro.textContent = 'Escreva o texto do recado.'; return; }
  if(erro) erro.textContent = '';
  const dados = lerRecados();
  dados.itens.unshift({ id: Date.now().toString(36), titulo, texto, destaque, area: area || undefined, inicioAte, ts: Date.now() });
  try {
    await salvarRecados(dados);
    renderPainelCom();
  } catch(e) {
    if (erro) erro.textContent = '⚠ Falha ao salvar. Verifique a conexão e tente novamente.';
    console.error('[admin] recadoAdicionar falhou:', e);
  }
}

async function recadoSalvarEdicao(idx) {
  const novaMod = document.getElementById('rec-edit-modalidade')?.value || 'recado';
  if (novaMod !== 'recado') { await _mudarModalidade('recado', idx, novaMod); return; }
  const dados = lerRecados();
  const item  = dados.itens[idx];
  if (!item) return;
  item.titulo    = (document.getElementById('rec-edit-titulo')?.value || '').trim();
  item.texto     = (document.getElementById('rec-edit-texto')?.value  || '').trim();
  item.destaque  = document.getElementById('rec-edit-destaque')?.checked || false;
  const area     = document.getElementById('rec-edit-area')?.value || '';
  item.area      = area || undefined;
  const inicioDias = document.getElementById('rec-edit-inicio')?.value ?? '0';
  item.inicioAte = _calcInicioAte(inicioDias);
  try {
    await salvarRecados(dados);
    _editRecadoIdx = null;
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao salvar edição. Verifique a conexão e tente novamente.');
    console.error('[admin] recadoSalvarEdicao falhou:', e);
  }
}

async function recadoRemover(idx) {
  if (!confirm('Remover este recado?')) return;
  const dados = lerRecados();
  dados.itens.splice(idx, 1);
  try {
    await salvarRecados(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao remover. Verifique a conexão e tente novamente.');
    console.error('[admin] recadoRemover falhou:', e);
  }
}

async function recadoMover(idx, delta) {
  const dados = lerRecados();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  try {
    await salvarRecados(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao reordenar. Verifique a conexão e tente novamente.');
    console.error('[admin] recadoMover falhou:', e);
  }
}

// ── Dicas — mídia ────────────────────────────────────────────────
let _dicaMidiaCache = {};  // { [prefixo]: dataUrl }

async function dicaHandleImagem(input, prefixo, idUrl) {
  const file = input.files && input.files[0];
  if (!file) return;
  const dataUrl = await comprimirImagem(file, 1200, 0.82);
  _dicaMidiaCache[prefixo] = dataUrl;
  const preview = document.getElementById(`${prefixo}-preview`);
  if (preview) {
    preview.innerHTML = `<div style="margin-top:6px;position:relative;display:inline-block">
      <img src="${dataUrl}" style="max-width:100%;max-height:140px;border-radius:10px;display:block">
      <button type="button" onclick="dicaRemoverImagem('${prefixo}','${idUrl}')"
        style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer;line-height:1">✕</button>
    </div>`;
  }
  const urlInput = document.getElementById(idUrl);
  if (urlInput) urlInput.value = '';
}

function dicaRemoverImagem(prefixo, idUrl) {
  delete _dicaMidiaCache[prefixo];
  const preview = document.getElementById(`${prefixo}-preview`);
  if (preview) preview.innerHTML = '';
  const urlInput = document.getElementById(idUrl);
  if (urlInput) urlInput.value = '';
}

function _lerMidiaDica(prefixo, idUrl) {
  return _dicaMidiaCache[prefixo] || (document.getElementById(idUrl)?.value || '').trim() || undefined;
}

// ── Dicas ─────────────────────────────────────────────────────────
async function dicaAdicionar() {
  const titulo     = (document.getElementById('dic-titulo')?.value  || '').trim();
  const icone      = (document.getElementById('dic-icone')?.value || '').trim() || '💡';
  const texto      = (document.getElementById('dic-texto')?.value  || '').trim();
  const area       = document.getElementById('dic-area')?.value || '';
  const inicioDias = document.getElementById('dic-inicio')?.value ?? '0';
  const inicioAte  = _calcInicioAte(inicioDias);
  const imagem     = _lerMidiaDica('dic-midia', 'dic-midia-url');
  const erro  = document.getElementById('dic-erro');
  if (!texto) { if(erro) erro.textContent = 'Escreva o texto da dica.'; return; }
  if(erro) erro.textContent = '';
  delete _dicaMidiaCache['dic-midia'];
  const dados = lerDicas();
  dados.itens.push({ id: Date.now().toString(36), titulo: titulo || undefined, icone, texto, imagem, area: area || undefined, inicioAte });
  try {
    await salvarDicas(dados);
    renderPainelCom();
  } catch(e) {
    if (erro) erro.textContent = '⚠ Falha ao salvar. Verifique a conexão e tente novamente.';
    console.error('[admin] dicaAdicionar falhou:', e);
  }
}

async function dicaSalvarEdicao(idx) {
  const novaMod = document.getElementById('dic-edit-modalidade')?.value || 'dica';
  if (novaMod !== 'dica') { await _mudarModalidade('dica', idx, novaMod); return; }
  const dados = lerDicas();
  const item  = dados.itens[idx];
  if (!item) return;
  item.titulo  = (document.getElementById('dic-edit-titulo')?.value || '').trim() || undefined;
  item.icone   = (document.getElementById('dic-edit-icone')?.value || '').trim() || item.icone || '💡';
  item.texto   = (document.getElementById('dic-edit-texto')?.value || '').trim();
  const urlEditVal = (document.getElementById('dic-edit-midia-url')?.value || '').trim();
  const previewVazio = !(document.getElementById('dic-edit-midia-preview')?.firstElementChild);
  if (_dicaMidiaCache['dic-edit-midia']) {
    item.imagem = _dicaMidiaCache['dic-edit-midia'];
  } else if (urlEditVal) {
    item.imagem = urlEditVal;
  } else if (previewVazio) {
    item.imagem = undefined;
  }
  delete _dicaMidiaCache['dic-edit-midia'];
  const area   = document.getElementById('dic-edit-area')?.value || '';
  item.area    = area || undefined;
  const inicioDias = document.getElementById('dic-edit-inicio')?.value ?? '0';
  item.inicioAte = _calcInicioAte(inicioDias);
  try {
    await salvarDicas(dados);
    _editDicaIdx = null;
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao salvar edição. Verifique a conexão e tente novamente.');
    console.error('[admin] dicaSalvarEdicao falhou:', e);
  }
}

async function dicaRemover(idx) {
  if (!confirm('Remover esta dica?')) return;
  const dados = lerDicas();
  dados.itens.splice(idx, 1);
  try {
    await salvarDicas(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao remover. Verifique a conexão e tente novamente.');
    console.error('[admin] dicaRemover falhou:', e);
  }
}

async function dicaMover(idx, delta) {
  const dados = lerDicas();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  try {
    await salvarDicas(dados);
    renderPainelCom();
  } catch(e) {
    alert('⚠ Falha ao reordenar. Verifique a conexão e tente novamente.');
    console.error('[admin] dicaMover falhou:', e);
  }
}

function sairCom() {
  sessionStorage.removeItem(CHAVE_SESSAO_COM);
  renderLoginCom();
}

window.addEventListener("DOMContentLoaded", async function () {
  await Promise.all([carregarBoletim(), carregarRecados(), carregarDicas()]);
  if (sessionStorage.getItem(CHAVE_SESSAO_COM) === "1") {
    renderPainelCom();
  } else {
    renderLoginCom();
  }
});

// ── Admin — Galeria de Fotos ──────────────────────────────────────
let _galPendingDataUrls = []; // array de { dataUrl, legenda, reporter }

function renderAbaFotosAdmin() {
  const galeria = lerGaleria();
  const fotos = galeria.itens || [];
  return `
    <div class="boletim-admin">
      <h2 style="font-size:17px;font-weight:800;margin:0 0 4px">📷 Galeria de Fotos</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px">Fotos ficam visíveis na aba Fotos do site de pais e alunos.</p>

      <div class="boletim-form">
        <div class="bol-upload-opcoes">
          <label class="bol-upload-btn" for="gal-file-camera"><span>📸</span> Tirar foto</label>
          <input id="gal-file-camera" type="file" accept="image/*" capture="environment"
                 style="display:none" onchange="galeriaHandleFiles(this)">
          <label class="bol-upload-btn bol-upload-btn-sec" for="gal-file-input"><span>🖼️</span> Da galeria (até 10)</label>
          <input id="gal-file-input" type="file" accept="image/*" multiple
                 style="display:none" onchange="galeriaHandleFiles(this)">
        </div>
        <div id="gal-preview" style="margin-top:10px"></div>
        <input id="gal-legenda"  type="text" placeholder="Legenda comum (opcional)"   class="boletim-input" style="margin-top:8px">
        <input id="gal-reporter" type="text" placeholder="Foto por… (opcional)" class="boletim-input" style="margin-top:4px">
        <button class="boletim-btn-add" style="margin-top:10px" onclick="galeriaAdicionarFotos()">+ Adicionar foto(s)</button>
        <div id="gal-erro" class="erro" style="margin-top:6px"></div>
      </div>

      <div class="bol-lista" style="margin-top:16px">
        ${fotos.length === 0 ? '<p style="color:var(--muted);font-size:13px">Nenhuma foto ainda.</p>' : ''}
        ${fotos.map((f, i) => `
          <div class="bol-item" style="display:flex;gap:12px;align-items:center">
            <img src="${f.dataUrl || f.url || ''}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.legenda || '(sem legenda)'}</div>
              ${f.reporter ? `<div style="font-size:11px;color:var(--muted)">${f.reporter}</div>` : ''}
            </div>
            <button class="bol-item-del" onclick="galeriaRemoverFoto(${i})" title="Remover">✕</button>
          </div>`).join('')}
      </div>
    </div>`;
}

async function galeriaHandleFiles(input) {
  const files = Array.from(input.files || []).slice(0, 10);
  if (!files.length) return;
  const preview = document.getElementById('gal-preview');
  if (preview) preview.innerHTML = '<span style="font-size:12px;color:var(--muted)">⏳ Comprimindo…</span>';
  _galPendingDataUrls = [];
  for (const file of files) {
    const dataUrl = await comprimirImagem(file, 1200, 0.82);
    _galPendingDataUrls.push(dataUrl);
  }
  if (preview) {
    if (_galPendingDataUrls.length === 1) {
      preview.innerHTML = `<img src="${_galPendingDataUrls[0]}" style="max-width:100%;max-height:220px;border-radius:8px;object-fit:cover">`;
    } else {
      preview.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">${
        _galPendingDataUrls.map(u => `<img src="${u}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px">`).join('')
      }</div><div style="font-size:12px;color:var(--muted);margin-top:4px">${_galPendingDataUrls.length} fotos selecionadas</div>`;
    }
  }
}

async function galeriaAdicionarFotos() {
  const err = document.getElementById('gal-erro');
  if (err) err.textContent = '';
  if (!_galPendingDataUrls.length) {
    if (err) err.textContent = 'Selecione ao menos uma foto primeiro.';
    return;
  }
  const legenda  = (document.getElementById('gal-legenda')?.value  || '').trim();
  const reporter = (document.getElementById('gal-reporter')?.value || '').trim();
  try {
    const galeria = await carregarGaleria();
    galeria.itens = galeria.itens || [];
    for (const dataUrl of _galPendingDataUrls) {
      galeria.itens.unshift({ dataUrl, legenda, reporter, ts: Date.now() });
    }
    await salvarGaleria(galeria);
    _galPendingDataUrls = [];
    trocarAbaCom('fotos');
  } catch (e) {
    if (err) err.textContent = 'Erro ao salvar: ' + e.message;
  }
}

async function galeriaRemoverFoto(idx) {
  if (!confirm('Remover esta foto?')) return;
  const galeria = await carregarGaleria();
  galeria.itens = galeria.itens || [];
  galeria.itens.splice(idx, 1);
  await salvarGaleria(galeria);
  trocarAbaCom('fotos');
}

// ── Admin — Shorts ────────────────────────────────────────────────
let _shtPendingBlob = null;

function renderAbaShortsAdmin() {
  const shorts = lerShorts();
  const itens = shorts.itens || [];
  return `
    <div class="boletim-admin">
      <h2 style="font-size:17px;font-weight:800;margin:0 0 4px">▶️ Shorts</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px">Vídeos curtos de até 10 s. São enviados para o Firebase Storage.</p>

      <div class="boletim-form">
        <div class="bol-upload-opcoes">
          <label class="bol-upload-btn bol-upload-btn-vid" for="sht-file-camera"><span>🎥</span> Gravar vídeo</label>
          <input id="sht-file-camera" type="file" accept="video/*" capture="environment"
                 style="display:none" onchange="shortsHandleVideo(this)">
          <label class="bol-upload-btn bol-upload-btn-sec" for="sht-file-input"><span>📁</span> Da galeria</label>
          <input id="sht-file-input" type="file" accept="video/*"
                 style="display:none" onchange="shortsHandleVideo(this)">
        </div>
        <div id="sht-preview" style="margin-top:8px"></div>
        <input id="sht-legenda"  type="text" placeholder="Legenda (opcional)"         class="boletim-input" style="margin-top:8px">
        <input id="sht-reporter" type="text" placeholder="Filmado por… (opcional)"   class="boletim-input" style="margin-top:4px">
        <button class="boletim-btn-add" style="margin-top:10px" onclick="shortsAdicionarVideo()">+ Publicar short</button>
        <div id="sht-progress" style="display:none;font-size:12px;color:var(--muted);text-align:center;margin-top:6px"></div>
        <div id="sht-erro" class="erro" style="margin-top:6px"></div>
      </div>

      <div class="bol-lista" style="margin-top:16px">
        ${itens.length === 0 ? '<p style="color:var(--muted);font-size:13px">Nenhum short ainda.</p>' : ''}
        ${itens.map((s, i) => `
          <div class="bol-item" style="display:flex;gap:12px;align-items:center">
            <video src="${cloudinaryVideoUrl(s.url || '')}" style="width:50px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0"
                   muted preload="metadata"></video>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.legenda || '(sem legenda)'}</div>
              ${s.reporter ? `<div style="font-size:11px;color:var(--muted)">${s.reporter}</div>` : ''}
            </div>
            <button class="bol-item-del" onclick="shortsRemoverVideo(${i})" title="Remover">✕</button>
          </div>`).join('')}
      </div>

      <div style="margin-top:20px;padding:12px;background:var(--card-bg,#f5f5f5);border-radius:10px">
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px">🔧 <b>Restaurar reações antigas:</b> migra reações armazenadas por índice (sistema antigo) para as IDs estáveis dos vídeos.</p>
        <button class="bol-upload-btn bol-upload-btn-sec" style="width:100%" onclick="shortsMigrarReacoes()">↺ Restaurar reações antigas</button>
        <div id="sht-migr-status" style="font-size:12px;margin-top:6px;color:var(--muted)"></div>
      </div>
    </div>`;
}

function shortsHandleVideo(input) {
  const file = input.files[0];
  if (!file) return;
  _shtPendingBlob = file;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('sht-preview');
  if (preview) preview.innerHTML = `
    <video src="${url}" style="max-width:100%;max-height:200px;border-radius:8px" muted controls preload="metadata"></video>
    <p style="font-size:11px;color:var(--muted);margin:4px 0 0">Tamanho: ${(file.size / 1024 / 1024).toFixed(1)} MB</p>`;
}

async function shortsAdicionarVideo() {
  const err      = document.getElementById('sht-erro');
  const progress = document.getElementById('sht-progress');
  if (err) err.textContent = '';
  if (!_shtPendingBlob) {
    if (err) err.textContent = 'Selecione um vídeo primeiro.';
    return;
  }
  const legenda  = (document.getElementById('sht-legenda')?.value  || '').trim();
  const reporter = (document.getElementById('sht-reporter')?.value || '').trim();
  if (progress) { progress.style.display = ''; progress.textContent = '⏳ Enviando vídeo para o servidor…'; }
  try {
    const ext      = _shtPendingBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const filename = `short_${Date.now()}.${ext}`;
    const url      = await uploadVideoStorage(_shtPendingBlob, filename);
    const shorts   = await carregarShorts();
    shorts.itens   = shorts.itens || [];
    shorts.itens.unshift({ id: `sht_${Date.now()}`, url, legenda, reporter, ts: Date.now() });
    await salvarShorts(shorts);
    _shtPendingBlob = null;
    if (progress) progress.style.display = 'none';
    trocarAbaCom('shorts');
  } catch (e) {
    if (progress) progress.style.display = 'none';
    if (err) err.textContent = 'Erro ao publicar: ' + e.message;
  }
}

async function shortsRemoverVideo(idx) {
  if (!confirm('Remover este short?')) return;
  const shorts = await carregarShorts();
  shorts.itens  = shorts.itens || [];
  const item    = shorts.itens[idx];
  shorts.itens.splice(idx, 1);
  await salvarShorts(shorts);
  if (item && item.url) deletarVideoStorage(item.url).catch(() => {});
  trocarAbaCom('shorts');
}

async function shortsMigrarReacoes() {
  const status = document.getElementById('sht-migr-status');
  if (status) status.textContent = '⏳ Lendo dados…';
  try {
    const shorts = lerShorts();
    const itens  = shorts.itens || [];

    // Lê todas as reações do Firebase
    const resp = await fetch('https://torneio-sesi-20de0-default-rtdb.firebaseio.com/reacoes.json');
    const reacoes = resp.ok ? (await resp.json() || {}) : {};

    // Identifica shorts sem id (antigos) e conta quantos têm id (novos)
    const novos = itens.filter(s => !!s.id).length;
    const antigos = itens.map((s, i) => ({ s, i })).filter(({ s }) => !s.id);

    if (antigos.length === 0) {
      if (status) status.textContent = '✅ Nenhum short antigo encontrado. Nada a migrar.';
      return;
    }

    // Mapeamento: short antigo no índice i do array tem chave antiga short_{i - novos}
    const migracoes = [];
    for (const { s, i } of antigos) {
      const chaveAntiga = `short_${i - novos}`;
      const chaveNova   = `short_${s.ts || i}`;
      const dadosAntigos = reacoes[chaveAntiga];
      if (dadosAntigos && chaveAntiga !== chaveNova) {
        migracoes.push({ chaveAntiga, chaveNova, dados: dadosAntigos, legenda: s.legenda || '(sem legenda)' });
      }
    }

    if (migracoes.length === 0) {
      if (status) status.textContent = '✅ Nenhuma reação antiga a migrar (ou já foram migradas).';
      return;
    }

    // Mostra o que será feito e pede confirmação
    const resumo = migracoes.map(m =>
      `"${m.legenda}": ${m.chaveAntiga} → ${m.chaveNova} (${Object.entries(m.dados).map(([k,v]) => `${k}:${v}`).join(', ')})`
    ).join('\n');
    if (!confirm(`Migrar reações?\n\n${resumo}\n\nAs reações antigas serão copiadas para as novas chaves estáveis.`)) {
      if (status) status.textContent = 'Cancelado.';
      return;
    }

    // Aplica a migração: escreve novas chaves e apaga antigas
    let ok = 0;
    for (const m of migracoes) {
      // Mescla com reações existentes na chave nova (se houver)
      const existentes = reacoes[m.chaveNova] || {};
      const merged = {};
      for (const [k, v] of Object.entries({ ...existentes })) merged[k] = v;
      for (const [k, v] of Object.entries(m.dados)) merged[k] = Math.max(merged[k] || 0, v);

      // Salva na chave nova
      await fetch(`https://torneio-sesi-20de0-default-rtdb.firebaseio.com/reacoes/${m.chaveNova}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged)
      });
      // Remove a chave antiga
      await fetch(`https://torneio-sesi-20de0-default-rtdb.firebaseio.com/reacoes/${m.chaveAntiga}.json`, {
        method: 'DELETE'
      });
      ok++;
    }

    if (status) status.textContent = `✅ ${ok} short(s) migrado(s) com sucesso! Recarregue a página para ver as reações restauradas.`;
  } catch (e) {
    if (status) status.textContent = '❌ Erro: ' + e.message;
  }
}
