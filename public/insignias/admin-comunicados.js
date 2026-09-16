// Painel de Gerenciamento de Comunicados — Boletim, Recados e Dicas.

const CHAVE_SESSAO_COM = "torneio-insignias-areas:admin-ok"; // compartilha PIN com admin-areas

function renderLoginCom() {
  const app = document.getElementById("admin-app");
  app.innerHTML = `
    <div class="pin-caixa">
      <div class="marca">Gerenciamento de Comunicados</div>
      <h2 class="titulo-principal">Digite o PIN</h2>
      <input id="campo-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••">
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

function trocarAbaCom(aba) { abaComAtiva = aba; renderPainelCom(); }

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
      <button class="admin-aba ${abaComAtiva === 'boletim'      ? 'ativa' : ''}" onclick="trocarAbaCom('boletim')">📸 Boletim</button>
      <button class="admin-aba ${abaComAtiva === 'comunicados'  ? 'ativa' : ''}" onclick="trocarAbaCom('comunicados')">📢 Recados e Dicas</button>
    </div>

    ${abaComAtiva === 'boletim' ? renderAbaBoletimCom(boletim) : renderAbaComunicadosCom()}

    <p class="rodape-nota">
      <a href="/hub.html" style="color:var(--muted);text-decoration:none">← Painel principal</a>
    </p>
  `;
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
let _pendingMedia = null; // { dataUrl, tipo: 'imagem'|'video' }

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
                ? `<video src="${_pendingMedia.dataUrl}" class="bol-pending-preview" muted playsinline controls preload="metadata"></video>`
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

          ${_pendingMedia
            ? `<button class="boletim-btn-add" onclick="boletimConfirmarPendente()">✅ Adicionar ao boletim</button>`
            : `<button class="boletim-btn-add" onclick="boletimAdicionar()">+ Adicionar por link</button>`}

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
            Descreva o momento — a IA gera manchete, parágrafos e citação. Adicione até 3 fotos.
          </p>
          <textarea id="not-descricao" class="boletim-input boletim-textarea"
            placeholder="Ex: A equipe verde venceu o desafio de robótica..." rows="3"></textarea>
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
        ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum item ainda.</p>`
        : `<div class="boletim-lista-admin">
            ${itens.map((item, i) => {
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
                    <strong class="bol-item-titulo">${tituloExibido}</strong>
                    <span class="bol-item-legenda">${item.legenda || item.subtitulo || ''}</span>
                  </div>
                  <div class="bol-item-acoes">
                    ${i > 0               ? `<button class="bol-btn-ord" onclick="boletimMover(${i},-1)">↑</button>` : ''}
                    ${i < itens.length-1  ? `<button class="bol-btn-ord" onclick="boletimMover(${i},+1)">↓</button>` : ''}
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
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0 8px;cursor:pointer">
        <input type="checkbox" id="rec-destaque"> Destacar este recado (laranja)
      </label>
      <button class="boletim-btn-add" onclick="recadoAdicionar()">📢 Publicar recado</button>
    </div>
    <div id="rec-erro" class="erro" style="margin-top:8px"></div>
    ${itens.length === 0
      ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhum recado ainda.</p>`
      : `<div class="boletim-lista-admin" style="margin-top:16px">
          ${itens.map((item, i) => `
            <div class="bol-item-admin">
              <div class="bol-item-info" style="flex:1">
                <strong class="bol-item-titulo">${item.titulo || '(sem título)'}</strong>
                <span class="bol-item-legenda" style="white-space:pre-line;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.texto}</span>
              </div>
              <div class="bol-item-acoes">
                ${i > 0              ? `<button class="bol-btn-ord" onclick="recadoMover(${i},-1)">↑</button>` : ''}
                ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="recadoMover(${i},+1)">↓</button>` : ''}
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
      <div style="display:flex;gap:8px">
        <input id="dic-icone" type="text" placeholder="💡" class="boletim-input" style="width:70px;text-align:center;font-size:20px;flex-shrink:0">
        <input id="dic-texto" type="text" placeholder="Texto da dica" class="boletim-input" style="flex:1">
      </div>
      <button class="boletim-btn-add" onclick="dicaAdicionar()">+ Adicionar dica</button>
    </div>
    <div id="dic-erro" class="erro" style="margin-top:8px"></div>
    ${itens.length === 0
      ? `<p style="color:var(--muted);font-size:14px;margin-top:24px;text-align:center">Nenhuma dica ainda.</p>`
      : `<div class="boletim-lista-admin" style="margin-top:16px">
          ${itens.map((item, i) => `
            <div class="bol-item-admin">
              <div style="font-size:24px;flex-shrink:0">${item.icone || '💡'}</div>
              <div class="bol-item-info" style="flex:1">
                <span class="bol-item-titulo">${item.texto}</span>
              </div>
              <div class="bol-item-acoes">
                ${i > 0              ? `<button class="bol-btn-ord" onclick="dicaMover(${i},-1)">↑</button>` : ''}
                ${i < itens.length-1 ? `<button class="bol-btn-ord" onclick="dicaMover(${i},+1)">↓</button>` : ''}
                <button class="bol-btn-rem" onclick="dicaRemover(${i})">🗑</button>
              </div>
            </div>`).join('')}
        </div>`}`;
}

function comTrocarSubAba(sub) { comSubAba = sub; renderPainelCom(); }

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
// Reproduz o vídeo em velocidade normal (necessário para captura de áudio correta).
function _comprimirVideo(file, meta, onProgress) {
  return new Promise((resolve, reject) => {
    const MAX_W = 640;
    const scale = Math.min(1, MAX_W / (meta.w || MAX_W));
    const w = Math.max(2, Math.round((meta.w || MAX_W) * scale));
    const h = Math.max(2, Math.round((meta.h || 360) * scale));

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true; // sem auto-play com som
    video.preload = 'auto';

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']
      .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';

    video.oncanplaythrough = () => {
      const videoStream = canvas.captureStream(24);

      // Adiciona áudio se possível
      let combinedStream = videoStream;
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaElementSource(video);
        const audioDest = audioCtx.createMediaStreamDestination();
        src.connect(audioDest);
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioDest.stream.getAudioTracks()
        ]);
      } catch (_) { /* sem áudio — continua só com vídeo */ }

      const recOpts = { videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 };
      if (mimeType) recOpts.mimeType = mimeType;
      const recorder = new MediaRecorder(combinedStream, recOpts);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
      };
      recorder.onerror = reject;

      recorder.start(200);
      video.muted = false;
      video.play().catch(() => {});

      let frameId;
      const draw = () => {
        if (video.ended || video.paused) return;
        ctx.drawImage(video, 0, 0, w, h);
        if (onProgress && meta.duration) onProgress(video.currentTime / meta.duration);
        frameId = requestAnimationFrame(draw);
      };
      video.onplay  = () => { frameId = requestAnimationFrame(draw); };
      video.onended = () => { cancelAnimationFrame(frameId); recorder.stop(); };
      video.onerror = reject;
    };

    video.onerror = reject;
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

  // Comprime o vídeo para ~10–15 MB (640px, 700 kbps)
  _avisoComp(`
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">
      ⚙️ Comprimindo vídeo — aguarde…
      <span id="bol-comp-pct" style="font-weight:700">0%</span>
    </div>
    <div style="height:5px;background:var(--card-line);border-radius:999px;overflow:hidden">
      <div id="bol-comp-fill" style="height:100%;background:#2F8FE0;width:0%;transition:width .4s"></div>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:4px">
      O vídeo é reproduzido internamente para compressão — leva até ${Math.ceil(meta.duration)}s.
    </div>`);

  let blob;
  try {
    blob = await _comprimirVideo(file, meta, pct => {
      const fill = document.getElementById('bol-comp-fill');
      const txt  = document.getElementById('bol-comp-pct');
      if (fill) fill.style.width = Math.round(pct * 100) + '%';
      if (txt)  txt.textContent  = Math.round(pct * 100) + '%';
    });
  } catch (e) {
    // Fallback: lê o arquivo original sem compressão
    console.warn('Compressão falhou, usando arquivo original:', e);
    _avisoComp('⏳ Carregando vídeo original…');
    blob = file;
  }

  _avisoComp('⏳ Preparando pré-visualização…');
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(blob);
  });

  _pendingMedia = { dataUrl, tipo: 'video' };
  renderPainelCom();
}

async function boletimConfirmarPendente() {
  if (!_pendingMedia) return;
  const titulo  = (document.getElementById('bol-titulo')?.value  || '').trim();
  const legenda = (document.getElementById('bol-legenda')?.value || '').trim();
  const dados = lerBoletim();
  dados.itens.unshift({
    id: Date.now().toString(36),
    tipo: _pendingMedia.tipo,
    url: _pendingMedia.dataUrl,
    titulo,
    legenda,
    ts: Date.now()
  });
  await salvarBoletim(dados);
  _pendingMedia = null;
  renderPainelCom();
}

function boletimCancelarPendente() {
  _pendingMedia = null;
  renderPainelCom();
}

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
  renderPainelCom();
}

async function boletimRemover(idx) {
  if (!confirm('Remover este item do boletim?')) return;
  const dados = lerBoletim();
  dados.itens.splice(idx, 1);
  await salvarBoletim(dados);
  renderPainelCom();
}

async function boletimMover(idx, delta) {
  const dados = lerBoletim();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  await salvarBoletim(dados);
  renderPainelCom();
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

  const reporters = ['Ana Paula Ferreira','Carlos Eduardo Lima','Juliana Mendes','Roberto Souza','Mariana Costa'];
  const reporter  = pick(reporters);

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
  const descricao = (document.getElementById('not-descricao')?.value || '').trim();
  const fotoUrl   = (document.getElementById('not-foto')?.value    || '').trim();
  const erro      = document.getElementById('not-erro');
  const preview   = document.getElementById('not-preview');

  if (!descricao) { if(erro) erro.textContent = 'Descreva o momento antes de gerar.'; return; }
  if(erro) erro.textContent = '';

  const noticia = gerarNoticia(descricao);
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
  renderPainelCom();
}

// ── Recados ───────────────────────────────────────────────────────
async function recadoAdicionar() {
  const titulo   = (document.getElementById('rec-titulo')?.value || '').trim();
  const texto    = (document.getElementById('rec-texto')?.value  || '').trim();
  const destaque = document.getElementById('rec-destaque')?.checked || false;
  const erro     = document.getElementById('rec-erro');
  if (!texto) { if(erro) erro.textContent = 'Escreva o texto do recado.'; return; }
  if(erro) erro.textContent = '';
  const dados = lerRecados();
  dados.itens.unshift({ id: Date.now().toString(36), titulo, texto, destaque, ts: Date.now() });
  await salvarRecados(dados);
  renderPainelCom();
}

async function recadoRemover(idx) {
  if (!confirm('Remover este recado?')) return;
  const dados = lerRecados();
  dados.itens.splice(idx, 1);
  await salvarRecados(dados);
  renderPainelCom();
}

async function recadoMover(idx, delta) {
  const dados = lerRecados();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  await salvarRecados(dados);
  renderPainelCom();
}

// ── Dicas ─────────────────────────────────────────────────────────
async function dicaAdicionar() {
  const icone = (document.getElementById('dic-icone')?.value || '').trim() || '💡';
  const texto = (document.getElementById('dic-texto')?.value  || '').trim();
  const erro  = document.getElementById('dic-erro');
  if (!texto) { if(erro) erro.textContent = 'Escreva o texto da dica.'; return; }
  if(erro) erro.textContent = '';
  const dados = lerDicas();
  dados.itens.push({ id: Date.now().toString(36), icone, texto });
  await salvarDicas(dados);
  renderPainelCom();
}

async function dicaRemover(idx) {
  if (!confirm('Remover esta dica?')) return;
  const dados = lerDicas();
  dados.itens.splice(idx, 1);
  await salvarDicas(dados);
  renderPainelCom();
}

async function dicaMover(idx, delta) {
  const dados = lerDicas();
  const novo  = idx + delta;
  if (novo < 0 || novo >= dados.itens.length) return;
  [dados.itens[idx], dados.itens[novo]] = [dados.itens[novo], dados.itens[idx]];
  await salvarDicas(dados);
  renderPainelCom();
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
