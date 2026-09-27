# CLAUDE.md — Guia para agentes de IA

## Estrutura do projeto

Este repositório contém **dois módulos paralelos e independentes**.

---

### Módulo 1 — Prova da Propulsão

**Arquivos:** `src/App.jsx`, `src/firebase.js`, `src/main.jsx`, `index.html`, `vite.config.js`

- React 18 + Vite + Firebase Realtime Database
- **Não altere** a lógica de pontuação (`rankPoints`, `countGiroFirsts`),
  as chaves do Firebase (`r{round}_{teamId}`, `live_r{round}_{teamId}`),
  nem a estrutura de `TEAMS` e `ROUNDS` sem revisar impacto em todos os componentes.
- Para deploy: `npm run build && firebase deploy --only hosting`

---

### Módulo 2 — Insígnias por Área

**Arquivos:** `public/insignias/areas-data.js`, `areas.html`, `areas.js`,
`admin-areas.html`, `admin-areas.js`, `style.css`

- HTML/CSS/JS puro — sem build, sem framework
- Storage: `localStorage` com chave `torneio-insignias-areas:v1`
- **Não compartilha storage com o Módulo 1** — são sistemas totalmente separados
- Imagens das insígnias: `public/insignias/assets/insignias/{robotica,ingles,artes,educacao-fisica}.jpg`
- PIN de admin: `ADMIN_PIN` em `areas-data.js`
- **Não altere** `AREAS` nem `TEAMS` em `areas-data.js` sem atualizar os dois módulos

---

## Regras gerais

- Os dois módulos compartilham apenas: mesmas equipes (IDs/cores), mesmo PIN,
  paleta visual (azul `#004B8D`, laranja `#F5821F`).
- Ao modificar equipes: atualizar `TEAMS` em `src/App.jsx` **e** em
  `public/insignias/areas-data.js` separadamente.
- Nunca misturar o storage dos módulos (Firebase ≠ localStorage com chave própria).
- A pasta `public/` do Vite é copiada diretamente para `dist/` no build —
  arquivos estáticos ali ficam disponíveis sem transformação.
