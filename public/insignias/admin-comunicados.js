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
          <div class="bol-upload-opcoes">
            <label class="bol-upload-btn" for="bol-file-camera"><span>📸</span> Tirar foto agora</label>
            <input id="bol-file-camera" type="file" accept="image/*" capture="environment" style="display:none" onchange="boletimHandleFile(this)">
            <label class="bol-upload-btn bol-upload-btn-sec" for="bol-file-input"><span>🖼️</span> Foto da galeria</label>
            <input id="bol-file-input" type="file" accept="image/*" style="display:none" onchange="boletimHandleFile(this)">
            <label class="bol-upload-btn bol-upload-btn-vid" for="bol-file-video"><span>📹</span> Enviar vídeo</label>
            <input id="bol-file-video" type="file" accept="video/*" style="display:none" onchange="boletimHandleVideo(this)">
          </div>
          <div id="bol-video-aviso" style="display:none;font-size:12px;color:var(--muted);margin-top:6px;text-align:center">
            ⏳ Carregando vídeo…
          </div>
          <div class="bol-separador"><span>ou cole um link</span></div>
          <input id="bol-url"     type="url"  placeholder="Link da foto ou vídeo do YouTube" class="boletim-input">
          <input id="bol-titulo"  type="text" placeholder="Título (opcional)"                class="boletim-input">
          <input id="bol-legenda" type="text" placeholder="Legenda (opcional)"               class="boletim-input">
          <button class="boletim-btn-add" onclick="boletimAdicionar()">+ Adicionar por link</button>
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
  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), tipo: 'imagem', url: dataUrl, titulo: '', legenda: '', ts: Date.now() });
  await salvarBoletim(dados);
  renderPainelCom();
}

async function boletimHandleVideo(input) {
  const file = input.files[0];
  if (!file) return;
  const MAX_MB = 50;
  if (file.size > MAX_MB * 1024 * 1024) {
    alert(`Vídeo muito grande (${(file.size/1024/1024).toFixed(0)} MB). Limite: ${MAX_MB} MB.\nPara vídeos maiores, envie para o YouTube e cole o link.`);
    input.value = '';
    return;
  }
  const aviso = document.getElementById('bol-video-aviso');
  if (aviso) aviso.style.display = 'block';
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
  const dados = lerBoletim();
  dados.itens.unshift({ id: Date.now().toString(36), tipo: 'video', url: dataUrl, titulo: '', legenda: '', ts: Date.now() });
  await salvarBoletim(dados);
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
