// Página pública — Insígnias por Área.
// Cada equipe tem seu estojo com 4 slots (um por área).
// Ao abrir o estojo: tampa 3D se abre e insígnias encaixam nos slots.

// ── SVG emblema da tampa ───────────────────────────────────────────
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

// ── Sons via Web Audio API ────────────────────────────────────────
function tocarSom(tipo) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (tipo === 'abrir') {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.35);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else if (tipo === 'snap') {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.14, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(); osc.stop(ctx.currentTime + 0.22);
    } else if (tipo === 'completo') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.13;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        o.start(t0); o.stop(t0 + 0.38);
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
  const palette = [cor, '#fff', '#ffd700', cor + 'bb', '#ffaa44', '#ffffff88'];
  const pcs = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.35 - 30,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * 5 + 1,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.25,
    w: Math.random() * 11 + 5,
    h: Math.random() * 5 + 3,
    cor: palette[Math.floor(Math.random() * palette.length)],
    alpha: 1,
  }));
  let frame = 0;
  (function animar() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    pcs.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.13; p.rot += p.vrot;
      if (frame > 85) p.alpha = Math.max(0, p.alpha - 0.014);
      c.save();
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.globalAlpha = p.alpha;
      c.fillStyle = p.cor;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    });
    frame++;
    if (frame < 145) requestAnimationFrame(animar);
    else canvas.remove();
  })();
}

// ── Modal de insígnia ─────────────────────────────────────────────
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

// ── Chave "vistos" ────────────────────────────────────────────────
function chaveVistosEquipe(teamId)          { return `torneio-insignias-areas:vistos:${teamId}`; }
function marcarVistosEquipe(teamId, ids)    { localStorage.setItem(chaveVistosEquipe(teamId), JSON.stringify(ids)); }
function idsJaVistosEquipe(teamId) {
  try { return JSON.parse(localStorage.getItem(chaveVistosEquipe(teamId)) || '[]'); }
  catch { return []; }
}

function totalConquistadoEquipe(estado, teamId) {
  return AREAS.filter(a => conquistouArea(estado, a.id, teamId)).length;
}

// ── Tela inicial ──────────────────────────────────────────────────
function renderHome() {
  const app    = document.getElementById('app');
  const estado = lerEstadoAreas();

  app.innerHTML = `
    <div class="marca">SESI · Torneio Infantil — Insígnias por Área</div>
    <h1 class="titulo-principal">Estojo de Insígnias</h1>
    <p class="subtitulo">Toque na sua equipe para abrir o estojo e ver as insígnias conquistadas.</p>

    <div class="grade-equipes-btn">
      ${TEAMS.map(t => {
        const total   = totalConquistadoEquipe(estado, t.id);
        const pct     = Math.round((total / AREAS.length) * 100);
        const completo = total === AREAS.length;
        const slots   = AREAS.map(a => {
          const ganhou = conquistouArea(estado, a.id, t.id);
          return `<span class="mini-slot ${ganhou ? 'conquistado' : ''}"
                        style="${ganhou ? `background:${t.cor}28;border-color:${t.cor}` : ''}">
                    ${ganhou ? `<img src="${a.imagem}" class="mini-img"
                                     onerror="this.outerHTML='${a.emoji}'">` : '🔒'}
                  </span>`;
        }).join('');
        return `
          <button class="equipe-btn ${completo ? 'completo' : ''}"
                  style="--c:${t.cor}; --cd:${t.corEscura}"
                  onclick="location.hash='#/equipe/${t.id}'">
            <div class="equipe-btn-topo" style="background:linear-gradient(135deg,${t.cor},${t.corEscura})">
              <span class="equipe-btn-nome">${completo ? '⭐ ' : ''}${t.nome}</span>
              <span class="equipe-btn-badge">${total}/${AREAS.length}</span>
            </div>
            <div class="equipe-btn-slots">${slots}</div>
            <div class="prog-bar"><div class="prog-bar-fill" style="width:${pct}%;background:${t.cor}"></div></div>
            <div class="equipe-btn-cta">${completo ? '🎉 Estojo completo!' : 'Abrir estojo →'}</div>
          </button>`;
      }).join('')}
    </div>

    <div class="home-links">
      <a href="/insignias/ranking.html" class="link-sec">🏆 Ver ranking</a>
      <a href="/hub.html" class="link-sec">⬅ Painel</a>
    </div>`;
}

// ── Estojo da equipe ──────────────────────────────────────────────
function renderEstojoEquipe(teamId) {
  const equipe = TEAMS.find(t => t.id === teamId);
  const app    = document.getElementById('app');
  if (!equipe) { location.hash = '#/'; return; }

  const estado          = lerEstadoAreas();
  const vistosAntes     = new Set(idsJaVistosEquipe(teamId));
  const conquistadasAgora = AREAS.filter(a => conquistouArea(estado, a.id, teamId)).map(a => a.id);
  const total           = conquistadasAgora.length;
  const completo        = total === AREAS.length;
  const eraCompleto     = vistosAntes.size === AREAS.length;
  const ficouCompleto   = completo && !eraCompleto;
  const temNovas        = conquistadasAgora.some(id => !vistosAntes.has(id));

  const slots = AREAS.map(area => {
    const ganhou = conquistouArea(estado, area.id, teamId);
    const nova   = ganhou && !vistosAntes.has(area.id);
    return `
      <div class="slot ${ganhou ? 'conquistada' : ''} ${nova ? 'recem-aberta' : ''}"
           style="--c:${equipe.cor}">
        <div class="slot-label" style="background:${equipe.cor}">${area.nome}</div>
        <div class="slot-corpo">
          ${ganhou
            ? `<div class="badge-3d-wrap ${nova ? 'recem-conquistada' : ''}"
                    onclick="abrirModalInsignia('${area.id}','${teamId}')"
                    title="Ver insígnia ampliada">
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

  app.innerHTML = `
    <div class="topbar">
      <button class="voltar" onclick="location.hash='#/'">← Equipes</button>
      <a href="/hub.html" class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>

    ${completo ? `<div class="banner-completo" style="--c:${equipe.cor}">
      ⭐ Estojo completo! Parabéns, ${equipe.nome}! ⭐
    </div>` : ''}

    <div class="case-scene">
      <div class="case-3d">
        <div class="case-base">
          <div class="estojo-topo">
            <span class="equipe-nome-estojo" style="color:${equipe.cor}">${equipe.nome}</span>
            <span class="contagem-badge">${total}/${AREAS.length}</span>
          </div>
          <div class="estojo-corpo">${slots}</div>
          <div class="estojo-prog">
            <div class="estojo-prog-fill" style="width:${Math.round(total/AREAS.length*100)}%;background:${equipe.cor}"></div>
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

    <p class="rodape-nota">Toque em uma insígnia para ampliar · As insígnias são liberadas pelo professor.</p>`;

  marcarVistosEquipe(teamId, conquistadasAgora);

  // Sons e celebração
  setTimeout(() => tocarSom('abrir'), 500);
  if (temNovas && !ficouCompleto) setTimeout(() => tocarSom('snap'), 1900);
  if (ficouCompleto) {
    setTimeout(() => {
      dispararConfete(equipe.cor);
      tocarSom('completo');
    }, 2000);
  }
}

// ── Roteador ──────────────────────────────────────────────────────
function rotear() {
  const partes = location.hash.replace(/^#\//, '').split('/');
  if (partes[0] === 'equipe' && partes[1]) renderEstojoEquipe(partes[1]);
  else renderHome();
}

window.addEventListener('hashchange', rotear);
window.addEventListener('DOMContentLoaded', function () {
  // Injeta modal no body
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
  rotear();
});
