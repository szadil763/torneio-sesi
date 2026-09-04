// Ranking das equipes por número de insígnias conquistadas.

const MEDALHAS = ['🥇', '🥈', '🥉', '🏅'];

function renderRanking() {
  const app    = document.getElementById('app');
  const estado = lerEstadoAreas();

  const ranking = TEAMS.map(t => ({
    ...t,
    total: AREAS.filter(a => conquistouArea(estado, a.id, t.id)).length,
    areas: AREAS.map(a => ({ ...a, conquistou: conquistouArea(estado, a.id, t.id) })),
  })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

  const lider = ranking[0].total;

  app.innerHTML = `
    <div class="topbar">
      <a href="areas.html" class="voltar" style="text-decoration:none">← Estojos</a>
      <a href="/hub.html"  class="voltar" style="text-decoration:none;margin-left:auto">⬅ Painel</a>
    </div>
    <div class="marca">SESI · Torneio Infantil</div>
    <h1 class="titulo-principal">🏆 Ranking de Insígnias</h1>
    <p class="subtitulo">Equipes ordenadas pelo número de insígnias conquistadas.</p>

    <div class="ranking-lista">
      ${ranking.map((t, i) => {
        const pos   = i + 1;
        const pct   = lider > 0 ? Math.round((t.total / AREAS.length) * 100) : 0;
        const empate = i > 0 && ranking[i - 1].total === t.total;
        return `
          <div class="ranking-card ${pos === 1 ? 'rank-lider' : ''}"
               style="--c:${t.cor};--cd:${t.corEscura}">
            <div class="rank-pos">${empate ? '·' : MEDALHAS[i] || pos + 'º'}</div>
            <div class="rank-info">
              <div class="rank-nome" style="color:${t.cor}">${t.nome}</div>
              <div class="rank-barra">
                <div class="rank-barra-fill" style="width:${pct}%;background:${t.cor}"></div>
              </div>
              <div class="rank-areas">
                ${t.areas.map(a => `
                  <span class="rank-area-chip ${a.conquistou ? 'sim' : 'nao'}"
                        style="${a.conquistou ? `background:${t.cor}22;border-color:${t.cor};color:${t.cor}` : ''}">
                    ${a.emoji} ${a.nome}
                  </span>`).join('')}
              </div>
            </div>
            <div class="rank-total">
              <span class="rank-num">${t.total}</span>
              <span class="rank-de">/${AREAS.length}</span>
            </div>
          </div>`;
      }).join('')}
    </div>

    <p class="rodape-nota" style="margin-top:32px">
      Atualizado em tempo real a partir do localStorage do dispositivo do professor.
    </p>`;
}

window.addEventListener('DOMContentLoaded', renderRanking);
