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
const TERCEIRO_ANO_TEAMS = [
  { id: "vermelho", label: "Vermelho", color: "#D92B2B" },
  { id: "azul",     label: "Azul",     color: "#004B8D" },
  { id: "verde",    label: "Verde",    color: "#2E9E4F" },
  { id: "amarelo",  label: "Amarelo",  color: "#F0B800", dark: true },
];
const SCORES_3ANO = [10, 7, 5, 3];

const ROUNDS = [1, 2, 3, 4];

// Mapeamento cor → IDs nas provas de 1º e 2º Ano
const COLOR_TEAMS = [
  { id: "vermelho", label: "Vermelho", color: "#D92B2B", ponteId: "1A", spinnerId: "2A" },
  { id: "azul",     label: "Azul",     color: "#004B8D", ponteId: "1B", spinnerId: "2B" },
  { id: "verde",    label: "Verde",    color: "#2E9E4F", ponteId: "1C", spinnerId: "2C" },
  { id: "amarelo",  label: "Amarelo",  color: "#F0B800", ponteId: "1D", spinnerId: "2D", dark: true },
];

// ── Firebase REST ────────────────────────────────────────────────
async function dbGet(key) {
  try {
    const r = await fetch(`${RTDB}/${encodeURIComponent(key)}.json`, { cache: 'no-store' });
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
    resultado: null, prevResultadoTs: undefined, resultadoTimer: null,
  },
  spinner: {
    data: {}, live: {},
    estado: "aguardando", comt: "",
    recorde: null, prevRecordeTs: undefined, celebrando: false, celebTimer: null,
    resultado: null, prevResultadoTs: undefined, resultadoTimer: null,
  },
  terceiroAno: { resultado: null, prevTs: undefined },
  quartoAno:   { resultado: null, prevTs: undefined },
  quintoAno:   { resultado: null, prevTs: undefined },
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

  const [metaPonte, metaSpinner, prova3ano, prova4ano, prova5ano, all] = await Promise.all([
    Promise.all([
      dbGet("ponte_estado"),
      dbGet("ponte_comentario"),
      dbGet("ponte_recorde"),
      dbGet("ponte_resultado_final"),
    ]),
    Promise.all([
      dbGet("spinner_estado"),
      dbGet("spinner_comentario"),
      dbGet("spinner_recorde"),
      dbGet("spinner_resultado_final"),
    ]),
    dbGet("prova_3ano"),
    dbGet("prova_4ano"),
    dbGet("prova_5ano"),
    Promise.all(fetches),
  ]);

  // Ponte meta
  ST.ponte.estado = metaPonte[0] ?? "aguardando";
  ST.ponte.comt   = typeof metaPonte[1] === "string" ? metaPonte[1] : "";
  checkRecorde(ST.ponte, metaPonte[2]);
  checkResultado(ST.ponte, metaPonte[3], "ponte", "Ponte de Da Vinci — 1º Ano", PONTE_TEAMS);

  // Spinner meta
  ST.spinner.estado = metaSpinner[0] ?? "aguardando";
  ST.spinner.comt   = typeof metaSpinner[1] === "string" ? metaSpinner[1] : "";
  checkRecorde(ST.spinner, metaSpinner[2]);
  checkResultado(ST.spinner, metaSpinner[3], "spinner", "Lançador de Spinner — 2º Ano", SPINNER_TEAMS);

  // 3º / 4º / 5º Ano
  checkProvaAno(ST.terceiroAno, prova3ano);
  checkProvaAno(ST.quartoAno,   prova4ano);
  checkProvaAno(ST.quintoAno,   prova5ano);

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

function checkResultado(st, res, scope, titulo, teams) {
  if (res?.ts && res.ts !== st.prevResultadoTs) {
    st.prevResultadoTs = res.ts;
    st.resultado = res;
    showResultadoOverlay(res, scope, titulo, teams);
  }
}

function showResultadoOverlay(res, scope, titulo, teams) {
  const el = document.getElementById(`resultado-overlay-${scope}`);
  if (!el) return;

  const medals = ["🥇","🥈","🥉","🏅"];
  const ranking = (res.ranking || []).map(r => {
    const t = teams.find(x => x.id === r.id);
    return t ? { team: t, pts: r.pts } : null;
  }).filter(Boolean);

  if (!ranking.length) return;

  const [first, ...rest] = ranking;
  const tc = first.team.dark ? "#3A3000" : "#fff";

  const confetti = Array.from({ length: 20 }).map((_, i) => {
    const colors = ["#FFD700","#F5821F","#D92B2B","#004B8D","#2E9E4F","#fff"];
    const color = colors[i % colors.length];
    const shape = i % 3 === 0 ? "50%" : "2px";
    const dur = (1.8 + (i % 4) * 0.4).toFixed(1);
    const delay = ((i % 6) * 0.12).toFixed(2);
    const left = ((i * 5.1) % 100).toFixed(1);
    return `<div class="res-confetti-piece" style="left:${left}%;background:${color};border-radius:${shape};animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
  }).join("");

  const podioCards = rest.map((r, i) => {
    const rtc = r.team.dark ? "#3A3000" : "#fff";
    return `<div class="res-pod-card" style="background:${r.team.color};animation-delay:${0.15 + i * 0.1}s">
      <div class="res-pod-medalha">${medals[i + 1]}</div>
      <div class="res-pod-nome" style="color:${rtc}">${r.team.label}</div>
      <div class="res-pod-pts" style="color:${rtc}99">${r.pts} pts</div>
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="res-confetti-wrap">${confetti}</div>
    <div class="res-content">
      <div class="res-titulo-prova">${titulo}</div>
      <div class="res-header">🏆 RESULTADO FINAL</div>
      <div class="res-campeao" style="background:${first.team.color};--gc:${first.team.color}88">
        <div class="res-medalha-grande">🥇</div>
        <div class="res-pos-label" style="color:${tc}99">1º LUGAR</div>
        <div class="res-nome" style="color:${tc}">${first.team.label}</div>
        <div class="res-pts" style="color:${tc}cc">${first.pts} pontos</div>
      </div>
      <div class="res-podio">${podioCards}</div>
      <div class="res-dica">Toque em qualquer lugar para fechar</div>
    </div>`;

  el.hidden = false;
  el.classList.remove("res-saindo");
  el.classList.add("res-entrando");

  el.onclick = () => {
    el.classList.add("res-saindo");
    setTimeout(() => { el.hidden = true; el.classList.remove("res-saindo","res-entrando"); }, 400);
  };
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

// ── Calcular totais por scope ────────────────────────────────────
function calcTotaisScope(scope, rods) {
  const teams = scope === "ponte" ? PONTE_TEAMS : SPINNER_TEAMS;
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
  return totals;
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

  const totals = calcTotaisScope(scope, rods);

  const maxPts   = Math.max(1, ...teams.map(t => totals[t.id]));
  const sorted   = [...teams].sort((a, b) => totals[b.id] - totals[a.id]);
  const medals   = ["🥇", "🥈", "🥉", "🏅"];
  const melhores = scope === "ponte" ? _melhorPonte(teams, rods) : _melhorSpinner(teams, rods);

  // Melhor valor global para destacar recorde
  let globalBest = null;
  if (scope === "ponte") {
    teams.forEach(t => {
      const v = melhores[t.id].bestTempo;
      if (v !== null && (globalBest === null || v < globalBest)) globalBest = v;
    });
  } else {
    teams.forEach(t => {
      const v = melhores[t.id].bestGiro;
      if (v !== null && (globalBest === null || v > globalBest)) globalBest = v;
    });
  }

  el.innerHTML = sorted.map((t, idx) => {
    const pts    = totals[t.id];
    const bar    = Math.round((pts / maxPts) * 100);
    const tc     = t.dark ? "#3A3000" : "#fff";
    const isLive = ROUNDS.some(r => ST[scope].live[`${r}_${t.id}`]);
    const m      = melhores[t.id];

    let subInfo = "";
    if (scope === "ponte") {
      const tempoStr = m.bestTempo !== null ? `⏱ ${fmtSeg(m.bestTempo)}` : "";
      const cargaStr = m.rodCount > 0 ? `· ${m.cargaCount}/${m.rodCount} carga ✓` : "";
      if (tempoStr || cargaStr) {
        const isRec = globalBest !== null && m.bestTempo === globalBest;
        subInfo = `<div class="rank-sub${isRec ? " rank-sub-record" : ""}"${isRec ? "" : ` style="color:${tc}99"`}>${isRec ? "⭐ " : ""}${tempoStr}${cargaStr}</div>`;
      }
    } else {
      if (m.bestGiro !== null) {
        const isRec = globalBest !== null && m.bestGiro === globalBest;
        subInfo = `<div class="rank-sub${isRec ? " rank-sub-record" : ""}"${isRec ? "" : ` style="color:${tc}99"`}>${isRec ? "⭐ " : ""}🌀 melhor giro: ${fmtSeg(m.bestGiro)}</div>`;
      }
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

  // Melhor valor global para destacar recorde nas tabelas
  let globalBest = null;
  rodsComDados.forEach(rr => {
    rr.items.forEach(it => {
      if (scope === "ponte") {
        if (it.tempo !== null && (globalBest === null || it.tempo < globalBest)) globalBest = it.tempo;
      } else {
        if (it.giro !== null && (globalBest === null || it.giro > globalBest)) globalBest = it.giro;
      }
    });
  });

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
        const isRec = it.tempo !== null && it.tempo === globalBest;
        const cargaHtml = it.carga === true
          ? `<span class="carga-ok">✓</span>`
          : it.carga === false
            ? `<span class="carga-no">✗</span>`
            : `<span class="det-nd">—</span>`;
        return `<tr${isRec ? ' class="det-record"' : ""}>
          <td class="det-equipe" style="color:${t.color}">${t.label}${liveTag}${isRec ? `<span class="det-rec-star">⭐</span>` : ""}</td>
          <td class="det-val">${fmtSeg(it.tempo)}</td>
          <td class="det-carga">${cargaHtml}</td>
          <td class="det-pts">${it.tempo !== null ? pts : "—"}</td>
        </tr>`;
      } else {
        const pts = (rr.montPts[it.team] || 0) + (rr.giroPts[it.team] || 0);
        const isRec = it.giro !== null && it.giro === globalBest;
        return `<tr${isRec ? ' class="det-record"' : ""}>
          <td class="det-equipe" style="color:${t.color}">${t.label}${liveTag}${isRec ? `<span class="det-rec-star">⭐</span>` : ""}</td>
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

// ── Provas por Ano ────────────────────────────────────────────────
function checkProvaAno(st, data) {
  if (data?.ts && data.ts !== st.prevTs) {
    st.prevTs = data.ts;
    st.resultado = data;
  } else if (!data) {
    st.resultado = null;
  }
}

function renderProvaAno(st, ano) {
  const painel = document.getElementById(`painel-${ano}ano`);
  const rankEl = document.getElementById(`tano-ranking-${ano}`);
  if (!painel || !rankEl) return;

  const res = st.resultado;
  if (!res?.ranking || !Array.isArray(res.ranking)) {
    painel.hidden = true;
    return;
  }
  painel.hidden = false;

  const medals = ["🥇","🥈","🥉","🏅"];
  const rows = res.ranking.map((teamId, idx) => {
    const team = TERCEIRO_ANO_TEAMS.find(t => t.id === teamId);
    if (!team) return "";
    const tc = team.dark ? "#3A3000" : "#fff";
    return `
      <div class="tano-row" style="background:${team.color}">
        <div class="tano-row-medal">${medals[idx] ?? (idx+1)+"º"}</div>
        <div class="tano-row-nome" style="color:${tc}">${team.label}</div>
        <div class="tano-row-pts" style="color:${tc}cc">${SCORES_3ANO[idx]}<span class="tano-row-pts-label" style="color:${tc}88">pts</span></div>
      </div>`;
  }).join("");

  rankEl.innerHTML = `<div class="tano-list">${rows}</div>`;
}

// ── Classificação Geral ───────────────────────────────────────────
function renderGeralRanking(ponteTotals, spinnerTotals) {
  const painel = document.getElementById("painel-geral");
  const rankEl = document.getElementById("geral-ranking");
  if (!painel || !rankEl) return;

  const hasPonte   = Object.values(ponteTotals).some(v => v > 0);
  const hasSpinner = Object.values(spinnerTotals).some(v => v > 0);
  const has3       = !!ST.terceiroAno.resultado?.ranking;
  const has4       = !!ST.quartoAno.resultado?.ranking;
  const has5       = !!ST.quintoAno.resultado?.ranking;

  if (!hasPonte && !hasSpinner && !has3 && !has4 && !has5) {
    painel.hidden = true;
    return;
  }
  painel.hidden = false;

  const totals = {};
  COLOR_TEAMS.forEach(ct => {
    totals[ct.id] =
      (ponteTotals[ct.ponteId]   || 0) +
      (spinnerTotals[ct.spinnerId] || 0);
  });

  [ST.terceiroAno, ST.quartoAno, ST.quintoAno].forEach(st => {
    if (!st.resultado?.ranking) return;
    st.resultado.ranking.forEach((teamId, idx) => {
      if (totals[teamId] !== undefined) totals[teamId] += SCORES_3ANO[idx];
    });
  });

  const maxPts = Math.max(1, ...COLOR_TEAMS.map(ct => totals[ct.id]));
  const sorted = [...COLOR_TEAMS].sort((a, b) => totals[b.id] - totals[a.id]);
  const medals = ["🥇","🥈","🥉","🏅"];

  rankEl.innerHTML = sorted.map((ct, idx) => {
    const pts = totals[ct.id];
    const tc  = ct.dark ? "#3A3000" : "#fff";
    const bar = Math.round((pts / maxPts) * 100);
    return `
      <div class="geral-card" style="background:${ct.color}">
        <div class="geral-medal">${medals[idx] ?? (idx+1)+"º"}</div>
        <div style="flex:1;min-width:0">
          <div class="geral-nome" style="color:${tc}">${ct.label}</div>
          <div style="height:4px;border-radius:100px;background:rgba(255,255,255,.2);margin-top:3px;overflow:hidden">
            <div style="width:${bar}%;height:100%;border-radius:100px;background:rgba(255,255,255,.7);transition:width .8s ease"></div>
          </div>
        </div>
        <div class="geral-pts" style="color:${tc}">${pts}<span class="geral-pts-label" style="color:${tc}88">pts</span></div>
      </div>`;
  }).join("");
}

// ── Render completo ──────────────────────────────────────────────
function render() {
  const rodsP = calcRodadasPonte();
  const rodsS = calcRodadasSpinner();
  const ponteTotals   = calcTotaisScope("ponte",   rodsP);
  const spinnerTotals = calcTotaisScope("spinner", rodsS);

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

  // Celebrando class nos painéis (destaque de recorde)
  ["ponte", "spinner"].forEach(scope => {
    const panelEl = document.getElementById(`painel-${scope}`);
    if (panelEl) panelEl.classList.toggle("celebrando", ST[scope].celebrando);
  });

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

  // Provas por Ano + Geral
  renderProvaAno(ST.terceiroAno, 3);
  renderProvaAno(ST.quartoAno,   4);
  renderProvaAno(ST.quintoAno,   5);
  renderGeralRanking(ponteTotals, spinnerTotals);

  // Sidebar vazio (placeholder)
  const sbVazio = document.getElementById("sidebar-vazio");
  if (sbVazio) {
    const anyVisible = ["painel-geral","painel-3ano","painel-4ano","painel-5ano"]
      .some(id => !document.getElementById(id)?.hidden);
    sbVazio.style.display = anyVisible ? "none" : "flex";
  }

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

// ── Preview mode (?preview=1) ─────────────────────────────────────
function _injectPreviewData() {
  ST.ponte.estado = "aguardando";
  // 4 rodadas completas — 1A=Vermelho, 1B=Azul, 1C=Verde, 1D=Amarelo
  // carga:true = suportou peso; tempo em segundos (menor = melhor)
  ST.ponte.data = {
    "ponte_r1_1A": { tempo: 12.3, carga: true  },
    "ponte_r1_1B": { tempo: 15.1, carga: true  },
    "ponte_r1_1C": { tempo: 18.2, carga: false },
    "ponte_r1_1D": { tempo: 11.8, carga: true  },
    "ponte_r2_1A": { tempo: 13.0, carga: true  },
    "ponte_r2_1B": { tempo: 14.5, carga: true  },
    "ponte_r2_1C": { tempo: 17.0, carga: true  },
    "ponte_r2_1D": { tempo: 12.5, carga: true  },
    "ponte_r3_1A": { tempo: 11.2, carga: true  },
    "ponte_r3_1B": { tempo: 16.3, carga: false },
    "ponte_r3_1C": { tempo: 14.8, carga: true  },
    "ponte_r3_1D": { tempo: 13.7, carga: true  },
    "ponte_r4_1A": { tempo: 10.9, carga: true  },
    "ponte_r4_1B": { tempo: 13.2, carga: true  },
    "ponte_r4_1C": { tempo: 15.5, carga: true  },
    "ponte_r4_1D": { tempo: 14.1, carga: true  },
  };

  ST.spinner.estado = "aguardando";
  // 4 rodadas completas — 2A=Vermelho, 2B=Azul, 2C=Verde, 2D=Amarelo
  // giro em segundos (maior = melhor)
  ST.spinner.data = {
    "r1_2A": { montagem: 8.2,  giro: 12.5 },
    "r1_2B": { montagem: 9.1,  giro: 10.3 },
    "r1_2C": { montagem: 7.8,  giro: 14.2 },
    "r1_2D": { montagem: 10.5, giro:  9.8 },
    "r2_2A": { montagem: 7.9,  giro: 13.1 },
    "r2_2B": { montagem: 8.6,  giro: 11.7 },
    "r2_2C": { montagem: 8.1,  giro: 15.0 },
    "r2_2D": { montagem: 9.8,  giro: 10.6 },
    "r3_2A": { montagem: 7.5,  giro: 14.8 },
    "r3_2B": { montagem: 8.9,  giro: 12.4 },
    "r3_2C": { montagem: 7.2,  giro: 16.3 },
    "r3_2D": { montagem: 9.3,  giro:  9.1 },
    "r4_2A": { montagem: 8.0,  giro: 13.9 },
    "r4_2B": { montagem: 9.4,  giro: 11.0 },
    "r4_2C": { montagem: 7.6,  giro: 15.7 },
    "r4_2D": { montagem: 10.1, giro:  8.5 },
  };

  // 3º/4º/5º Ano — ainda não publicados (aguardando)
  ST.terceiroAno.resultado = null;
  ST.quartoAno.resultado   = null;
  ST.quintoAno.resultado   = null;

  const hdr = document.getElementById("telao-header");
  if (hdr) {
    const b = document.createElement("div");
    b.textContent = "🧪 PREVIEW";
    b.style.cssText = "font-size:clamp(9px,1vw,13px);font-weight:800;letter-spacing:.1em;background:#9333ea;color:#fff;padding:4px 12px;border-radius:100px;white-space:nowrap";
    hdr.appendChild(b);
  }
}

// ── Start ────────────────────────────────────────────────────────
if (/[?&]preview=1/.test(location.search)) {
  _injectPreviewData();
  render();
} else {
  poll();
  _pollId = setInterval(poll, _pollMs);
}
