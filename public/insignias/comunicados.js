// Página pública de comunicados — pais e alunos.
// Sem token, acessível a todos. Dados do Firebase RTDB.

const TORNEIO_INICIO = new Date('2026-10-03T08:00:00-03:00');
const MEET_LINK = 'COLE_O_LINK_DO_TEAMS_AQUI';

let _countdownInterval = null;

// ── Contador regressivo ───────────────────────────────────────────
function renderContadorCom() {
  function calcular() {
    const diff = TORNEIO_INICIO.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      dias:    Math.floor(diff / 86400000),
      horas:   Math.floor((diff % 86400000) / 3600000),
      minutos: Math.floor((diff % 3600000)  / 60000),
      segs:    Math.floor((diff % 60000)     / 1000)
    };
  }

  const secao = document.createElement('div');
  secao.id = 'contador-torneio';
  secao.className = 'contador-secao';
  secao.innerHTML = `<div id="contador-inner"></div>`;
  document.getElementById('app').appendChild(secao);

  function atualizar() {
    const tempo = calcular();
    const inner = document.getElementById('contador-inner');
    if (!inner) return;

    if (!tempo) {
      inner.innerHTML = `
        <div class="contador-ao-vivo" style="--c:#F5821F">
          🏆 <span>TORNEIO EM ANDAMENTO!</span>
        </div>
        ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI'
          ? `<a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:#F5821F">📺 Assistir abertura ao vivo</a>`
          : ''}`;
      clearInterval(_countdownInterval);
      return;
    }

    inner.innerHTML = `
      <div class="contador-titulo">🏆 TORNEIO SESI INFANTIL</div>
      <div class="contador-subtitulo">começa em</div>
      <div class="contador-numeros">
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.dias).padStart(2,'0')}</span>
          <span class="contador-label">dias</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.horas).padStart(2,'0')}</span>
          <span class="contador-label">horas</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:#004B8D">
          <span class="contador-num">${String(tempo.minutos).padStart(2,'0')}</span>
          <span class="contador-label">min</span>
        </div>
        <span class="contador-sep">:</span>
        <div class="contador-bloco" style="--c:#F5821F">
          <span class="contador-num">${String(tempo.segs).padStart(2,'0')}</span>
          <span class="contador-label">seg</span>
        </div>
      </div>
      <div class="contador-data">📅 03 de outubro de 2026 · 08h00</div>
      ${MEET_LINK !== 'COLE_O_LINK_DO_TEAMS_AQUI'
        ? `<a href="${MEET_LINK}" target="_blank" class="contador-meet-btn" style="background:#004B8D">📺 Abertura ao vivo — Teams</a>`
        : ''}`;
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
                    style="animation-delay:${delay}s"
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
    <p class="rodape-nota alunos-dica" style="margin-bottom:0">💡 Toque em uma insígnia para ver em tamanho grande</p>`;

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

  // Toggle: clicando no aberto fecha
  if (_estojoAtivoCom === teamId) {
    _estojoAtivoCom = null;
    expandWrap.hidden = true;
    expandWrap.innerHTML = '';
    document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
    return;
  }

  // Troca: fecha anterior, abre novo
  _estojoAtivoCom = teamId;
  document.querySelectorAll('.mini-estojo-card').forEach(c => c.classList.remove('aberto'));
  const card = document.getElementById('mini-com-' + teamId);
  if (card) card.classList.add('aberto');

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
    <div class="com-secao-titulo">🏅 Estojos de Insígnias</div>
    <p class="com-estojos-sub">Toque em um estojo para abrir e ver as insígnias conquistadas</p>
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
            <div class="mini-count">${n} / ${AREAS.length} insígnias</div>
          </div>`;
      }).join('')}
    </div>
    <div id="estojos-expand-com" class="estojos-expand-wrap" hidden></div>`;
  document.getElementById('app').appendChild(secao);
}

// ── Renderização de recados ───────────────────────────────────────
function renderRecados(recados) {
  const itens = recados.itens || [];
  const secao = document.createElement('div');
  secao.className = 'com-secao';
  secao.innerHTML = `
    <div class="com-secao-titulo">📢 Recados dos professores</div>
    ${itens.length === 0
      ? `<div class="com-vazio">Nenhum recado por enquanto.</div>`
      : itens.map(r => `
          <div class="com-recado ${r.destaque ? 'com-recado-destaque' : ''}">
            ${r.titulo ? `<div class="com-recado-titulo">${r.titulo}</div>` : ''}
            <div class="com-recado-texto">${r.texto}</div>
            <div class="com-recado-data">${formatarDataCom(r.ts)}</div>
          </div>`).join('')}`;
  document.getElementById('app').appendChild(secao);
}

// ── Renderização de dicas ─────────────────────────────────────────
function renderDicas(dicas) {
  const itens = dicas.itens || [];
  const secao = document.createElement('div');
  secao.className = 'com-secao';
  secao.innerHTML = `
    <div class="com-secao-titulo">💡 Dicas para o torneio</div>
    ${itens.length === 0
      ? `<div class="com-vazio">Nenhuma dica por enquanto.</div>`
      : `<div class="com-dicas-lista">
          ${itens.map(d => `
            <div class="com-dica">
              <span class="com-dica-icone">${d.icone || '💡'}</span>
              <span class="com-dica-texto">${d.texto}</span>
            </div>`).join('')}
        </div>`}`;
  document.getElementById('app').appendChild(secao);
}

// ── Renderização do boletim ───────────────────────────────────────
function renderBoletimCom(boletim) {
  const itens = boletim.itens || [];
  if (itens.length === 0) return;

  const secao = document.createElement('div');
  secao.className = 'com-secao boletim-secao';
  secao.innerHTML = `
    <div class="com-secao-titulo">📸 Boletim do torneio</div>
    <div class="boletim-galeria">
      ${itens.map(item => {
        if (item.tipo === 'noticia') return renderNoticiaCard(item);
        const tipo = detectarTipoMidia(item.url || '');
        const vid  = tipo === 'youtube' ? youtubeId(item.url) : null;
        const midia = vid
          ? `<div class="bol-video-wrap">
               <iframe src="https://www.youtube.com/embed/${vid}?rel=0" frameborder="0"
                 allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                 class="bol-iframe"></iframe>
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
            ${item.titulo  ? `<div class="bol-card-titulo">${item.titulo}</div>`   : ''}
            ${item.legenda ? `<div class="bol-card-legenda">${item.legenda}</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
  document.getElementById('app').appendChild(secao);
}

// ── Página principal ──────────────────────────────────────────────
async function renderComunicados() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="com-header">
      <div class="com-logo">
        <span class="com-logo-detalhe"></span>
        SESI TORNEIO INFANTIL
        <span class="com-logo-detalhe"></span>
      </div>
      <h1 class="com-titulo">Comunicados</h1>
      <p class="com-subtitulo">Recados, dicas e novidades do torneio para pais e alunos</p>
    </div>`;

  // Contador
  renderContadorCom();

  // Estojos
  renderEstojosSection();

  // Carrega dados do Firebase em paralelo
  const [recados, dicas, boletim] = await Promise.all([
    carregarRecados(),
    carregarDicas(),
    carregarBoletim()
  ]);

  renderRecados(recados);
  renderDicas(dicas);
  renderBoletimCom(boletim);

  app.insertAdjacentHTML('beforeend', `
    <div class="com-rodape">
      Atualizado automaticamente · SESI Torneio Infantil 2026
    </div>`);
}

// ── Auto-refresh a cada 60 s ──────────────────────────────────────
function agendarRefresh() {
  setTimeout(async () => {
    _recadosCache = null;
    _dicasCache   = null;
    _boletimCache = null;
    _estojoAtivoCom = null;
    await renderComunicados();
    agendarRefresh();
  }, 60000);
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
