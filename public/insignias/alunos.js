// Página de alunos e pais — Insígnias por Área.
// Acesso controlado por token de equipe na URL (?t=TOKEN).
// A animação completa do estojo (tampa + insígnias encaixando) acontece SEMPRE.

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
          🏆 <span>TORNEIO EM ANDAMENTO!</span>
        </div>
        ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI' ? `
        <a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:${cor}">
          📺 Assistir abertura ao vivo
        </a>` : ''}`;
      clearInterval(_countdownInterval);
      return;
    }

    inner.innerHTML = `
      <div class="contador-titulo">🏆 TORNEIO SESI INFANTIL</div>
      <div class="contador-subtitulo">começa em</div>
      <div class="contador-numeros">
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.dias).padStart(2,'0')}</span>
          <span class="contador-label">dias</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.horas).padStart(2,'0')}</span>
          <span class="contador-label">horas</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.minutos).padStart(2,'0')}</span>
          <span class="contador-label">min</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:${cor}">
          <span class="contador-num">${String(tempo.segs).padStart(2,'0')}</span>
          <span class="contador-label">seg</span>
        </div>
      </div>
      <div class="contador-data">📅 03 de outubro de 2026 · 08h00</div>
      ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI' ? `
      <a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:${cor}">
        📺 Abertura ao vivo — Teams
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
                    style="animation-delay:${delay}s"
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
    ${completo ? `<div class="banner-completo" style="--c:${equipe.cor}">⭐ Estojo completo! Parabéns, ${equipe.nome}! ⭐</div>` : ''}
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
    <p class="rodape-nota alunos-dica" style="margin-bottom:0">💡 Toque em uma insígnia para ver em tamanho grande</p>`;

  tocarSom('abrir');
  if (areas > 0) setTimeout(() => tocarSom('snap'), BASE_DELAY * 1000);
  if (completo) setTimeout(() => {
    dispararConfete(equipe.cor);
    tocarSom('completo');
  }, (BASE_DELAY + AREAS.length * STEP + 0.4) * 1000);
}

// ── Controla abertura/fechamento individual de cada estojo ────────
const _estojoAberto = {};

function abrirEstojo(teamId) {
  const equipe = TEAMS.find(t => t.id === teamId);
  if (!equipe) return;

  const btn  = document.getElementById('btn-' + teamId);
  const wrap = document.getElementById('wrap-' + teamId);
  if (!btn || !wrap) return;

  if (!wrap.hidden) {
    wrap.hidden = true;
    btn.classList.remove('aberto');
    return;
  }

  btn.classList.add('aberto');
  wrap.hidden = false;

  // Renderiza o estojo apenas na primeira abertura
  if (!_estojoAberto[teamId]) {
    _estojoAberto[teamId] = true;
    renderEstojoNoContainer(equipe, wrap);
  }
}

// ── Página principal com todos os estojos ─────────────────────────
function renderPaginaEstojos() {
  const app = document.getElementById('app');

  // Contador regressivo com cor SESI
  renderContador({ cor: '#004B8D' });

  app.insertAdjacentHTML('beforeend', `
    <div class="alunos-hero">
      <div class="alunos-hero-icon">🏅</div>
      <h1 style="font-family:'Baloo 2',sans-serif;font-weight:900;font-size:22px;margin:0 0 4px">Estojos de Insígnias</h1>
      <p style="font-size:13px;color:var(--muted);margin:0">Toque em uma turma para abrir o estojo</p>
    </div>
    <div class="equipes-grade">
      ${TEAMS.map(t => `
        <div class="equipe-secao" id="sec-${t.id}">
          <button class="equipe-abrir-btn" id="btn-${t.id}"
                  onclick="abrirEstojo('${t.id}')"
                  style="--c:${t.cor}">
            <span class="equipe-bolinha"></span>
            <span class="equipe-btn-nome">${t.nome}</span>
            <span class="equipe-abrir-hint">Toque para abrir</span>
            <span class="equipe-abrir-icone">▼</span>
          </button>
          <div class="equipe-estojo-wrap" id="wrap-${t.id}" hidden></div>
        </div>`).join('')}
    </div>`);

  // Boletim abaixo dos estojos
  const boletim = lerBoletim();
  if (boletim.itens && boletim.itens.length > 0) {
    const secao = document.createElement('div');
    secao.className = 'boletim-secao';
    secao.style.marginTop = '36px';
    secao.innerHTML = `
      <h2 class="boletim-titulo">📸 Boletim do Torneio</h2>
      <div class="boletim-galeria">
        ${boletim.itens.map(item => {
          if (item.tipo === 'noticia') return renderNoticiaCard(item);
          const tipo = detectarTipoMidia(item.url || '');
          const vid  = tipo === 'youtube' ? youtubeId(item.url) : null;
          const midia = vid
            ? `<div class="bol-video-wrap">
                 <iframe src="https://www.youtube.com/embed/${vid}?rel=0" frameborder="0" allowfullscreen
                         allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                         class="bol-iframe"></iframe>
               </div>`
            : `<div class="bol-img-wrap">
                 <img src="${item.url}" alt="${item.titulo || 'Foto'}" class="bol-img"
                      onerror="this.closest('.bol-img-wrap').innerHTML='<span class=bol-img-erro>Imagem indisponível</span>'">
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
  }
}

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
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

  carregarBoletim().then(() => renderPaginaEstojos());
});
