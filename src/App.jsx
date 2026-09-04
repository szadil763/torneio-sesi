import React, { useState, useEffect, useRef, useCallback } from "react";
import { safeGet, safeSet, safeDelete } from "./firebase.js";

const TEAMS = [
  { id: "2A", label: "2º A", color: "#D92B2B" },
  { id: "2B", label: "2º B", color: "#004B8D" },
  { id: "2C", label: "2º C", color: "#2E9E4F" },
  { id: "2D", label: "2º D", color: "#F0B800", dark: true },
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
    montagemFinal !== null && giroFinal !== null && !montagemRunning && !giroRunning;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    const ok = await safeSet(keyFor(round, teamId), {
      montagem: montagemFinal,
      giro: giroFinal,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      const newData = { montagem: montagemFinal, giro: giroFinal };
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
          Último salvo — Montagem: {formatTime(existing.montagem)} · Giro:{" "}
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
      return { team: t.id, montagem: v?.montagem ?? null, giro: v?.giro ?? null };
    });
    const complete = items.every((it) => it.montagem !== null && it.giro !== null);
    let montPts = {};
    let giroPts = {};
    if (complete) {
      montPts = rankPoints(
        items.map((it) => ({ team: it.team, value: it.montagem })),
        false
      );
      giroPts = rankPoints(
        items.map((it) => ({ team: it.team, value: it.giro })),
        true
      );
    }
    return { round: r, items, complete, montPts, giroPts };
  });

  const totals = {};
  TEAMS.forEach((t) => (totals[t.id] = 0));
  roundResults.forEach((rr) => {
    if (rr.complete) {
      TEAMS.forEach((t) => {
        totals[t.id] += (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
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
          🏆 Ranking — Prova da Propulsão
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
            // Find winner(s): team(s) with highest round points
            let winners = [];
            let maxPts = 0;
            if (rr.complete) {
              TEAMS.forEach((t) => {
                const pts = (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
                if (pts > maxPts) { maxPts = pts; winners = [t]; }
                else if (pts === maxPts) { winners.push(t); }
              });
            }
            const isTie = winners.length > 1;
            return (
              <div
                key={rr.round}
                className="rounded-2xl overflow-hidden shadow-sm border border-gray-200"
              >
                <div
                  className="px-3 py-1.5 text-xs font-bold text-white text-center"
                  style={{ backgroundColor: AZUL }}
                >
                  Rodada {rr.round}
                </div>
                {rr.complete ? (
                  <div
                    className="p-3 flex flex-col items-center gap-1"
                    style={{ backgroundColor: winners[0]?.color + "22" }}
                  >
                    <div className="text-2xl">{isTie ? "🤝" : "🏆"}</div>
                    <div className="font-extrabold text-sm text-center" style={{ color: AZUL }}>
                      {isTie
                        ? winners.map((w) => w.label).join(" · ")
                        : winners[0]?.label}
                    </div>
                    <div
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: isTie ? "#6B7280" : winners[0]?.color }}
                    >
                      {maxPts} pts
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
            <div
              className="px-4 py-2 font-bold text-white flex items-center justify-between"
              style={{ backgroundColor: AZUL }}
            >
              <span>Rodada {rr.round}</span>
              {!rr.complete && (
                <span className="text-xs font-normal opacity-80">
                  aguardando resultados...
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#EAF2FB" }}>
                  <th className="text-left px-3 py-2">Equipe</th>
                  <th className="px-3 py-2">Montagem</th>
                  <th className="px-3 py-2">Giro</th>
                  <th className="px-3 py-2">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {rr.items.map((it) => {
                  const t = TEAMS.find((x) => x.id === it.team);
                  const pts = rr.complete
                    ? (rr.montPts[it.team] || 0) + (rr.giroPts[it.team] || 0)
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
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("monitor");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: AZUL_ESCURO }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm md:text-base">🌀 Prova da Propulsão</span>
            <a
              href="/insignias/areas.html"
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)" }}
            >
              🏅 Insígnias por área
            </a>
          </div>
          <div className="flex gap-1 bg-white bg-opacity-10 rounded-full p-1">
            <button
              onClick={() => setMode("monitor")}
              className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: mode === "monitor" ? LARANJA : "transparent" }}
            >
              Monitor
            </button>
            <button
              onClick={() => setMode("telao")}
              className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: mode === "telao" ? LARANJA : "transparent" }}
            >
              Telão / Ranking
            </button>
          </div>
        </div>
      </div>
      {mode === "monitor" ? <MonitorView /> : <TelaoView />}
    </div>
  );
}
