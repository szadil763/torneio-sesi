import React, { useState, useEffect, useRef, useCallback } from "react";
import { safeGet, safeSet, safeDelete, isLocalMode, kahootGet, kahootSet, kahootDelete } from "./firebase.js";
import { QRCodeSVG } from "qrcode.react";

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
const TEAMS_KAHOOT = [
  { id: "A", label: "Equipe A", color: "#E5484D" },
  { id: "B", label: "Equipe B", color: "#2F8FE0" },
  { id: "C", label: "Equipe C", color: "#3C9A5F" },
  { id: "D", label: "Equipe D", color: "#E0B23C", dark: true },
];
const SITE_URL    = "https://torneio-sesi-20de0.web.app";
const PUBLIC_URL  = "https://torneio-sesi-20de0.web.app/insignias/comunicados.html";
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
    const hasAny   = items.some((it) => it.montagem !== null || it.giro !== null);
    let montPts = {};
    let giroPts = {};
    if (hasAny) {
      const comMontagem = items.filter((it) => it.montagem !== null);
      const comGiro     = items.filter((it) => it.giro !== null);
      montPts = rankPoints(comMontagem.map((it) => ({ team: it.team, value: it.montagem })), false);
      giroPts = rankPoints(comGiro.map((it)     => ({ team: it.team, value: it.giro })),     true);
    }
    return { round: r, items, complete, hasAny, montPts, giroPts };
  });

  const totals = {};
  TEAMS.forEach((t) => (totals[t.id] = 0));
  roundResults.forEach((rr) => {
    if (rr.hasAny) {
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
                const pts = (rr.montPts[t.id] || 0) + (rr.giroPts[t.id] || 0);
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

  const [cargaOk, setCargaOk] = useState(null); // null | true | false

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
        setCargaOk(data?.carga ?? null);
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
    const ok = await safeSet(ponteKeyFor(round, teamId), { tempo: tempoFinal, carga: cargaOk });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setExisting({ tempo: tempoFinal, carga: cargaOk });
      setAllRounds((prev) => ({ ...prev, [round]: { tempo: tempoFinal, carga: cargaOk } }));
    } else {
      setSaveError(true);
    }
  };

  const handleReset = async () => {
    const team = TEAMS_1ANO.find((t) => t.id === teamId);
    if (!window.confirm(`Apagar resultado de ${team?.label} na Rodada ${round}?`)) return;
    await safeDelete(ponteKeyFor(round, teamId));
    setTempoFinal(null);
    setCargaOk(null);
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
    setCargaOk(null);
    setElapsed(0);
    setExisting(null);
    setSaved(false);
    setSaveError(false);
    setAllRounds({});
  };

  const team = TEAMS_1ANO.find((t) => t.id === teamId);
  const canSave = tempoFinal !== null && cargaOk !== null && !running;
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

      {/* Carga */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="text-sm font-bold text-gray-600 mb-3 text-center">
          ⚖️ A carga equilibrou na ponte?
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setCargaOk(true); setSaved(false); }}
            className="py-3 rounded-xl font-bold text-base border-2 transition-all"
            style={{
              backgroundColor: cargaOk === true ? "#2E9E4F" : "#F3F4F6",
              color: cargaOk === true ? "#fff" : "#374151",
              borderColor: cargaOk === true ? "#2E9E4F" : "#E5E7EB",
            }}
          >
            ✓ Sim — 4 pts
          </button>
          <button
            onClick={() => { setCargaOk(false); setSaved(false); }}
            className="py-3 rounded-xl font-bold text-base border-2 transition-all"
            style={{
              backgroundColor: cargaOk === false ? "#D92B2B" : "#F3F4F6",
              color: cargaOk === false ? "#fff" : "#374151",
              borderColor: cargaOk === false ? "#D92B2B" : "#E5E7EB",
            }}
          >
            ✗ Não — 0 pts
          </button>
        </div>
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
          Salvo: {formatTime(existing.tempo)} · Carga: {existing.carga === true ? "✓ equilibrou" : existing.carga === false ? "✗ caiu" : "--"}
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
                <th className="px-2 py-1">Carga</th>
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
                    <td className="px-2 py-1 text-center text-gray-600">
                      {v?.carga === true ? "✓" : v?.carga === false ? "✗" : "--"}
                    </td>
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
      return { team: t.id, tempo: v?.tempo ?? null, carga: v?.carga ?? null };
    });
    const complete = items.every((it) => it.tempo !== null && it.carga !== null);
    const hasAny   = items.some((it) => it.tempo !== null || it.carga !== null);
    let tempoPts = {};
    const cargaPts = {};
    if (hasAny) {
      const comTempo = items.filter((it) => it.tempo !== null);
      tempoPts = rankPoints(comTempo.map((it) => ({ team: it.team, value: it.tempo })), false);
      items.forEach((it) => {
        if (it.carga !== null) cargaPts[it.team] = it.carga === true ? 4 : 0;
      });
    }
    return { round: r, items, complete, hasAny, tempoPts, cargaPts };
  });

  const totals = {};
  TEAMS_1ANO.forEach((t) => (totals[t.id] = 0));
  roundResults.forEach((rr) => {
    if (rr.hasAny) TEAMS_1ANO.forEach((t) => {
      totals[t.id] += (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0);
    });
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
                const p = (rr.tempoPts[t.id] || 0) + (rr.cargaPts[t.id] || 0);
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
                  <th className="px-3 py-2">Carga</th>
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
                  const pts = rr.hasAny ? (rr.tempoPts[it.team] || 0) + (rr.cargaPts[it.team] || 0) : null;
                  const isLive = !!liveKeys[`${rr.round}_${it.team}`];
                  return (
                    <tr key={it.team} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-semibold" style={{ color: t.color }}>
                        {t.label}
                        {isLive && <span className="ml-1 text-xs font-bold" style={{ color: "#D92B2B" }}>🔴</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{formatTime(it.tempo)}</td>
                      <td className="px-3 py-2 text-center">
                        {it.carga === true ? <span style={{ color: "#2E9E4F", fontWeight: 700 }}>✓ 4pts</span>
                          : it.carga === false ? <span style={{ color: "#D92B2B", fontWeight: 700 }}>✗ 0pts</span>
                          : "--"}
                      </td>
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

// ── Tela Home — QR Code para pais e alunos ───────────────────────
function QRPrintModal({ onClose }) {
  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>QR Code — Torneio SESI</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
  .card { text-align: center; padding: 40px 48px; border: 3px solid #004B8D; border-radius: 24px; max-width: 380px; }
  h1 { color: #004B8D; font-size: 22px; margin-bottom: 6px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
  img { display: block; margin: 0 auto 20px; width: 220px; height: 220px; }
  .url { color: #004B8D; font-size: 12px; word-break: break-all; margin-bottom: 16px; }
  .hint { color: #888; font-size: 12px; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="card">
  <h1>🏆 Torneio SESI</h1>
  <p class="sub">Página de pais e alunos — insígnias e resultados</p>
  <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(PUBLIC_URL)}&size=220x220&color=004B8D" alt="QR Code">
  <p class="url">${PUBLIC_URL}</p>
  <p class="hint">Escaneie com a câmera do celular</p>
</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center font-extrabold text-xl" style={{ color: AZUL }}>
          📱 Site para pais e alunos
        </div>
        <QRCodeSVG value={PUBLIC_URL} size={240} bgColor="#ffffff" fgColor={AZUL} level="M" />
        <div className="text-xs text-gray-500 text-center break-all">{PUBLIC_URL}</div>
        <div className="text-xs text-gray-400 text-center">
          Escaneie com a câmera do celular para acessar insígnias e resultados
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-full font-bold text-white text-sm"
            style={{ backgroundColor: LARANJA }}
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full font-bold text-sm border-2"
            style={{ borderColor: AZUL, color: AZUL }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeView() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <QRPrintModal onClose={() => setOpen(false)} />}
      <div className="max-w-md mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-extrabold mb-1" style={{ color: AZUL }}>🏆 Torneio SESI</div>
          <div className="text-sm text-gray-500">Painel do Professor</div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 w-full"
          style={{ border: `2px solid #E5E7EB` }}>
          <div className="font-extrabold text-base text-center" style={{ color: AZUL }}>
            📱 Página para pais e alunos
          </div>
          <div className="text-xs text-gray-500 text-center">
            Compartilhe o QR Code para que pais e alunos acompanhem insígnias e resultados
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-2xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ padding: "12px", background: "#fff", border: `3px solid ${AZUL}` }}
            title="Clique para ampliar e imprimir"
          >
            <QRCodeSVG value={PUBLIC_URL} size={200} bgColor="#ffffff" fgColor={AZUL} level="M" />
          </button>
          <div className="text-xs text-gray-400 text-center break-all">{PUBLIC_URL}</div>
          <button
            onClick={() => setOpen(true)}
            className="w-full py-2.5 rounded-full font-bold text-white text-sm"
            style={{ backgroundColor: LARANJA }}
          >
            🖨️ Imprimir QR Code
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 w-full flex flex-col gap-2"
          style={{ border: `1px solid #E5E7EB` }}>
          <div className="font-bold text-sm" style={{ color: AZUL }}>Acesso rápido</div>
          <a href="/insignias/areas.html"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl"
            style={{ background: "#F0F4FF", color: AZUL }}>
            🏅 Insígnias por Área
          </a>
          <a href="/insignias/admin-areas.html"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl"
            style={{ background: "#FFF4EC", color: LARANJA }}>
            ⚙️ Admin — Insígnias
          </a>
        </div>
      </div>
    </>
  );
}

// ── Sons das botoeiras ────────────────────────────────────────────
function playBuzzSound(teamId) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const play = (type, freq, start, dur, vol = 0.5) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };

    if (teamId === "A") {
      // Vermelha — alarme: duas notas alternadas 3x (sawtooth agressivo)
      [0, 0.15, 0.30].forEach((t) => {
        play("sawtooth", 880, t,       0.12, 0.45);
        play("sawtooth", 660, t + 0.13, 0.12, 0.45);
      });
    } else if (teamId === "B") {
      // Azul — beep eletrônico duplo limpo (sine)
      play("sine", 880, 0,    0.18, 0.5);
      play("sine", 880, 0.22, 0.18, 0.5);
      play("sine", 440, 0,    0.40, 0.15); // sub baixo
    } else if (teamId === "C") {
      // Verde — sobe rápido (sweep sine)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.45);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.55);
    } else if (teamId === "D") {
      // Amarela — três notas ascendentes (fanfarra triangle)
      play("triangle", 523, 0,    0.16, 0.5); // C5
      play("triangle", 659, 0.18, 0.16, 0.5); // E5
      play("triangle", 784, 0.36, 0.25, 0.5); // G5
    }

    setTimeout(() => ctx.close(), 1500);
  } catch (_) {}
}

// ── Kahoot English — Botoeira (modo aluno) ────────────────────────
function KahootBuzzerView() {
  const [active, setActive] = useState(false);
  const [buzz, setBuzz] = useState(null);
  const [errou, setErrou] = useState(null); // teamId que errou primeiro
  const [pressed, setPressed] = useState(false);
  const prevBuzzRef = useRef(null);
  const pollRef = useRef(null);

  const fetchState = useCallback(async () => {
    const [a, b, err] = await Promise.all([
      safeGet("kahoot_active"),
      safeGet("kahoot_buzz"),
      safeGet("kahoot_errou"),
    ]);
    setActive(!!a);
    setErrou(err ?? null);
    setBuzz((prev) => {
      if (!prevBuzzRef.current && b?.teamId) {
        playBuzzSound(b.teamId);
      }
      prevBuzzRef.current = b ?? null;
      return b ?? null;
    });
  }, []);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 500);
    return () => clearInterval(pollRef.current);
  }, [fetchState]);

  const handlePress = async (teamId) => {
    if (!active || buzz || errou === teamId) return;
    setPressed(true);
    playBuzzSound(teamId);
    const existing = await safeGet("kahoot_buzz");
    if (!existing) {
      await safeSet("kahoot_buzz", { teamId, ts: Date.now() });
    }
    const updated = await safeGet("kahoot_buzz");
    prevBuzzRef.current = updated;
    setBuzz(updated);
  };

  const winner = buzz ? TEAMS_KAHOOT.find((t) => t.id === buzz.teamId) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0d1018" }}>
      <div className="text-center py-6 px-4">
        <div className="text-white font-extrabold text-2xl mb-1">🎓 Kahoot English</div>
        {!active && !buzz && !errou && (
          <div className="text-gray-400 text-sm">Aguardando a próxima pergunta…</div>
        )}
        {errou && !buzz && !active && (
          <div className="text-orange-400 font-bold text-base">
            ⏳ Segunda chance — aguardando mediador…
          </div>
        )}
        {active && !buzz && (
          <div className="text-yellow-400 font-bold text-lg animate-pulse">
            ⚡ {errou ? "Segunda chance! Aperte!" : "Aperte o botão da sua equipe!"}
          </div>
        )}
        {buzz && winner && (
          <div className="text-white font-extrabold text-xl mt-2">
            🏆 <span style={{ color: winner.color }}>{winner.label}</span> foi primeiro!
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3 p-4 pb-8">
        {TEAMS_KAHOOT.map((t) => {
          const isWinner   = buzz?.teamId === t.id;
          const isErrou    = errou === t.id;
          const isDisabled = isErrou || (!active && !isWinner) || !!buzz;
          const isLoser    = (buzz && !isWinner) || (isErrou && !buzz);
          return (
            <button
              key={t.id}
              onClick={() => handlePress(t.id)}
              disabled={isDisabled}
              className="rounded-3xl font-extrabold text-3xl flex items-center justify-center transition-all"
              style={{
                backgroundColor: isLoser ? "#333" : t.color,
                color: isLoser ? "#555" : (t.dark ? "#3A3000" : "#fff"),
                opacity: isLoser ? 0.35 : 1,
                transform: isWinner ? "scale(1.04)" : "scale(1)",
                boxShadow: isWinner ? `0 0 32px ${t.color}88` : "none",
                minHeight: "120px",
                border: isWinner ? `3px solid #fff` : isErrou ? "3px solid #ef4444" : "3px solid transparent",
              }}
            >
              {isWinner ? "✓ " : isErrou ? "✗ " : ""}{t.label}
              {isErrou && <span style={{ fontSize: 14, display: "block", opacity: 0.6 }}>errou</span>}
            </button>
          );
        })}
      </div>

      {!active && !buzz && !errou && (
        <div className="text-center text-gray-600 text-xs pb-6">
          {pressed ? "Registrado — aguarde a próxima pergunta" : "Botoeira bloqueada"}
        </div>
      )}

      {/* Botão de contestação — aparece após uma equipe ser detectada */}
      {buzz && !active && (
        <div className="text-center pb-8 px-4">
          <button
            onClick={async () => {
              if (!window.confirm("Contestar resultado e reiniciar as botoeiras?")) return;
              await safeDelete("kahoot_buzz");
              setBuzz(null);
              setPressed(false);
              prevBuzzRef.current = null;
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: 12, padding: "10px 24px",
              color: "rgba(255,255,255,0.6)", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            ↺ Contestar / Reiniciar botoeiras
          </button>
        </div>
      )}
    </div>
  );
}

// ── Kahoot English — Monitor (admin) ─────────────────────────────

// AudioContext singleton — reutilizado entre perguntas para evitar limite do browser
let _kahootAudioCtx = null;
function _getKahootCtx() {
  try {
    if (!_kahootAudioCtx || _kahootAudioCtx.state === 'closed') {
      _kahootAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_kahootAudioCtx.state === 'suspended') _kahootAudioCtx.resume();
    return _kahootAudioCtx;
  } catch (_) { return null; }
}

// Sirene intermitente: 6 pulsos alternando 880 Hz ↔ 660 Hz (sawtooth)
function playBuzzerSound() {
  const ctx = _getKahootCtx(); if (!ctx) return;
  try {
    const freqs = [880, 660, 880, 660, 880, 660];
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      const t = ctx.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
      gain.gain.setValueAtTime(0.5, t + 0.10);
      gain.gain.linearRampToValueAtTime(0, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch (_) {}
}

// Fanfarra de vitória: arpejo C5-E5-G5-C6 seguido de acorde sustentado
function playSoundCorreto() {
  const ctx = _getKahootCtx(); if (!ctx) return;
  try {
    const notas = [
      { f: 523, t: 0.00, dur: 0.14 },
      { f: 659, t: 0.13, dur: 0.14 },
      { f: 784, t: 0.26, dur: 0.14 },
      { f: 1047, t: 0.39, dur: 0.40 },
    ];
    notas.forEach(({ f, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + t + 0.02);
      gain.gain.setValueAtTime(0.55, ctx.currentTime + t + dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.02);
    });
  } catch (_) {}
}

// Som de derrota: descida wah-wah (sawtooth desce de 440 → 150)
function playSoundErrado() {
  const ctx = _getKahootCtx(); if (!ctx) return;
  try {
    const notas = [
      { f1: 440, f2: 330, t: 0.00, dur: 0.22 },
      { f1: 330, f2: 220, t: 0.20, dur: 0.30 },
      { f1: 220, f2: 150, t: 0.48, dur: 0.36 },
    ];
    notas.forEach(({ f1, f2, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      const at = ctx.currentTime + t;
      osc.frequency.setValueAtTime(f1, at);
      osc.frequency.exponentialRampToValueAtTime(f2, at + dur);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.50, at + 0.02);
      gain.gain.setValueAtTime(0.50, at + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, at + dur);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    });
  } catch (_) {}
}

const ALT_CORES  = { a: '#ef4444', b: '#3b82f6', c: '#22c55e', d: '#f59e0b' };
const ALT_LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' };
const FORM_VAZIO = { texto: '', a: '', b: '', c: '', d: '', correta: 'a' };
const TIMER_MS   = 30000;

const QUESTOES_DEFAULT = [
  { texto: '1º ANO — HOW MANY LETTERS ARE THERE IN THE WORD S-W-A-N?', a: '4', b: '3', c: '6', d: '5', correta: 'a' },
  { texto: '1º ANO — THE DUCKLINGS ARE:', a: 'Green', b: 'Yellow', c: 'Blue', d: 'Pink', correta: 'b' },
  { texto: '1º ANO — WHAT DID THE UGLY DUCKLING SEE?', a: 'Many Frogs', b: 'Many Dogs', c: 'Beautiful Swans', d: 'Many Hens', correta: 'c' },
  { texto: '1º ANO — WHAT CAME OUT FROM THE LAST EGG?', a: 'A little butterfly', b: 'A big and gray duckling', c: 'A goose', d: 'An alligator', correta: 'b' },
  { texto: '2º ANO — WHICH WORD BEGINS WITH THE SAME SOUND AS "SWAN"?', a: 'Swim', b: 'Tree', c: 'Cat', d: 'Pond', correta: 'a' },
  { texto: '2º ANO — WHICH WORD IS HIDDEN INSIDE "DUCKLING"?', a: 'Duck', b: 'Lake', c: 'Wing', d: 'Nest', correta: 'a' },
  { texto: '2º ANO — WHICH WORD ENDS WITH THE SAME SOUND AS "NEST"?', a: 'Best', b: 'Duck', c: 'Swan', d: 'Pond', correta: 'a' },
  { texto: '2º ANO — HOW MANY LETTERS ARE THERE IN THE WORD "SWAN"?', a: '3', b: '4', c: '5', d: '6', correta: 'b' },
  { texto: '3º ANO — UNSCRAMBLE THE LETTERS: K - C - U - D', a: 'Duck', b: 'Luck', c: 'Desk', d: 'Swan', correta: 'a' },
  { texto: '3º ANO — WHICH WORD DOES NOT BELONG TO THE GROUP?', a: 'Duck', b: 'Swan', c: 'Goose', d: 'Carrot', correta: 'd' },
  { texto: '3º ANO — WHICH WORD BELONGS TO THE GROUP "ANIMALS"?', a: 'Flower', b: 'Swan', c: 'Winter', d: 'Water', correta: 'b' },
  { texto: '3º ANO — UNSCRAMBLE THE LETTERS: N - A - W - S', a: 'Swan', b: 'Snow', c: 'Wans', d: 'Wing', correta: 'a' },
  { texto: '4º ANO — WHICH WORD MEANS THE OPPOSITE OF "BIG"?', a: 'Tall', b: 'Fast', c: 'Small', d: 'Strong', correta: 'c' },
  { texto: '4º ANO — WHICH WORD HAS THREE VOWELS?', a: 'Duck', b: 'Swan', c: 'Nest', d: 'Animal', correta: 'd' },
  { texto: '4º ANO — WHICH WORD MEANS THE OPPOSITE OF "COLD"?', a: 'Hot', b: 'Slow', c: 'Small', d: 'Dark', correta: 'a' },
  { texto: '4º ANO — WHICH WORD HAS THREE SYLLABLES?', a: 'Swan', b: 'Winter', c: 'Animal', d: 'Pond', correta: 'c' },
  { texto: '5º ANO — PUT IN ORDER: BEAUTIFUL • BECOMES • THE • SWAN • DUCKLING • A', a: 'THE BEAUTIFUL DUCKLING BECOMES A SWAN.', b: 'THE DUCKLING BECOMES A BEAUTIFUL SWAN.', c: 'A SWAN BECOMES THE BEAUTIFUL DUCKLING.', d: 'THE DUCKLING A BEAUTIFUL SWAN BECOMES.', correta: 'b' },
  { texto: '5º ANO — COMPLETE: B E A U T I _ U L — WHICH LETTER IS MISSING?', a: 'P', b: 'F', c: 'V', d: 'T', correta: 'b' },
  { texto: '5º ANO — PUT IN ORDER: IS • THE • WATER • LOOKING • DUCKLING • INTO • THE', a: 'THE DUCKLING IS LOOKING INTO THE WATER.', b: 'THE WATER IS LOOKING INTO THE DUCKLING.', c: 'THE DUCKLING LOOKING IS INTO THE WATER.', d: 'IS THE DUCKLING THE WATER LOOKING INTO.', correta: 'a' },
  { texto: '5º ANO — COMPLETE: R E F L E C T I _ N — WHICH LETTER IS MISSING?', a: 'A', b: 'E', c: 'O', d: 'U', correta: 'c' },
];

function KahootMonitorView({ forceLocal = false }) {
  const [active, setActive] = useState(false);
  const [buzz, setBuzz]   = useState(null);
  const [pts, setPts]     = useState({});
  const [flash, setFlash] = useState(false);
  const [questoes, setQuestoes]     = useState([]);
  const [questaoIdx, setQuestaoIdx] = useState(-1);
  const [timerStart, setTimerStart] = useState(null);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [answer, setAnswer]         = useState(null);
  const [errou, setErrou]           = useState(null); // teamId da equipe que errou primeiro
  const [showQuestoes, setShowQuestoes] = useState(false);
  const [editIdx, setEditIdx]   = useState(undefined);
  const [editForm, setEditForm] = useState(FORM_VAZIO);
  const pollRef      = useRef(null);
  const prevBuzzId   = useRef(null);
  const timerRef     = useRef(null);
  const activatedRef = useRef(false);

  const kGet = useCallback((k) => kahootGet(k, forceLocal), [forceLocal]);
  const kSet = useCallback((k, v) => kahootSet(k, v, forceLocal), [forceLocal]);
  const kDel = useCallback((k) => kahootDelete(k, forceLocal), [forceLocal]);

  const fetchState = useCallback(async () => {
    const [a, b, p, q, qi, ts, ans, err] = await Promise.all([
      kGet("kahoot_active"),
      kGet("kahoot_buzz"),
      kGet("kahoot_pts"),
      kGet("kahoot_questoes"),
      kGet("kahoot_questao_idx"),
      kGet("kahoot_timer_start"),
      kGet("kahoot_answer"),
      kGet("kahoot_errou"),
    ]);
    const newBuzz = b ?? null;
    const newId = newBuzz ? (newBuzz.teamId + (newBuzz.ts || "")) : null;
    if (newId && newId !== prevBuzzId.current) {
      prevBuzzId.current = newId;
      playBuzzerSound();
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
    if (!newBuzz) prevBuzzId.current = null;
    setActive(!!a);
    setBuzz(newBuzz);
    setPts(p ?? {});
    setQuestoes(Array.isArray(q) ? q : []);
    setQuestaoIdx(qi !== null && qi !== undefined ? Number(qi) : -1);
    setTimerStart(ts ? Number(ts) : null);
    setAnswer(ans ?? null);
    setErrou(err ?? null);
  }, [kGet]);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 700);
    return () => clearInterval(pollRef.current);
  }, [fetchState]);

  // ── Cronômetro local seeded pelo Firebase ──────────────────────
  const activarBotoeiras = useCallback(async () => {
    await Promise.all([kSet("kahoot_active", true), kDel("kahoot_timer_start")]);
    setActive(true);
    setTimerStart(null);
    setTimeLeft(0);
  }, [kSet, kDel]);

  const reativarOutrasBotoeiras = useCallback(async () => {
    await Promise.all([kSet("kahoot_active", true), kDel("kahoot_buzz")]);
    setActive(true);
    setBuzz(null);
    prevBuzzId.current = null;
  }, [kSet, kDel]);

  useEffect(() => {
    clearInterval(timerRef.current);
    activatedRef.current = false;
    if (!timerStart) { setTimeLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, TIMER_MS - (Date.now() - timerStart));
      setTimeLeft(left);
      if (left <= 0 && !activatedRef.current) {
        activatedRef.current = true;
        clearInterval(timerRef.current);
        activarBotoeiras();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 100);
    return () => clearInterval(timerRef.current);
  }, [timerStart, activarBotoeiras]);

  const novaPergunta = async () => {
    const len = questoes.length;
    const nextIdx = len > 0 ? (questaoIdx < 0 ? 0 : Math.min(questaoIdx + 1, len - 1)) : -1;
    const now = Date.now();
    await Promise.all([
      kDel("kahoot_buzz"),
      kDel("kahoot_active"),
      kDel("kahoot_answer"),
      kDel("kahoot_errou"),
      kSet("kahoot_timer_start", now),
      ...(len > 0 ? [kSet("kahoot_questao_idx", nextIdx)] : []),
    ]);
    if (len > 0) setQuestaoIdx(nextIdx);
    setBuzz(null);
    setActive(false);
    setAnswer(null);
    setErrou(null);
    setTimerStart(now);
    prevBuzzId.current = null;
  };

  const irParaQuestao = async (idx) => {
    if (idx < 0 || idx >= questoes.length) return;
    await kSet("kahoot_questao_idx", idx);
    setQuestaoIdx(idx);
  };

  const pressVirtual = async (teamId) => {
    if (!active || buzz) return;
    const existing = await kGet("kahoot_buzz");
    if (!existing) {
      await kSet("kahoot_buzz", { teamId, ts: Date.now() });
      playBuzzerSound();
    }
    await fetchState();
  };

  const darResposta = async (alt) => {
    if (!buzz || !questaoAtualRef.current) return;
    const correto = alt === questaoAtualRef.current.correta;

    if (correto) {
      // Resposta correta: dá ponto, mostra gabarito, encerra rodada
      const ansObj = { alt, correto: true, teamId: buzz.teamId };
      const newPts = { ...pts, [buzz.teamId]: (pts[buzz.teamId] || 0) + 1 };
      await Promise.all([
        kSet("kahoot_answer", ansObj),
        kSet("kahoot_pts", newPts),
        kDel("kahoot_active"),
        kDel("kahoot_buzz"),
        kDel("kahoot_timer_start"),
        kDel("kahoot_errou"),
      ]);
      setPts(newPts);
      setAnswer(ansObj);
      playSoundCorreto();
    } else if (!errou) {
      // Primeiro erro: salva equipe que errou, NÃO mostra gabarito
      const firstWrong = buzz.teamId;
      await Promise.all([
        kSet("kahoot_errou", firstWrong),
        kDel("kahoot_active"),
        kDel("kahoot_buzz"),
        kDel("kahoot_timer_start"),
      ]);
      setErrou(firstWrong);
      playSoundErrado();
    } else {
      // Segundo erro: encerra rodada, agora mostra gabarito
      const ansObj = { alt, correto: false, teamId: buzz.teamId, final: true };
      await Promise.all([
        kSet("kahoot_answer", ansObj),
        kDel("kahoot_active"),
        kDel("kahoot_buzz"),
        kDel("kahoot_timer_start"),
        kDel("kahoot_errou"),
      ]);
      setAnswer(ansObj);
      playSoundErrado();
    }
    setActive(false);
    setBuzz(null);
    setTimerStart(null);
    prevBuzzId.current = null;
  };

  const pular = async () => {
    await Promise.all([kDel("kahoot_active"), kDel("kahoot_buzz"), kDel("kahoot_timer_start"), kDel("kahoot_answer"), kDel("kahoot_errou")]);
    setActive(false);
    setBuzz(null);
    setTimerStart(null);
    setAnswer(null);
    setErrou(null);
    prevBuzzId.current = null;
  };

  const resetAll = async () => {
    if (!window.confirm("Zerar toda a pontuação do Kahoot English?")) return;
    await Promise.all([
      kDel("kahoot_pts"), kDel("kahoot_buzz"), kDel("kahoot_active"),
      kDel("kahoot_timer_start"), kDel("kahoot_answer"), kDel("kahoot_errou"),
      kSet("kahoot_questao_idx", -1),
    ]);
    setPts({});
    setBuzz(null);
    setActive(false);
    setQuestaoIdx(-1);
    setTimerStart(null);
    setAnswer(null);
    setErrou(null);
    prevBuzzId.current = null;
  };

  const salvarQuestao = async () => {
    if (!editForm.texto.trim()) return;
    const novas = [...questoes];
    if (editIdx === null) {
      if (novas.length >= 20) { alert("Máximo de 20 questões atingido."); return; }
      novas.push({ ...editForm });
    } else {
      novas[editIdx] = { ...editForm };
    }
    await kSet("kahoot_questoes", novas);
    setQuestoes(novas);
    setEditIdx(undefined);
    setEditForm(FORM_VAZIO);
  };

  const excluirQuestao = async (idx) => {
    if (!window.confirm(`Excluir questão ${idx + 1}?`)) return;
    const novas = questoes.filter((_, i) => i !== idx);
    await kSet("kahoot_questoes", novas);
    setQuestoes(novas);
    if (editIdx === idx) { setEditIdx(undefined); setEditForm(FORM_VAZIO); }
  };

  const abrirEdicao = (idx) => {
    if (idx === null) { setEditIdx(null); setEditForm(FORM_VAZIO); }
    else { setEditIdx(idx); setEditForm({ ...questoes[idx] }); }
  };

  const winner      = buzz ? TEAMS_KAHOOT.find((t) => t.id === buzz.teamId) : null;
  const ranking     = [...TEAMS_KAHOOT].sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0));
  const questaoAtual = questoes.length > 0 && questaoIdx >= 0 ? questoes[questaoIdx] : null;
  const questaoAtualRef = useRef(questaoAtual);
  useEffect(() => { questaoAtualRef.current = questaoAtual; }, [questaoAtual]);

  const contando = timerStart !== null && timeLeft > 0;
  const secsLeft = Math.ceil(timeLeft / 1000);
  const pct      = timerStart ? Math.min(100, ((Date.now() - timerStart) / TIMER_MS) * 100) : 0;

  /* ── cores de fundo do cabeçalho ── */
  const errouTeam = errou ? TEAMS_KAHOOT.find(t => t.id === errou) : null;
  const headerBg = winner
    ? winner.color
    : contando
    ? AZUL_ESCURO
    : active
    ? LARANJA
    : answer
    ? (answer.correto ? "#15803d" : "#dc2626")
    : errou
    ? "#92400e"
    : "#1e293b";

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">

      {/* ── Questão atual ── */}
      {questaoAtual && (
        <div className="rounded-2xl p-4 border-2" style={{ backgroundColor: AZUL + "0f", borderColor: AZUL + "44" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: AZUL }}>
              Questão {questaoIdx + 1} / {questoes.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => irParaQuestao(questaoIdx - 1)} disabled={questaoIdx <= 0}
                className="w-7 h-7 rounded-lg text-xs font-bold disabled:opacity-30"
                style={{ background: AZUL + "22", color: AZUL }}>◀</button>
              <button onClick={() => irParaQuestao(questaoIdx + 1)} disabled={questaoIdx >= questoes.length - 1}
                className="w-7 h-7 rounded-lg text-xs font-bold disabled:opacity-30"
                style={{ background: AZUL + "22", color: AZUL }}>▶</button>
            </div>
          </div>
          <div className="font-bold text-gray-800 text-sm mb-3 leading-snug">{questaoAtual.texto}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['a','b','c','d']).map((alt) => (
              <div key={alt} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: questaoAtual.correta === alt ? ALT_CORES[alt] + "22" : "#f1f5f9",
                  border: `1.5px solid ${questaoAtual.correta === alt ? ALT_CORES[alt] : "transparent"}`,
                  color: questaoAtual.correta === alt ? ALT_CORES[alt] : "#475569",
                }}>
                <span className="font-extrabold">{ALT_LABELS[alt]})</span>
                <span>{questaoAtual[alt]}</span>
                {questaoAtual.correta === alt && <span className="ml-auto">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {questoes.length === 0 && (
        <div className="text-center text-xs text-gray-400 py-1">
          Nenhuma questão cadastrada — use "📋 Questões" abaixo.
        </div>
      )}

      {/* ── Cabeçalho de status ── */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg text-center"
        style={{
          background: headerBg,
          outline: flash ? "5px solid #fff" : "5px solid transparent",
          transition: "background 0.3s, outline 0.1s",
        }}
      >
        {/* barra de progresso do timer */}
        {contando && (
          <div className="h-2 w-full" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full transition-all" style={{
              width: `${pct}%`,
              background: pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#22c55e",
              transition: "width 0.1s linear, background 0.3s",
            }} />
          </div>
        )}
        <div className="px-5 py-5">
          {/* Contando */}
          {contando && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-black text-white" style={{ fontSize: 56, lineHeight: 1, textShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                  {secsLeft}
                </div>
                <div className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">
                  Leia a questão…
                </div>
              </div>
              <button onClick={activarBotoeiras}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}>
                ⚡ Ativar já
              </button>
            </div>
          )}
          {/* Botoeiras ativas */}
          {!contando && active && !winner && (
            <div className="font-extrabold text-xl text-white animate-pulse tracking-wide"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
              ⚡ Primeira equipe a apertar!
            </div>
          )}
          {/* Vencedor — selecionar alternativa */}
          {winner && (
            <div>
              <div className="font-black text-white tracking-tight" style={{ fontSize: 28, textShadow: "0 3px 16px rgba(0,0,0,0.5)" }}>
                🔔 {winner.label}
              </div>
              <div className="text-white/80 text-sm font-semibold mt-0.5 mb-3">
                foi a primeira! Qual alternativa respondeu?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['a','b','c','d']).map((alt) => (
                  <button key={alt} onClick={() => darResposta(alt)}
                    className="py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2"
                    style={{ background: ALT_CORES[alt], color: '#fff', boxShadow: `0 4px 12px ${ALT_CORES[alt]}88` }}>
                    <span className="text-base">{ALT_LABELS[alt]}</span>
                    <span className="font-semibold text-xs opacity-90 truncate max-w-[80px]">
                      {questaoAtual?.[alt] || ''}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={pular} className="w-full mt-2 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.7)" }}>
                Pular / equipe não respondeu
              </button>
            </div>
          )}
          {/* Resultado da resposta */}
          {answer && !winner && !contando && !active && (
            <div>
              <div className="font-black text-white text-2xl">
                {answer.correto ? "✅ Correto! +1 pt" : "❌ Errado! Encerrado."}
              </div>
              <div className="text-white/80 text-sm mt-1">
                {TEAMS_KAHOOT.find(t => t.id === answer.teamId)?.label} respondeu {ALT_LABELS[answer.alt]}
                {questaoAtual && ` — correto era ${ALT_LABELS[questaoAtual.correta]}`}
              </div>
            </div>
          )}
          {/* Primeiro erro — aguardando mediador reativar */}
          {errou && !winner && !active && !answer && !contando && (
            <div>
              <div className="font-black text-white text-xl mb-1">
                ❌ {errouTeam?.label} errou
              </div>
              <div className="text-white/70 text-sm mb-3">
                Reative as outras 3 botoeiras para segunda chance
              </div>
              <button
                onClick={reativarOutrasBotoeiras}
                className="w-full py-2.5 rounded-xl font-bold text-sm"
                style={{ background: LARANJA, color: "#fff", boxShadow: `0 4px 14px ${LARANJA}88` }}>
                ⚡ Reativar outras 3 botoeiras
              </button>
            </div>
          )}
          {/* Aguardando */}
          {!contando && !active && !winner && !answer && !errou && (
            <div className="text-white/60 font-semibold text-sm tracking-wide">
              Pronto — pressione "Nova Pergunta"
            </div>
          )}
        </div>
      </div>

      {/* ── Botoeiras virtuais 2×2 ── */}
      <div className="grid grid-cols-2 gap-3">
        {TEAMS_KAHOOT.map((t) => {
          const isWinner  = winner?.id === t.id;
          const isErrou   = errou === t.id;
          const isLoser   = (!!winner && !isWinner) || (!!errou && !buzz && isErrou);
          const canPress  = active && !buzz && !isErrou;
          return (
            <button
              key={t.id}
              onClick={() => pressVirtual(t.id)}
              disabled={!canPress}
              className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl font-extrabold transition-all select-none"
              style={{
                backgroundColor: t.color,
                color: t.dark ? "#1a1a1a" : "#fff",
                height: 104,
                fontSize: 15,
                opacity: isLoser ? 0.2 : 1,
                transform: isWinner ? "scale(1.06)" : canPress ? "scale(1)" : "scale(0.97)",
                boxShadow: isWinner
                  ? `0 0 0 4px #fff, 0 0 40px 10px ${t.color}bb`
                  : canPress
                  ? `0 6px 20px ${t.color}88`
                  : "0 2px 6px rgba(0,0,0,0.12)",
                transition: "all 0.25s",
                cursor: canPress ? "pointer" : "default",
              }}
            >
              <span style={{ fontSize: 30 }}>🔔</span>
              <span style={{ letterSpacing: ".02em" }}>{t.label}</span>
              <span style={{ fontSize: 11, opacity: 0.65 }}>{pts[t.id] || 0} pts</span>
              {isWinner && (
                <span
                  style={{
                    position: "absolute",
                    top: 6, right: 10,
                    fontSize: 20,
                    animation: "spin 1s linear infinite",
                  }}
                >⭐</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Nova Pergunta ── */}
      {!contando && !active && !winner && !errou && (
        <button
          onClick={novaPergunta}
          className="w-full py-3 rounded-2xl font-bold text-lg text-white"
          style={{ backgroundColor: AZUL }}
        >
          {questoes.length > 0
            ? `▶ Q${Math.min(questaoIdx + 2, questoes.length)} — Nova Pergunta`
            : "▶ Nova Pergunta — Iniciar Cronômetro"}
        </button>
      )}

      {/* ── Placar ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-500">Placar</div>
        <div className="flex flex-col gap-2">
          {ranking.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ backgroundColor: t.color + "22" }}>
              <span className="text-lg font-bold w-7 text-center" style={{ color: t.color }}>{idx + 1}º</span>
              <span className="flex-1 font-semibold text-gray-700">{t.label}</span>
              <span className="font-extrabold text-xl" style={{ color: t.color }}>
                {pts[t.id] || 0} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 pb-2 flex gap-2">
        <button onClick={resetAll}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50">
          ⚠️ Zerar pontuação
        </button>
        <button onClick={() => setShowQuestoes((v) => !v)}
          className="flex-1 py-2 rounded-xl text-sm font-semibold border"
          style={{
            background: showQuestoes ? AZUL : "transparent",
            color: showQuestoes ? "#fff" : AZUL,
            borderColor: AZUL,
          }}>
          📋 Questões ({questoes.length}/20)
        </button>
      </div>

      {/* ── Gerenciar Questões ── */}
      {showQuestoes && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: AZUL }}>
            <span className="font-bold text-white text-sm">Banco de Questões</span>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (questoes.length > 0 && !window.confirm("Substituir todas as questões pelo banco padrão?")) return;
                await kSet("kahoot_questoes", QUESTOES_DEFAULT);
                setQuestoes(QUESTOES_DEFAULT);
              }}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-yellow-400" style={{ color: '#1e3a5f' }}>
                ⬇ {questoes.length === 0 ? "Importar 20 questões" : "Restaurar padrão"}
              </button>
              <button onClick={() => abrirEdicao(null)}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-white" style={{ color: AZUL }}>
                + Nova
              </button>
            </div>
          </div>

          {/* Formulário de edição */}
          {editIdx !== undefined && (
            <div className="p-4 border-b border-gray-100 bg-blue-50">
              <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: AZUL }}>
                {editIdx === null ? "Nova Questão" : `Editando Questão ${editIdx + 1}`}
              </div>
              <textarea
                className="w-full rounded-xl border border-gray-300 p-2 text-sm mb-2 resize-none"
                rows={2}
                placeholder="Texto da pergunta…"
                value={editForm.texto}
                onChange={(e) => setEditForm((f) => ({ ...f, texto: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['a','b','c','d']).map((alt) => (
                  <div key={alt} className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs w-5 text-center"
                      style={{ color: ALT_CORES[alt] }}>{ALT_LABELS[alt]})</span>
                    <input
                      className="flex-1 rounded-lg border border-gray-300 p-1.5 text-xs"
                      placeholder={`Alternativa ${ALT_LABELS[alt]}`}
                      value={editForm[alt]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [alt]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-600">Correta:</span>
                {(['a','b','c','d']).map((alt) => (
                  <label key={alt} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="correta" value={alt}
                      checked={editForm.correta === alt}
                      onChange={() => setEditForm((f) => ({ ...f, correta: alt }))} />
                    <span className="text-xs font-bold" style={{ color: ALT_CORES[alt] }}>{ALT_LABELS[alt]}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={salvarQuestao}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: AZUL }}>
                  💾 Salvar
                </button>
                <button onClick={() => { setEditIdx(undefined); setEditForm(FORM_VAZIO); }}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold border border-gray-300 text-gray-600">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de questões */}
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {questoes.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-6">
                Nenhuma questão ainda
              </div>
            )}
            {questoes.map((q, idx) => (
              <div key={idx}
                className="flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                style={{ borderLeft: questaoIdx === idx ? `4px solid ${LARANJA}` : "4px solid transparent" }}>
                <span className="font-bold text-xs w-5 shrink-0 mt-0.5" style={{ color: AZUL }}>{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 truncate">{q.texto}</div>
                  <div className="text-xs text-gray-400">
                    ✓ {ALT_LABELS[q.correta]}: {q[q.correta]}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => irParaQuestao(idx)}
                    className="w-6 h-6 rounded text-xs" title="Exibir esta questão"
                    style={{ background: questaoIdx === idx ? LARANJA : "#e2e8f0", color: questaoIdx === idx ? "#fff" : "#64748b" }}>
                    ▶
                  </button>
                  <button onClick={() => abrirEdicao(idx)}
                    className="w-6 h-6 rounded text-xs" style={{ background: "#e2e8f0", color: "#64748b" }}>
                    ✏
                  </button>
                  <button onClick={() => excluirQuestao(idx)}
                    className="w-6 h-6 rounded text-xs" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Kahoot English — Telão ────────────────────────────────────────
function KahootTelaoView({ forceLocal = false }) {
  const [pts, setPts] = useState({});
  const [buzz, setBuzz] = useState(null);
  const [active, setActive] = useState(false);
  const [questoes, setQuestoes] = useState([]);
  const [questaoIdx, setQuestaoIdx] = useState(-1);
  const [timerStart, setTimerStart] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [errou, setErrou] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const timerRefT = useRef(null);

  const fetchAll = useCallback(async () => {
    const [p, b, a, q, qi, ts, ans, err] = await Promise.all([
      kahootGet("kahoot_pts", forceLocal),
      kahootGet("kahoot_buzz", forceLocal),
      kahootGet("kahoot_active", forceLocal),
      kahootGet("kahoot_questoes", forceLocal),
      kahootGet("kahoot_questao_idx", forceLocal),
      kahootGet("kahoot_timer_start", forceLocal),
      kahootGet("kahoot_answer", forceLocal),
      kahootGet("kahoot_errou", forceLocal),
    ]);
    setPts(p ?? {});
    setBuzz(b ?? null);
    setActive(!!a);
    setQuestoes(Array.isArray(q) ? q : []);
    setQuestaoIdx(qi !== null && qi !== undefined ? Number(qi) : -1);
    setTimerStart(ts ? Number(ts) : null);
    setAnswer(ans ?? null);
    setErrou(err ?? null);
    setLastUpdate(new Date());
  }, [forceLocal]);

  // Countdown local no telão (só visual, não escreve no Firebase)
  useEffect(() => {
    clearInterval(timerRefT.current);
    if (!timerStart) { setTimeLeft(0); return; }
    const tick = () => setTimeLeft(Math.max(0, TIMER_MS - (Date.now() - timerStart)));
    tick();
    timerRefT.current = setInterval(tick, 100);
    return () => clearInterval(timerRefT.current);
  }, [timerStart]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 500);
    return () => clearInterval(id);
  }, [fetchAll]);

  const ranking  = [...TEAMS_KAHOOT].sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0));
  const maxPts   = Math.max(1, ...TEAMS_KAHOOT.map((t) => pts[t.id] || 0));
  const winner   = buzz ? TEAMS_KAHOOT.find((t) => t.id === buzz.teamId) : null;
  const questaoAtual = questoes.length > 0 && questaoIdx >= 0 ? questoes[questaoIdx] : null;
  const contandoT = timerStart !== null && timeLeft > 0;
  const secsLeftT = Math.ceil(timeLeft / 1000);
  const pctT      = timerStart ? Math.min(100, ((Date.now() - timerStart) / TIMER_MS) * 100) : 0;

  const errouTeamT = errou ? TEAMS_KAHOOT.find(t => t.id === errou) : null;

  // Fase atual do telão
  const fase = buzz ? 'buzz'
    : answer ? 'resposta'
    : active && errou ? 'ativo_segunda'
    : contandoT ? 'countdown'
    : active ? 'ativo'
    : errou ? 'errou'
    : 'idle';

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: AZUL_ESCURO,
      ...(expanded ? { position: "fixed", inset: 0, zIndex: 9999, overflow: "auto" } : {}),
    }}>

      {/* ── Botão expandir/recolher ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        title={expanded ? "Recolher" : "Expandir tela cheia"}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 10000,
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, padding: "4px 9px", color: "#fff", cursor: "pointer",
          fontSize: 18, lineHeight: 1,
        }}
      >
        {expanded ? "⤡" : "⛶"}
      </button>

      {/* ── Cabeçalho fixo ── */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: LARANJA }}>SESI — TORNEIO INFANTIL</div>
          <div className="font-extrabold text-white text-lg">🎓 Kahoot English</div>
        </div>
        {questoes.length > 0 && questaoIdx >= 0 && (
          <div className="flex items-center gap-2">
            {questoes.map((_, i) => (
              <div key={i} className="rounded-full transition-all"
                style={{
                  width: i === questaoIdx ? 18 : 8,
                  height: 8,
                  background: i === questaoIdx ? LARANJA : i < questaoIdx ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                  transition: "all 0.3s",
                }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-5 max-w-3xl mx-auto w-full">

        {/* FASE: idle */}
        {fase === 'idle' && (
          <div className="text-center py-12">
            <div className="font-black text-white text-opacity-30 text-4xl" style={{ color: "rgba(255,255,255,0.2)" }}>
              🎓
            </div>
            <div className="text-white/40 font-semibold mt-3">Aguardando próxima pergunta…</div>
          </div>
        )}

        {/* FASE: countdown — questão + botões travados */}
        {fase === 'countdown' && questaoAtual && (
          <>
            {/* Cronômetro */}
            <div className="flex items-center gap-4">
              <div className="font-black text-white shrink-0"
                style={{ fontSize: 72, lineHeight: 1, textShadow: "0 6px 30px rgba(0,0,0,0.5)",
                  animation: secsLeftT <= 3 ? "pulseScale 0.5s ease-in-out infinite" : "none" }}>
                {secsLeftT}
              </div>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${pctT}%`,
                  background: pctT > 70 ? "#ef4444" : pctT > 40 ? "#f59e0b" : "#22c55e",
                  transition: "width 0.1s linear, background 0.3s",
                }} />
              </div>
            </div>
            {/* Texto da questão (sem alternativas) */}
            <div className="rounded-3xl px-7 py-6" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: LARANJA }}>
                Questão {questaoIdx + 1} / {questoes.length}
              </div>
              <div className="font-extrabold text-white leading-snug" style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
            {/* Botões das equipes — travados */}
            <div className="grid grid-cols-2 gap-3">
              {TEAMS_KAHOOT.map(t => (
                <div key={t.id}
                  className="rounded-2xl flex items-center justify-center gap-3 font-extrabold"
                  style={{
                    background: t.color,
                    height: 72,
                    fontSize: 18,
                    color: t.dark ? "#1a1a1a" : "#fff",
                    opacity: 0.45,
                    filter: "grayscale(30%)",
                  }}>
                  🔒 {t.label}
                </div>
              ))}
            </div>
          </>
        )}

        {/* FASE: ativo — questão + alternativas + botões pulsando */}
        {fase === 'ativo' && questaoAtual && (
          <>
            {/* Texto da questão */}
            <div className="rounded-3xl px-7 py-5" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: LARANJA }}>
                Questão {questaoIdx + 1} / {questoes.length}
              </div>
              <div className="font-extrabold text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.8rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
            {/* Alternativas */}
            <div className="grid grid-cols-2 gap-3">
              {(['a','b','c','d']).map(alt => (
                <div key={alt} className="rounded-2xl flex items-center gap-3 px-5 py-4"
                  style={{ background: ALT_CORES[alt] }}>
                  <span className="font-black text-white text-2xl w-9 shrink-0 text-center">{ALT_LABELS[alt]}</span>
                  <span className="font-bold text-white text-base leading-tight">{questaoAtual[alt]}</span>
                </div>
              ))}
            </div>
            {/* Botões equipes — pulsando */}
            <div className="grid grid-cols-2 gap-3">
              {TEAMS_KAHOOT.map(t => (
                <div key={t.id}
                  className="rounded-2xl flex items-center justify-center gap-3 font-extrabold"
                  style={{
                    background: t.color,
                    height: 68,
                    fontSize: 18,
                    color: t.dark ? "#1a1a1a" : "#fff",
                    animation: "pulseScale 1s ease-in-out infinite",
                    boxShadow: `0 0 28px ${t.color}99`,
                  }}>
                  🔔 {t.label}
                </div>
              ))}
            </div>
          </>
        )}

        {/* FASE: buzz — vencedor em destaque + questão grande */}
        {fase === 'buzz' && winner && questaoAtual && (
          <>
            {/* Vencedor em destaque */}
            <div className="rounded-3xl flex flex-col items-center justify-center py-8"
              style={{ background: winner.color, boxShadow: `0 0 60px ${winner.color}88` }}>
              <div className="font-black" style={{ fontSize: 56, color: winner.dark ? "#1a1a1a" : "#fff",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)", animation: "pulseScale 0.8s ease-in-out infinite" }}>
                🔔 {winner.label}
              </div>
              <div className="font-bold mt-1 text-lg" style={{ color: winner.dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)" }}>
                foi a primeira!
              </div>
            </div>
            {/* Apenas texto da questão — sem alternativas */}
            <div className="rounded-3xl px-7 py-6 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="font-extrabold text-white leading-snug" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
            {/* Outras equipes — somem (só vencedor visível acima) */}
            <div className="grid grid-cols-3 gap-2">
              {TEAMS_KAHOOT.filter(t => t.id !== winner.id).map(t => (
                <div key={t.id} className="rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: t.color, height: 44, color: t.dark ? "#1a1a1a" : "#fff", opacity: 0.25 }}>
                  {t.label}
                </div>
              ))}
            </div>
          </>
        )}

        {/* FASE: errou — primeira equipe errou, aguardando mediador */}
        {fase === 'errou' && errouTeamT && questaoAtual && (
          <>
            <div className="rounded-3xl flex flex-col items-center justify-center py-8"
              style={{ background: "#7f1d1d", boxShadow: "0 0 40px #ef444488" }}>
              <div className="font-black text-white text-4xl mb-2">
                ❌ {errouTeamT.label} errou!
              </div>
              <div className="text-white/70 font-semibold text-lg">
                Aguardando segunda chance…
              </div>
            </div>
            <div className="rounded-3xl px-7 py-5" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="font-extrabold text-white leading-snug text-center" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.8rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
          </>
        )}

        {/* FASE: ativo_segunda — segunda chance, equipe que errou bloqueada */}
        {fase === 'ativo_segunda' && questaoAtual && (
          <>
            <div className="rounded-3xl px-7 py-5" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: LARANJA }}>
                Segunda chance — Questão {questaoIdx + 1} / {questoes.length}
              </div>
              <div className="font-extrabold text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2.8vw, 1.8rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['a','b','c','d']).map(alt => (
                <div key={alt} className="rounded-2xl flex items-center gap-3 px-5 py-4"
                  style={{ background: ALT_CORES[alt] }}>
                  <span className="font-black text-white text-2xl w-9 shrink-0 text-center">{ALT_LABELS[alt]}</span>
                  <span className="font-bold text-white text-base leading-tight">{questaoAtual[alt]}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TEAMS_KAHOOT.map(t => {
                const isBlocked = t.id === errou;
                return (
                  <div key={t.id}
                    className="rounded-2xl flex items-center justify-center gap-2 font-extrabold"
                    style={{
                      background: isBlocked ? "#333" : t.color,
                      height: 68,
                      fontSize: 17,
                      color: isBlocked ? "#555" : (t.dark ? "#1a1a1a" : "#fff"),
                      opacity: isBlocked ? 0.3 : 1,
                      animation: isBlocked ? "none" : "pulseScale 1s ease-in-out infinite",
                      boxShadow: isBlocked ? "none" : `0 0 28px ${t.color}99`,
                    }}>
                    {isBlocked ? "✗" : "🔔"} {t.label}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* FASE: resposta — revela gabarito */}
        {fase === 'resposta' && questaoAtual && (
          <>
            {/* Banner resultado */}
            <div className="rounded-3xl py-5 px-7 text-center"
              style={{ background: answer.correto ? "#15803d" : "#dc2626",
                boxShadow: answer.correto ? "0 0 40px #15803d88" : "0 0 40px #dc262688" }}>
              <div className="font-black text-white text-3xl">
                {answer.correto ? "✅ CORRETO! +1 pt" : "❌ ERRADO!"}
              </div>
              <div className="text-white/80 font-semibold mt-1">
                {TEAMS_KAHOOT.find(t => t.id === answer.teamId)?.label} respondeu {ALT_LABELS[answer.alt]}
                {!answer.correto && ` — correto era ${ALT_LABELS[questaoAtual.correta]}`}
              </div>
            </div>
            {/* Texto da questão */}
            <div className="rounded-3xl px-7 py-4" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="font-extrabold text-white leading-snug" style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)" }}>
                {questaoAtual.texto}
              </div>
            </div>
            {/* Alternativas reveladas */}
            <div className="grid grid-cols-2 gap-3">
              {(['a','b','c','d']).map(alt => {
                const isResposta = answer.alt === alt;
                const isCorreta  = questaoAtual.correta === alt;
                return (
                  <div key={alt} className="rounded-2xl flex items-center gap-3 px-5 py-4 transition-all"
                    style={{
                      background: isCorreta ? "#15803d" : isResposta ? "#dc2626" : ALT_CORES[alt],
                      opacity: !isResposta && !isCorreta ? 0.4 : 1,
                      transform: isCorreta ? "scale(1.04)" : "scale(1)",
                      boxShadow: isCorreta ? "0 0 30px #15803d99" : isResposta ? "0 0 20px #dc262688" : "none",
                    }}>
                    <span className="font-black text-white text-2xl w-9 shrink-0 text-center">{ALT_LABELS[alt]}</span>
                    <span className="font-bold text-white text-base leading-tight flex-1">{questaoAtual[alt]}</span>
                    {isCorreta && <span className="text-white text-xl font-black">✓</span>}
                    {isResposta && !isCorreta && <span className="text-white text-xl font-black">✗</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Placar compacto (sempre visível no rodapé) ── */}
      <div className="px-6 pb-4 pt-3 max-w-3xl mx-auto w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex gap-2 items-center">
          {ranking.map((t, idx) => (
            <div key={t.id} className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2 transition-all"
              style={{
                background: t.color + (buzz?.teamId === t.id ? "ff" : "55"),
                transform: answer?.teamId === t.id && answer.correto ? "scale(1.06)" : "scale(1)",
              }}>
              <span className="text-xs font-bold" style={{ color: t.dark ? "#1a1a1a" : "rgba(255,255,255,0.7)" }}>{idx + 1}º</span>
              <span className="font-bold text-xs flex-1 truncate" style={{ color: t.dark ? "#1a1a1a" : "#fff" }}>{t.label}</span>
              <span className="font-extrabold tabular-nums" style={{ fontSize: 18, color: t.dark ? "#1a1a1a" : "#fff" }}>{pts[t.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");  // "home" | "propulsao" | "ponte" | "kahoot"
  const [mode, setMode] = useState("monitor"); // "monitor" | "telao"


  const pageLabel = page === "home"      ? "🏠 Início"
    : page === "propulsao" ? "🌀 Lançador de Spinner"
    : page === "ponte"     ? "🌉 Ponte de Da Vinci"
    : "🎓 Kahoot English";

  const handleSetPage = (p) => {
    setPage(p);
    setMode("monitor");
  };

  const isHome = page === "home";

  return (
    <div className="min-h-screen bg-gray-50">
      {isLocalMode && (
        <div style={{ background: '#16a34a', color: '#fff', textAlign: 'center', fontSize: '11px', fontWeight: 700, padding: '5px', letterSpacing: '.05em' }}>
          ● MODO OFFLINE — servidor local · todos os dados salvos no notebook
        </div>
      )}
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: AZUL_ESCURO }}>
        <div className="max-w-5xl mx-auto flex flex-col gap-2 px-4 py-3">
          {/* Linha 1: título + seletor de modo (só quando não é home) */}
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm md:text-base">{pageLabel}</span>
            {!isHome && (
              <div className="flex gap-1 bg-white bg-opacity-10 rounded-full p-1">
                <button onClick={() => setMode("monitor")}
                  className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: mode === "monitor" ? LARANJA : "transparent" }}>
                  Monitor
                </button>
                {page === "kahoot" && (
                  <a href="/buzzer.html" target="_blank" rel="noopener"
                    className="px-3 py-1.5 rounded-full text-sm font-bold text-white no-underline"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", textDecoration: "none" }}>
                    🎯 Buzzer ↗
                  </a>
                )}
                <button onClick={() => setMode("telao")}
                  className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: mode === "telao" ? LARANJA : "transparent" }}>
                  Telão
                </button>
              </div>
            )}
          </div>
          {/* Linha 2: navegação entre páginas */}
          <div className="flex gap-2">
            {[
              { id: "home",      label: "🏠 Início" },
              { id: "propulsao", label: "🌀 Spinner" },
              { id: "ponte",     label: "🌉 Ponte" },
              { id: "kahoot",    label: "🎓 Kahoot" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => handleSetPage(id)}
                className="flex-1 py-1.5 rounded-xl text-sm font-bold transition-colors"
                style={{
                  backgroundColor: page === id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                  color: page === id ? "#fff" : "rgba(255,255,255,0.55)",
                  border: page === id ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isHome && <HomeView />}
      {page === "propulsao" && (mode === "monitor" ? <MonitorView /> : <TelaoView />)}
      {page === "ponte"     && (mode === "monitor" ? <PonteMonitorView /> : <PonteTelaoView />)}
      {page === "kahoot"    && (
        mode === "monitor"
          ? <KahootMonitorView />
          : <KahootTelaoView  />
      )}
    </div>
  );
}
