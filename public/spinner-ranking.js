// Ranking ao vivo — Lançador de Spinner (página pública standalone)

const TEAMS = [
  { id: "2A", label: "2º A", color: "#D92B2B" },
  { id: "2B", label: "2º B", color: "#004B8D" },
  { id: "2C", label: "2º C", color: "#2E9E4F" },
  { id: "2D", label: "2º D", color: "#F0B800", dark: true },
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
function spinnerKey(round, teamId)     { return `r${round}_${teamId}`; }
function spinnerLiveKey(round, teamId) { return `live_r${round}_${teamId}`; }

// ── Formatting ────────────────────────────────────────────────
function fmtTime(sec) {
  if (sec === null || sec === undefined) return "—";
  return sec.toFixed(1) + "s";
}
function fmtGiro(rpm) {
  if (rpm === null || rpm === undefined) return "—";
  return rpm.toFixed(1) + "s";
}
function fmtElapsed(sec) {
  return sec.toFixed(1) + "s";
}

// ── Scoring (mirrors App.jsx rankPoints) ─────────────────────
function rankPoints(items, higherBetter) {
  const present = items.filter(it => it.value !== null && it.value !== undefined);
  if (!present.length) return {};
  const sorted = [...present].sort((a, b) =>
    higherBetter ? b.value - a.value : a.value - b.value
  );
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

function countGiroFirsts(roundResults, teamId) {
  let count = 0;
  for (const rr of roundResults) {
    if (rr.complete && rr.giroPts[teamId] === 4) count++;
  }
  return count;
}

// ── State ─────────────────────────────────────────────────────
let _data    = {};
let _live    = {};   // { "1_2A": { montagemRunning, giroRunning, startTs_montagem, startTs_giro }, ... }
let _estado  = "aguardando";
let _comt    = "";
let _recorde = null;
let _prevRecordeTs = undefined;
let _celebrando    = false;
let _celebTimer    = null;
let _liveTimerRaf  = null;
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
        dbGet(spinnerKey(r, t.id)).then(v => ({ type: "data", key: spinnerKey(r, t.id), v })),
        dbGet(spinnerLiveKey(r, t.id)).then(v => ({ type: "live", key: `${r}_${t.id}`, v })),
      );
    }
  }

  const [meta, roundResults] = await Promise.all([
    Promise.all([
      dbGet("spinner_estado"),
      dbGet("spinner_comentario"),
      dbGet("spinner_recorde"),
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
      const v = _data[spinnerKey(r, t.id)];
      return { team: t.id, montagem: v?.montagem ?? null, giro: v?.giro ?? null };
    });
    const complete = items.every(it => it.montagem !== null && it.giro !== null);
    const hasAny   = items.some(it => it.montagem !== null || it.giro !== null);
    let montPts = {}, giroPts = {};
    if (hasAny) {
      const comMont = items.filter(it => it.montagem !== null);
      const comGiro = items.filter(it => it.giro !== null);
      montPts = rankPoints(comMont.map(it => ({ team: it.team, value: it.montagem })), false);
      giroPts = rankPoints(comGiro.map(it => ({ team: it.team, value: it.giro })),     true);
    }
    return { round: r, items, complete, hasAny, montPts, giroPts };
  });
}

// ── Render live section (called by RAF for smooth timer) ──────
function renderLiveSection() {
  const liveEl = document.getElementById("live-section");
  if (!liveEl) return;

  const liveEntries = [];
  for (const [key, val] of Object.entries(_live)) {
    const [round, teamId] = key.split("_");
    const team = TEAMS.find(t => t.id === teamId);
    if (!team) continue;
    const montagemElapsed = (val.montagemRunning && val.startTs_montagem)
      ? (Date.now() - val.startTs_montagem) / 1000 : null;
    const giroElapsed = (val.giroRunning && val.startTs_giro)
      ? (Date.now() - val.startTs_giro) / 1000 : null;
    liveEntries.push({ round: parseInt(round), team, val, montagemElapsed, giroElapsed });
  }

  if (!liveEntries.length) { liveEl.hidden = true; return; }
  liveEl.hidden = false;

  liveEl.innerHTML = liveEntries.map(entry => {
    const textColor = entry.team.dark ? "#3A3000" : "#fff";
    let phaseLabel = "", timerVal = null;
    if (entry.val.montagemRunning) {
      phaseLabel = "Montagem";
      timerVal = entry.montagemElapsed;
    } else if (entry.val.giroRunning) {
      phaseLabel = "Lançamento";
      timerVal = entry.giroElapsed;
    } else {
      phaseLabel = "Preparando";
    }
    const timerHtml = timerVal !== null
      ? `<div class="lv-timer">${fmtElapsed(timerVal)}</div>`
      : `<div class="lv-timer lv-timer-blink">● AO VIVO</div>`;
    return `
      <div class="lv-card" style="background:${entry.team.color}">
        <div class="lv-content">
          <div class="lv-label" style="color:${textColor}">
            <span class="lv-dot">●</span> AO VIVO · Rodada ${entry.round}
          </div>
          <div class="lv-team" style="color:${textColor}">${entry.team.label}</div>
          ${timerHtml}
          <div class="lv-sub" style="color:${textColor}88">${phaseLabel}</div>
        </div>
      </div>`;
  }).join("");
}

// ── Full render ───────────────────────────────────────────────
function render() {
  const roundResults = computeRounds();

  const totals = {};
  TEAMS.forEach(t => totals[t.id] = 0);
  roundResults.forEach(rr => {
    if (rr.hasAny) TEAMS.forEach(t => {
      totals[t.id] += (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
    });
  });
  const maxTotal = Math.max(1, ...TEAMS.map(t => totals[t.id]));
  const ranking  = [...TEAMS].sort((a, b) => {
    const diff = totals[b.id] - totals[a.id];
    if (diff !== 0) return diff;
    return countGiroFirsts(roundResults, b.id) - countGiroFirsts(roundResults, a.id);
  });
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

  // Live section (static; RAF updates timer)
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
      const isLive   = ROUNDS.some(r => _live[`${r}_${t.id}`]);
      const pts      = totals[t.id];
      const barPct   = Math.round((pts / maxTotal) * 100);
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
      let winners = [], maxPts = 0;
      if (rr.hasAny) {
        TEAMS.forEach(t => {
          const p = (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
          if (p > maxPts) { maxPts = p; winners = [t]; }
          else if (p === maxPts && p > 0) winners.push(t);
        });
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
        const pa = (rr.montPts[a.team] || 0) + (rr.giroPts[a.team] || 0);
        const pb = (rr.montPts[b.team] || 0) + (rr.giroPts[b.team] || 0);
        return pb - pa;
      });
      const rows = sortedItems.map(it => {
        const t   = TEAMS.find(x => x.id === it.team);
        const pts = rr.hasAny ? (rr.montPts[it.team] || 0) + (rr.giroPts[it.team] || 0) : null;
        const isLive = !!_live[`${rr.round}_${it.team}`];
        return `<tr>
          <td style="color:${t.color}">
            ${t.label}${isLive ? ` <span style="color:#D92B2B;font-size:10px">🔴</span>` : ""}
          </td>
          <td>${fmtTime(it.montagem)}</td>
          <td>${fmtGiro(it.giro)}</td>
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
            <thead><tr><th>Equipe</th><th>Montagem</th><th>Giro</th><th>Pts</th></tr></thead>
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
