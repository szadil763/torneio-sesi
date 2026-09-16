// Página de alunos e pais — Insígnias por Área.
// Acesso controlado por token de equipe na URL (?t=TOKEN).
// A animação completa do estojo (tampa + insígnias encaixando) acontece SEMPRE.

// ── Idioma ────────────────────────────────────────────────────────
const STRINGS = {
  pt: {
    torneio_titulo:       'TORNEIO SESI INFANTIL',
    torneio_comeca_em:    'começa em',
    torneio_andamento:    'TORNEIO EM ANDAMENTO!',
    torneio_ao_vivo:      '📺 Assistir abertura ao vivo',
    torneio_ao_vivo_btn:  '📺 Abertura ao vivo — Teams',
    torneio_data:         '📅 03 de outubro de 2026 · 08h00',
    dias:   'dias',
    horas:  'horas',
    min:    'min',
    seg:    'seg',
    estojos_titulo:       'Estojos de Insígnias',
    estojos_subtitulo:    'Toque em uma turma para abrir o estojo',
    toque_para_abrir:     'Toque para abrir',
    estojo_completo:      '⭐ Estojo completo! Parabéns,',
    dica_insignia:        '💡 Toque em uma insígnia para ver em tamanho grande',
    boletim_titulo:       '📸 Boletim do Torneio',
    boletim_pt_note:      '',
    img_indisponivel:     'Imagem indisponível',
  },
  en: {
    torneio_titulo:       'SESI CHILDREN\'S TOURNAMENT',
    torneio_comeca_em:    'starts in',
    torneio_andamento:    'TOURNAMENT IN PROGRESS!',
    torneio_ao_vivo:      '📺 Watch opening ceremony live',
    torneio_ao_vivo_btn:  '📺 Live opening — Teams',
    torneio_data:         '📅 October 3, 2026 · 8:00 AM',
    dias:   'days',
    horas:  'hours',
    min:    'min',
    seg:    'sec',
    estojos_titulo:       'Badge Cases',
    estojos_subtitulo:    'Tap a class to open the case',
    toque_para_abrir:     'Tap to open',
    estojo_completo:      '⭐ Case complete! Congrats,',
    dica_insignia:        '💡 Tap a badge to see it full size',
    boletim_titulo:       '📸 Tournament Bulletin',
    boletim_pt_note:      '<p style="font-size:11px;color:var(--muted);margin:4px 0 12px;text-align:center">Content written in Portuguese by teachers</p>',
    img_indisponivel:     'Image unavailable',
  }
};

let _lang = (() => {
  try {
    const saved = localStorage.getItem('torneio-lang');
    if (saved === 'pt' || saved === 'en') return saved;
  } catch (_) {}
  return navigator.language && navigator.language.startsWith('pt') ? 'pt' : 'en';
})();

function t(key) {
  return (STRINGS[_lang] || STRINGS.pt)[key] || key;
}

function alternarIdioma() {
  _lang = _lang === 'pt' ? 'en' : 'pt';
  try { localStorage.setItem('torneio-lang', _lang); } catch (_) {}
  _estojoAtivoId = null;
  renderPaginaEstojos();
}

// ── Configuração do torneio ───────────────────────────────────────
// Data de início: 03/10/2026 às 08h00 (horário de Brasília)
const TORNEIO_INICIO = new Date('2026-10-03T08:00:00-03:00');
// Link da abertura ao vivo (Microsoft Teams) — atualize aqui quando tiver o link:
const MEET_LINK = 'COLE_O_LINK_DO_TEAMS_AQUI';

// ── Contador regressivo ───────────────────────────────────────────
let _countdownInterval = null;

function renderContador(equipe) {
  const cor = equipe.cor;

  function calcular() {
    const agora = Date.now();
    const diff  = TORNEIO_INICIO.getTime() - agora;
    if (diff <= 0) return null;
    const dias    = Math.floor(diff / 86400000);
    const horas   = Math.floor((diff % 86400000) / 3600000);
    const minutos = Math.floor((diff % 3600000)  / 60000);
    const segs    = Math.floor((diff % 60000)     / 1000);
    return { dias, horas, minutos, segs };
  }

  const secao = document.createElement('div');
  secao.id = 'contador-torneio';
  secao.className = 'contador-secao';

  function atualizar() {
    const tempo = calcular();
    const inner = document.getElementById('contador-inner');
    if (!inner) return;

    if (!tempo) {
      inner.innerHTML = `
        <div class="contador-ao-vivo" style="--c:${cor}">
          🏆 <span>${t('torneio_andamento')}</span>
        </div>
        ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI' ? `
        <a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:${cor}">
          ${t('torneio_ao_vivo')}
        </a>` : ''}`;
      clearInterval(_countdownInterval);
      return;
    }

    inner.innerHTML = `
      <div class="contador-titulo">🏆 ${t('torneio_titulo')}</div>
      <div class="contador-subtitulo">${t('torneio_comeca_em')}</div>
      <div class="contador-numeros">
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.dias).padStart(2,'0')}</span>
          <span class="contador-label">${t('dias')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.horas).padStart(2,'0')}</span>
          <span class="contador-label">${t('horas')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.minutos).padStart(2,'0')}</span>
          <span class="contador-label">${t('min')}</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.segs).padStart(2,'0')}</span>
          <span class="contador-label">${t('seg')}</span>
        </div>
      </div>
      <div class="contador-data">${t('torneio_data')}</div>
      ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI' ? `
      <a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:${cor}">
        ${t('torneio_ao_vivo_btn')}
      </a>` : ''}`;
  }

  secao.innerHTML = `<div id="contador-inner"></div>`;
  document.getElementById('app').prepend(secao);
  atualizar();
  if (_countdownInterval) clearInterval(_countdownInterval);
  _countdownInterval = setInterval(atualizar, 1000);
}

// ── Controle de acesso (mantido apenas para compatibilidade com links antigos) ──
function resolverEquipePorToken() {
  const params = new URLSearchParams(location.search);
  const token  = params.get('t');
  if (!token) return null;
  return TEAMS.find(t => t.token === token) || null;
}

// ── SVG emblema da tampa ──────────────────────────────────────────
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

// ── Sons ──────────────────────────────────────────────────────────
function tocarSom(tipo) {
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

// ── Confete ───────────────────────────────────────────────────────
function dispararConfete(cor) {
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

// ── Copiar link da turma ──────────────────────────────────────────
// ── Modal da insígnia ─────────────────────────────────────────────
function abrirModalInsignia(areaId, teamId) {
  const area   = AREAS.find(a => a.id === areaId);
  const equipe = TEAMS.find(t => t.id === teamId);
  if (!area || !equipe) return;
  document.getElementById('modal-img').src = area.imagem;
  document.getElementById('modal-img').alt = 'Insígnia ' + area.nome;
  document.getElementById('modal-nome').textContent = area.nome;
  document.getElementById('modal-nome').style.color = equipe.cor;
  document.getElementById('modal-equipe').textContent = equipe.nome;
  document.getElementById('modal-insignia').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function fecharModal() {
  document.getElementById('modal-insignia').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Renderiza o estojo aberto dentro de um container ─────────────
function renderEstojoNoContainer(equipe, container) {
  const estado   = lerEstadoAreas();
  const areas    = AREAS.filter(a => conquistouArea(estado, a.id, equipe.id)).length;
  const completo = areas === AREAS.length;

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
                    onclick="abrirModalInsignia('${area.id}','${equipe.id}')"
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
    ${completo ? `<div class="banner-completo" style="--c:${equipe.cor}">${t('estojo_completo')} ${equipe.nome}! ⭐</div>` : ''}
    <div class="case-scene">
      <div class="case-3d">
        <div class="case-base">
          <div class="estojo-topo">
            <span class="equipe-nome-estojo" style="color:${equipe.cor}">${equipe.nome}</span>
          </div>
          <div class="estojo-corpo">${slots}</div>
          <div class="estojo-prog">
            <div class="estojo-prog-fill" style="width:${Math.round(areas/AREAS.length*100)}%;background:${equipe.cor}"></div>
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
    <p class="rodape-nota alunos-dica" style="margin-bottom:0">${t('dica_insignia')}</p>`;

  tocarSom('abrir');
  if (areas > 0) setTimeout(() => tocarSom('snap'), BASE_DELAY * 1000);
  if (completo) setTimeout(() => {
    dispararConfete(equipe.cor);
    tocarSom('completo');
  }, (BASE_DELAY + AREAS.length * STEP + 0.4) * 1000);
}

// ── Controla abertura/fechamento — um estojo de cada vez ─────────
let _estojoAtivoId = null;

function abrirEstojo(teamId) {
  const equipe = TEAMS.find(t => t.id === teamId);
  if (!equipe) return;
  const expandWrap = document.getElementById('estojos-expand');
  if (!expandWrap) return;

  if (_estojoAtivoId === teamId) {
    _estojoAtivoId = null;
    expandWrap.hidden = true;
    expandWrap.innerHTML = '';
    document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
    return;
  }

  _estojoAtivoId = teamId;
  document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
  const card = document.getElementById('mini-' + teamId);
  if (card) card.classList.add('aberto');

  expandWrap.hidden = false;
  expandWrap.innerHTML = '';
  renderEstojoNoContainer(equipe, expandWrap);
  setTimeout(() => expandWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180);
}

// ── Página principal com todos os estojos ─────────────────────────
function renderPaginaEstojos() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Botão de idioma fixo no topo
  const langBtn = document.createElement('button');
  langBtn.className = 'lang-toggle-btn';
  langBtn.onclick = alternarIdioma;
  langBtn.innerHTML = _lang === 'pt'
    ? '🇺🇸 EN'
    : '🇧🇷 PT';
  app.appendChild(langBtn);

  // Contador regressivo com cor SESI
  renderContador({ cor: '#004B8D' });

  const estado = lerEstadoAreas();
  app.insertAdjacentHTML('beforeend', `
    <div class="alunos-hero">
      <div class="alunos-hero-icon">🏅</div>
      <h1 style="font-family:'Baloo 2',sans-serif;font-weight:900;font-size:22px;margin:0 0 4px">${t('estojos_titulo')}</h1>
      <p style="font-size:13px;color:var(--muted);margin:0">${t('estojos_subtitulo')}</p>
    </div>
    <div class="mini-estojos-grid" style="max-width:480px;margin-inline:auto;width:100%">
      ${TEAMS.map(tm => {
        const n = AREAS.filter(a => conquistouArea(estado, a.id, tm.id)).length;
        return `
          <div class="mini-estojo-card" id="mini-${tm.id}"
               onclick="abrirEstojo('${tm.id}')"
               style="--c:${tm.cor};--cd:${tm.corEscura}">
            <div class="mini-case-wrap">
              <div class="mini-case-lid"></div>
              <div class="mini-case-base"></div>
              <div class="mini-case-clasp"></div>
            </div>
            <div class="mini-nome">${tm.nome}</div>
            <div class="mini-count">${n} / ${AREAS.length} ${_lang === 'pt' ? 'insígnias' : 'badges'}</div>
          </div>`;
      }).join('')}
    </div>
    <div id="estojos-expand" class="estojos-expand-wrap" hidden></div>`);

  // Boletim abaixo dos estojos
  const boletim = lerBoletim();
  if (boletim.itens && boletim.itens.length > 0) {
    const secao = document.createElement('div');
    secao.className = 'boletim-secao';
    secao.style.marginTop = '36px';
    secao.innerHTML = `
      <h2 class="boletim-titulo">${t('boletim_titulo')}</h2>
      ${t('boletim_pt_note')}
      <div class="boletim-galeria">
        ${boletim.itens.map(item => {
          if (item.tipo === 'noticia') return renderNoticiaCard(item);
          const tipo = item.videoId ? 'video' : detectarTipoMidia(item.url || '');
          const vid  = tipo === 'youtube' ? youtubeId(item.url) : null;
          const imgErrLabel = t('img_indisponivel');
          const midia = vid
            ? `<div class="bol-video-wrap">
                 <iframe src="https://www.youtube.com/embed/${vid}?rel=0" frameborder="0" allowfullscreen
                         allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                         class="bol-iframe"></iframe>
               </div>`
            : item.videoId
            ? `<div class="bol-video-wrap">
                 <video data-video-id="${item.videoId}" controls playsinline class="bol-iframe bol-video-lazy"
                   style="background:#111;width:100%;max-height:360px;object-fit:contain">
                   <source src="" type="video/webm">
                 </video>
                 <div class="bol-video-carregando" data-for="${item.videoId}">⏳ Carregando vídeo…</div>
               </div>`
            : tipo === 'video'
            ? `<div class="bol-video-wrap">
                 <video src="${item.url}" controls playsinline class="bol-iframe"
                   style="background:#000;width:100%;max-height:360px;object-fit:contain"></video>
               </div>`
            : `<div class="bol-img-wrap">
                 <img src="${item.url}" alt="${item.titulo || 'Foto'}" class="bol-img"
                      onerror="this.closest('.bol-img-wrap').innerHTML='<span class=bol-img-erro>${imgErrLabel}</span>'">
               </div>`;
          return `
            <div class="bol-card">
              ${midia}
              ${item.titulo  ? `<div class="bol-card-titulo">${item.titulo}</div>`   : ''}
              ${item.legenda ? `<div class="bol-card-legenda">${item.legenda}</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
    app.appendChild(secao);
    carregarVideosPendentesAlunos();
  }
}

async function carregarVideosPendentesAlunos() {
  const videos = document.querySelectorAll('video[data-video-id]');
  for (const video of videos) {
    const id = video.dataset.videoId;
    const aviso = document.querySelector(`.bol-video-carregando[data-for="${id}"]`);
    try {
      const dataUrl = await carregarVideoBoletim(id);
      if (dataUrl) {
        video.src = dataUrl;
        video.load();
      } else {
        if (aviso) aviso.textContent = '⚠ Vídeo indisponível';
      }
    } catch (_) {
      if (aviso) aviso.textContent = '⚠ Vídeo indisponível';
    }
    if (aviso && video.src && video.src !== location.href) aviso.remove();
  }
}

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  // Modal vive no body (fora do #app) para sobreviver ao re-render
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-insignia" class="modal-overlay hidden" onclick="fecharModal()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <button class="modal-fechar" onclick="fecharModal()">✕</button>
        <div class="modal-img-wrap">
          <img id="modal-img" src="" alt="" class="modal-img-grande">
          <div class="badge-gloss"></div>
        </div>
        <div id="modal-nome" class="modal-nome"></div>
        <div id="modal-equipe" class="modal-equipe-nome"></div>
      </div>
    </div>
  `);

  Promise.all([carregarInsignias(), carregarBoletim()]).then(() => renderPaginaEstojos());
});
