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
    // Invalida caches para forçar re-fetch
    _recadosCache = null;
    _dicasCache   = null;
    _boletimCache = null;
    await renderComunicados();
    agendarRefresh();
  }, 60000);
}

window.addEventListener('DOMContentLoaded', async () => {
  await renderComunicados();
  agendarRefresh();
});
