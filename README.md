# Torneio SESI — Painel Digital

Painel web para acompanhamento em tempo real do torneio escolar SESI,
composto por dois módulos independentes que compartilham apenas o estilo visual.

---

## Módulo 1 — Prova da Propulsão (React + Firebase)

Aplicação principal (`src/App.jsx`), construída em React 18 + Vite com dados
armazenados no Firebase Realtime Database.

**Funcionalidades:**
- **Monitor** — lançamento de pontos de montagem e giro por rodada e equipe,
  com indicador de atividade ao vivo.
- **Telão / Ranking** — classificação geral em tempo real, histórico de rodadas,
  painel de vencedor por rodada e detalhe completo de cada etapa.

**Equipes:** 2º A, 2º B, 2º C, 2º D | **Rodadas:** 1–4

**Deploy:** Firebase Hosting — `https://torneio-sesi-20de0.web.app`

**Build:**
```bash
npm install
npm run build          # gera dist/
firebase deploy --only hosting
```

---

## Módulo 2 — Insígnias por Área (HTML/CSS/JS estático)

Páginas independentes em `public/insignias/`, sem framework, sem build.
Cada **área/disciplina** tem seu próprio estojo com 4 slots — um por equipe —
que exibe a imagem real da insígnia quando aquela equipe vence a competição.

**Áreas:** Robótica, Inglês, Artes, Educação Física

**Páginas:**
| URL | Descrição |
|-----|-----------|
| `/insignias/areas.html` | Página pública — estojo de cada área |
| `/insignias/admin-areas.html` | Painel do professor — marcar conquistas |

**Dados:** localStorage (`torneio-insignias-areas:v1`) — independente do Firebase.

**Imagens das insígnias** — colocar em `public/insignias/assets/insignias/`:
- `robotica.jpg`
- `ingles.jpg`
- `artes.jpg`
- `educacao-fisica.jpg`

**PIN de admin:** definido em `public/insignias/areas-data.js` → `ADMIN_PIN`.

---

## O que é compartilhado entre os módulos

| Recurso | Compartilhado? |
|---------|----------------|
| Equipes (ids, cores) | Sim — definidas em ambos com os mesmos valores |
| PIN de admin | Mesmo valor, definido separadamente em cada módulo |
| Estilo visual (azul, laranja) | Sim — mesmas variáveis CSS |
| Firebase / localStorage | Não — cada módulo usa seu próprio storage |
| Lógica de negócio | Não — sistemas completamente independentes |
