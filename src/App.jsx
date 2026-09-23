import React, { useState, useEffect, useRef, useCallback } from "react";
import { safeGet, safeSet, safeDelete } from "./firebase.js";

const TEAMS = [
  { id: "2A", label: "2º A", color: "#D92B2B" },
  { id: "2B", label: "2º B", color: "#004B8D" },
  { id: "2C", label: "2º C", color: "#2E9E4F" },
  { id: "2D", label: "2º D", color: "#F0B800", dark: true },
];
const TEAMS_1ANO = [
  { id: "1A", label: "1º A", color: "#D92B2B" },
  { id: "1B", label: "1º B", color: "#004B8D" },
  { id: "1C", label: "1º C", color: "#2E9E4F" },
  { id: "1D", label: "1º D", color: "#F0B800", dark: true },
];
const ROUNDS = [1, 2, 3, 4];
const AZUL = "#004B8D";
const AZUL_ESCURO = "#002B52";
const LARANJA = "#F5821F";
const MONTAGEM_WARN_SECS = 180;

function keyFor(round, teamId) {
  return `r${round}_${teamId}`;
}

function liveKeyFor(round, teamId) {
  return `live_r${round}_${teamId}`;
}

// ── Ponte de Da Vinci ─────────────────────────────────────────────
function ponteKeyFor(round, teamId) {
  return `ponte_r${round}_${teamId}`;
}
function ponteLiveKeyFor(round, teamId) {
  return `ponte_live_r${round}_${teamId}`;
}

function formatTime(sec) {
  if (sec === null || sec === undefined) return "--";
  return sec.toFixed(1) + "s";
}

function rankPoints(items, higherBetter) {
  const present = items.filter((it) => it.value !== null && it.value !== undefined);
  if (present.length === 0) return {};
  const sorted = [...present].sort((a, b) =>
    higherBetter ? b.value - a.value : a.value - b.value
  );
  const pts = [4, 3, 2, 1];
  const result = {};
  let lastValue = null;
  let lastPoints = null;
  sorted.forEach((it, idx) => {
    let p;
    if (lastValue !== null && it.value === lastValue) {
      p = lastPoints;
    } else {
      p = pts[idx] !== undefined ? pts[idx] : 1;
    }
    result[it.team] = p;
    lastValue = it.value;
    lastPoints = p;
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

function Timer({ label, icon, running, elapsed, onStart, onStop, disabled, accent, warn }) {
  return (
    <div
      className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border"
      style={{ borderColor: warn ? "#F5821F" : "#E5E7EB" }}
    >
      <div className="text-sm font-semibold" style={{ color: AZUL }}>
        {icon} {label}
      </div>
      <div
        className="text-5xl font-bold tabular-nums"
        style={{ color: warn ? "#D92B2B" : "#111827" }}
      >
        {elapsed.toFixed(1)}s
      </div>
      {warn && (
        <div className="text-xs font-bold" style={{ color: "#D92B2B" }}>
          ⚠️ Tempo elevado
        </div>
      )}
      {!running ? (
        <button
          disabled={disabled}
          onClick={onStart}
          className="px-6 py-2 rounded-full text-white font-bold disabled:opacity-40 w-full"
          style={{ backgroundColor: accent }}
        >
          Iniciar
        </button>
      ) : (
        <button
          onClick={onStop}
          className="px-6 py-2 rounded-full text-white font-bold w-full"
          style={{ backgroundColor: "#D92B2B" }}
        >
          Parar
        </button>
      )}
    </div>
  );
}

function MonitorView() {
  const [round, setRound] = useState(1);
  const [teamId, setTeamId] = useState("2A");

  const [montagemRunning, setMontagemRunning] = useState(false);
  const [montagemElapsed, setMontagemElapsed] = useState(0);
  const [montagemStart, setMontagemStart] = useState(null);
  const [montagemFinal, setMontagemFinal] = useState(null);

  const [giroRunning, setGiroRunning] = useState(false);
  const [giroElapsed, setGiroElapsed] = useState(0);
  const [giroStart, setGiroStart] = useState(null);
  const [giroFinal, setGiroFinal] = useState(null);

  const [cargaFinal, setCargaFinal] = useState(null);
  const [cargaInput, setCargaInput] = useState("");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [existing, setExisting] = useState(null);
  const [allRounds, setAllRounds] = useState({});

  const montagemTickRef = useRef(null);
  const giroTickRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeGet(keyFor(round, teamId));
      if (!cancelled) {
        setExisting(data);
        setMontagemFinal(data?.montagem ?? null);
        setGiroFinal(data?.giro ?? null);
        setCargaFinal(data?.carga ?? null);
        setCargaInput(data?.carga != null ? String(data.carga) : "");
        setMontagemElapsed(data?.montagem ?? 0);
        setGiroElapsed(data?.giro ?? 0);
        setSaved(false);
        setSaveError(false);
      }

      const hist = {};
      for (const r of ROUNDS) {
        const v = await safeGet(keyFor(r, teamId));
        if (!cancelled) hist[r] = v;
      }
      if (!cancelled) setAllRounds(hist);
    })();
    setMontagemRunning(false);
    setGiroRunning(false);
    return () => { cancelled = true; };
  }, [round, teamId]);

  useEffect(() => {
    const isLive = montagemRunning || giroRunning;
    if (isLive) {
      safeSet(liveKeyFor(round, teamId), { montagemRunning, giroRunning });
    } else {
      safeDelete(liveKeyFor(round, teamId));
    }
  }, [montagemRunning, giroRunning, round, teamId]);

  useEffect(() => {
    if (montagemRunning) {
      montagemTickRef.current = setInterval(() => {
        setMontagemElapsed((Date.now() - montagemStart) / 1000);
      }, 100);
    } else {
      clearInterval(montagemTickRef.current);
    }
    return () => clearInterval(montagemTickRef.current);
  }, [montagemRunning, montagemStart]);

  useEffect(() => {
    if (giroRunning) {
      giroTickRef.current = setInterval(() => {
        setGiroElapsed((Date.now() - giroStart) / 1000);
      }, 100);
    } else {
      clearInterval(giroTickRef.current);
    }
    return () => clearInterval(giroTickRef.current);
  }, [giroRunning, giroStart]);

  const startMontagem = () => {
    setMontagemStart(Date.now());
    setMontagemElapsed(0);
    setMontagemRunning(true);
    setMontagemFinal(null);
    setSaved(false);
    setSaveError(false);
  };
  const stopMontagem = () => {
    const t = (Date.now() - montagemStart) / 1000;
    setMontagemElapsed(t);
    setMontagemFinal(t);
    setMontagemRunning(false);
  };
  const startGiro = () => {
    setGiroStart(Date.now());
    setGiroElapsed(0);
    setGiroRunning(true);
    setGiroFinal(null);
    setSaved(false);
    setSaveError(false);
  };
  const stopGiro = () => {
    const t = (Date.now() - giroStart) / 1000;
    setGiroElapsed(t);
    setGiroFinal(t);
    setGiroRunning(false);
  };

  const canSave =
    montagemFinal !== null && giroFinal !== null && cargaFinal !== null && !montagemRunning && !giroRunning;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    const ok = await safeSet(keyFor(round, teamId), {
      montagem: montagemFinal,
      carga: cargaFinal,
      giro: giroFinal,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      const newData = { montagem: montagemFinal, carga: cargaFinal, giro: giroFinal };
      setExisting(newData);
      setAllRounds((prev) => ({ ...prev, [round]: newData }));
    } else {
      setSaveError(true);
    }
  };

  const handleReset = async () => {
    const team = TEAMS.find((t) => t.id === teamId);
    const confirmed = window.confirm(
      `Apagar resultado de ${team?.label} na Rodada ${round}?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await safeDelete(keyFor(round, teamId));
    setMontagemFinal(null);
    setGiroFinal(null);
    setCargaFinal(null);
    setCargaInput("");
    setMontagemElapsed(0);
    setGiroElapsed(0);
    setExisting(null);
    setSaved(false);
    setSaveError(false);
    setAllRounds((prev) => ({ ...prev, [round]: null }));
  };

  const handleResetTournament = async () => {
    const confirmed = window.confirm(
      "⚠️ ZERAR TORNEIO INTEIRO?\n\nTodos os resultados de todas as rodadas e equipes serão apagados permanentemente.\n\nClique em OK para confirmar."
    );
    if (!confirmed) return;
    for (const r of ROUNDS) {
      for (const t of TEAMS) {
        await safeDelete(keyFor(r, t.id));
        await safeDelete(liveKeyFor(r, t.id));
      }
    }
    setExisting(null);
    setMontagemFinal(null);
    setGiroFinal(null);
    setCargaFinal(null);
    setCargaInput("");
    setMontagemElapsed(0);
    setGiroElapsed(0);
    setSaved(false);
    setSaveError(false);
    setAllRounds({});
  };

  const team = TEAMS.find((t) => t.id === teamId);
  const montagemWarn = montagemRunning && montagemElapsed >= MONTAGEM_WARN_SECS;
  const hasHistory = Object.values(allRounds).some((v) => v !== null && v !== undefined);

  return (
    <div className="flex flex-col gap-5 p-4 max-w-xl mx-auto">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
          Rodada
        </div>
        <div className="flex gap-2 mb-4">
          {ROUNDS.map((r) => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className="flex-1 py-2 rounded-xl font-bold"
              style={{
                backgroundColor: round === r ? AZUL : "#EAF2FB",
                color: round === r ? "#fff" : AZUL,
              }}
            >
              R{r}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
          Equipe (grupo desta rodada)
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TEAMS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTeamId(t.id)}
              className="py-2 rounded-xl font-bold text-sm"
              style={{
                backgroundColor: t.id === teamId ? t.color : "#F3F4F6",
                color: t.id === teamId ? (t.dark ? "#3A3000" : "#fff") : "#374151",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Timer
          label="Montagem"
          icon="⏱️"
          running={montagemRunning}
          elapsed={montagemElapsed}
          onStart={startMontagem}
          onStop={stopMontagem}
          disabled={giroRunning}
          accent={AZUL}
          warn={montagemWarn}
        />
        <Timer
          label="Giro"
          icon="🌀"
          running={giroRunning}
          elapsed={giroElapsed}
          onStart={startGiro}
          onStop={stopGiro}
          disabled={montagemFinal === null || montagemRunning}
          accent={LARANJA}
          warn={false}
        />
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="text-sm font-semibold mb-2" style={{ color: AZUL }}>⚖️ Carga suportada (g)</div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Ex: 250"
            value={cargaInput}
            onChange={(e) => {
              setCargaInput(e.target.value);
              const n = parseFloat(e.target.value);
              setCargaFinal(!isNaN(n) && n >= 0 ? n : null);
              setSaved(false);
            }}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-lg font-bold text-center tabular-nums focus:outline-none focus:ring-2"
            style={{ color: AZUL }}
          />
          <span className="text-sm text-gray-500 font-medium">gramas</span>
        </div>
        {cargaFinal !== null && (
          <div className="text-xs text-gray-500 mt-1 text-center">✓ {cargaFinal} g registrado</div>
        )}
      </div>

      <button
        disabled={!canSave || saving}
        onClick={handleSave}
        className="w-full py-3 rounded-2xl font-bold text-lg disabled:opacity-40"
        style={{ backgroundColor: team.color, color: team.dark ? "#3A3000" : "#fff" }}
      >
        {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar resultado"}
      </button>

      {saveError && (
        <div className="text-center text-sm font-bold text-red-600 bg-red-50 rounded-xl py-2 px-4">
          ✗ Erro ao salvar — verifique a conexão e tente novamente
        </div>
      )}

      {existing && (existing.montagem !== null || existing.giro !== null) && (
        <div className="text-center text-sm text-gray-500">
          Último salvo — Montagem: {formatTime(existing.montagem)} · Carga: {existing.carga != null ? `${existing.carga} g` : "--"} · Giro:{" "}
          {formatTime(existing.giro)}
          <button onClick={handleReset} className="ml-3 underline text-red-600">
            Refazer
          </button>
        </div>
      )}

      {hasHistory && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
            Histórico — {team.label}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#EAF2FB" }}>
                <th className="text-left px-2 py-1">Rodada</th>
                <th className="px-2 py-1">Montagem</th>
                <th className="px-2 py-1">Carga</th>
                <th className="px-2 py-1">Giro</th>
              </tr>
            </thead>
            <tbody>
              {ROUNDS.map((r) => {
                const v = allRounds[r];
                const isCurrent = r === round;
                return (
                  <tr
                    key={r}
                    className="border-t border-gray-100"
                    style={{ backgroundColor: isCurrent ? "#FFF7ED" : undefined }}
                  >
                    <td className="px-2 py-1 font-semibold text-gray-700">
                      R{r}
                      {isCurrent && (
                        <span className="ml-1 text-xs" style={{ color: LARANJA }}>←</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600">
                      {formatTime(v?.montagem)}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600">
                      {v?.carga != null ? `${v.carga} g` : "--"}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600">
                      {formatTime(v?.giro)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 pb-2">
        Mesa: {team.label} · Rodada {round} — os tempos são enviados ao telão
        automaticamente após salvar.
      </div>

      <div className="border-t border-gray-200 pt-3 pb-4">
        <button
          onClick={handleResetTournament}
          className="w-full py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50"
        >
          ⚠️ Zerar torneio inteiro
        </button>
      </div>
    </div>
  );
}

function TelaoView() {
  const [data, setData] = useState({});
  const [liveKeys, setLiveKeys] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    const entries = {};
    const live = {};
    for (const r of ROUNDS) {
      for (const t of TEAMS) {
        const k = keyFor(r, t.id);
        const v = await safeGet(k);
        if (v) entries[k] = v;

        const lv = await safeGet(liveKeyFor(r, t.id));
        if (lv) live[`${r}_${t.id}`] = lv;
      }
    }
    setData(entries);
    setLiveKeys(live);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const roundResults = ROUNDS.map((r) => {
    const items = TEAMS.map((t) => {
      const v = data[keyFor(r, t.id)];
      return { team: t.id, montagem: v?.montagem ?? null, carga: v?.carga ?? null, giro: v?.giro ?? null };
    });
    const complete = items.every((it) => it.montagem !== null && it.carga !== null && it.giro !== null);
    const hasAny   = items.some((it) => it.montagem !== null || it.carga !== null || it.giro !== null);
    let montPts = {};
    let cargaPts = {};
    let giroPts = {};
    if (hasAny) {
      const comMontagem = items.filter((it) => it.montagem !== null);
      const comCarga    = items.filter((it) => it.carga !== null);
      const comGiro     = items.filter((it) => it.giro !== null);
      montPts  = rankPoints(comMontagem.map((it) => ({ team: it.team, value: it.montagem })), false);
      cargaPts = rankPoints(comCarga.map((it)    => ({ team: it.team, value: it.carga })),    true);
      giroPts  = rankPoints(comGiro.map((it)     => ({ team: it.team, value: it.giro })),     true);
    }
    return { round: r, items, complete, hasAny, montPts, cargaPts, giroPts };
  });

  const totals = {};
  TEAMS.forEach((t) => (totals[t.id] = 0));
  roundResults.forEach((rr) => {
    if (rr.hasAny) {
      TEAMS.forEach((t) => {
        totals[t.id] += (rr.montPts[t.id] || 0) + (rr.cargaPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
      });
    }
  });

  const ranking = [...TEAMS].sort((a, b) => {
    const diff = totals[b.id] - totals[a.id];
    if (diff !== 0) return diff;
    return countGiroFirsts(roundResults, b.id) - countGiroFirsts(roundResults, a.id);
  });
  const maxTotal = Math.max(1, ...TEAMS.map((t) => totals[t.id]));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <div
          className="text-center text-sm font-bold tracking-widest mb-1"
          style={{ color: LARANJA }}
        >
          SESI — TORNEIO INFANTIL
        </div>
        <h1
          className="text-center text-3xl md:text-4xl font-extrabold"
          style={{ color: AZUL }}
        >
          🏆 Ranking — Lançador de Spinner
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {ranking.map((t, idx) => {
          const isLiveAny = ROUNDS.some((r) => liveKeys[`${r}_${t.id}`]);
          return (
            <div
              key={t.id}
              className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: t.color }}
            >
              <div
                className="flex items-center justify-center rounded-full font-extrabold text-xl w-10 h-10 shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  color: t.dark ? "#3A3000" : "#fff",
                }}
              >
                {idx + 1}º
              </div>
              <div
                className="font-bold text-xl md:text-2xl flex items-center gap-2"
                style={{ color: t.dark ? "#3A3000" : "#fff", flex: "1" }}
              >
                {t.label}
                {isLiveAny && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#D92B2B", color: "#fff" }}
                  >
                    🔴 ao vivo
                  </span>
                )}
              </div>
              <div
                className="h-4 rounded-full overflow-hidden hidden md:block"
                style={{ flex: "1", backgroundColor: "rgba(255,255,255,0.3)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(totals[t.id] / maxTotal) * 100}%`,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    transition: "width 0.7s ease",
                  }}
                />
              </div>
              <div
                className="font-extrabold text-2xl md:text-3xl tabular-nums"
                style={{ color: t.dark ? "#3A3000" : "#fff" }}
              >
                {totals[t.id]} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Vencedores por rodada */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: AZUL }}>
          🥇 Vencedor por rodada
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {roundResults.map((rr) => {
            let winners = [];
            let maxPts = 0;
            if (rr.hasAny) {
              TEAMS.forEach((t) => {
                const pts = (rr.montPts[t.id] || 0) + (rr.cargaPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
                if (pts > maxPts) { maxPts = pts; winners = [t]; }
                else if (pts === maxPts && pts > 0) { winners.push(t); }
              });
            }
            const isTie = winners.length > 1;
            return (
              <div key={rr.round} className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className="px-3 py-1.5 text-xs font-bold text-white text-center" style={{ backgroundColor: AZUL }}>
                  Rodada {rr.round}
                  {rr.hasAny && !rr.complete && <span className="ml-1 opacity-70">(parcial)</span>}
                </div>
                {rr.hasAny ? (
                  <div className="p-3 flex flex-col items-center gap-1"
                    style={{ backgroundColor: (winners[0]?.color ?? "#ccc") + "22" }}>
                    <div className="text-2xl">{isTie ? "🤝" : "🏆"}</div>
                    <div className="font-extrabold text-sm text-center" style={{ color: AZUL }}>
                      {isTie ? winners.map((w) => w.label).join(" · ") : winners[0]?.label}
                    </div>
                    <div className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: isTie ? "#6B7280" : winners[0]?.color }}>
                      {maxPts} pts{!rr.complete && " *"}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 flex flex-col items-center gap-1 bg-gray-50">
                    <div className="text-xl text-gray-300">⏳</div>
                    <div className="text-xs text-gray-400 text-center">aguardando</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold" style={{ color: AZUL }}>
          Detalhe por rodada
        </h2>
        {roundResults.map((rr) => (
          <div
            key={rr.round}
            className="rounded-2xl border overflow-hidden border-gray-200"
          >
            <div className="px-4 py-2 font-bold text-white flex items-center justify-between" style={{ backgroundColor: AZUL }}>
              <span>Rodada {rr.round}</span>
              {!rr.complete && (
                <span className="text-xs font-normal opacity-80">
                  {rr.hasAny ? "parcial — aguardando equipes..." : "aguardando resultados..."}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#EAF2FB" }}>
                  <th className="text-left px-3 py-2">Equipe</th>
                  <th className="px-3 py-2">Montagem</th>
                  <th className="px-3 py-2">Carga</th>
                  <th className="px-3 py-2">Giro</th>
                  <th className="px-3 py-2">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {rr.items.map((it) => {
                  const t = TEAMS.find((x) => x.id === it.team);
                  const pts = rr.complete
                    ? (rr.montPts[it.team] || 0) + (rr.cargaPts[it.team] || 0) + (rr.giroPts[it.team] || 0)
                    : null;
                  const isLive = !!liveKeys[`${rr.round}_${it.team}`];
                  return (
                    <tr key={it.team} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-semibold" style={{ color: t.color }}>
                        {t.label}
                        {isLive && (
                          <span className="ml-1 text-xs font-bold" style={{ color: "#D92B2B" }}>
                            🔴
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{formatTime(it.montagem)}</td>
                      <td className="px-3 py-2 text-center">{it.carga != null ? `${it.carga} g` : "--"}</td>
                      <td className="px-3 py-2 text-center">{formatTime(it.giro)}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        {pts !== null ? pts : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {lastUpdate && (
        <div className="text-center text-xs text-gray-400">
          Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")}
        </div>
      )}

      {/* Acesso rápido aos estojos de insígnias */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-base font-bold mb-3" style={{ color: AZUL }}>
          🏅 Estojos de Insígnias — acesso rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "vermelha", nome: "Turma A · Vermelha", cor: "#E5484D" },
            { id: "azul",     nome: "Turma B · Azul",     cor: "#2F8FE0" },
            { id: "verde",    nome: "Turma C · Verde",     cor: "#3C9A5F" },
            { id: "amarela",  nome: "Turma D · Amarela",   cor: "#E0B23C" },
          ].map(t => (
            <a
              key={t.id}
              href={`/insignias/areas.html#/equipe/${t.id}`}
              className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 font-bold text-sm text-white no-underline"
              style={{ backgroundColor: t.cor, textDecoration: "none" }}
            >
              <span>{t.nome}</span>
              <span style={{ opacity: .75 }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Ponte de Da Vinci — Monitor ───────────────────────────────────
function PonteMonitorView() {
  const [round, setRound] = useState(1);
  const [teamId, setTeamId] = useState("1A");

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTs, setStartTs] = useState(null);
  const [tempoFinal, setTempoFinal] = useState(null);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [existing, setExisting] = useState(null);
  const [allRounds, setAllRounds] = useState({});

  const tickRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeGet(ponteKeyFor(round, teamId));
      if (!cancelled) {
        setExisting(data);
        setTempoFinal(data?.tempo ?? null);
        setElapsed(data?.tempo ?? 0);
        setSaved(false);
        setSaveError(false);
      }
      const hist = {};
      for (const r of ROUNDS) {
        const v = await safeGet(ponteKeyFor(r, teamId));
        if (!cancelled) hist[r] = v;
      }
      if (!cancelled) setAllRounds(hist);
    })();
    setRunning(false);
    return () => { cancelled = true; };
  }, [round, teamId]);

  useEffect(() => {
    if (running) {
      safeSet(ponteLiveKeyFor(round, teamId), { running: true });
      tickRef.current = setInterval(() => {
        setElapsed((Date.now() - startTs) / 1000);
      }, 100);
    } else {
      clearInterval(tickRef.current);
      safeDelete(ponteLiveKeyFor(round, teamId));
    }
    return () => clearInterval(tickRef.current);
  }, [running, startTs, round, teamId]);

  const start = () => {
    setStartTs(Date.now());
    setElapsed(0);
    setRunning(true);
    setTempoFinal(null);
    setSaved(false);
    setSaveError(false);
  };

  const stop = () => {
    const t = (Date.now() - startTs) / 1000;
    setElapsed(t);
    setTempoFinal(t);
    setRunning(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    const ok = await safeSet(ponteKeyFor(round, teamId), { tempo: tempoFinal });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setExisting({ tempo: tempoFinal });
      setAllRounds((prev) => ({ ...prev, [round]: { tempo: tempoFinal } }));
    } else {
      setSaveError(true);
    }
  };

  const handleReset = async () => {
    const team = TEAMS_1ANO.find((t) => t.id === teamId);
    if (!window.confirm(`Apagar resultado de ${team?.label} na Rodada ${round}?`)) return;
    await safeDelete(ponteKeyFor(round, teamId));
    setTempoFinal(null);
    setElapsed(0);
    setExisting(null);
    setSaved(false);
    setSaveError(false);
    setAllRounds((prev) => ({ ...prev, [round]: null }));
  };

  const handleResetAll = async () => {
    if (!window.confirm("⚠️ ZERAR TORNEIO INTEIRO — PONTE?\n\nTodos os resultados serão apagados.\n\nOK para confirmar.")) return;
    for (const r of ROUNDS) {
      for (const t of TEAMS_1ANO) {
        await safeDelete(ponteKeyFor(r, t.id));
        await safeDelete(ponteLiveKeyFor(r, t.id));
      }
    }
    setTempoFinal(null);
    setElapsed(0);
    setExisting(null);
    setSaved(false);
    setSaveError(false);
    setAllRounds({});
  };

  const team = TEAMS_1ANO.find((t) => t.id === teamId);
  const canSave = tempoFinal !== null && !running;
  const hasHistory = Object.values(allRounds).some((v) => v !== null && v !== undefined);

  return (
    <div className="flex flex-col gap-5 p-4 max-w-xl mx-auto">
      {/* Seletor rodada + equipe */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Rodada</div>
        <div className="flex gap-2 mb-4">
          {ROUNDS.map((r) => (
            <button key={r} onClick={() => setRound(r)} className="flex-1 py-2 rounded-xl font-bold"
              style={{ backgroundColor: round === r ? AZUL : "#EAF2FB", color: round === r ? "#fff" : AZUL }}>
              R{r}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Equipe</div>
        <div className="grid grid-cols-4 gap-2">
          {TEAMS_1ANO.map((t) => (
            <button key={t.id} onClick={() => setTeamId(t.id)} className="py-2 rounded-xl font-bold text-sm"
              style={{ backgroundColor: t.id === teamId ? t.color : "#F3F4F6", color: t.id === teamId ? (t.dark ? "#3A3000" : "#fff") : "#374151" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center gap-4">
        <div className="text-sm font-bold text-gray-500">🌉 PONTE DE DA VINCI — TEMPO DE MONTAGEM</div>
        <div className="text-6xl font-bold tabular-nums" style={{ color: running ? "#D92B2B" : AZUL }}>
          {elapsed.toFixed(1)}s
        </div>
        {!running ? (
          <button onClick={start} className="px-8 py-3 rounded-full text-white font-bold text-lg w-full"
            style={{ backgroundColor: AZUL }}>
            Iniciar cronômetro
          </button>
        ) : (
          <button onClick={stop} className="px-8 py-3 rounded-full text-white font-bold text-lg w-full"
            style={{ backgroundColor: "#D92B2B" }}>
            ⏹ Parar
          </button>
        )}
      </div>

      {/* Salvar */}
      <button disabled={!canSave || saving} onClick={handleSave}
        className="w-full py-3 rounded-2xl font-bold text-lg disabled:opacity-40"
        style={{ backgroundColor: team.color, color: team.dark ? "#3A3000" : "#fff" }}>
        {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar resultado"}
      </button>

      {saveError && (
        <div className="text-center text-sm font-bold text-red-600 bg-red-50 rounded-xl py-2 px-4">
          ✗ Erro ao salvar — verifique a conexão
        </div>
      )}

      {existing?.tempo != null && (
        <div className="text-center text-sm text-gray-500">
          Salvo: {formatTime(existing.tempo)}
          <button onClick={handleReset} className="ml-3 underline text-red-600">Refazer</button>
        </div>
      )}

      {/* Histórico */}
      {hasHistory && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <div className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
            Histórico — {team.label}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#EAF2FB" }}>
                <th className="text-left px-2 py-1">Rodada</th>
                <th className="px-2 py-1">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {ROUNDS.map((r) => {
                const v = allRounds[r];
                return (
                  <tr key={r} className="border-t border-gray-100"
                    style={{ backgroundColor: r === round ? "#FFF7ED" : undefined }}>
                    <td className="px-2 py-1 font-semibold text-gray-700">
                      R{r}{r === round && <span className="ml-1 text-xs" style={{ color: LARANJA }}>←</span>}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600">{formatTime(v?.tempo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 pb-2">
        Mesa: {team.label} · Rodada {round} — tempo enviado ao telão após salvar.
      </div>

      <div className="border-t border-gray-200 pt-3 pb-4">
        <button onClick={handleResetAll}
          className="w-full py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50">
          ⚠️ Zerar torneio inteiro (Ponte)
        </button>
      </div>
    </div>
  );
}

// ── Ponte de Da Vinci — Telão ─────────────────────────────────────
function PonteTelaoView() {
  const [data, setData] = useState({});
  const [liveKeys, setLiveKeys] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    const entries = {};
    const live = {};
    for (const r of ROUNDS) {
      for (const t of TEAMS_1ANO) {
        const v = await safeGet(ponteKeyFor(r, t.id));
        if (v) entries[ponteKeyFor(r, t.id)] = v;
        const lv = await safeGet(ponteLiveKeyFor(r, t.id));
        if (lv) live[`${r}_${t.id}`] = lv;
      }
    }
    setData(entries);
    setLiveKeys(live);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const roundResults = ROUNDS.map((r) => {
    const items = TEAMS_1ANO.map((t) => {
      const v = data[ponteKeyFor(r, t.id)];
      return { team: t.id, tempo: v?.tempo ?? null };
    });
    const complete = items.every((it) => it.tempo !== null);
    const hasAny   = items.some((it) => it.tempo !== null);
    let pts = {};
    if (hasAny) {
      const comTempo = items.filter((it) => it.tempo !== null);
      pts = rankPoints(comTempo.map((it) => ({ team: it.team, value: it.tempo })), false);
    }
    return { round: r, items, complete, hasAny, pts };
  });

  const totals = {};
  TEAMS_1ANO.forEach((t) => (totals[t.id] = 0));
  roundResults.forEach((rr) => {
    if (rr.hasAny) TEAMS_1ANO.forEach((t) => { totals[t.id] += rr.pts[t.id] || 0; });
  });

  const ranking = [...TEAMS_1ANO].sort((a, b) => totals[b.id] - totals[a.id]);
  const maxTotal = Math.max(1, ...TEAMS_1ANO.map((t) => totals[t.id]));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <div className="text-center text-sm font-bold tracking-widest mb-1" style={{ color: LARANJA }}>
          SESI — TORNEIO INFANTIL
        </div>
        <h1 className="text-center text-3xl md:text-4xl font-extrabold" style={{ color: AZUL }}>
          🌉 Ranking — Ponte de Da Vinci
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1">Menor tempo = melhor colocação</p>
      </div>

      {/* Ranking geral */}
      <div className="flex flex-col gap-3">
        {ranking.map((t, idx) => {
          const isLive = ROUNDS.some((r) => liveKeys[`${r}_${t.id}`]);
          return (
            <div key={t.id} className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: t.color }}>
              <div className="flex items-center justify-center rounded-full font-extrabold text-xl w-10 h-10 shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.25)", color: t.dark ? "#3A3000" : "#fff" }}>
                {idx + 1}º
              </div>
              <div className="font-bold text-xl md:text-2xl flex items-center gap-2"
                style={{ color: t.dark ? "#3A3000" : "#fff", flex: "1" }}>
                {t.label}
                {isLive && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#D92B2B", color: "#fff" }}>
                    🔴 ao vivo
                  </span>
                )}
              </div>
              <div className="h-4 rounded-full overflow-hidden hidden md:block"
                style={{ flex: "1", backgroundColor: "rgba(255,255,255,0.3)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${(totals[t.id] / maxTotal) * 100}%`,
                  backgroundColor: "rgba(255,255,255,0.85)",
                  transition: "width 0.7s ease",
                }} />
              </div>
              <div className="font-extrabold text-2xl md:text-3xl tabular-nums"
                style={{ color: t.dark ? "#3A3000" : "#fff" }}>
                {totals[t.id]} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Vencedor por rodada */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: AZUL }}>🥇 Mais rápido por rodada</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {roundResults.map((rr) => {
            let winners = [];
            let maxPts = 0;
            let bestTime = null;
            if (rr.hasAny) {
              TEAMS_1ANO.forEach((t) => {
                const p = rr.pts[t.id] || 0;
                if (p > maxPts) { maxPts = p; winners = [t]; }
                else if (p === maxPts && p > 0) winners.push(t);
              });
              const winItem = rr.items.find((it) => it.team === winners[0]?.id);
              bestTime = winItem?.tempo ?? null;
            }
            const isTie = winners.length > 1;
            return (
              <div key={rr.round} className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className="px-3 py-1.5 text-xs font-bold text-white text-center" style={{ backgroundColor: AZUL }}>
                  Rodada {rr.round}
                  {rr.hasAny && !rr.complete && <span className="ml-1 opacity-70">(parcial)</span>}
                </div>
                {rr.hasAny ? (
                  <div className="p-3 flex flex-col items-center gap-1" style={{ backgroundColor: (winners[0]?.color ?? "#ccc") + "22" }}>
                    <div className="text-2xl">{isTie ? "🤝" : "🏆"}</div>
                    <div className="font-extrabold text-sm text-center" style={{ color: AZUL }}>
                      {isTie ? winners.map((w) => w.label).join(" · ") : winners[0]?.label}
                    </div>
                    {bestTime !== null && !isTie && (
                      <div className="text-xs text-gray-500 tabular-nums">{formatTime(bestTime)}</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 flex flex-col items-center gap-1 bg-gray-50">
                    <div className="text-xl text-gray-300">⏳</div>
                    <div className="text-xs text-gray-400 text-center">aguardando</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhe por rodada */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold" style={{ color: AZUL }}>Detalhe por rodada</h2>
        {roundResults.map((rr) => (
          <div key={rr.round} className="rounded-2xl border overflow-hidden border-gray-200">
            <div className="px-4 py-2 font-bold text-white flex items-center justify-between" style={{ backgroundColor: AZUL }}>
              <span>Rodada {rr.round}</span>
              {!rr.complete && <span className="text-xs font-normal opacity-80">{rr.hasAny ? "parcial — aguardando equipes..." : "aguardando resultados..."}</span>}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#EAF2FB" }}>
                  <th className="text-left px-3 py-2">Equipe</th>
                  <th className="px-3 py-2">Tempo</th>
                  <th className="px-3 py-2">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {[...rr.items].sort((a, b) => {
                  if (a.tempo === null) return 1;
                  if (b.tempo === null) return -1;
                  return a.tempo - b.tempo;
                }).map((it) => {
                  const t = TEAMS_1ANO.find((x) => x.id === it.team);
                  const pts = rr.hasAny ? (rr.pts[it.team] || 0) : null;
                  const isLive = !!liveKeys[`${rr.round}_${it.team}`];
                  return (
                    <tr key={it.team} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-semibold" style={{ color: t.color }}>
                        {t.label}
                        {isLive && <span className="ml-1 text-xs font-bold" style={{ color: "#D92B2B" }}>🔴</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{formatTime(it.tempo)}</td>
                      <td className="px-3 py-2 text-center font-bold">{pts !== null ? pts : "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {lastUpdate && (
        <div className="text-center text-xs text-gray-400">
          Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [prova, setProva] = useState("propulsao"); // "propulsao" | "ponte"
  const [mode, setMode]   = useState("monitor");   // "monitor"   | "telao"

  const provaLabel = prova === "propulsao" ? "🌀 Lançador de Spinner" : "🌉 Ponte de Da Vinci";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: AZUL_ESCURO }}>
        <div className="max-w-5xl mx-auto flex flex-col gap-2 px-4 py-3">
          {/* Linha 1: título + insígnias */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm md:text-base">{provaLabel}</span>
              <a href="/insignias/areas.html"
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)" }}>
                🏅 Insígnias
              </a>
            </div>
            {/* Seletor Monitor / Telão */}
            <div className="flex gap-1 bg-white bg-opacity-10 rounded-full p-1">
              <button onClick={() => setMode("monitor")}
                className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: mode === "monitor" ? LARANJA : "transparent" }}>
                Monitor
              </button>
              <button onClick={() => setMode("telao")}
                className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: mode === "telao" ? LARANJA : "transparent" }}>
                Telão
              </button>
            </div>
          </div>
          {/* Linha 2: seletor de prova */}
          <div className="flex gap-2">
            <button onClick={() => setProva("propulsao")}
              className="flex-1 py-1.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                backgroundColor: prova === "propulsao" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                color: prova === "propulsao" ? "#fff" : "rgba(255,255,255,0.55)",
                border: prova === "propulsao" ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent",
              }}>
              🌀 Lançador de Spinner
            </button>
            <button onClick={() => setProva("ponte")}
              className="flex-1 py-1.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                backgroundColor: prova === "ponte" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                color: prova === "ponte" ? "#fff" : "rgba(255,255,255,0.55)",
                border: prova === "ponte" ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent",
              }}>
              🌉 Ponte de Da Vinci
            </button>
          </div>
        </div>
      </div>

      {prova === "propulsao"
        ? (mode === "monitor" ? <MonitorView />      : <TelaoView />)
        : (mode === "monitor" ? <PonteMonitorView /> : <PonteTelaoView />)
      }
    </div>
  );
}
