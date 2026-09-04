// Painel admin — Insígnias por Área

(function () {
  // ── PIN ──────────────────────────────────────────────────
  const pinOverlay = document.getElementById("pin-overlay");
  const pinInput   = document.getElementById("pin-input");
  const pinBtn     = document.getElementById("pin-btn");
  const pinErro    = document.getElementById("pin-erro");
  const adminApp   = document.getElementById("admin-app");

  function validarPin() {
    if (pinInput.value === ADMIN_PIN) {
      pinOverlay.style.display = "none";
      adminApp.style.display   = "block";
      renderAdmin();
    } else {
      pinErro.style.display = "block";
      pinInput.value = "";
      pinInput.focus();
    }
  }

  pinBtn.addEventListener("click", validarPin);
  pinInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") validarPin();
  });
  pinInput.focus();

  // ── Estado de trabalho (será salvo ao clicar em Salvar) ──
  var estadoAtual = {}; // carregado após login
  var estadoTemp  = {}; // cópia editável

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ── Renderiza o painel ──────────────────────────────────
  function renderAdmin() {
    estadoAtual = carregarEstado();
    estadoTemp  = clonar(estadoAtual);

    const body = document.getElementById("admin-body");
    body.innerHTML = "";

    AREAS.forEach(function (area) {
      const section = document.createElement("div");
      section.className = "admin-section";

      const titulo = document.createElement("div");
      titulo.className = "admin-area-titulo";
      titulo.innerHTML = area.emoji + " " + area.nome;
      section.appendChild(titulo);

      const grid = document.createElement("div");
      grid.className = "admin-checkboxes";

      TEAMS.forEach(function (team) {
        const checked = !!(estadoTemp[area.id] && estadoTemp[area.id][team.id]);

        const label = document.createElement("label");
        label.className = "admin-check-label";
        label.style.background = team.cor + "18";
        label.style.borderColor = checked ? team.cor : "transparent";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = checked;
        cb.dataset.area = area.id;
        cb.dataset.team = team.id;

        cb.addEventListener("change", function () {
          if (!estadoTemp[area.id]) estadoTemp[area.id] = {};
          if (cb.checked) {
            estadoTemp[area.id][team.id] = true;
            label.style.borderColor = team.cor;
          } else {
            delete estadoTemp[area.id][team.id];
            label.style.borderColor = "transparent";
          }
        });

        const span = document.createElement("span");
        span.style.color = team.cor;
        span.textContent = team.nome;

        label.appendChild(cb);
        label.appendChild(span);
        grid.appendChild(label);
      });

      section.appendChild(grid);
      body.appendChild(section);

      // Separador
      const hr = document.createElement("hr");
      hr.style.cssText = "border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0";
      body.appendChild(hr);
    });
  }

  // ── Salvar ───────────────────────────────────────────────
  document.getElementById("btn-salvar").addEventListener("click", function () {
    salvarEstado(estadoTemp);
    estadoAtual = clonar(estadoTemp);

    const btn = document.getElementById("btn-salvar");
    const original = btn.textContent;
    btn.textContent = "✅ Salvo!";
    btn.disabled = true;
    setTimeout(function () {
      btn.textContent = original;
      btn.disabled = false;
    }, 1800);
  });
})();
