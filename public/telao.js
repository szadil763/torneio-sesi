// Telão — dois rankings simultâneos: Ponte de Da Vinci + Lançador de Spinner

const RTDB = "https://torneio-sesi-20de0-default-rtdb.firebaseio.com";

const PONTE_TEAMS = [
  { id: "1A", label: "1º A", color: "#D92B2B" },
  { id: "1B", label: "1º B", color: "#004B8D" },
  { id: "1C", label: "1º C", color: "#2E9E4F" },
  { id: "1D", label: "1º D", color: "#F0B800", dark: true },
];
const SPINNER_TEAMS = [
  { id: "2A", label: "2º A", color: "#D92B2B" },
  { id: "2B", label: "2º B", color: "#004B8D" },
  { id: "2C", label: "2º C", color: "#2E9E4F" },
  { id: "2D", label: "2º D", color: "#F0B800", dark: true },
];
const ROUNDS = [1, 2, 3, 4];

// ── Firebase REST ────────────────────────────────────────────────
async function dbGet(key) {
  try {
    const r = await fetch(`${RTDB}/${encodeURIComponent(key)}.json`);
    if (!r.ok) return null;
    const v = await r.json();
    return v ?? null;
  } catch { return null; }
}

// ── Firebase chaves ──────────────────────────────────────────────
const key = {
  ponte:      (r, id) => `ponte_r${r}_${id}`,
  ponteLive:  (r, id) => `ponte_live_r${r}_${id}`,
  spinner:    (r, id) => `r${r}_${id}`,
  spinnerLive:(r, id) => `live_r${r}_${id}`,
};

// ── Formatação ───────────────────────────────────────────────────
function fmtSeg(sec) {
  if (sec == null) return "—";
  return sec.toFixed(1) + "s";
}
function fmtElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return m > 0 ? `${m}:${s}` : `${sec.toFixed(1)}s`;
}

// ── Pontuação (espelha App.jsx) ──────────────────────────────────
function rankPts(items, higherBetter) {
  const present = items.filter(x => x.value != null);
  if (!present.length) return {};
  const sorted = [...present].sort((a, b) => higherBetter ? b.value - a.value : a.value - b.value);
  const scale  = [4, 3, 2, 1];
  const res = {};
  let lastVal = null, lastP = null;
  sorted.forEach((it, i) => {
    const p = (lastVal !== null && it.value === lastVal) ? lastP : (scale[i] ?? 1);
    res[it.team] = p;
    lastVal = it.value; lastP = p;
  });
  return res;
}

// ── Estado global ────────────────────────────────────────────────
const ST = {
  ponte: {
    data: {}, live: {},
    estado: "aguardando", comt: "",
    recorde: null, prevRecordeTs: undefined, celebrando: false, celebTimer: null,
  },
  spinner: {
    data: {}, live: {},
    estado: "aguardando", comt: "",
    recorde: null, prevRecordeTs: undefined, celebrando: false, celebTimer: null,
  },
};

let _raf    = null;   // requestAnimationFrame para timers ao vivo
let _pollId = null;
let _pollMs = 4000;

// ── RAF para timers ao vivo ──────────────────────────────────────
function startRaf() {
  if (_raf) return;
  function tick() {
    const anyLive = Object.keys(ST.ponte.live).length > 0 || Object.keys(ST.spinner.live).length > 0;
    if (!anyLive) { _raf = null; return; }
    renderLive("ponte");
    renderLive("spinner");
    _raf = requestAnimationFrame(tick);
  }
  _raf = requestAnimationFrame(tick);
}
function stopRaf() {
  if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
}

// ── Poll ─────────────────────────────────────────────────────────
async function poll() {
  const fetches = [];

  // Ponte
  for (const r of ROUNDS) {
    for (const t of PONTE_TEAMS) {
      fetches.push(
        dbGet(key.ponte(r, t.id)).then(v => ({ scope: "ponte", type: "data", k: key.ponte(r, t.id), v })),
        dbGet(key.ponteLive(r, t.id)).then(v => ({ scope: "ponte", type: "live", k: `${r}_${t.id}`, v })),
      );
    }
  }
  // Spinner
  for (const r of ROUNDS) {
    for (const t of SPINNER_TEAMS) {
      fetches.push(
        dbGet(key.spinner(r, t.id)).then(v => ({ scope: "spinner", type: "data", k: key.spinner(r, t.id), v })),
        dbGet(key.spinnerLive(r, t.id)).then(v => ({ scope: "spinner", type: "live", k: `${r}_${t.id}`, v })),
      );
    }
  }

  const [metaPonte, metaSpinner, all] = await Promise.all([
    Promise.all([
      dbGet("ponte_estado"),
      dbGet("ponte_comentario"),
      dbGet("ponte_recorde"),
    ]),
    Promise.all([
      dbGet("spinner_estado"),
      dbGet("spinner_comentario"),
      dbGet("spinner_recorde"),
    ]),
    Promise.all(fetches),
  ]);

  // Ponte meta
  ST.ponte.estado = metaPonte[0] ?? "aguardando";
  ST.ponte.comt   = typeof metaPonte[1] === "string" ? metaPonte[1] : "";
  checkRecorde(ST.ponte, metaPonte[2]);

  // Spinner meta
  ST.spinner.estado = metaSpinner[0] ?? "aguardando";
  ST.spinner.comt   = typeof metaSpinner[1] === "string" ? metaSpinner[1] : "";
  checkRecorde(ST.spinner, metaSpinner[2]);

  // Distribuir resultados
  const newPonteData = {}, newPonteLive = {};
  const newSpinnerData = {}, newSpinnerLive = {};
  for (const { scope, type, k, v } of all) {
    if (scope === "ponte") {
      if (type === "live") { if (v) newPonteLive[k] = v; }
      else                 { if (v) newPonteData[k] = v; }
    } else {
      if (type === "live") { if (v) newSpinnerLive[k] = v; }
      else                 { if (v) newSpinnerData[k] = v; }
    }
  }
  ST.ponte.data   = newPonteData;
  ST.ponte.live   = newPonteLive;
  ST.spinner.data = newSpinnerData;
  ST.spinner.live = newSpinnerLive;

  const anyLive = Object.keys(ST.ponte.live).length > 0 || Object.keys(ST.spinner.live).length > 0;
  const target  = anyLive ? 2000 : 4000;
  if (target !== _pollMs) {
    _pollMs = target;
    clearInterval(_pollId);
    _pollId = setInterval(poll, _pollMs);
  }

  if (anyLive) startRaf(); else stopRaf();

  render();
}

function checkRecorde(st, rec) {
  if (rec?.ts && rec.ts !== st.prevRecordeTs) {
    if (st.prevRecordeTs !== undefined) {
      st.celebrando = true;
      clearTimeout(st.celebTimer);
      st.celebTimer = setTimeout(() => { st.celebrando = false; render(); }, 5000);
    }
    st.prevRecordeTs = rec.ts;
  }
  st.recorde = rec ?? null;
}

// ── Calcular rodadas Ponte ───────────────────────────────────────
function calcRodadasPonte() {
  return ROUNDS.map(r => {
    const items = PONTE_TEAMS.map(t => {
      const v = ST.ponte.data[key.ponte(r, t.id)];
      return { team: t.id, tempo: v?.tempo ?? null, carga: v?.carga ?? null };
    });
    const hasAny   = items.some(it => it.tempo !== null || it.carga !== null);
    const complete = items.every(it => it.tempo !== null && it.carga !== null);
    let tempoPts = {}, cargaPts = {};
    if (hasAny) {
      const comTempo = items.filter(it => it.tempo !== null);
      tempoPts = rankPts(comTempo.map(it => ({ team: it.team, value: it.tempo })), false);
      items.forEach(it => { if (it.carga !== null) cargaPts[it.team] = it.carga ? 4 : 0; });
    }
    return { round: r, items, hasAny, complete, tempoPts, cargaPts };
  });
}

// ── Calcular rodadas Spinner ─────────────────────────────────────
function calcRodadasSpinner() {
  return ROUNDS.map(r => {
    const items = SPINNER_TEAMS.map(t => {
      const v = ST.spinner.data[key.spinner(r, t.id)];
      return { team: t.id, montagem: v?.montagem ?? null, giro: v?.giro ?? null };
    });
    const hasAny   = items.some(it => it.montagem !== null || it.giro !== null);
    const complete = items.every(it => it.montagem !== null && it.giro !== null);
    let montPts = {}, giroPts = {};
    if (hasAny) {
      const comMont = items.filter(it => it.montagem !== null);
      const comGiro = items.filter(it => it.giro !== null);
      montPts = rankPts(comMont.map(it => ({ team: it.team, value: it.montagem })), false);
      giroPts = rankPts(comGiro.map(it => ({ team: it.team, value: it.giro })),     true);
    }
    return { round: r, items, hasAny, complete, montPts, giroPts };
  });
}

// ── Render live timers (chamado pelo RAF) ────────────────────────
function renderLive(scope) {
  const liveEl = document.getElementById(`${scope}-live`);
  if (!liveEl) return;

  const teams  = scope === "ponte" ? PONTE_TEAMS : SPINNER_TEAMS;
  const liveMap = ST[scope].live;

  const entries = [];
  for (const [k, val] of Object.entries(liveMap)) {
    const [round, teamId] = k.split("_");
    const team = teams.find(t => t.id === teamId);
    if (!team) continue;

    if (scope === "ponte") {
      if (!val?.running) continue;
      const elapsed = val.startTs ? (Date.now() - val.startTs) / 1000 : null;
      entries.push({ round, team, elapsed, fase: "Cronômetro rodando" });
    } else {
      const montagemElapsed = (val.montagemRunning && val.startTs_montagem)
        ? (Date.now() - val.startTs_montagem) / 1000 : null;
      const giroElapsed = (val.giroRunning && val.startTs_giro)
        ? (Date.now() - val.startTs_giro) / 1000 : null;
      const fase = val.montagemRunning ? "Montagem" : val.giroRunning ? "Lançamento" : "Preparando";
      const elapsed = val.montagemRunning ? montagemElapsed : val.giroRunning ? giroElapsed : null;
      entries.push({ round, team, elapsed, fase });
    }
  }

  if (!entries.length) { liveEl.hidden = true; return; }
  liveEl.hidden = false;

  liveEl.innerHTML = entries.map(e => {
    const tc = e.team.dark ? "#3A3000" : "#fff";
    const timerHtml = e.elapsed !== null
      ? `<div class="lv-timer" style="color:${tc}">${scope === "ponte" ? fmtElapsed(e.elapsed) : fmtSeg(e.elapsed)}</div>`
      : `<div class="lv-timer lv-timer-blink" style="color:${tc}">● AO VIVO</div>`;
    return `
      <div class="lv-card" style="background:${e.team.color}">
        <div class="lv-content">
          <div class="lv-label" style="color:${tc}88"><span class="lv-dot">●</span> AO VIVO</div>
          <div class="lv-team" style="color:${tc}">${e.team.label}</div>
          <div class="lv-fase" style="color:${tc}99">${e.fase}</div>
        </div>
        <div class="lv-timer-block">
          ${timerHtml}
          <div class="lv-round-label" style="color:${tc}88">Rodada ${e.round}</div>
        </div>
      </div>`;
  }).join("");
}

// ── Melhor resultado acumulado por equipe (para exibir no rank) ──
function _melhorPonte(teams, rods) {
  const res = {};
  teams.forEach(t => {
    let bestTempo = null;
    let cargaCount = 0, rodCount = 0;
    rods.forEach(rr => {
      const it = rr.items.find(x => x.team === t.id);
      if (!it) return;
      if (it.tempo !== null && (bestTempo === null || it.tempo < bestTempo)) bestTempo = it.tempo;
      if (it.carga !== null) { rodCount++; if (it.carga) cargaCount++; }
    });
    res[t.id] = { bestTempo, cargaCount, rodCount };
  });
  return res;
}
function _melhorSpinner(teams, rods) {
  const res = {};
  teams.forEach(t => {
    let bestGiro = null;
    rods.forEach(rr => {
      const it = rr.items.find(x => x.team === t.id);
      if (it?.giro !== null && it?.giro !== undefined && (bestGiro === null || it.giro > bestGiro)) bestGiro = it.giro;
    });
    res[t.id] = { bestGiro };
  });
  return res;
}

// ── Render ranking ───────────────────────────────────────────────
function renderRanking(scope, rods) {
  const el    = document.getElementById(`${scope}-ranking`);
  const teams = scope === "ponte" ? PONTE_TEAMS : SPINNER_TEAMS;
  if (!el) return;

  const hasAny = rods.some(rr => rr.hasAny);
  if (!hasAny) {
    el.innerHTML = `<div class="painel-aguardando">⏳<br>Aguardando resultados…</div>`;
    return;
  }

  const totals = {};
  teams.forEach(t => totals[t.id] = 0);
  rods.forEach(rr => {
    if (!rr.hasAny) return;
    teams.forEach(t => {
      if (scope === "ponte") {
        totals[t.id] += (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0);
      } else {
        totals[t.id] += (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
      }
    });
  });

  const maxPts  = Math.max(1, ...teams.map(t => totals[t.id]));
  const sorted  = [...teams].sort((a, b) => totals[b.id] - totals[a.id]);
  const medals  = ["🥇", "🥈", "🥉", "🏅"];
  const melhores = scope === "ponte" ? _melhorPonte(teams, rods) : _melhorSpinner(teams, rods);

  el.innerHTML = sorted.map((t, idx) => {
    const pts    = totals[t.id];
    const bar    = Math.round((pts / maxPts) * 100);
    const tc     = t.dark ? "#3A3000" : "#fff";
    const isLive = ROUNDS.some(r => ST[scope].live[`${r}_${t.id}`]);

    let subInfo = "";
    if (scope === "ponte") {
      const m = melhores[t.id];
      const tempoStr  = m.bestTempo !== null ? `⏱ ${fmtSeg(m.bestTempo)}` : "";
      const cargaStr  = m.rodCount > 0
        ? `· ${m.cargaCount}/${m.rodCount} carga ✓`
        : "";
      if (tempoStr || cargaStr) subInfo = `<div class="rank-sub" style="color:${tc}99">${tempoStr}${cargaStr}</div>`;
    } else {
      const m = melhores[t.id];
      if (m.bestGiro !== null) subInfo = `<div class="rank-sub" style="color:${tc}99">🌀 melhor giro: ${fmtSeg(m.bestGiro)}</div>`;
    }

    return `
      <div class="rank-card" style="background:${t.color}">
        <div class="rank-pos" style="color:${tc}">${medals[idx] ?? (idx+1)+"º"}</div>
        <div class="rank-info">
          <div class="rank-nome" style="color:${tc}">
            ${t.label}
            ${isLive ? `<span class="rank-live-dot">🔴 ao vivo</span>` : ""}
          </div>
          ${subInfo}
          <div class="rank-bar-wrap">
            <div class="rank-bar" style="width:${bar}%"></div>
          </div>
        </div>
        <div>
          <div class="rank-pts" style="color:${tc}">${pts}</div>
          <div class="rank-pts-label" style="color:${tc}88">pts</div>
        </div>
      </div>`;
  }).join("");
}

// ── Render rodadas ───────────────────────────────────────────────
function renderRodadas(scope, rods) {
  const sec = document.getElementById(`${scope}-rodadas`);
  if (!sec) return;
  const hasAny = rods.some(rr => rr.hasAny);
  if (!hasAny) { sec.hidden = true; return; }
  sec.hidden = false;

  const teams = scope === "ponte" ? PONTE_TEAMS : SPINNER_TEAMS;
  const cards = rods.map(rr => {
    let winners = [], maxP = 0;
    if (rr.hasAny) {
      teams.forEach(t => {
        const p = scope === "ponte"
          ? (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0)
          : (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
        if (p > maxP) { maxP = p; winners = [t]; }
        else if (p === maxP && p > 0) winners.push(t);
      });
    }
    const isTie   = winners.length > 1;
    const winItem = rr.items.find(it => it.team === winners[0]?.id);

    let extra = "";
    if (!isTie && rr.hasAny && winItem) {
      if (scope === "ponte") {
        const tempoStr = winItem.tempo != null ? `⏱ ${fmtSeg(winItem.tempo)}` : "";
        const cargaStr = winItem.carga === true
          ? `<span class="carga-ok">✓ carga</span>`
          : winItem.carga === false
            ? `<span class="carga-no">✗ sem carga</span>`
            : "";
        if (tempoStr || cargaStr) extra = `<div class="rodada-winner-extra">${tempoStr} ${cargaStr}</div>`;
      } else {
        const parts = [];
        if (winItem.montagem != null) parts.push(`mont: ${fmtSeg(winItem.montagem)}`);
        if (winItem.giro != null)     parts.push(`giro: ${fmtSeg(winItem.giro)}`);
        if (parts.length) extra = `<div class="rodada-winner-extra">${parts.join(" · ")}</div>`;
      }
    }

    return `
      <div class="rodada-card">
        <div class="rodada-header">
          R${rr.round}
          ${rr.hasAny && !rr.complete ? `<span class="parcial">parcial</span>` : ""}
        </div>
        ${rr.hasAny ? `
          <div class="rodada-body" style="background:${(winners[0]?.color ?? "#ccc")}22">
            <div class="rodada-winner-icon">${isTie ? "🤝" : "🏆"}</div>
            <div class="rodada-winner-nome">${isTie ? winners.map(w => w.label).join("·") : (winners[0]?.label ?? "")}</div>
            ${extra}
          </div>` : `
          <div class="rodada-body"><div class="rodada-pending">⏳</div></div>`}
      </div>`;
  }).join("");

  const icon = scope === "ponte" ? "🌉" : "🌀";
  sec.innerHTML = `
    <div class="rodadas-titulo">${icon} Melhores por rodada</div>
    <div class="rodadas-grid">${cards}</div>`;
}

// ── Render detalhe por rodada ────────────────────────────────────
function renderDetalhe(scope, rods) {
  const sec   = document.getElementById(`${scope}-detalhe`);
  if (!sec) return;
  const teams = scope === "ponte" ? PONTE_TEAMS : SPINNER_TEAMS;
  const rodsComDados = rods.filter(rr => rr.hasAny);
  if (!rodsComDados.length) { sec.hidden = true; return; }
  sec.hidden = false;

  const icon = scope === "ponte" ? "🌉" : "🌀";

  const tabelas = rodsComDados.map(rr => {
    const sortedItems = scope === "ponte"
      ? [...rr.items].sort((a, b) => {
          if (a.tempo === null) return 1;
          if (b.tempo === null) return -1;
          return a.tempo - b.tempo;
        })
      : [...rr.items].sort((a, b) => {
          const pa = (rr.montPts[a.team] || 0) + (rr.giroPts[a.team] || 0);
          const pb = (rr.montPts[b.team] || 0) + (rr.giroPts[b.team] || 0);
          return pb - pa;
        });

    const rows = sortedItems.map(it => {
      const t      = teams.find(x => x.id === it.team);
      const isLive = !!ST[scope].live[`${rr.round}_${it.team}`];
      const liveTag = isLive ? `<span class="det-live">🔴</span>` : "";

      if (scope === "ponte") {
        const pts = (rr.tempoPts[it.team] || 0) + (rr.cargaPts[it.team] || 0);
        const cargaHtml = it.carga === true
          ? `<span class="carga-ok">✓</span>`
          : it.carga === false
            ? `<span class="carga-no">✗</span>`
            : `<span class="det-nd">—</span>`;
        return `<tr>
          <td class="det-equipe" style="color:${t.color}">${t.label}${liveTag}</td>
          <td class="det-val">${fmtSeg(it.tempo)}</td>
          <td class="det-carga">${cargaHtml}</td>
          <td class="det-pts">${it.tempo !== null ? pts : "—"}</td>
        </tr>`;
      } else {
        const pts = (rr.montPts[it.team] || 0) + (rr.giroPts[it.team] || 0);
        return `<tr>
          <td class="det-equipe" style="color:${t.color}">${t.label}${liveTag}</td>
          <td class="det-val">${fmtSeg(it.montagem)}</td>
          <td class="det-val">${fmtSeg(it.giro)}</td>
          <td class="det-pts">${it.montagem !== null ? pts : "—"}</td>
        </tr>`;
      }
    }).join("");

    const thead = scope === "ponte"
      ? `<tr><th>Equipe</th><th>Tempo</th><th>Carga</th><th>Pts</th></tr>`
      : `<tr><th>Equipe</th><th>Mont.</th><th>Giro</th><th>Pts</th></tr>`;

    const parcialBadge = !rr.complete
      ? `<span class="det-parcial">parcial</span>` : "";

    return `
      <div class="det-bloco">
        <div class="det-header">Rodada ${rr.round} ${parcialBadge}</div>
        <table class="det-table">
          <thead>${thead}</thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join("");

  sec.innerHTML = `
    <div class="rodadas-titulo">${icon} Detalhe por rodada</div>
    <div class="det-grid">${tabelas}</div>`;
}

// ── Render completo ──────────────────────────────────────────────
function render() {
  const rodsP = calcRodadasPonte();
  const rodsS = calcRodadasSpinner();

  // Suspense (prioridade: ponte, depois spinner)
  const suspense = ST.ponte.estado === "suspense" || ST.spinner.estado === "suspense";
  document.getElementById("suspense-overlay").hidden = !suspense;

  // Recorde overlay (ponte tem prioridade)
  const cel = ST.ponte.celebrando || ST.spinner.celebrando;
  const recEl = document.getElementById("recorde-overlay");
  recEl.hidden = !cel;
  if (cel) {
    const rec = ST.ponte.celebrando ? ST.ponte.recorde : ST.spinner.recorde;
    if (rec?.texto) document.getElementById("recorde-detalhe").textContent = rec.texto;
  }

  // Badge global ao vivo
  const anyLive = Object.keys(ST.ponte.live).length > 0 || Object.keys(ST.spinner.live).length > 0;
  const liveBadge = document.getElementById("telao-live-badge");
  liveBadge.hidden = !anyLive;

  // Ponte
  updateBadge("ponte");
  renderLive("ponte");
  renderRanking("ponte", rodsP);
  renderRodadas("ponte", rodsP);
  renderDetalhe("ponte", rodsP);

  // Spinner
  updateBadge("spinner");
  renderLive("spinner");
  renderRanking("spinner", rodsS);
  renderRodadas("spinner", rodsS);
  renderDetalhe("spinner", rodsS);

  // Rodapé
  const up = document.getElementById("footer-update");
  if (up) up.textContent = "Atualizado " + new Date().toLocaleTimeString("pt-BR");
}

function updateBadge(scope) {
  const el = document.getElementById(`${scope}-badge`);
  if (!el) return;
  const st = ST[scope];
  if (st.estado === "suspense") {
    el.textContent = "🎭 Suspense";
    el.className = "painel-badge ao-vivo";
    el.hidden = false;
  } else if (st.estado === "revelado") {
    el.textContent = "✅ Revelado";
    el.className = "painel-badge revelado";
    el.hidden = false;
  } else if (Object.keys(st.live).length > 0) {
    el.textContent = "🔴 Ao vivo";
    el.className = "painel-badge ao-vivo";
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

// ── Start ────────────────────────────────────────────────────────
poll();
_pollId = setInterval(poll, _pollMs);
