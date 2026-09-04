// Página pública — Insígnias por Área

(function () {
  const estado = carregarEstado();
  let areaAtiva = null;

  const grid = document.getElementById("areas-grid");
  const estojoWrapper = document.getElementById("estojo-wrapper");
  const estojoTopo = document.getElementById("estojo-topo");
  const estojoCorp = document.getElementById("estojo-corpo");

  // Renderiza os cards das áreas
  AREAS.forEach(function (area) {
    const card = document.createElement("div");
    card.className = "area-card";
    card.dataset.id = area.id;
    card.innerHTML =
      '<div class="area-card-topo">' + area.nome + "</div>" +
      '<span class="area-card-emoji">' + area.emoji + "</span>" +
      '<div class="area-card-nome">ver insígnias</div>';
    card.addEventListener("click", function () {
      abrirArea(area, card);
    });
    grid.appendChild(card);
  });

  function abrirArea(area, cardEl) {
    // Destaca o card ativo
    document.querySelectorAll(".area-card").forEach(function (c) {
      c.classList.remove("ativa");
    });
    if (areaAtiva === area.id) {
      // Fecha o estojo se clicar na mesma área
      areaAtiva = null;
      estojoWrapper.classList.remove("visivel");
      return;
    }
    cardEl.classList.add("ativa");
    areaAtiva = area.id;

    // Cabeçalho do estojo
    estojoTopo.innerHTML = area.emoji + " " + area.nome;

    // Slots — um por equipe
    estojoCorp.innerHTML = "";
    TEAMS.forEach(function (team) {
      const ganhou = conquistou(estado, area.id, team.id);
      const slot = document.createElement("div");
      slot.className = "slot";

      const label = document.createElement("div");
      label.className = "slot-label";
      label.style.background = team.cor;
      label.style.color = team.corTexto;
      label.textContent = team.nome;

      const corpo = document.createElement("div");
      corpo.className = "slot-corpo";
      corpo.style.background = team.cor + "18";

      if (ganhou) {
        const img = document.createElement("img");
        img.src = area.imagem;
        img.alt = "Insígnia " + area.nome + " — " + team.nome;
        img.className = "slot-insignia recem-conquistada";
        img.onerror = function () {
          // Se a imagem não existir, mostra emoji grande
          corpo.innerHTML =
            '<div style="font-size:3rem;text-align:center;padding:.5rem">' +
            area.emoji + "</div>";
        };
        corpo.appendChild(img);
      } else {
        const cadeado = document.createElement("div");
        cadeado.className = "slot-cadeado";
        cadeado.style.color = team.cor;
        cadeado.innerHTML =
          ICONS.cadeado + '<span style="color:' + team.cor + '">não conquistada</span>';
        corpo.appendChild(cadeado);
      }

      slot.appendChild(label);
      slot.appendChild(corpo);
      estojoCorp.appendChild(slot);
    });

    estojoWrapper.classList.add("visivel");
    // Scroll suave até o estojo
    setTimeout(function () {
      estojoWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
})();
