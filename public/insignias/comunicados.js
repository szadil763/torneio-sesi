// Página pública de comunicados — pais e alunos.
// Sem token, acessível a todos. Dados do Firebase RTDB.

const TORNEIO_INICIO = new Date('2026-10-02T14:50:00-03:00');
const MEET_LINK = 'https://youtu.be/_1NVzpI8ZzI?si=cTbeAmXn5Yg9HAQn';

// Modo de teste: ?teste=65  → contador termina em 65 s a partir de agora
const _testeSecs = (() => { try { return parseInt(new URLSearchParams(location.search).get('teste')) || 0; } catch(_) { return 0; } })();
const _CONTADOR_TARGET = _testeSecs > 0 ? new Date(Date.now() + _testeSecs * 1000) : TORNEIO_INICIO;

// ── Idioma ────────────────────────────────────────────────────────
const STRINGS_COM = {
  pt: {
    titulo_pagina:    'Comunicados',
    subtitulo_pagina: 'Recados, dicas e novidades do torneio para pais e alunos',
    estojos_titulo:   '🏅 Estojos de Insígnias',
    estojos_sub:      'Toque em um estojo para abrir e ver as insígnias conquistadas',
    insignias:        'insígnias',
    dica_insignia:    '💡 Toque em uma insígnia para ver em tamanho grande',
    recados_titulo:   '📢 Recados dos professores',
    recados_vazio:    'Nenhum recado por enquanto.',
    dicas_titulo:     '💡 Dicas para o torneio',
    dicas_vazio:      'Nenhuma dica por enquanto.',
    boletim_titulo:   '📸 Boletim do torneio',
    rodape:           'Atualizado automaticamente · SESI Torneio Infantil 2026',
    andamento:        'TORNEIO EM ANDAMENTO!',
    comeca_em:        'começa em',
    data_evento:      '📅 02 de outubro de 2026 · 14h50',
    dias: 'dias', horas: 'horas', min: 'min', seg: 'seg',
    ao_vivo:          '📺 Assistir abertura ao vivo',
    ao_vivo_btn:      '📺 Abertura ao vivo — YouTube',
    aba_inicio:    'Início',
    aba_insignias: 'Insígnias',
    aba_recados:   'Recados',
    aba_boletim:   'Boletim',
    aba_dicas:     'Dicas',
    aba_noticias:  'Notícias',
    noticias_titulo: '📰 Notícias do torneio',
    noticias_vazio:  'Nenhuma notícia por enquanto.',
    inicio_boas_vindas: 'Bem-vindo ao Torneio!',
    inicio_nav:         'Navegue pelas abas para ver tudo',
    inicio_ultimo_recado: 'Último recado',
    inicio_ver_recados:   'Ver todos os recados →',
    inicio_no_boletim:    'No boletim',
    inicio_ver_boletim:   'Ver boletim →',
    inicio_noticias:      'Últimas notícias',
    inicio_ver_noticias:  'Ver todas as notícias →',
  },
  en: {
    titulo_pagina:    'Updates',
    subtitulo_pagina: 'Messages, tips and news from the tournament for parents and students',
    estojos_titulo:   '🏅 Badge Cases',
    estojos_sub:      'Tap a case to open it and see the earned badges',
    insignias:        'badges',
    dica_insignia:    '💡 Tap a badge to see it full size',
    recados_titulo:   '📢 Teacher messages',
    recados_vazio:    'No messages yet.',
    dicas_titulo:     '💡 Tournament tips',
    dicas_vazio:      'No tips yet.',
    boletim_titulo:   '📸 Tournament Bulletin',
    rodape:           'Auto-updated · SESI Children\'s Tournament 2026',
    andamento:        'TOURNAMENT IN PROGRESS!',
    comeca_em:        'starts in',
    data_evento:      '📅 October 2, 2026 · 2:50 PM',
    dias: 'days', horas: 'hours', min: 'min', seg: 'sec',
    ao_vivo:          '📺 Watch opening ceremony live',
    ao_vivo_btn:      '📺 Live opening — YouTube',
    aba_inicio:    'Home',
    aba_insignias: 'Badges',
    aba_recados:   'Messages',
    aba_boletim:   'Bulletin',
    aba_dicas:     'Tips',
    aba_noticias:  'News',
    noticias_titulo: '📰 Tournament News',
    noticias_vazio:  'No news yet.',
    inicio_boas_vindas: 'Welcome to the Tournament!',
    inicio_nav:         'Use the tabs to explore',
    inicio_ultimo_recado: 'Latest message',
    inicio_ver_recados:   'See all messages →',
    inicio_no_boletim:    'In the bulletin',
    inicio_ver_boletim:   'View bulletin →',
    inicio_noticias:      'Latest news',
    inicio_ver_noticias:  'See all news →',
  }
};

let _langCom = (() => {
  try {
    const s = localStorage.getItem('torneio-lang');
    if (s === 'pt' || s === 'en') return s;
  } catch (_) {}
  return navigator.language && navigator.language.startsWith('pt') ? 'pt' : 'en';
})();

function tc(key) {
  return (STRINGS_COM[_langCom] || STRINGS_COM.pt)[key] || key;
}

function alternarIdiomaCom() {
  _langCom = _langCom === 'pt' ? 'en' : 'pt';
  try { localStorage.setItem('torneio-lang', _langCom); } catch (_) {}
  _estojoAtivoCom = null;
  renderComunicados();
}

let _countdownInterval = null;

// ── Abas ──────────────────────────────────────────────────────────
let _abaAtiva  = 'inicio';
let _dadosCache = null; // { recados, dicas, boletim }

const ABAS_CONFIG = [
  { id: 'inicio',    emoji: '🏠', labelKey: 'aba_inicio'    },
  { id: 'noticias',  emoji: '📰', labelKey: 'aba_noticias'  },
  { id: 'insignias', emoji: '🏅', labelKey: 'aba_insignias' },
  { id: 'recados',   emoji: '📢', labelKey: 'aba_recados'   },
  { id: 'boletim',   emoji: '🎬', labelKey: 'aba_boletim'   },
  { id: 'dicas',     emoji: '💡', labelKey: 'aba_dicas'     },
];

function getMountEl() {
  return document.getElementById('com-content') || document.getElementById('app');
}

function renderTabBar() {
  return `
    <nav class="com-tabs-bar" id="com-tabs-bar" role="tablist">
      <div class="com-tabs-inner">
        ${ABAS_CONFIG.map(aba => `
          <button class="com-tab-btn${_abaAtiva === aba.id ? ' ativo' : ''}"
                  onclick="trocarAba('${aba.id}')"
                  data-aba="${aba.id}"
                  role="tab"
                  aria-selected="${_abaAtiva === aba.id}">
            <span class="com-tab-emoji">${aba.emoji}</span>
            <span class="com-tab-label">${tc(aba.labelKey)}</span>
          </button>`).join('')}
      </div>
    </nav>`;
}

function trocarAba(id) {
  if (!_dadosCache) return;
  _abaAtiva = id;
  _estojoAtivoCom = null;
  _filtroRecados = 'todas';
  _filtroDicas   = 'todas';
  _filtroBoletim = 'todas';

  // Para o countdown se estava rodando e vai sair de Início
  if (id !== 'inicio' && _countdownInterval) {
    clearInterval(_countdownInterval);
    _countdownInterval = null;
  }

  // Atualiza estado visual das abas
  document.querySelectorAll('.com-tab-btn').forEach(btn => {
    const ativo = btn.dataset.aba === id;
    btn.classList.toggle('ativo', ativo);
    btn.setAttribute('aria-selected', ativo);
  });

  // Re-renderiza conteúdo
  const content = document.getElementById('com-content');
  if (content) {
    content.innerHTML = '';
    renderConteudoAba(_dadosCache);
    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderConteudoAba(dados) {
  switch (_abaAtiva) {
    case 'inicio':    renderInicio(dados);             break;
    case 'noticias':  renderNoticias(dados);           break;
    case 'insignias': renderEstojosSection();           break;
    case 'recados':   renderRecados(dados.recados);    break;
    case 'boletim':
      renderBoletimCom(dados.boletim);
      document.querySelectorAll('video:not([data-video-id])').forEach(_monitorarVideo);
      carregarVideosPendentes();
      break;
    case 'dicas':     renderDicas(dados.dicas);        break;
  }
  getMountEl().insertAdjacentHTML('beforeend',
    `<div class="com-rodape">${tc('rodape')}<br><span id="com-stats-visitors" style="font-size:11px;color:var(--muted)"></span></div>`);
}

// ── Aba Início ────────────────────────────────────────────────────
function renderInicio(dados) {
  // Countdown sempre no topo
  renderContadorCom();

  const recados = (dados.recados && dados.recados.itens) || [];
  const boletim = (dados.boletim && dados.boletim.itens) || [];

  // Cards de acesso rápido
  const totalInsignias = (() => {
    try {
      const estado = lerEstadoAreas();
      return TEAMS.reduce((acc, tm) =>
        acc + AREAS.filter(a => conquistouArea(estado, a.id, tm.id)).length, 0);
    } catch (_) { return 0; }
  })();

  const noticias = _coletarNoticias(dados);
  const cards = [
    { id: 'noticias',  emoji: '📰', label: tc('aba_noticias'),  count: `${noticias.length} notícia${noticias.length !== 1 ? 's' : ''}`, cor: '#C2185B' },
    { id: 'insignias', emoji: '🏅', label: tc('aba_insignias'), count: `${totalInsignias} / ${TEAMS.length * AREAS.length} ${tc('insignias')}`, cor: '#004B8D' },
    { id: 'recados',   emoji: '📢', label: tc('aba_recados'),   count: `${recados.length} recado${recados.length !== 1 ? 's' : ''}`, cor: '#F5821F' },
    { id: 'boletim',   emoji: '🎬', label: tc('aba_boletim'),   count: `${boletim.length} item${boletim.length !== 1 ? 's' : ''}`,  cor: '#2E9E4F' },
    { id: 'dicas',     emoji: '💡', label: tc('aba_dicas'),     count: `${((dados.dicas && dados.dicas.itens) || []).length} dica${((dados.dicas && dados.dicas.itens) || []).length !== 1 ? 's' : ''}`, cor: '#7C3AED' },
  ];

  const divCards = document.createElement('div');
  divCards.className = 'com-secao';
  divCards.innerHTML = `
    <div class="com-inicio-cards">
      ${cards.map(c => `
        <button class="com-inicio-card" onclick="trocarAba('${c.id}')" style="--cc:${c.cor}">
          <span class="com-inicio-card-emoji">${c.emoji}</span>
          <span class="com-inicio-card-label">${c.label}</span>
          <span class="com-inicio-card-count">${c.count}</span>
        </button>`).join('')}
    </div>`;
  getMountEl().appendChild(divCards);

  // Preview do último recado visível na Início
  const agora = Date.now();
  const recadoInicio = recados.find(r =>
    r.inicioAte !== -1 && (r.inicioAte === null || r.inicioAte === undefined || agora <= r.inicioAte)
  );
  if (recadoInicio) {
    const ultimo = recadoInicio;
    const texto  = ultimo.texto || '';
    const preview = texto.length > 120 ? texto.substring(0, 120) + '…' : texto;
    const div = document.createElement('div');
    div.className = 'com-secao';
    div.innerHTML = `
      <div class="com-secao-titulo">${tc('inicio_ultimo_recado')}</div>
      <div class="com-recado${ultimo.destaque ? ' com-recado-destaque' : ''} com-recado-clicavel"
           onclick="trocarAba('recados')" role="button" tabindex="0">
        ${ultimo.titulo ? `<div class="com-recado-titulo">${ultimo.titulo}</div>` : ''}
        <div class="com-recado-texto">${preview}</div>
        <div class="com-recado-data">${formatarDataCom(ultimo.ts)}</div>
        <div class="com-inicio-ver-mais">${tc('inicio_ver_recados')}</div>
      </div>`;
    getMountEl().appendChild(div);
  }

  // Notícias — preview da mais recente
  const agora2 = Date.now();
  const noticiaPreview = noticias.find(n =>
    n.inicioAte !== -1 && (n.inicioAte === null || n.inicioAte === undefined || agora2 <= n.inicioAte)
  );
  if (noticiaPreview) {
    const titulo  = noticiaPreview.titulo || noticiaPreview.manchete || '';
    const sub     = noticiaPreview.subtitulo || noticiaPreview.texto || '';
    const preview = sub.length > 100 ? sub.substring(0, 100) + '…' : sub;
    const div = document.createElement('div');
    div.className = 'com-secao';
    div.innerHTML = `
      <div class="com-secao-titulo">${tc('inicio_noticias')}</div>
      <div class="com-noticia-card com-recado-clicavel" onclick="trocarAba('noticias')" role="button" tabindex="0">
        ${noticiaPreview.imagem ? `<img src="${noticiaPreview.imagem}" class="com-noticia-img">` : ''}
        ${titulo ? `<div class="com-noticia-titulo">${titulo}</div>` : ''}
        ${preview ? `<div class="com-noticia-sub">${preview}</div>` : ''}
        <div class="com-inicio-ver-mais">${tc('inicio_ver_noticias')}</div>
      </div>`;
    getMountEl().appendChild(div);
  }

  // Boletim — itens visíveis na Início (sem inicioAte=-1 e dentro do prazo)
  const bolInicio = boletim.filter(b =>
    b.inicioAte !== -1 && (b.inicioAte === null || b.inicioAte === undefined || agora <= b.inicioAte)
  );
  if (bolInicio.length > 0) {
    const div = document.createElement('div');
    div.className = 'com-secao boletim-secao';
    div.innerHTML = `
      <div class="com-secao-titulo">${tc('inicio_no_boletim')}</div>
      <div class="boletim-galeria">${bolInicio.map(_renderBoletimItem).join('')}</div>
      <div class="com-inicio-ver-mais" onclick="trocarAba('boletim')" role="button" style="cursor:pointer">
        ${tc('inicio_ver_boletim')}
      </div>`;
    getMountEl().appendChild(div);
    // Carrega vídeos do Firebase que aparecem no Início
    setTimeout(() => {
      getMountEl().querySelectorAll('video:not([data-video-id])').forEach(_monitorarVideo);
      carregarVideosPendentes();
    }, 0);
  } else if (boletim.length > 0) {
    // Tem itens mas nenhum visível na Início — mostra só o link
    const div = document.createElement('div');
    div.className = 'com-secao';
    div.innerHTML = `
      <div class="com-secao-titulo">${tc('inicio_no_boletim')}</div>
      <button class="com-inicio-boletim-btn" onclick="trocarAba('boletim')">
        <span class="com-inicio-boletim-emoji">🎬</span>
        <div class="com-inicio-boletim-info">
          <div class="com-inicio-boletim-titulo">${boletim.length} item${boletim.length !== 1 ? 's' : ''} no boletim</div>
          <div class="com-inicio-boletim-sub">${tc('inicio_ver_boletim')}</div>
        </div>
        <span class="com-inicio-boletim-arrow">›</span>
      </button>`;
    getMountEl().appendChild(div);
  }
}

// ── Áudio do contador ─────────────────────────────────────────────
let _bipLastSeg   = -1;
let _fimIniciado  = false;
let _audioCtxCom  = null;

// Pré-cria AudioContext na primeira interação do usuário (exigência dos browsers)
function _initAudioCtxCom() {
  if (_audioCtxCom && _audioCtxCom.state !== 'closed') {
    // Já existe — apenas retoma se suspenso
    if (_audioCtxCom.state === 'suspended') _audioCtxCom.resume().catch(() => {});
    return;
  }
  try {
    _audioCtxCom = new (window.AudioContext || window.webkitAudioContext)();
    // Retoma automaticamente se o browser suspender por inatividade
    _audioCtxCom.addEventListener('statechange', () => {
      if (_audioCtxCom.state === 'suspended') _audioCtxCom.resume().catch(() => {});
    });
  } catch(_) {}
  // Esconde o aviso assim que o usuário tocar
  const aviso = document.getElementById('aviso-toque-audio');
  if (aviso) aviso.style.display = 'none';
}
// Re-ativa em qualquer toque para cobrir o caso em que a tela foi desligada
document.addEventListener('touchstart', _initAudioCtxCom, { passive: true });
document.addEventListener('click',      _initAudioCtxCom);

// Retorna o AudioContext garantidamente em estado "running", aguardando resume() se necessário
async function _getAudioCtx() {
  if (!_audioCtxCom || _audioCtxCom.state === 'closed') {
    // Fora de gesto do usuário isso pode falhar — tudo bem, retorna null
    try { _audioCtxCom = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) { return null; }
  }
  if (_audioCtxCom.state === 'suspended') {
    try { await _audioCtxCom.resume(); } catch(_) { return null; }
  }
  return _audioCtxCom.state === 'running' ? _audioCtxCom : null;
}

async function _tocarBipContagem() {
  try {
    const ctx = await _getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.start(t); osc.stop(t + 0.1);
  } catch(_) {}
}

async function _tocarSinalFim(onFim) {
  // Sirene intermitente: 8 pulsos de ~1 s cada (grave→agudo), totalizando ~8 s
  const DURACAO_TOTAL = 8200;
  const NUM_PULSOS = 8;
  const DURACAO_PULSO = DURACAO_TOTAL / NUM_PULSOS; // ~1025 ms por pulso

  let pulsoAtual = 0;

  async function _pulso() {
    if (pulsoAtual >= NUM_PULSOS) { setTimeout(onFim, 100); return; }
    try {
      const ctx = await _getAudioCtx();
      if (!ctx) { setTimeout(onFim, DURACAO_TOTAL - pulsoAtual * DURACAO_PULSO); return; }
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sawtooth';
      const t = ctx.currentTime;
      const duracaoS = DURACAO_PULSO / 1000;
      // sweep grave→agudo em cada pulso (660 Hz → 1320 Hz)
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.linearRampToValueAtTime(1320, t + duracaoS * 0.75);
      // envelope: ataque rápido, sustain, decay
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.40, t + 0.04);
      g.gain.setValueAtTime(0.40, t + duracaoS * 0.70);
      g.gain.linearRampToValueAtTime(0, t + duracaoS * 0.92);
      osc.start(t); osc.stop(t + duracaoS);
    } catch(_) {}
    pulsoAtual++;
    setTimeout(_pulso, DURACAO_PULSO);
  }

  _pulso();
  setTimeout(onFim, DURACAO_TOTAL + 200);
}

function _youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    return u.searchParams.get('v') || '';
  } catch(_) { return ''; }
}

function _ativarSomYoutube() {
  const iframe = document.getElementById('yt-iframe-abertura');
  if (!iframe) return;
  // postMessage para o player do YouTube: desmutar e volume máximo
  const cmd = JSON.stringify({ event: 'command', func: 'unMute',      args: [] });
  const vol  = JSON.stringify({ event: 'command', func: 'setVolume',  args: [100] });
  try { iframe.contentWindow.postMessage(cmd, '*'); } catch(_) {}
  try { iframe.contentWindow.postMessage(vol, '*'); } catch(_) {}
  const btn = document.getElementById('btn-ativar-som');
  if (btn) btn.style.display = 'none';
}

function _mostrarAberturaVideo() {
  const secao = document.getElementById('contador-torneio');
  if (!secao) return;
  const temLink = MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI';
  const videoId = temLink ? _youtubeId(MEET_LINK) : '';

  // autoplay=1 + mute=1 → vídeo inicia automaticamente sem som (browsers sempre permitem)
  // enablejsapi=1 → habilita postMessage para desmutar via botão
  secao.innerHTML = `
    <div class="contador-abertura-overlay">
      <div class="contador-abertura-titulo">🏆 ABERTURA DO TORNEIO!</div>
      <div class="contador-abertura-sub">SESI TORNEIO INFANTIL 2026</div>
      ${videoId
        ? `<div style="position:relative">
             <div class="contador-video-wrap">
               <iframe id="yt-iframe-abertura"
                 src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1"
                 class="contador-video-iframe"
                 frameborder="0"
                 allow="autoplay; fullscreen; picture-in-picture"
                 allowfullscreen></iframe>
             </div>
             <button id="btn-ativar-som" class="btn-ativar-som" onclick="_ativarSomYoutube()">
               🔊 Toque para ativar o som
             </button>
           </div>`
        : `<div class="contador-abertura-link-pendente">📺 Transmissão em breve</div>`}
    </div>`;

  // Confete
  try { dispararConfeteCom('#F5821F'); } catch(_) {}
  try { setTimeout(() => dispararConfeteCom('#004B8D'), 600); } catch(_) {}
}

// ── Contador regressivo ───────────────────────────────────────────
function renderContadorCom() {
  function calcular() {
    const diff = _CONTADOR_TARGET.getTime() - Date.now();
    if (diff <= 0) return null;
    const totalSegs = Math.floor(diff / 1000);
    return {
      dias:    Math.floor(diff / 86400000),
      horas:   Math.floor((diff % 86400000) / 3600000),
      minutos: Math.floor((diff % 3600000)  / 60000),
      segs:    Math.floor((diff % 60000)     / 1000),
      totalSegs,
      ultimoMinuto: totalSegs <= 60,
    };
  }

  const secao = document.createElement('div');
  secao.id = 'contador-torneio';
  secao.className = 'contador-secao';
  secao.innerHTML = `<div id="contador-inner"></div>`;
  getMountEl().appendChild(secao);

  function atualizar() {
    const tempo = calcular();
    const inner = document.getElementById('contador-inner');
    if (!inner) return;

    if (!tempo) {
      if (_fimIniciado) return;
      _fimIniciado = true;
      clearInterval(_countdownInterval);
      _countdownInterval = null;
      inner.innerHTML = `<div class="contador-sinal-fim">🔔 Iniciando abertura…</div>`;
      _tocarSinalFim(_mostrarAberturaVideo);
      return;
    }

    // Bip a cada segundo no último minuto
    if (tempo.ultimoMinuto && tempo.segs !== _bipLastSeg) {
      _bipLastSeg = tempo.segs;
      _tocarBipContagem();
    }

    const corSegs = tempo.ultimoMinuto ? '#D32F2F' : '#F5821F';
    const pulsarClass = tempo.ultimoMinuto ? ' contador-bloco-alerta' : '';

    inner.innerHTML = `
      <div class="contador-titulo">🏆 SESI TORNEIO INFANTIL</div>
      <div class="contador-subtitulo">${tc('comeca_em')}</div>
      ${tempo.ultimoMinuto ? `<div class="contador-alerta-faixa">⚠️ Último minuto!</div>` : ''}
      <div class="contador-numeros">
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.dias).padStart(2,'0')}</span>
          <span class="contador-label">${tc('dias')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.horas).padStart(2,'0')}</span>
          <span class="contador-label">${tc('horas')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.minutos).padStart(2,'0')}</span>
          <span class="contador-label">${tc('min')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco${pulsarClass}" style="--c:${corSegs}">
          <span class="contador-num">${String(tempo.segs).padStart(2,'0')}</span>
          <span class="contador-label">${tc('seg')}</span>
        </div>
      </div>
      <div class="contador-data">${tc('data_evento')}</div>`;
  }

  atualizar();
  if (_countdownInterval) clearInterval(_countdownInterval);
  _countdownInterval = setInterval(atualizar, 1000);
}

// ── Formatação de data ────────────────────────────────────────────
function formatarDataCom(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Estojos de Insígnias ──────────────────────────────────────────
let _estojoAtivoCom = null;

function emblemaLid() {
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

function tocarSomCom(tipo) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (tipo === 'abrir') {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.35);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else if (tipo === 'snap') {
      const freqs = [900, 820, 740, 660];
      freqs.forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.22;
        g.gain.setValueAtTime(0.13, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        o.start(t0); o.stop(t0 + 0.2);
      });
    } else if (tipo === 'completo') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.13;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.25, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
        o.start(t0); o.stop(t0 + 0.4);
      });
    }
  } catch (_) {}
}

function dispararConfeteCom(cor) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d');
  const palette = [cor, '#fff', '#ffd700', cor + 'bb', '#ffaa44'];
  const pcs = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.4 - 40,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * 6 + 1,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.3,
    w: Math.random() * 14 + 6,
    h: Math.random() * 6 + 3,
    cor: palette[Math.floor(Math.random() * palette.length)],
    alpha: 1,
  }));
  let frame = 0;
  (function animar() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    pcs.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.rot += p.vrot;
      if (frame > 90) p.alpha = Math.max(0, p.alpha - 0.012);
      c.save();
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.globalAlpha = p.alpha;
      c.fillStyle = p.cor;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    });
    frame++;
    if (frame < 160) requestAnimationFrame(animar);
    else canvas.remove();
  })();
}

function abrirModalInsigniaCom(areaId, teamId) {
  const area   = AREAS.find(a => a.id === areaId);
  const equipe = TEAMS.find(t => t.id === teamId);
  if (!area || !equipe) return;
  document.getElementById('modal-img-com').src = area.imagem;
  document.getElementById('modal-img-com').alt = 'Insígnia ' + area.nome;
  document.getElementById('modal-nome-com').textContent = area.nome;
  document.getElementById('modal-nome-com').style.color = equipe.cor;
  document.getElementById('modal-equipe-com').textContent = equipe.nome;
  document.getElementById('modal-insignia-com').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function fecharModalCom() {
  document.getElementById('modal-insignia-com').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderEstojoNoContainerCom(equipe, container) {
  const estado   = lerEstadoAreas();
  const ganhas   = AREAS.filter(a => conquistouArea(estado, a.id, equipe.id)).length;
  const completo = ganhas === AREAS.length;
  const BASE_DELAY = 1.65;
  const STEP       = 0.22;

  const slots = AREAS.map((area, i) => {
    const ganhou = conquistouArea(estado, area.id, equipe.id);
    const delay  = (BASE_DELAY + i * STEP).toFixed(2);
    return `
      <div class="slot ${ganhou ? 'conquistada recem-aberta' : ''}" style="--c:${equipe.cor}">
        <div class="slot-label" style="background:${equipe.cor}">${area.nome}</div>
        <div class="slot-corpo">
          ${ganhou
            ? `<div class="badge-3d-wrap recem-conquistada"
                    style="animation-delay:${delay}s;--c:${equipe.cor}"
                    onclick="abrirModalInsigniaCom('${area.id}','${equipe.id}')"
                    title="Toque para ampliar">
                 <img src="${area.imagem}"
                      alt="Insígnia ${area.nome}"
                      class="slot-insignia"
                      onerror="this.closest('.badge-3d-wrap').outerHTML='<div class=\\'slot-fallback\\'>${area.emoji}</div>'">
                 <div class="badge-gloss"></div>
               </div>`
            : `<div class="slot-vazio">
                 <div class="slot-vazio-circulo" style="--c:${equipe.cor}">
                   <span class="slot-vazio-lock">${ICONS.cadeado}</span>
                 </div>
                 <span class="slot-vazio-nome">${area.nome}</span>
               </div>`
          }
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    ${completo ? `<div class="banner-completo" style="--c:${equipe.cor}">⭐ Estojo completo! Parabéns, ${equipe.nome}! ⭐</div>` : ''}
    <div class="case-scene">
      <div class="case-3d">
        <div class="case-base">
          <div class="estojo-topo">
            <span class="equipe-nome-estojo" style="color:${equipe.cor}">${equipe.nome}</span>
          </div>
          <div class="estojo-corpo">${slots}</div>
          <div class="estojo-prog">
            <div class="estojo-prog-fill" style="width:${Math.round(ganhas/AREAS.length*100)}%;background:${equipe.cor}"></div>
          </div>
        </div>
        <div class="case-lid" style="--c:${equipe.cor}; --cd:${equipe.corEscura}">
          <div class="lid-front">
            <div class="lid-emblem">${emblemaLid()}</div>
          </div>
          <div class="lid-back">
            <span class="lid-back-mark">SESI</span>
          </div>
        </div>
      </div>
    </div>
    <p class="rodape-nota alunos-dica" style="margin-bottom:0">${tc('dica_insignia')}</p>`;

  tocarSomCom('abrir');
  if (ganhas > 0) setTimeout(() => tocarSomCom('snap'), BASE_DELAY * 1000);
  if (completo) setTimeout(() => {
    dispararConfeteCom(equipe.cor);
    tocarSomCom('completo');
  }, (BASE_DELAY + AREAS.length * STEP + 0.4) * 1000);
}

function abrirEstojoCom(teamId) {
  const equipe = TEAMS.find(t => t.id === teamId);
  if (!equipe) return;
  const expandWrap = document.getElementById('estojos-expand-com');
  if (!expandWrap) return;

  if (_estojoAtivoCom === teamId) {
    _estojoAtivoCom = null;
    expandWrap.hidden = true;
    expandWrap.innerHTML = '';
    document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
    return;
  }

  _estojoAtivoCom = teamId;
  document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
  const card = document.getElementById('mini-com-' + teamId);
  if (card) card.classList.add('aberto');

  const teamIndex = TEAMS.findIndex(t => t.id === teamId);
  const isLinhaDeСima = teamIndex < 2;
  if (isLinhaDeСima) {
    const rowLastIndex = Math.min(teamIndex % 2 === 0 ? teamIndex + 1 : teamIndex, TEAMS.length - 1);
    const anchorCard = document.getElementById('mini-com-' + TEAMS[rowLastIndex].id);
    if (anchorCard) anchorCard.after(expandWrap);
  } else {
    const gridEl = document.querySelector('.com-secao-estojos .mini-estojos-grid');
    if (gridEl) gridEl.after(expandWrap);
  }

  expandWrap.hidden = false;
  expandWrap.innerHTML = '';
  renderEstojoNoContainerCom(equipe, expandWrap);
  setTimeout(() => expandWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180);
}

function renderEstojosSection() {
  const estado = lerEstadoAreas();
  const secao = document.createElement('div');
  secao.className = 'com-secao com-secao-estojos';
  secao.innerHTML = `
    <div class="com-secao-titulo">${tc('estojos_titulo')}</div>
    <p class="com-estojos-sub">${tc('estojos_sub')}</p>
    <div class="mini-estojos-grid">
      ${TEAMS.map(tm => {
        const n = AREAS.filter(a => conquistouArea(estado, a.id, tm.id)).length;
        return `
          <div class="mini-estojo-card" id="mini-com-${tm.id}"
               onclick="abrirEstojoCom('${tm.id}')"
               style="--c:${tm.cor};--cd:${tm.corEscura}">
            <div class="mini-case-wrap">
              <div class="mini-case-lid"></div>
              <div class="mini-case-base"></div>
              <div class="mini-case-clasp"></div>
            </div>
            <div class="mini-nome">${tm.nome}</div>
            <div class="mini-count">${n} / ${AREAS.length} ${tc('insignias')}</div>
          </div>`;
      }).join('')}
    </div>
    <div id="estojos-expand-com" class="estojos-expand-wrap" hidden></div>`;
  getMountEl().appendChild(secao);
}

// ── Filtro por área ───────────────────────────────────────────────
const _AREAS_FILTRO = [
  { id: 'todas',          label: 'Todas',          emoji: '🔵', cor: '#004B8D' },
  { id: 'robotica',       label: 'Robótica',        emoji: '🤖', cor: '#7C3AED' },
  { id: 'ingles',         label: 'Inglês',          emoji: '🌎', cor: '#2E9E4F' },
  { id: 'artes',          label: 'Artes',           emoji: '🎨', cor: '#E53E3E' },
  { id: 'educacao-fisica',label: 'Ed. Física',      emoji: '⚽', cor: '#F5821F' },
];

let _filtroRecados = 'todas';
let _filtroDicas   = 'todas';
let _filtroBoletim = 'todas';

function _areaNome(id) {
  const a = _AREAS_FILTRO.find(x => x.id === id);
  return a ? `${a.emoji} ${a.label}` : '';
}
function _areaCor(id) {
  const a = _AREAS_FILTRO.find(x => x.id === id);
  return a ? a.cor : '#004B8D';
}

function _renderChips(filtroAtual, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'com-area-chips';
  _AREAS_FILTRO.forEach(area => {
    const btn = document.createElement('button');
    btn.className = 'com-area-chip' + (filtroAtual === area.id ? ' ativo' : '');
    btn.style.setProperty('--chip-cor', area.cor);
    btn.textContent = `${area.emoji} ${area.label}`;
    btn.onclick = () => onChange(area.id);
    wrap.appendChild(btn);
  });
  return wrap;
}

function _filtrarItens(itens, filtro) {
  if (filtro === 'todas') return itens;
  return itens.filter(i => (i.area || '') === filtro);
}

function _badgeArea(item) {
  if (!item.area) return '';
  const cor = _areaCor(item.area);
  return `<span class="com-area-badge" style="background:${cor}">${_areaNome(item.area)}</span>`;
}

// ── Barra de reações emoji ────────────────────────────────────────
function _reacoesBar(itemId) {
  const locais = lerReacoesLocais();
  const btns = EMOJIS_REACAO.map(e => {
    const count = getContagemReacao(itemId, e.key);
    const ativo = !!locais[`${itemId}:${e.key}`];
    return `<button class="com-reacao-btn${ativo ? ' ativo' : ''}"
              onclick="reagirComItem('${itemId}','${e.key}',this)" aria-label="${e.key}">
              ${e.emoji}<span class="com-reacao-count">${count > 0 ? count : ''}</span>
            </button>`;
  }).join('');
  return `<div class="com-reacoes-bar">${btns}</div>`;
}

async function reagirComItem(itemId, emojiKey, btn) {
  const result = await reagirItem(itemId, emojiKey);
  btn.classList.toggle('ativo', result.ativo);
  const countEl = btn.querySelector('.com-reacao-count');
  if (countEl) countEl.textContent = result.contagem > 0 ? result.contagem : '';
  if (result.ativo) {
    btn.classList.add('com-reacao-animando');
    setTimeout(() => btn.classList.remove('com-reacao-animando'), 400);
  }
}

// ── Renderização de recados ───────────────────────────────────────
function renderRecados(recados) {
  const todos  = recados.itens || [];
  const secao  = document.createElement('div');
  secao.className = 'com-secao';

  function desenhar() {
    const itens = _filtrarItens(todos, _filtroRecados);
    secao.innerHTML = `<div class="com-secao-titulo">${tc('recados_titulo')}</div>`;
    secao.appendChild(_renderChips(_filtroRecados, id => {
      _filtroRecados = id;
      desenhar();
    }));
    const lista = document.createElement('div');
    lista.innerHTML = itens.length === 0
      ? `<div class="com-vazio">${tc('recados_vazio')}</div>`
      : itens.map(r => {
          const id = `rec-${r.ts || Math.random().toString(36).slice(2)}`;
          return `
          <div class="com-recado ${r.destaque ? 'com-recado-destaque' : ''}">
            ${_badgeArea(r)}
            ${r.titulo ? `<div class="com-recado-titulo">${r.titulo}</div>` : ''}
            <div class="com-recado-texto">${r.texto}</div>
            <div class="com-recado-data">${formatarDataCom(r.ts)}</div>
            ${_reacoesBar(id)}
          </div>`;
        }).join('');
    secao.appendChild(lista);
  }

  desenhar();
  getMountEl().appendChild(secao);
}

// ── Notícias (dicas com titulo + boletim tipo:noticia) ────────────
function _coletarNoticias(dados) {
  const agora = Date.now();
  const dicasItens = ((dados.dicas && dados.dicas.itens) || [])
    .filter(d => d.titulo)
    .map(d => ({ _fonte: 'dica', titulo: d.titulo, texto: d.texto, imagem: d.imagem, icone: d.icone, area: d.area, inicioAte: d.inicioAte, ts: d.ts || d.id || 0 }));
  const bolItens = ((dados.boletim && dados.boletim.itens) || [])
    .filter(b => b.tipo === 'noticia')
    .map(b => ({ _fonte: 'boletim', titulo: b.manchete, texto: b.subtitulo, imagem: undefined, icone: '📰', area: b.area, inicioAte: b.inicioAte, ts: b.ts || b.id || 0 }));
  return [...dicasItens, ...bolItens].sort((a, b) => (b.ts > a.ts ? 1 : b.ts < a.ts ? -1 : 0));
}

function renderNoticias(dados) {
  const todos = _coletarNoticias(dados);
  const secao = document.createElement('div');
  secao.className = 'com-secao';

  const agora = Date.now();
  const visiveis = todos.filter(n =>
    n.inicioAte !== -1 && (n.inicioAte === null || n.inicioAte === undefined || agora <= n.inicioAte)
  );

  secao.innerHTML = `<div class="com-secao-titulo">${tc('noticias_titulo')}</div>`;
  if (visiveis.length === 0) {
    secao.innerHTML += `<div class="com-vazio">${tc('noticias_vazio')}</div>`;
  } else {
    const lista = document.createElement('div');
    lista.className = 'com-noticias-lista';
    lista.innerHTML = visiveis.map((n, i) => {
      const id = `not-${i}`;
      return `
      <article class="com-noticia-card">
        ${n.imagem ? `<img src="${n.imagem}" class="com-noticia-img">` : ''}
        <div class="com-noticia-body">
          <span class="com-noticia-icone">${n.icone || '📰'}</span>
          ${n.titulo ? `<h3 class="com-noticia-titulo">${n.titulo}</h3>` : ''}
          ${n.texto  ? `<p class="com-noticia-sub">${n.texto}</p>`     : ''}
          ${_reacoesBar(id)}
        </div>
      </article>`;
    }).join('');
    secao.appendChild(lista);
  }

  getMountEl().appendChild(secao);
}

// ── Renderização de dicas ─────────────────────────────────────────
function renderDicas(dicas) {
  const todos = dicas.itens || [];
  const secao = document.createElement('div');
  secao.className = 'com-secao';

  function desenhar() {
    const itens = _filtrarItens(todos, _filtroDicas);
    secao.innerHTML = `<div class="com-secao-titulo">${tc('dicas_titulo')}</div>`;
    secao.appendChild(_renderChips(_filtroDicas, id => {
      _filtroDicas = id;
      desenhar();
    }));
    const lista = document.createElement('div');
    lista.innerHTML = itens.length === 0
      ? `<div class="com-vazio">${tc('dicas_vazio')}</div>`
      : `<div class="com-dicas-lista">
          ${itens.map(d => {
            const id = `dic-${d.ts || Math.random().toString(36).slice(2)}`;
            return `
            <div class="com-dica">
              ${_badgeArea(d)}
              <span class="com-dica-icone">${d.icone || '💡'}</span>
              ${d.titulo ? `<strong style="display:block;font-size:15px;line-height:1.3;margin-bottom:4px">${d.titulo}</strong>` : ''}
              <span class="com-dica-texto">${d.texto}</span>
              ${d.imagem ? `<img src="${d.imagem}" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-top:8px;display:block">` : ''}
              ${_reacoesBar(id)}
            </div>`;
          }).join('')}
        </div>`;
    secao.appendChild(lista);
  }

  desenhar();
  getMountEl().appendChild(secao);
}

// ── Renderização de um item de boletim ───────────────────────────
function _renderBoletimItem(item) {
    const bolId = `bol-${item.ts || Math.random().toString(36).slice(2)}`;
    if (item.tipo === 'noticia') return renderNoticiaCard(item) + _reacoesBar(bolId);
    const tipo = item.videoId ? 'video' : detectarTipoMidia(item.url || '');
    const vid  = tipo === 'youtube' ? youtubeId(item.url) : null;
    const midia = vid
      ? `<div class="bol-video-wrap">
           <iframe src="https://www.youtube.com/embed/${vid}?rel=0" frameborder="0"
             allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
             class="bol-iframe"></iframe>
         </div>`
      : item.videoId
      ? `<div class="bol-video-wrap">
           <video data-video-id="${item.videoId}" controls playsinline class="bol-iframe bol-video-lazy"
             style="background:#111;width:100%;max-height:360px;object-fit:contain"></video>
           <div class="bol-video-carregando" data-for="${item.videoId}">⏳ Carregando vídeo…</div>
         </div>`
      : tipo === 'video'
      ? `<div class="bol-video-wrap">
           <video src="${item.url}" controls playsinline class="bol-iframe"
             style="background:#000;width:100%;max-height:360px;object-fit:contain"></video>
         </div>`
      : `<div class="bol-img-wrap">
           <img src="${item.url}" alt="${item.titulo || 'Foto'}" class="bol-img"
             onerror="this.closest('.bol-img-wrap').innerHTML='<span class=bol-img-erro>Imagem indisponível</span>'">
         </div>`;
    return `
      <div class="bol-card">
        ${midia}
        ${_badgeArea(item)}
        ${item.titulo  ? `<div class="bol-card-titulo">${item.titulo}</div>`   : ''}
        ${item.legenda ? `<div class="bol-card-legenda">${item.legenda}</div>` : ''}
        ${_reacoesBar(bolId)}
      </div>`;
}

// ── Renderização do boletim (aba Boletim) ────────────────────────
function renderBoletimCom(boletim) {
  const todos = boletim.itens || [];
  const secao = document.createElement('div');
  secao.className = 'com-secao boletim-secao';

  function desenhar() {
    const itens = _filtrarItens(todos, _filtroBoletim);
    secao.innerHTML = `<div class="com-secao-titulo">${tc('boletim_titulo')}</div>`;
    secao.appendChild(_renderChips(_filtroBoletim, id => {
      _filtroBoletim = id;
      desenhar();
      secao.querySelectorAll('video:not([data-video-id])').forEach(_monitorarVideo);
      carregarVideosPendentes();
    }));
    const lista = document.createElement('div');
    lista.innerHTML = itens.length === 0
      ? `<div class="com-vazio">Nenhum item no boletim por enquanto.</div>`
      : `<div class="boletim-galeria">${itens.map(_renderBoletimItem).join('')}</div>`;
    secao.appendChild(lista);
  }

  desenhar();
  getMountEl().appendChild(secao);
}

// ── Controle de reprodução ativa ──────────────────────────────────
let _ultimoPlayMs = 0;
const _GRACE_MS = 15_000;

function _videoAtivo() {
  return Date.now() - _ultimoPlayMs < _GRACE_MS;
}

function _monitorarVideo(video) {
  video.addEventListener('timeupdate', () => { _ultimoPlayMs = Date.now(); });
  video.addEventListener('play',    () => { _ultimoPlayMs = Date.now(); });
  video.addEventListener('seeking', () => { _ultimoPlayMs = Date.now(); });
}

async function carregarVideosPendentes() {
  const videos = document.querySelectorAll('video[data-video-id]');
  for (const video of videos) {
    const id = video.dataset.videoId;
    const aviso = document.querySelector(`.bol-video-carregando[data-for="${id}"]`);
    try {
      const blobUrl = await carregarVideoBoletim(id);
      if (blobUrl) {
        video.src = blobUrl;
        video.load();
        _monitorarVideo(video);
        if (aviso) aviso.remove();
      } else {
        if (aviso) aviso.textContent = '⚠ Vídeo indisponível';
      }
    } catch (_) {
      if (aviso) aviso.textContent = '⚠ Vídeo indisponível';
    }
  }
}

// ── Opção B: banner de novo conteúdo ─────────────────────────────
const _ULTIMA_VISITA_KEY = 'torneio-com-ultima-visita';

function _maxTs(dados) {
  const ts = [];
  const recados = (dados.recados && dados.recados.itens) || [];
  const dicas   = (dados.dicas   && dados.dicas.itens)   || [];
  const boletim = (dados.boletim && dados.boletim.itens) || [];
  recados.forEach(r => r.ts && ts.push(r.ts));
  dicas.forEach(d => d.ts && ts.push(d.ts));
  boletim.forEach(b => b.ts && ts.push(b.ts));
  return ts.length ? Math.max(...ts) : 0;
}

function _verificarNovosConteudos(dados) {
  let ultimaVisita = 0;
  try { ultimaVisita = parseInt(localStorage.getItem(_ULTIMA_VISITA_KEY) || '0', 10); } catch (_) {}

  const maxTs = _maxTs(dados);

  // Atualiza timestamp de última visita sempre que a página é carregada
  try { localStorage.setItem(_ULTIMA_VISITA_KEY, String(Date.now())); } catch (_) {}

  // Só mostra banner se há conteúdo mais novo que a última visita registrada
  // e se o usuário já visitou antes (ultimaVisita > 0)
  if (!maxTs || !ultimaVisita || maxTs <= ultimaVisita) return;

  const banner = document.createElement('div');
  banner.id = 'com-novo-banner';
  banner.className = 'com-novo-banner';
  banner.innerHTML = `
    <span class="com-novo-banner-icone">📢</span>
    <span class="com-novo-banner-texto">Novo conteúdo desde sua última visita!</span>
    <button class="com-novo-banner-fechar" onclick="this.closest('#com-novo-banner').remove()" aria-label="Fechar">✕</button>`;
  document.getElementById('app').insertBefore(banner, document.getElementById('app').firstChild);
}

// ── Opção A: notificações Web Push (FCM) ─────────────────────────
const FCM_VAPID_KEY = 'BOLK-rUbBqUG2BHeCStWaqW9ypJN-r0JIUPA4FvXqEjWJX-4G5ccF8bbf05OjOR_iS6eszp_ZVc5Mr22_3ImXrY';
const FCM_SENDER_ID  = 'COLE_O_SENDER_ID_AQUI'; // número, ex: 123456789012
const RTDB_FCM_TOKENS = 'https://torneio-sesi-20de0-default-rtdb.firebaseio.com/fcm-tokens';

async function _registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.warn('[push] SW falhou:', e);
    return null;
  }
}

function _urlBase64ToUint8(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function _obterTokenFCM(reg) {
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8(FCM_VAPID_KEY),
      });
    }
    // Salva no RTDB para o admin enviar notificações
    const uuid = (() => {
      try {
        let u = localStorage.getItem('torneio-visitor-uuid');
        if (!u) { u = crypto.randomUUID(); localStorage.setItem('torneio-visitor-uuid', u); }
        return u;
      } catch (_) { return 'anon'; }
    })();
    const payload = JSON.stringify({
      endpoint:   sub.endpoint,
      p256dh:     btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
      auth:       btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
      ts:         Date.now(),
    });
    await fetch(`${RTDB_FCM_TOKENS}/${uuid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return sub;
  } catch (e) {
    console.warn('[push] token falhou:', e);
    return null;
  }
}

let _pushBtnEl = null;

async function ativarNotificacoes() {
  const btn = _pushBtnEl;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Ativando…'; }

  if (!('Notification' in window)) {
    if (btn) { btn.textContent = '⚠ Não suportado'; btn.disabled = false; }
    return;
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }

  if (perm === 'default') {
    // Chrome "Reduzir pedidos" silenciou o pedido — mostra dica do ícone na barra
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔔 Receber novidades';
    }
    _mostrarDicaChromeQuiet();
    return;
  }

  if (perm !== 'granted') {
    if (btn) { btn.textContent = '🔕 Bloqueado'; btn.disabled = false; }
    location.reload(); // recarrega para mostrar instruções de desbloqueio
    return;
  }

  const reg = await _registrarServiceWorker();
  if (!reg) {
    if (btn) { btn.textContent = '⚠ Erro ao registrar SW'; btn.disabled = false; }
    return;
  }

  const sub = await _obterTokenFCM(reg);
  if (sub) {
    try { localStorage.setItem('torneio-push-ativo', '1'); } catch (_) {}
    if (btn) {
      btn.textContent = '🔔 Notificações ativas';
      btn.classList.add('ativo');
      btn.disabled = false;
    }
  } else {
    if (btn) { btn.textContent = '⚠ Falhou — tente de novo'; btn.disabled = false; }
  }
}

function _mostrarDicaChromeQuiet() {
  // Remove aviso anterior se houver
  document.getElementById('push-quiet-dica')?.remove();
  const wrap = document.getElementById('com-push-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.id = 'push-quiet-dica';
  div.className = 'com-push-bloqueado-card';
  div.style.marginTop = '8px';
  const isMobileQuiet = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  div.innerHTML = `
    <div class="com-push-bloq-titulo">🔔 Quase lá! O Chrome ocultou o pedido</div>
    <p style="font-size:13px;margin:0 0 10px;line-height:1.5">
      O Chrome está configurado para reduzir popups de notificação.
      ${isMobileQuiet
        ? 'Toque no ícone <strong>ⓘ</strong> na barra de endereço → <strong>Permissões</strong> → <strong>Notificações → Permitir</strong> e tente novamente.'
        : 'Procure um <strong>ícone de sino 🔔</strong> no lado direito da barra de endereço e clique em <strong>"Permitir"</strong>.'}
    </p>
    ${isMobileQuiet ? '' : `<p style="font-size:12px;color:var(--muted);margin:0 0 10px">
      Se não aparecer nenhum ícone, cole na barra de endereço:
      <code style="font-size:11px;color:#60a5fa">chrome://settings/content/notifications</code>
      → escolha <strong>"Expandir todos os pedidos"</strong> → volte aqui e tente de novo.
    </p>`}
    <button class="com-push-btn" onclick="this.closest('#push-quiet-dica').remove();ativarNotificacoes()" style="width:100%">
      🔔 Tentar novamente
    </button>`;
  wrap.appendChild(div);
}

function _renderBotaoPush(container) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (FCM_VAPID_KEY === 'COLE_A_VAPID_KEY_PUBLICA_AQUI') return; // não configurado ainda

  const jaAtivo = (() => { try { return localStorage.getItem('torneio-push-ativo') === '1'; } catch(_) { return false; }})();
  const permBloqueado = 'Notification' in window && Notification.permission === 'denied';

  if (permBloqueado) {
    const ua      = navigator.userAgent;
    const isIOS   = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile  = isIOS || isAndroid || ('ontouchstart' in window && screen.width < 768);
    const isSafari  = /^((?!chrome|android).)*safari/i.test(ua);
    const isFF      = ua.includes('Firefox');

    // Gera instruções e ação principal por browser
    let instrucoes, acaoExtra = '';

    if (isIOS) {
      instrucoes = [
        'Abra os <strong>Ajustes</strong> do iPhone/iPad',
        'Role até <strong>Safari</strong> e toque nele',
        'Toque em <strong>Notificações</strong> → ative para este site',
        'Volte aqui e toque em "Já desbloqueei"',
      ];
    } else if (isAndroid) {
      instrucoes = [
        'Toque no ícone <strong>ⓘ</strong> ou <strong>🔒</strong> na barra de endereço',
        'Toque em <strong>Permissões</strong>',
        'Em <strong>Notificações</strong>, escolha <strong>Permitir</strong>',
        'Volte aqui e toque em "Já desbloqueei"',
      ];
    } else if (isSafari) {
      instrucoes = [
        'No menu superior, clique em <strong>Safari → Preferências para este site…</strong>',
        'Mude <strong>Notificações</strong> para <strong>Permitir</strong>',
        'Clique em "Já desbloqueei" abaixo',
      ];
    } else if (isFF) {
      instrucoes = [
        'Clique no <strong>escudo 🛡 ou cadeado 🔒</strong> à esquerda do endereço',
        'Clique em <strong>Permissões</strong>',
        'Em <strong>Receber notificações</strong>, clique em ✕ para remover o bloqueio',
        'Clique em "Já desbloqueei" abaixo',
      ];
    } else {
      // Chrome / Edge desktop
      const settingsUrl = 'chrome://settings/content/notifications';
      instrucoes = [
        'Copie o endereço abaixo, abra uma <strong>nova aba</strong> e cole:',
        'Encontre <strong>torneio-sesi-20de0.web.app</strong> em "Bloqueado"',
        'Clique em <strong>⋮ → Permitir</strong> ao lado do site',
        'Volte aqui e clique em "Já desbloqueei"',
      ];
      acaoExtra = `
        <div class="com-push-bloq-copiar">
          <code id="push-settings-url">${settingsUrl}</code>
          <button class="com-push-bloq-copiar-btn" onclick="
            navigator.clipboard.writeText('${settingsUrl}').then(() => {
              this.textContent = '✓ Copiado!';
              setTimeout(() => this.textContent = '📋 Copiar', 2000);
            }).catch(() => {
              const el = document.getElementById('push-settings-url');
              const r = document.createRange(); r.selectNode(el);
              window.getSelection().removeAllRanges();
              window.getSelection().addRange(r);
            })
          ">📋 Copiar</button>
        </div>`;
    }

    const div = document.createElement('div');
    div.className = 'com-push-bloqueado-card';
    div.innerHTML = `
      <p class="com-push-bloq-convite">Quer ficar atualizado com tudo que rola no torneio? Siga o passo a passo e desbloqueie as notificações 👇</p>
      <div class="com-push-bloq-titulo">🔕 Notificações bloqueadas</div>
      <ol class="com-push-bloq-passos">
        ${instrucoes.map(p => `<li>${p}</li>`).join('')}
      </ol>
      ${acaoExtra}
      <button class="com-push-btn" onclick="location.reload()" style="margin-top:10px;width:100%">
        ✅ Já desbloqueei — Recarregar
      </button>`;
    container.appendChild(div);
    return;
  }

  if (jaAtivo) {
    const btn = document.createElement('button');
    btn.className = 'com-push-btn ativo';
    btn.textContent = '🔔 Notificações ativas';
    btn.onclick = ativarNotificacoes;
    _pushBtnEl = btn;
    container.appendChild(btn);
    return;
  }

  // Convite para ativar notificações
  const card = document.createElement('div');
  card.className = 'com-push-convite';
  card.innerHTML = `
    <span class="com-push-convite-icone">🔔</span>
    <div class="com-push-convite-texto">
      <strong>Quer ficar por dentro de tudo que rola no torneio?</strong>
      <span>Ative as notificações e receba recados, fotos e novidades na hora!</span>
    </div>
    <button class="com-push-convite-btn" id="btn-push-ativar">Ativar</button>`;
  card.querySelector('#btn-push-ativar').onclick = ativarNotificacoes;
  _pushBtnEl = card.querySelector('#btn-push-ativar');
  container.appendChild(card);
}

// ── Página principal ──────────────────────────────────────────────
async function renderComunicados() {
  const app = document.getElementById('app');

  // Estrutura fixa: header + barra de abas + área de conteúdo
  app.innerHTML = `
    <button class="lang-toggle-btn" onclick="alternarIdiomaCom()">
      ${_langCom === 'pt' ? '🇺🇸 EN' : '🇧🇷 PT'}
    </button>
    <div class="com-header">
      <img src="/torneio-sesi.jpg" alt="Torneio Infantil SESI" class="com-header-img">
      <div class="com-logo">
        <span class="com-logo-detalhe"></span>
        SESI TORNEIO INFANTIL
        <span class="com-logo-detalhe"></span>
      </div>
      <h1 class="com-titulo">${tc('titulo_pagina')}</h1>
      <p class="com-subtitulo">${tc('subtitulo_pagina')}</p>
    </div>
    <div id="com-push-wrap"></div>
    ${renderTabBar()}
    <div id="aviso-toque-audio" class="aviso-toque-audio" onclick="this.style.display='none'">
      <span class="aviso-toque-icone">📱</span>
      <span class="aviso-toque-texto">
        <strong>Toque na tela uma vez</strong> para ativar o som e a abertura automática do vídeo ao final da contagem.
      </span>
      <button class="aviso-toque-fechar" aria-label="Fechar">✕</button>
    </div>
    <div id="com-content" class="com-content-area"></div>`;

  _renderBotaoPush(document.getElementById('com-push-wrap'));

  // Carrega reações e registra visita em paralelo com os dados
  const [, recados, dicas, boletim] = await Promise.all([
    carregarInsignias(),
    carregarRecados(),
    carregarDicas(),
    carregarBoletim(),
    carregarTodasReacoes().catch(() => {})
  ]);
  registrarVisita().catch(() => {});

  _dadosCache = { recados, dicas, boletim };
  _verificarNovosConteudos(_dadosCache);
  renderConteudoAba(_dadosCache);

  // Atualiza rodapé com visitantes únicos após carregar stats
  carregarStats().then(stats => {
    const el = document.getElementById('com-stats-visitors');
    if (el && stats['visitantes-unicos']) {
      el.textContent = `🏠 ${stats['visitantes-unicos']} famíl${stats['visitantes-unicos'] === 1 ? 'ia visitou' : 'ias visitaram'}`;
    }
  }).catch(() => {});
}

// ── Auto-refresh a cada 3 min ─────────────────────────────────────
function agendarRefresh() {
  setTimeout(async () => {
    const videos   = Array.from(document.querySelectorAll('video'));
    const domAtivo = videos.some(v => !v.paused && !v.ended);
    const iniciado = videos.some(v => v.currentTime > 0 && !v.ended);
    const ytAtivo  = !!document.querySelector('iframe[src*="youtube"]');
    if (_videoAtivo() || domAtivo || iniciado || ytAtivo) {
      agendarRefresh();
      return;
    }
    _recadosCache    = null;
    _dicasCache      = null;
    _boletimCache    = null;
    _estojoAtivoCom  = null;
    await renderComunicados();
    agendarRefresh();
  }, 180_000);
}

window.addEventListener('DOMContentLoaded', async () => {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-insignia-com" class="modal-overlay hidden" onclick="fecharModalCom()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <button class="modal-fechar" onclick="fecharModalCom()">✕</button>
        <div class="modal-img-wrap">
          <img id="modal-img-com" src="" alt="" class="modal-img-grande">
          <div class="badge-gloss"></div>
        </div>
        <div id="modal-nome-com" class="modal-nome"></div>
        <div id="modal-equipe-com" class="modal-equipe-nome"></div>
      </div>
    </div>
  `);
  await renderComunicados();
  agendarRefresh();
});
