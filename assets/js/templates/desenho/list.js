window.initNotaEncomendaList = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }
  const supabase = window.supabaseClient;

    let cleanupRealtime = null;
  if (typeof window.initNotaEncomendaRealtime === "function") {
    try {
      cleanupRealtime = window.initNotaEncomendaRealtime(loadData);
    } catch (err) {
      console.warn("Aviso: falha ao iniciar realtime das notas de encomenda:", err);
    }
  }
  window.addEventListener("beforeunload", () => {
    if (cleanupRealtime) cleanupRealtime();
  });

  // ---------------------------------------------------------------
  // ELEMENTOS
  // ---------------------------------------------------------------
  const tbody = document.getElementById("notasBody");
  const filtroNumero = document.getElementById("filtroNotaNumero");
  const filtroCliente = document.getElementById("filtroNotaCliente");
  const filtroMaterial = document.getElementById("filtroNotaMaterial");
   const filtroTipo = document.getElementById("filtroNotaTipo");
  const filtroEstado = document.getElementById("filtroNotaEstado");
  const btnLimpar = document.getElementById("btnLimparFiltrosNota");

  function popularFiltroEstado() {
    const opcoes = Object.entries(window.NE_ESTADO_LABEL || {})
      .map(([valor, label]) => `<option value="${valor}">${escapeHtml(label)}</option>`)
      .join("");
    filtroEstado.innerHTML = `<option value="">Todos</option>${opcoes}`;
  }
  popularFiltroEstado();

  const itemsPerPageSelect = document.getElementById("itemsPerPageNota");
  const prevPageBtn = document.getElementById("prevPageNota");
  const nextPageBtn = document.getElementById("nextPageNota");
  const pageIndicator = document.getElementById("pageIndicatorNota");

  const deleteModalEl = document.getElementById("deleteNotaModal");
  const deleteModal = new bootstrap.Modal(deleteModalEl);
  const confirmDeleteBtn = document.getElementById("confirmDeleteNotaBtn");

   const estadoModalEl = document.getElementById("neModalAlterarEstado");
  const estadoModal = new bootstrap.Modal(estadoModalEl);
  const estadoModalSelect = document.getElementById("neEstadoModalSelect");
  const confirmAlterarEstadoBtn = document.getElementById("confirmAlterarEstadoBtn");
  let itemToChangeEstado = null;

  function popularOpcoesEstado() {
    estadoModalSelect.innerHTML = Object.entries(window.NE_ESTADO_LABEL || {})
      .map(([valor, label]) => `<option value="${valor}">${escapeHtml(label)}</option>`)
      .join("");
  }
  popularOpcoesEstado();

  const confirmarImpressaoModalEl = document.getElementById("neModalConfirmarImpressao");
  const confirmarImpressaoModal = new bootstrap.Modal(confirmarImpressaoModalEl);
  const btnImpressaoSim = document.getElementById("btnImpressaoSim");
  const btnImpressaoNao = document.getElementById("btnImpressaoNao");
  let notaAImprimir = null;

  const storageKey = "itemsPerPage_list-desenho";
  let currentPage = 1;
  let itemsPerPage = parseInt(localStorage.getItem(storageKey)) || 10;
  itemsPerPageSelect.value = itemsPerPage;

  let dadosOriginais = [];
  let itemToDelete = null;

  // ---------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------
  async function loadData() {
    tbody.innerHTML = `<tr><td colspan="11">A carregar dados...</td></tr>`;

    const { data, error } = await supabase
      .from("notas_encomenda")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      tbody.innerHTML = `<tr><td colspan="11">Erro ao carregar dados: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    dadosOriginais = data || [];
    currentPage = 1;
    renderTabela();
  }

  // ---------------------------------------------------------------
  // FILTROS
  // ---------------------------------------------------------------
    function aplicarFiltros() {
      const numeroVal = filtroNumero.value.trim().toLowerCase();
    const clienteVal = filtroCliente.value.trim().toLowerCase();
    const materialVal = filtroMaterial.value.trim().toLowerCase();
    const tipoVal = filtroTipo.value;
    const estadoVal = filtroEstado.value;

    return dadosOriginais.filter((n) => {
      const numeroOk = !numeroVal || String(n.id).toLowerCase().startsWith(numeroVal);
const clienteOk = !clienteVal || (n.cliente_nome || "").toLowerCase().startsWith(clienteVal);
      const materialOk = !materialVal || (n.material || "").toLowerCase().includes(materialVal);
      const tipoOk = !tipoVal || n.tipo === tipoVal;
      const estadoOk = !estadoVal || (n.estado || "por_acabar") === estadoVal;
      return numeroOk && clienteOk && materialOk && tipoOk && estadoOk;
    });
  }

       filtroNumero.addEventListener("input", () => { currentPage = 1; renderTabela(); });
  filtroMaterial.addEventListener("input", () => { currentPage = 1; renderTabela(); });
  filtroTipo.addEventListener("change", () => { currentPage = 1; renderTabela(); });
  filtroEstado.addEventListener("change", () => { currentPage = 1; renderTabela(); });

    // ---------------------------------------------------------------
  // AUTOCOMPLETE DO FILTRO "CLIENTE" (visual igual ao dropdown de Marca)
  // ---------------------------------------------------------------
  const filtroClienteDropdown = document.getElementById("filtroClienteDropdown");
  const clearFiltroClienteBtn = document.getElementById("clearFiltroCliente");
  let listaClientesFiltro = [];

  async function carregarClientesParaFiltro() {
    const { data, error } = await supabase.from("clientes_encomendas").select("nome").order("nome");
    if (!error && data) listaClientesFiltro = data.map((c) => c.nome);
  }
  carregarClientesParaFiltro();

  function toggleClearFiltroCliente() {
    clearFiltroClienteBtn.classList.toggle("d-none", !filtroCliente.value);
  }

  function renderFiltroClienteDropdown(lista) {
    if (!lista.length) {
      filtroClienteDropdown.innerHTML = `<div class="autocomplete-item disabled">Sem clientes correspondentes</div>`;
      filtroClienteDropdown.classList.add("show");
      return;
    }
    filtroClienteDropdown.innerHTML = lista
      .map((nome) => `<div class="autocomplete-item" data-nome="${escapeHtml(nome)}">${escapeHtml(nome)}</div>`)
      .join("");
    filtroClienteDropdown.classList.add("show");

    filtroClienteDropdown.querySelectorAll(".autocomplete-item:not(.disabled)").forEach((item) => {
      item.addEventListener("click", () => {
        filtroCliente.value = item.getAttribute("data-nome");
        filtroClienteDropdown.classList.remove("show");
        toggleClearFiltroCliente();
        currentPage = 1;
        renderTabela();
      });
    });
  }

  function filtrarESugerirClientes() {
    const termo = filtroCliente.value.trim().toLowerCase();
    const filtradas = termo
      ? listaClientesFiltro.filter((n) => n.toLowerCase().includes(termo))
      : listaClientesFiltro;
    renderFiltroClienteDropdown(filtradas);
  }

  filtroCliente.addEventListener("focus", filtrarESugerirClientes);
  filtroCliente.addEventListener("input", () => {
    toggleClearFiltroCliente();
    filtrarESugerirClientes();
    currentPage = 1;
    renderTabela();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#filtroNotaCliente") && !e.target.closest("#filtroClienteDropdown")) {
      filtroClienteDropdown.classList.remove("show");
    }
  });

  clearFiltroClienteBtn.addEventListener("click", () => {
    filtroCliente.value = "";
    toggleClearFiltroCliente();
    filtroClienteDropdown.classList.remove("show");
    currentPage = 1;
    renderTabela();
    filtroCliente.focus();
  });

        btnLimpar.addEventListener("click", () => {
    filtroNumero.value = "";
    filtroCliente.value = "";
    filtroMaterial.value = "";
    filtroTipo.value = "";
    filtroEstado.value = "";
    toggleClearFiltroCliente();
    filtroClienteDropdown.classList.remove("show");
    currentPage = 1;
    renderTabela();
  });

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  function renderTabela() {
    const filtrados = aplicarFiltros();

     if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11">Nenhuma nota de encomenda encontrada.</td></tr>`;
      pageIndicator.textContent = "1 / 1";
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itemsPerPage));
    if (currentPage > totalPaginas) currentPage = totalPaginas;
    if (currentPage < 1) currentPage = 1;

    const inicio = (currentPage - 1) * itemsPerPage;
    const pagina = filtrados.slice(inicio, inicio + itemsPerPage);

tbody.innerHTML = pagina.map((n) => {
  const previewHtml = n.preview_url
    ? `<img src="${escapeHtml(n.preview_url)}" class="ne-thumb" data-id="${n.id}" alt="preview">`
    : `<span class="text-muted fst-italic">—</span>`;

  const estado = n.estado || "por_acabar";
  const estadoLabel = (window.NE_ESTADO_LABEL && window.NE_ESTADO_LABEL[estado]) || estado;
  const estadoCor = (window.NE_ESTADO_BADGE_COLOR && window.NE_ESTADO_BADGE_COLOR[estado]) || "#6c757d";
  const imprimirDisabled = estado === "por_acabar";
  const impressoes = n.impressoes || 0;

  return `
    <tr data-id="${n.id}">
      <td>${escapeHtml(String(n.id))}</td>
      <td>${escapeHtml(n.cliente_nome || "")}</td>
      <td>${escapeHtml(n.material || "")}</td>
      <td>${escapeHtml((window.NE_TIPO_LABEL && window.NE_TIPO_LABEL[n.tipo]) || n.tipo || "")}</td>
      <td>
        <span class="badge ne-estado-badge" data-id="${n.id}" title="Clica para alterar o estado"
              style="background-color:${estadoCor}; color:#fff; cursor:pointer; font-weight:600;">
          ${escapeHtml(estadoLabel)}
        </span>
      </td>
      <td><span class="badge text-bg-dark" title="Nº de vezes impressa">${impressoes}</span></td>
      <td>${previewHtml}</td>
      <td>${escapeHtml(window.neFormatDate ? window.neFormatDate(n.data_criacao) : (n.data_criacao || ""))}</td>
      <td>${escapeHtml(window.neFormatDate ? window.neFormatDate(n.data_entrega) : (n.data_entrega || ""))}</td>
      <td>${n.observacoes ? `<button class="btn btn-sm btn-outline-secondary btn-ver-obs" title="Ver observações"><i class="bi bi-eye me-1"></i>Ver</button>` : `<span class="text-muted fst-italic">—</span>`}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1 btn-ver" title="Pré-visualizar"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1 btn-editar" title="Editar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-secondary me-1 btn-imprimir" title="${imprimirDisabled ? "Só disponível quando o desenho estiver pronto" : "Imprimir"}" ${imprimirDisabled ? "disabled" : ""}><i class="bi bi-printer"></i></button>
        <button class="btn btn-sm btn-outline-danger btn-eliminar" title="Eliminar"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `;
}).join("");

    pageIndicator.textContent = `${currentPage} / ${totalPaginas}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPaginas;

    configurarEventos(pagina);
  }

  function configurarEventos(pagina) {
    tbody.querySelectorAll(".ne-thumb, .btn-ver").forEach((el) => {
      el.addEventListener("click", (e) => {
        const row = e.currentTarget.closest("tr");
        const id = row.getAttribute("data-id");
        abrirPreview(pagina.find((n) => String(n.id) === id));
      });
    });

    tbody.querySelectorAll(".btn-ver-obs").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.currentTarget.closest("tr");
        const id = row.getAttribute("data-id");
        const nota = pagina.find((n) => String(n.id) === id);
        if (nota) abrirObservacoes(nota);
      });
    });

    tbody.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.currentTarget.closest("tr");
        const id = row.getAttribute("data-id");
        goToRoute(`/form-desenho?id=${id}`);
      });
    });

       tbody.querySelectorAll(".btn-imprimir").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.currentTarget.closest("tr");
        const id = row.getAttribute("data-id");
        const nota = pagina.find((n) => String(n.id) === id);
        if (nota) iniciarFluxoImpressao(nota, nota.desenho || []);
      });
    });

        tbody.querySelectorAll(".btn-eliminar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.currentTarget.closest("tr");
        itemToDelete = row.getAttribute("data-id");
        deleteModal.show();
      });
    });

tbody.querySelectorAll(".ne-estado-badge").forEach((badge) => {
  badge.addEventListener("click", (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const nota = pagina.find((n) => String(n.id) === id);
    if (!nota) return;
    itemToChangeEstado = id;
    estadoModalSelect.value = nota.estado || "por_acabar";
    estadoModal.show();
  });
});
  }


   function abrirPreview(nota) {
  if (!nota) return;
  document.getElementById("neListModalPreviewTitulo").textContent = `Nota Nº ${nota.id} — ${nota.cliente_nome || ""}`;
  const body = document.getElementById("neListModalPreviewBody");
  if (nota.preview_url) {
    body.innerHTML = `<img src="${escapeHtml(nota.preview_url)}" class="img-fluid border" alt="Pré-visualização">`;
  } else {
    body.innerHTML = `<p class="text-muted">Sem pré-visualização disponível.</p>`;
  }
  const btnImprimirModal = document.getElementById("neListModalImprimir");
  const imprimirDisabled = (nota.estado || "por_acabar") === "por_acabar";
  btnImprimirModal.disabled = imprimirDisabled;
  btnImprimirModal.title = imprimirDisabled ? "Só disponível quando o desenho estiver pronto" : "";
  btnImprimirModal.onclick = () => iniciarFluxoImpressao(nota, nota.desenho || []);
  new bootstrap.Modal(document.getElementById("neListModalPreview")).show();
}

    function abrirObservacoes(nota) {
    let offcanvasEl = document.getElementById("neObsOffcanvas");
    if (!offcanvasEl) {
      offcanvasEl = document.createElement("div");
      offcanvasEl.className = "offcanvas offcanvas-end";
      offcanvasEl.id = "neObsOffcanvas";
      offcanvasEl.tabIndex = -1;
      offcanvasEl.innerHTML = `
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="neObsOffcanvasTitulo">Observações</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
        </div>
        <div class="offcanvas-body" id="neObsOffcanvasBody"></div>
      `;
      document.body.appendChild(offcanvasEl);
    }

        document.getElementById("neObsOffcanvasTitulo").textContent = `Observações — Nota Nº ${nota.id}`;
    document.getElementById("neObsOffcanvasBody").innerHTML = `
      <p class="fw-bold mb-3">${escapeHtml(nota.cliente_nome || "")}</p>
      <p class="mb-0" style="white-space: pre-wrap;">${escapeHtml(nota.observacoes || "")}</p>
    `;

    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    offcanvas.show();
  }

   // ---------------------------------------------------------------
  // ALTERAR ESTADO
  // ---------------------------------------------------------------
  confirmAlterarEstadoBtn.addEventListener("click", async () => {
    if (!itemToChangeEstado) return;
    const novoEstado = estadoModalSelect.value;
    const { error } = await supabase.from("notas_encomenda").update({ estado: novoEstado }).eq("id", itemToChangeEstado);
    if (error) {
      showMessage(`Erro ao atualizar estado: ${error.message}`, "danger");
      return;
    }
    const nota = dadosOriginais.find((n) => String(n.id) === itemToChangeEstado);
    if (nota) nota.estado = novoEstado;
    showMessage("Estado atualizado.", "success");
    estadoModal.hide();
    itemToChangeEstado = null;
    renderTabela();
  });

  // ---------------------------------------------------------------
  // IMPRESSÃO — abre o modal de impressão do browser e, por baixo dele,
  // o nosso modal de confirmação; só se conta a impressão se o
  // utilizador confirmar "Sim, imprimi" depois de fechar o diálogo do
  // browser.
  // ---------------------------------------------------------------
  function iniciarFluxoImpressao(nota, shapes) {
    notaAImprimir = nota;
    window.neImprimirNota(nota, shapes || []);
    setTimeout(() => {
      // só mostra a confirmação se ainda estivermos a tratar da mesma nota
      // (evita o modal aparecer sozinho se entretanto se mudou de página)
      if (notaAImprimir && notaAImprimir.id === nota.id) {
        confirmarImpressaoModal.show();
      }
    }, 2500);
  }

  async function registarImpressao(nota) {
    const novoValor = (nota.impressoes || 0) + 1;
    const { error } = await supabase.from("notas_encomenda").update({ impressoes: novoValor }).eq("id", nota.id);
    if (error) {
      showMessage(`Erro ao atualizar a contagem de impressões: ${error.message}`, "danger");
      return;
    }
    nota.impressoes = novoValor;
    const orig = dadosOriginais.find((n) => String(n.id) === String(nota.id));
    if (orig) orig.impressoes = novoValor;
    renderTabela();
  }

  btnImpressaoSim.addEventListener("click", async () => {
    if (notaAImprimir) await registarImpressao(notaAImprimir);
    notaAImprimir = null;
    confirmarImpressaoModal.hide();
  });

  btnImpressaoNao.addEventListener("click", () => {
    notaAImprimir = null;
    confirmarImpressaoModal.hide();
  });

  // ---------------------------------------------------------------
  // ELIMINAR
  // ---------------------------------------------------------------
  confirmDeleteBtn.addEventListener("click", async () => {
    if (!itemToDelete) return;

    const { error } = await supabase.from("notas_encomenda").delete().eq("id", itemToDelete);
    if (error) {
      showMessage(`Erro ao eliminar nota: ${error.message}`, "danger");
      deleteModal.hide();
      return;
    }

    dadosOriginais = dadosOriginais.filter((n) => String(n.id) !== String(itemToDelete));
    showMessage("Desenho eliminada com sucesso!", "success");
    deleteModal.hide();
    itemToDelete = null;
    renderTabela();
  });

  // ---------------------------------------------------------------
  // PAGINAÇÃO
  // ---------------------------------------------------------------
  itemsPerPageSelect.addEventListener("change", (e) => {
    itemsPerPage = parseInt(e.target.value);
    localStorage.setItem(storageKey, itemsPerPage);
    currentPage = 1;
    renderTabela();
  });

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderTabela(); }
  });
  nextPageBtn.addEventListener("click", () => {
    const totalPaginas = Math.max(1, Math.ceil(aplicarFiltros().length / itemsPerPage));
    if (currentPage < totalPaginas) { currentPage++; renderTabela(); }
  });

  await loadData();
};