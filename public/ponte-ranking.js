// Ranking ao vivo — Ponte de Da Vinci (página pública standalone)

const TEAMS = [
  { id: "1A", label: "1º A", color: "#D92B2B" },
  { id: "1B", label: "1º B", color: "#004B8D" },
  { id: "1C", label: "1º C", color: "#2E9E4F" },
  { id: "1D", label: "1º D", color: "#F0B800", dark: true },
];
const ROUNDS = [1, 2, 3, 4];
const RTDB   = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com";

// ── Firebase REST helpers ─────────────────────────────────────
async function dbGet(key) {
  try {
    const r = await fetch(`${RTDB}/${encodeURIComponent(key)}.json`);
    if (!r.ok) return null;
    const v = await r.json();
    return v === null ? null : v;
  } catch { return null; }
}

// ── Keys (mirroring App.jsx) ──────────────────────────────────
function ponteKey(round, teamId)     { return `ponte_r${round}_${teamId}`; }
function ponteLiveKey(round, teamId) { return `ponte_live_r${round}_${teamId}`; }

// ── Formatting ────────────────────────────────────────────────
function fmtTime(sec) {
  if (sec === null || sec === undefined) return "—";
  return sec.toFixed(1) + "s";
}
function fmtElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return m > 0 ? `${m}:${s}` : `${sec.toFixed(1)}s`;
}

// ── Scoring (lower time = better) ────────────────────────────
function rankPoints(items) {
  const present = items.filter(it => it.value !== null && it.value !== undefined);
  if (!present.length) return {};
  const sorted = [...present].sort((a, b) => a.value - b.value);
  const pts = [4, 3, 2, 1];
  const result = {};
  let lastVal = null, lastPts = null;
  sorted.forEach((it, idx) => {
    const p = (lastVal !== null && it.value === lastVal)
      ? lastPts
      : (pts[idx] !== undefined ? pts[idx] : 1);
    result[it.team] = p;
    lastVal = it.value; lastPts = p;
  });
  return result;
}

// ── State ─────────────────────────────────────────────────────
let _data    = {};
let _live    = {};   // { "1_1A": { running, startTs }, ... }
let _estado  = "aguardando";
let _comt    = "";
let _recorde = null;
let _prevRecordeTs = undefined;
let _celebrando    = false;
let _celebTimer    = null;
let _liveTimerRaf  = null;  // requestAnimationFrame handle
let _pollInterval  = null;

// ── Live timer loop ───────────────────────────────────────────
function startLiveTimer() {
  if (_liveTimerRaf) return;
  function tick() {
    const hasLive = Object.keys(_live).length > 0;
    if (!hasLive) { _liveTimerRaf = null; return; }
    renderLiveSection();
    _liveTimerRaf = requestAnimationFrame(tick);
  }
  _liveTimerRaf = requestAnimationFrame(tick);
}
function stopLiveTimer() {
  if (_liveTimerRaf) { cancelAnimationFrame(_liveTimerRaf); _liveTimerRaf = null; }
}

// ── Poll ──────────────────────────────────────────────────────
async function poll() {
  const roundPromises = [];
  for (const r of ROUNDS) {
    for (const t of TEAMS) {
      roundPromises.push(
        dbGet(ponteKey(r, t.id)).then(v => ({ type: "data", key: ponteKey(r, t.id), v })),
        dbGet(ponteLiveKey(r, t.id)).then(v => ({ type: "live", key: `${r}_${t.id}`, v })),
      );
    }
  }

  const [meta, roundResults] = await Promise.all([
    Promise.all([
      dbGet("ponte_estado"),
      dbGet("ponte_comentario"),
      dbGet("ponte_recorde"),
    ]),
    Promise.all(roundPromises),
  ]);

  const [est, comt, rec] = meta;
  _estado = est ?? "aguardando";
  _comt   = typeof comt === "string" ? comt : "";

  const newData = {}, newLive = {};
  for (const { type, key, v } of roundResults) {
    if (type === "live") { if (v) newLive[key] = v; }
    else                 { if (v) newData[key] = v; }
  }
  _data = newData;
  _live = newLive;

  if (rec?.ts && rec.ts !== _prevRecordeTs) {
    if (_prevRecordeTs !== undefined) {
      _celebrando = true;
      clearTimeout(_celebTimer);
      _celebTimer = setTimeout(() => { _celebrando = false; render(); }, 5000);
    }
    _prevRecordeTs = rec.ts;
  }
  _recorde = rec ?? null;

  // Adjust poll frequency — faster when live
  const isLive = Object.keys(_live).length > 0;
  const targetInterval = isLive ? 2000 : 4000;
  if (_pollInterval && _pollInterval.__interval !== targetInterval) {
    clearInterval(_pollInterval.__id);
    _pollInterval.__id = setInterval(poll, targetInterval);
    _pollInterval.__interval = targetInterval;
  }

  if (isLive) startLiveTimer(); else stopLiveTimer();

  render();
}

// ── Compute round results ─────────────────────────────────────
function computeRounds() {
  return ROUNDS.map(r => {
    const items = TEAMS.map(t => {
      const v = _data[ponteKey(r, t.id)];
      return { team: t.id, tempo: v?.tempo ?? null, carga: v?.carga ?? null };
    });
    const complete = items.every(it => it.tempo !== null && it.carga !== null);
    const hasAny   = items.some(it => it.tempo !== null || it.carga !== null);
    let tempoPts = {}, cargaPts = {};
    if (hasAny) {
      const comTempo = items.filter(it => it.tempo !== null);
      tempoPts = rankPoints(comTempo.map(it => ({ team: it.team, value: it.tempo })));
      items.forEach(it => {
        if (it.carga !== null) cargaPts[it.team] = it.carga === true ? 4 : 0;
      });
    }
    return { round: r, items, complete, hasAny, tempoPts, cargaPts };
  });
}

// ── Render live section (called by RAF for smooth timer) ──────
function renderLiveSection() {
  const liveEl = document.getElementById("live-section");
  if (!liveEl) return;

  const liveEntries = [];
  for (const [key, val] of Object.entries(_live)) {
    const [round, teamId] = key.split("_");
    if (!val?.running) continue;
    const team = TEAMS.find(t => t.id === teamId);
    if (!team) continue;
    const elapsed = val.startTs ? (Date.now() - val.startTs) / 1000 : null;
    liveEntries.push({ round: parseInt(round), team, elapsed });
  }

  if (!liveEntries.length) {
    liveEl.hidden = true;
    return;
  }
  liveEl.hidden = false;

  const entry = liveEntries[0];
  const textColor = entry.team.dark ? "#3A3000" : "#fff";
  const timerHtml = entry.elapsed !== null
    ? `<div class="lv-timer">${fmtElapsed(entry.elapsed)}</div>`
    : `<div class="lv-timer lv-timer-blink">● AO VIVO</div>`;

  liveEl.innerHTML = `
    <div class="lv-card" style="background:${entry.team.color}">
      <div class="lv-pulse-ring"></div>
      <div class="lv-content">
        <div class="lv-label" style="color:${textColor}">
          <span class="lv-dot">●</span> AO VIVO · Rodada ${entry.round}
        </div>
        <div class="lv-team" style="color:${textColor}">${entry.team.label}</div>
        ${timerHtml}
        <div class="lv-sub" style="color:${textColor}88">cronômetro em execução</div>
      </div>
    </div>`;
}

// ── Full render ───────────────────────────────────────────────
function render() {
  const roundResults = computeRounds();

  const totals = {};
  TEAMS.forEach(t => totals[t.id] = 0);
  roundResults.forEach(rr => {
    if (rr.hasAny) TEAMS.forEach(t => {
      totals[t.id] += (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0);
    });
  });
  const maxTotal = Math.max(1, ...TEAMS.map(t => totals[t.id]));
  const ranking  = [...TEAMS].sort((a, b) => totals[b.id] - totals[a.id]);
  const hasAnyResult = roundResults.some(rr => rr.hasAny);

  // Suspense
  document.getElementById("suspense-overlay").hidden = (_estado !== "suspense");

  // Recorde overlay
  const recEl = document.getElementById("recorde-overlay");
  recEl.hidden = !_celebrando;
  if (_celebrando && _recorde?.texto) {
    document.getElementById("recorde-detalhe").textContent = _recorde.texto;
  }

  // Comentário bar
  const comtEl = document.getElementById("comentario-bar");
  if (_comt) {
    comtEl.textContent = "💬 " + _comt;
    comtEl.hidden = false;
    document.getElementById("main-content").style.paddingBottom = "80px";
  } else {
    comtEl.hidden = true;
    document.getElementById("main-content").style.paddingBottom = "";
  }

  // Estado badge
  const badgeEl = document.getElementById("estado-badge");
  if (_estado === "suspense") {
    badgeEl.textContent = "🎭 Suspense";
    badgeEl.className = "pr-estado-badge ao-vivo";
    badgeEl.hidden = false;
  } else if (_estado === "revelado") {
    badgeEl.textContent = "✅ Revelado";
    badgeEl.className = "pr-estado-badge revelado";
    badgeEl.hidden = false;
  } else if (Object.keys(_live).length > 0) {
    badgeEl.textContent = "🔴 Ao vivo";
    badgeEl.className = "pr-estado-badge ao-vivo";
    badgeEl.hidden = false;
  } else {
    badgeEl.hidden = true;
  }

  // Live section (static part; RAF updates timer)
  renderLiveSection();

  // Ranking list
  const rankEl = document.getElementById("ranking-list");
  if (!hasAnyResult) {
    rankEl.innerHTML = `
      <div class="pr-empty">
        <div class="pr-empty-icon">⏳</div>
        <div class="pr-empty-txt">Aguardando os primeiros resultados…</div>
      </div>`;
  } else {
    rankEl.innerHTML = ranking.map((t, idx) => {
      const isLive    = ROUNDS.some(r => _live[`${r}_${t.id}`]);
      const pts       = totals[t.id];
      const barPct    = Math.round((pts / maxTotal) * 100);
      const textColor = t.dark ? "#3A3000" : "#fff";
      return `
        <div class="pr-rank-card" style="background:${t.color}">
          <div class="pr-rank-pos" style="color:${textColor}">${idx + 1}º</div>
          <div class="pr-rank-info">
            <div class="pr-rank-label" style="color:${textColor}">
              ${t.label}
              ${isLive ? `<span class="pr-live-dot">🔴 ao vivo</span>` : ""}
            </div>
            <div class="pr-rank-bar-wrap">
              <div class="pr-rank-bar" style="width:${barPct}%"></div>
            </div>
          </div>
          <div class="pr-rank-pts" style="color:${textColor}">${pts} pts</div>
        </div>`;
    }).join("");
  }

  // Rounds grid
  const roundsSec = document.getElementById("rounds-section");
  roundsSec.hidden = !hasAnyResult;
  if (hasAnyResult) {
    document.getElementById("rounds-grid").innerHTML = roundResults.map(rr => {
      let winners = [], maxPts = 0, bestTime = null;
      if (rr.hasAny) {
        TEAMS.forEach(t => {
          const p = (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0);
          if (p > maxPts) { maxPts = p; winners = [t]; }
          else if (p === maxPts && p > 0) winners.push(t);
        });
        const winItem = rr.items.find(it => it.team === winners[0]?.id);
        bestTime = winItem?.tempo ?? null;
      }
      const isTie = winners.length > 1;
      return `
        <div class="pr-round-card">
          <div class="pr-round-header">
            Rodada ${rr.round}
            ${rr.hasAny && !rr.complete ? `<span class="parcial">parcial</span>` : ""}
          </div>
          ${rr.hasAny ? `
            <div class="pr-round-body" style="background:${(winners[0]?.color ?? "#ccc")}22">
              <div class="pr-round-winner-icon">${isTie ? "🤝" : "🏆"}</div>
              <div class="pr-round-winner-name">
                ${isTie ? winners.map(w => w.label).join(" · ") : (winners[0]?.label ?? "")}
              </div>
              ${bestTime !== null && !isTie ? `<div class="pr-round-winner-time">${fmtTime(bestTime)}</div>` : ""}
            </div>` : `
            <div class="pr-round-body">
              <div class="pr-round-pending">⏳</div>
            </div>`}
        </div>`;
    }).join("");
  }

  // Detail per round
  const detailSec = document.getElementById("rounds-detail-section");
  detailSec.hidden = !hasAnyResult;
  if (hasAnyResult) {
    document.getElementById("rounds-detail").innerHTML = roundResults.map(rr => {
      const sortedItems = [...rr.items].sort((a, b) => {
        if (a.tempo === null) return 1;
        if (b.tempo === null) return -1;
        return a.tempo - b.tempo;
      });
      const rows = sortedItems.map(it => {
        const t   = TEAMS.find(x => x.id === it.team);
        const pts = rr.hasAny ? (rr.tempoPts[it.team] || 0) + (rr.cargaPts[it.team] || 0) : null;
        const isLive = !!_live[`${rr.round}_${it.team}`];
        return `<tr>
          <td style="color:${t.color}">
            ${t.label}${isLive ? ` <span style="color:#D92B2B;font-size:10px">🔴</span>` : ""}
          </td>
          <td>${fmtTime(it.tempo)}</td>
          <td>${it.carga === true  ? `<span class="carga-ok">✓ 4pts</span>`
             : it.carga === false ? `<span class="carga-no">✗ 0pts</span>`
             : "—"}</td>
          <td>${pts !== null ? pts : "—"}</td>
        </tr>`;
      }).join("");
      return `
        <div class="pr-detail-round">
          <div class="pr-detail-round-header">
            <span>Rodada ${rr.round}</span>
            ${!rr.complete ? `<span class="parcial">${rr.hasAny ? "parcial" : "aguardando"}</span>` : ""}
          </div>
          <table class="pr-detail-table">
            <thead><tr><th>Equipe</th><th>Tempo</th><th>Carga</th><th>Pts</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");
  }

  const upEl = document.getElementById("last-update");
  upEl.hidden = false;
  upEl.textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR");
}

// ── Start ─────────────────────────────────────────────────────
poll();
_pollInterval = { __id: setInterval(poll, 4000), __interval: 4000 };
