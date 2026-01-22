// supabase.js
window.isRealtimeUpdate = false;

async function initSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;

  const res = await fetch("/.netlify/functions/getSupabase");
  const { supabaseUrl, supabaseKey } = await res.json();
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  return window.supabaseClient;
}

/**
 * initHomeSupabase
 * @param {string} filtroEstado - 'on' | 'off' | 'nosso'
 * @param {boolean} preservarPaginacao - Se true, mantém página atual
 */
async function initHomeSupabase(filtroEstado = "on", preservarPaginacao = false) {
  try {
    const pageKey = window.currentRoute || window.location.pathname;
    
    // 🔹 GUARDAR página atual e filtros ANTES de limpar
    const paginaAtualSalva = preservarPaginacao && paginacaoPorPagina[pageKey] 
      ? paginacaoPorPagina[pageKey].paginaAtual 
      : 1;
    
    const filtrosAtuais = preservarPaginacao ? {
      ref: document.getElementById("filtroid")?.value || "",
      marca: document.getElementById("filtroMarca")?.value || "",
      nome: document.getElementById("filtroNome")?.value || "",
      tipo: document.getElementById("filtroTipo")?.value || ""
    } : null;

    // ============================
    // LIMPAR ESTADO AO ENTRAR
    // ============================
    window.dadosOriginais = [];
    window.filtroEstadoAtual = filtroEstado;

    const tableBody = document.getElementById("itemsBody");
    if (!tableBody) return;

    // ============================
    // LOADING (só se NÃO for realtime)
    // ============================
    if (!window.isRealtimeUpdate) {
      tableBody.innerHTML = `<tr><td colspan="10">A carregar dados...</td></tr>`;
    }

    // ============================
    // ORDENAR POR ESTADO
    // ============================
    const orderField =
      filtroEstado === "off" || filtroEstado === "nosso" ? "data_off" : "id";

    // ============================
    // FETCH SUPABASE
    // ============================
    const { data, error } = await supabaseClient
      .from("items_view")
      .select("*")
      .eq("estado", filtroEstado)
      .order(orderField, { ascending: false });

    if (error) {
      if (!window.isRealtimeUpdate) {
        tableBody.innerHTML = `<tr><td colspan="10">Erro ao carregar dados: ${error.message}</td></tr>`;
      }
      showMessage(`Erro ao carregar dados: ${error.message}`, "danger");
      window.isRealtimeUpdate = false;
      return;
    }

    // ============================
    // SEM DADOS
    // ============================
    if (!data || data.length === 0) {
      if (!window.isRealtimeUpdate) {
        tableBody.innerHTML = `<tr><td colspan="10">Nenhum produto encontrado.</td></tr>`;
      }

      window.dadosOriginais = [];
      preencherFiltroMarcas();
      window.isRealtimeUpdate = false;
      return;
    }

    // ============================
    // DADOS OK
    // ============================
    window.dadosOriginais = data;

    // filtros + paginação
    preencherFiltroMarcas();
    
    // 🔹 RESTAURAR filtros se solicitado
    if (preservarPaginacao && filtrosAtuais) {
      if (filtrosAtuais.ref) document.getElementById("filtroid").value = filtrosAtuais.ref;
      if (filtrosAtuais.marca) document.getElementById("filtroMarca").value = filtrosAtuais.marca;
      if (filtrosAtuais.nome) document.getElementById("filtroNome").value = filtrosAtuais.nome;
      if (filtrosAtuais.tipo) document.getElementById("filtroTipo").value = filtrosAtuais.tipo;
    }
    
    // 🔹 RESTAURAR página se solicitado
    if (preservarPaginacao && paginacaoPorPagina[pageKey]) {
      paginacaoPorPagina[pageKey].paginaAtual = paginaAtualSalva;
    }
    
    ativarPaginacao();
    initFiltros();

    // ============================
    // FIM
    // ============================
    window.isRealtimeUpdate = false;
  } catch (err) {
    const tableBody = document.getElementById("itemsBody");
    if (!window.isRealtimeUpdate && tableBody) {
      tableBody.innerHTML = `<tr><td colspan="10">Erro inesperado ao carregar dados.</td></tr>`;
    }
    showMessage("Erro inesperado ao carregar dados.", "danger");
    console.error(err);
    window.isRealtimeUpdate = false;
  }
}

/* ============================
   Funções de Filtros & UI
   ============================ */

function preencherFiltroMarcas() {
  const filtroMarca = document.getElementById("filtroMarca");
  if (!filtroMarca) return;

  // 🔹 GUARDAR o valor selecionado ANTES de recriar o HTML
  const valorAtualSelecionado = filtroMarca.value;

  const mapaMarcas = new Map();

  (window.dadosOriginais || []).forEach((item) => {
    if (item.marca) {
      const marcaOriginal = item.marca.trim();
      const key = marcaOriginal.toLowerCase();

      // Se ainda não existe, adiciona
      if (!mapaMarcas.has(key)) {
        mapaMarcas.set(key, marcaOriginal);
      } else {
        // Já existe — se a nova tiver alguma letra maiúscula, substitui
        const existente = mapaMarcas.get(key);
        if (/[A-Z]/.test(marcaOriginal) && !/[A-Z]/.test(existente)) {
          mapaMarcas.set(key, marcaOriginal);
        }
      }
    }
  });

  // Gera o HTML do select ordenado alfabeticamente
  filtroMarca.innerHTML =
    `<option value="">Todas</option>` +
    Array.from(mapaMarcas.values())
      .sort((a, b) => a.localeCompare(b))
      .map((m) => `<option value="${m}">${m}</option>`)
      .join("");
  
  // 🔹 RESTAURAR o valor que estava selecionado
  if (valorAtualSelecionado) {
    filtroMarca.value = valorAtualSelecionado;
  }
}

// 🔹 NOVA FUNÇÃO para aplicar filtros e retornar dados filtrados
function aplicarFiltrosAtuais() {
  const filtroId = document.getElementById("filtroid");
  const filtroMarca = document.getElementById("filtroMarca");
  const filtroNome = document.getElementById("filtroNome");
  const filtroTipo = document.getElementById("filtroTipo");

  if (!filtroId || !filtroMarca || !filtroNome || !filtroTipo) {
    return window.dadosOriginais || [];
  }

  const refValor = filtroId.value.trim().toLowerCase();
  const marcaValor = filtroMarca.value.trim().toLowerCase();
  const nomeValor = (filtroNome.value || "")
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .trim();
  const tipoValor = filtroTipo.value.trim().toLowerCase();

  return (window.dadosOriginais || []).filter((item) => {
    // === FILTRO DE REFERÊNCIA ===
    let refOk = true;
    if (refValor) {
      const refId = String(item.id || "").toLowerCase();
      const refCampo = String(item.referencia || "").toLowerCase();
      refOk = refId.startsWith(refValor) || refCampo.startsWith(refValor);
    }

    // === RESTANTES FILTROS ===
    const marcaOk =
      !marcaValor ||
      (item.marca || "").trim().toLowerCase() === marcaValor.trim().toLowerCase();
    const nomeOk =
      !nomeValor ||
      (item.marca_nome_espessura_clean || "").includes(nomeValor);
    const tipoOk =
      !tipoValor || (item.tipo || "").toLowerCase() === tipoValor;

    return refOk && marcaOk && nomeOk && tipoOk;
  });
}

function initFiltros() {
  const filtroId = document.getElementById("filtroid");
  const filtroMarca = document.getElementById("filtroMarca");
  const filtroNome = document.getElementById("filtroNome");
  const filtroTipo = document.getElementById("filtroTipo");
  const btnLimpar = document.getElementById("btnLimparFiltros");

  if (!filtroId || !filtroMarca || !filtroNome || !filtroTipo || !btnLimpar)
    return;

  const aplicarFiltros = () => {
    const pageKey = window.currentRoute || window.location.pathname;
    const dadosFiltrados = aplicarFiltrosAtuais();
    
    // 🔹 Resetar para página 1 quando aplicar filtros manualmente
    if (paginacaoPorPagina[pageKey]) {
      paginacaoPorPagina[pageKey].paginaAtual = 1;
    }
    
    renderTabelaComPaginacao(dadosFiltrados, pageKey);
  };

  // eventos
  [filtroId, filtroNome].forEach((el) =>
    el.addEventListener("input", aplicarFiltros),
  );
  [filtroMarca, filtroTipo].forEach((el) => {
    el.addEventListener("change", aplicarFiltros);
    el.addEventListener("input", aplicarFiltros);
  });

  btnLimpar.addEventListener("click", () => {
    filtroId.value = "";
    filtroMarca.value = "";
    filtroNome.value = "";
    filtroTipo.value = "";
    aplicarFiltros();
  });
}

/* ============================
   Render da Tabela & Eventos
   ============================ */

function renderTabela(lista, estadoAtual) {
  const tableBody = document.getElementById("itemsBody");
  if (!tableBody) return;

  if (!lista || lista.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tableBody.innerHTML = lista
    .map((item) => {
      const fotoHtml = item.foto
        ? `<img src="${escapeHtml(
            item.foto,
          )}" style="max-width:120px;height:60px;object-fit:cover;border-radius:4px;">`
        : "";
      const dataCol =
        estadoAtual === "off"
          ? item.data_off
            ? new Date(item.data_off).toLocaleString("pt-PT")
            : ""
          : item.created_at
            ? new Date(item.created_at).toLocaleString("pt-PT")
            : "";
      const marcaenomeeespessura = `${item.marca ?? ""} - ${item.nome ?? ""} ${
        item.espessura ?? ""
      }`;
      return `
            <tr data-id="${escapeHtml(String(item.id))}">
                <td>${escapeHtml(String(item.id))}</td>
                <td>${escapeHtml(marcaenomeeespessura ?? "")}</td>
                <td>${escapeHtml(item.comprimento ?? "")}</td>
                <td>${escapeHtml(item.largura ?? "")}</td>
                <td>${escapeHtml(item.lote ?? "")}</td>
                <td>${escapeHtml(item.tipo ?? "")}</td>
                <td>${fotoHtml}</td>
                <td>${escapeHtml(item.observacoes ?? "")}</td>
                <td>${escapeHtml(dataCol)}</td>
                <td>
                    ${
                      estadoAtual === "on"
                        ? `
                        <button class="btn btn-sm btn-outline-primary me-1 btn-edit" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success me-1 btn-move-nosso" title="Mover para Nossas Reservas">
                            <i class="bi bi-arrow-right-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    `
                        : `
                        <button class="btn btn-sm btn-outline-success btn-move-on" title="Mover para Produtos">
                            <i class="bi bi-arrow-right-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    `
                    }
                </td>
            </tr>
        `;
    })
    .join("");

  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    row.style.opacity = 1;
  });
  
  configurarEventosTabela();
}

function configurarEventosTabela() {
  // DELETE
  let itemToDelete = null;
  const deleteModalEl = document.getElementById("deleteModal");
  const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.removeEventListener?.("click", onDeleteClick);
    btn.addEventListener("click", onDeleteClick);
  });

  function onDeleteClick(e) {
    const row = e.currentTarget.closest("tr");
    const id = row?.getAttribute("data-id");
    if (!id) return;
    itemToDelete = { id, row };
    deleteModal?.show();
  }

  document
    .getElementById("confirmDeleteBtn")
    ?.addEventListener("click", async () => {
      if (!itemToDelete) return;

      const itemId = itemToDelete.id;
      const pageKey = window.currentRoute || window.location.pathname;
      
      // 🔹 GUARDAR página atual e TODOS os filtros
      const paginaAnterior = paginacaoPorPagina[pageKey]?.paginaAtual || 1;
      const filtrosAtuais = {
        ref: document.getElementById("filtroid")?.value || "",
        nome: document.getElementById("filtroNome")?.value || "",
        tipo: document.getElementById("filtroTipo")?.value || ""
      };

      // 1. Buscar foto atual
      const { data: itemData, error: fetchError } = await supabaseClient
        .from("items")
        .select("foto")
        .eq("id", itemId)
        .maybeSingle();

      if (fetchError) {
        showMessage("Erro ao buscar item: " + fetchError.message, "danger");
        return;
      }

      if (itemData?.foto) {
        const fileName = itemData.foto.split("/").pop();
        if (fileName) {
          const { error: deleteErr } = await supabaseClient.storage
            .from("imagens")
            .remove([fileName]);
          if (deleteErr) {
            console.error(deleteErr);
            showMessage("Erro ao apagar a imagem do storage", "danger");
            return;
          }
        }
      }

      // 2. Apagar item do banco
      const { error: delError } = await supabaseClient
        .from("items")
        .delete()
        .eq("id", itemId);

      if (delError) {
        showMessage("Erro ao eliminar item", "danger");
        return;
      }

      showMessage("Item eliminado com sucesso!", "success");
      
      // 🔹 Remover da lista local
      window.dadosOriginais = (window.dadosOriginais || []).filter(
        (i) => String(i.id) !== String(itemId)
      );
      
      // 🔹 Atualizar marcas (preserva filtro de marca automaticamente)
      preencherFiltroMarcas();
      
      // 🔹 RESTAURAR os outros filtros
      const filtroIdEl = document.getElementById("filtroid");
      const filtroNomeEl = document.getElementById("filtroNome");
      const filtroTipoEl = document.getElementById("filtroTipo");
      
      if (filtroIdEl) filtroIdEl.value = filtrosAtuais.ref;
      if (filtroNomeEl) filtroNomeEl.value = filtrosAtuais.nome;
      if (filtroTipoEl) filtroTipoEl.value = filtrosAtuais.tipo;
      
      // 🔹 Aplicar filtros para obter lista filtrada
      const dadosFiltrados = aplicarFiltrosAtuais();
      
      // 🔹 Ajustar página se necessário (se ficou vazia)
      const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / paginacaoPorPagina[pageKey].itensPorPagina));
      if (paginaAnterior > totalPaginas) {
        paginacaoPorPagina[pageKey].paginaAtual = totalPaginas;
      } else {
        paginacaoPorPagina[pageKey].paginaAtual = paginaAnterior;
      }
      
      // 🔹 Re-renderizar com a página preservada
      renderTabelaComPaginacao(dadosFiltrados, pageKey);
      
      deleteModal?.hide();
      itemToDelete = null;
    });

  // MOVE / REACTIVATE (para estado 'off' -> 'on')
  let itemToReactivate = null;
  const reactivateModalEl = document.getElementById("reactivateModal");
  const reactivateModal = reactivateModalEl
    ? new bootstrap.Modal(reactivateModalEl)
    : null;

  document.querySelectorAll(".btn-move-on").forEach((btn) => {
    btn.removeEventListener?.("click", onMoveClick);
    btn.addEventListener("click", onMoveClick);
  });

  function onMoveClick(e) {
    const row = e.currentTarget.closest("tr");
    const id = row?.getAttribute("data-id");
    if (!id) return;
    itemToReactivate = { id, row };
    reactivateModal?.show();
  }

  document
    .getElementById("confirmReactivateBtn")
    ?.addEventListener("click", async () => {
      if (!itemToReactivate) return;

      const pageKey = window.currentRoute || window.location.pathname;
      const paginaAnterior = paginacaoPorPagina[pageKey]?.paginaAtual || 1;
      const filtrosAtuais = {
        ref: document.getElementById("filtroid")?.value || "",
        nome: document.getElementById("filtroNome")?.value || "",
        tipo: document.getElementById("filtroTipo")?.value || ""
      };

      const { error } = await supabaseClient
        .from("items")
        .update({
          estado: "on",
          data_off: null,
        })
        .eq("id", itemToReactivate.id);

      if (error) {
        showMessage(`Erro ao reativar: ${error.message}`, "danger");
      } else {
        showMessage("Produto reativado com sucesso!", "success");
        
        window.dadosOriginais = (window.dadosOriginais || []).filter(
          (i) => String(i.id) !== String(itemToReactivate.id),
        );
        
        // 🔹 Atualizar marcas (preserva filtro de marca automaticamente)
        preencherFiltroMarcas();
        
        // 🔹 RESTAURAR os outros filtros
        const filtroIdEl = document.getElementById("filtroid");
        const filtroNomeEl = document.getElementById("filtroNome");
        const filtroTipoEl = document.getElementById("filtroTipo");
        
        if (filtroIdEl) filtroIdEl.value = filtrosAtuais.ref;
        if (filtroNomeEl) filtroNomeEl.value = filtrosAtuais.nome;
        if (filtroTipoEl) filtroTipoEl.value = filtrosAtuais.tipo;
        
        const dadosFiltrados = aplicarFiltrosAtuais();
        
        const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / paginacaoPorPagina[pageKey].itensPorPagina));
        if (paginaAnterior > totalPaginas) {
          paginacaoPorPagina[pageKey].paginaAtual = totalPaginas;
        } else {
          paginacaoPorPagina[pageKey].paginaAtual = paginaAnterior;
        }
        
        renderTabelaComPaginacao(dadosFiltrados, pageKey);
      }

      reactivateModal?.hide();
      itemToReactivate = null;
    });

  // MOVE PARA "NOSSO"
  let itemToMoveNosso = null;
  const moveNossoModalEl = document.getElementById("moveNossoModal");
  const moveNossoModal = moveNossoModalEl
    ? new bootstrap.Modal(moveNossoModalEl)
    : null;

  document.querySelectorAll(".btn-move-nosso").forEach((btn) => {
    btn.removeEventListener?.("click", onMoveNossoClick);
    btn.addEventListener("click", onMoveNossoClick);
  });

  function onMoveNossoClick(e) {
    const row = e.currentTarget.closest("tr");
    const id = row?.getAttribute("data-id");
    if (!id) return;
    itemToMoveNosso = { id, row };
    moveNossoModal?.show();
  }

  document
    .getElementById("confirmMoveNossoBtn")
    ?.addEventListener("click", async () => {
      if (!itemToMoveNosso) return;

      const pageKey = window.currentRoute || window.location.pathname;
      const paginaAnterior = paginacaoPorPagina[pageKey]?.paginaAtual || 1;
      const filtrosAtuais = {
        ref: document.getElementById("filtroid")?.value || "",
        nome: document.getElementById("filtroNome")?.value || "",
        tipo: document.getElementById("filtroTipo")?.value || ""
      };

      const { error } = await supabaseClient
        .from("items")
        .update({
          estado: "nosso",
          data_off: new Date().toISOString(),
        })
        .eq("id", itemToMoveNosso.id);

      if (error) {
        showMessage(`Erro ao mover para "nosso": ${error.message}`, "danger");
      } else {
        showMessage(
          "Produto movido para 'Nossas Reservas' com sucesso!",
          "success",
        );
        
        window.dadosOriginais = (window.dadosOriginais || []).filter(
          (i) => String(i.id) !== String(itemToMoveNosso.id),
        );
        
        // 🔹 Atualizar marcas (preserva filtro de marca automaticamente)
        preencherFiltroMarcas();
        
        // 🔹 RESTAURAR os outros filtros
        const filtroIdEl = document.getElementById("filtroid");
        const filtroNomeEl = document.getElementById("filtroNome");
        const filtroTipoEl = document.getElementById("filtroTipo");
        
        if (filtroIdEl) filtroIdEl.value = filtrosAtuais.ref;
        if (filtroNomeEl) filtroNomeEl.value = filtrosAtuais.nome;
        if (filtroTipoEl) filtroTipoEl.value = filtrosAtuais.tipo;
        
        const dadosFiltrados = aplicarFiltrosAtuais();
        
        const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / paginacaoPorPagina[pageKey].itensPorPagina));
        if (paginaAnterior > totalPaginas) {
          paginacaoPorPagina[pageKey].paginaAtual = totalPaginas;
        } else {
          paginacaoPorPagina[pageKey].paginaAtual = paginaAnterior;
        }
        
        renderTabelaComPaginacao(dadosFiltrados, pageKey);
      }

      moveNossoModal?.hide();
      itemToMoveNosso = null;
    });

  // EDIT (Offcanvas)
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.removeEventListener?.("click", onEditClick);
    btn.addEventListener("click", onEditClick);
  });

  async function loadBrandsForEdit(selectedMarca = "") {
    try {
      const { data: brands, error } = await supabaseClient
        .from("brands")
        .select("display_name, items_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      const editMarcaSelect = document.getElementById("editMarca");
      
      editMarcaSelect.innerHTML = `<option value="" disabled selected>Seleciona a marca...</option>`;

      brands.forEach((b) => {
        const option = document.createElement("option");
        option.value = b.items_key;
        option.textContent = b.display_name;
        option.dataset.itemsKey = b.items_key;
        if (b.items_key === selectedMarca) option.selected = true;
        editMarcaSelect.appendChild(option);
      });

    } catch (err) {
      console.error("Erro ao carregar marcas:", err);
      showMessage("Erro ao carregar marcas.", "danger");
    }
  }

  function onEditClick(e) {
    const row = e.currentTarget.closest("tr");
    const itemId = row?.getAttribute("data-id");
    if (!itemId) return;

    const item = (window.dadosOriginais || []).find(
      (i) => String(i.id) === String(itemId),
    );
    if (!item) return;

    loadBrandsForEdit(item.marca);

    document.getElementById("editId").value = item.id;
    document.getElementById("editNome").value = item.nome ?? "";
    document.getElementById("editLote").value = item.lote ?? "";
    document.getElementById("editTipo").value = item.tipo ?? "";
    document.getElementById("editComprimento").value = item.comprimento ?? "";
    document.getElementById("editLargura").value = item.largura ?? "";
    document.getElementById("editEspessura").value = item.espessura ?? "";
    document.getElementById("editObservacoes").value = item.observacoes ?? "";
    document.getElementById("editFotoAtual").value = item.foto ?? "";
    const fotoPreview = document.getElementById("fotoPreview");
    if (fotoPreview) fotoPreview.src = item.foto ?? "";
    const editFotoInput = document.getElementById("editFoto");
    if (editFotoInput) editFotoInput.value = "";

    const editOffcanvasEl = document.getElementById("editOffcanvas");
    const editOffcanvas = editOffcanvasEl
      ? new bootstrap.Offcanvas(editOffcanvasEl)
      : null;
    editOffcanvas?.show();
  }
}

/* ============================
   Edit Form (Offcanvas)
   ============================ */

window.addEventListener("load", () => {
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    if (form.id !== "editForm") return;

    e.preventDefault();

    const id = document.getElementById("editId")?.value;
    const fileInput = document.getElementById("editFoto");
    const fotoAtual = document.getElementById("editFotoAtual")?.value || "";

    if (!id) {
      showMessage("Erro: ID do produto não encontrado.", "danger");
      return;
    }

    const pageKey = window.currentRoute || window.location.pathname;
    
    // 🔹 GUARDAR página e filtros ANTES de editar
    const paginaAnterior = paginacaoPorPagina[pageKey]?.paginaAtual || 1;
    const filtrosAtuais = {
      ref: document.getElementById("filtroid")?.value || "",
      nome: document.getElementById("filtroNome")?.value || "",
      tipo: document.getElementById("filtroTipo")?.value || ""
    };

    let fotoUrl = fotoAtual;

    try {
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const newFile = fileInput.files[0];

        if (fotoAtual) {
          try {
            const oldName = fotoAtual.split("/").pop();
            if (oldName) {
              const { error: deleteErr } = await supabaseClient.storage
                .from("imagens")
                .remove([oldName]);

              if (deleteErr) {
                console.error(deleteErr);
                showMessage(
                  "Aviso: Não foi possível apagar a imagem antiga.",
                  "warning",
                );
              }
            }
          } catch (err) {
            console.error("Erro ao eliminar imagem antiga:", err);
          }
        }

        const cleanName = newFile.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");

        const fileName = `${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("imagens")
          .upload(fileName, newFile, { upsert: true });

        if (uploadError) {
          console.error(uploadError);
          showMessage("Erro ao enviar nova imagem.", "danger");
          return;
        }

        const { data: publicData } = supabaseClient.storage
          .from("imagens")
          .getPublicUrl(fileName);

        fotoUrl = publicData.publicUrl;
      }

      const updatedItem = {
        marca: document.getElementById("editMarca").value || null,
        nome: document.getElementById("editNome").value || null,
        lote: document.getElementById("editLote").value || null,
        tipo: document.getElementById("editTipo").value || null,
        comprimento: document.getElementById("editComprimento").value || null,
        largura: document.getElementById("editLargura").value || null,
        espessura: document.getElementById("editEspessura").value || null,
        observacoes: document.getElementById("editObservacoes").value || null,
        foto: fotoUrl,
      };

      const idValue = /^[0-9]+$/.test(id) ? Number(id) : id;

      const { data, error } = await supabaseClient
        .from("items")
        .update(updatedItem)
        .eq("id", idValue)
        .select();

      if (error) {
        showMessage(`Erro ao atualizar: ${error.message}`, "danger");
        return;
      }

      showMessage("Produto atualizado com sucesso!", "success");

      const editOffcanvasEl = document.getElementById("editOffcanvas");
      const offcanvas = bootstrap.Offcanvas.getInstance(editOffcanvasEl);
      offcanvas?.hide();

      // 🔹 Atualizar o item na lista local
      const index = (window.dadosOriginais || []).findIndex(
        (i) => String(i.id) === String(id)
      );
      if (index !== -1 && data && data[0]) {
        window.dadosOriginais[index] = { ...window.dadosOriginais[index], ...data[0] };
      }

      // 🔹 Atualizar marcas (preserva filtros automaticamente)
      preencherFiltroMarcas();

      // 🔹 RESTAURAR os outros filtros (ref, nome, tipo)
      const filtroIdEl = document.getElementById("filtroid");
      const filtroNomeEl = document.getElementById("filtroNome");
      const filtroTipoEl = document.getElementById("filtroTipo");
      
      if (filtroIdEl) filtroIdEl.value = filtrosAtuais.ref;
      if (filtroNomeEl) filtroNomeEl.value = filtrosAtuais.nome;
      if (filtroTipoEl) filtroTipoEl.value = filtrosAtuais.tipo;

      // 🔹 RESTAURAR página atual
      if (paginacaoPorPagina[pageKey]) {
        paginacaoPorPagina[pageKey].paginaAtual = paginaAnterior;
      }

      // 🔹 Re-renderizar mantendo a página
      const dadosFiltrados = aplicarFiltrosAtuais();
      renderTabelaComPaginacao(dadosFiltrados, pageKey);

    } catch (err) {
      console.error(err);
      showMessage("Erro inesperado ao atualizar item.", "danger");
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "editFoto") {
      const fileInput = e.target;
      const fotoPreview = document.getElementById("fotoPreview");
      const f = fileInput.files[0];
      if (!f) {
        fotoPreview.src = document.getElementById("editFotoAtual")?.value || "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        fotoPreview.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    }
  });
});

/* ============================
   Utilitárias
   ============================ */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message, type = "info") {
  const containerId = "toast-container";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.role = "alert";
  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

/* ============================
   PAGINAÇÃO + ITENS POR PÁGINA
   ============================ */

const paginacaoPorPagina = {};
const defaultItensPorPagina = 10;

function ativarPaginacao() {
  const pageKey = window.currentRoute || window.location.pathname;
  const storageKey = `itemsPerPage_${pageKey}`;

  let itensSalvos = localStorage.getItem(storageKey);

  if (!itensSalvos) {
    itensSalvos = defaultItensPorPagina;
    localStorage.setItem(storageKey, defaultItensPorPagina);
  } else {
    itensSalvos = parseInt(itensSalvos);
  }

  if (!paginacaoPorPagina[pageKey]) {
    paginacaoPorPagina[pageKey] = {
      paginaAtual: 1,
      itensPorPagina: itensSalvos,
    };
  } else {
    paginacaoPorPagina[pageKey].itensPorPagina = itensSalvos;
  }

  const itemsPerPageEl = document.getElementById("itemsPerPage");
  const prevPageEl = document.getElementById("prevPage");
  const nextPageEl = document.getElementById("nextPage");

  if (itemsPerPageEl) {
    const clone = itemsPerPageEl.cloneNode(true);
    itemsPerPageEl.parentNode.replaceChild(clone, itemsPerPageEl);
  }
  if (prevPageEl) {
    const clone = prevPageEl.cloneNode(true);
    prevPageEl.parentNode.replaceChild(clone, prevPageEl);
  }
  if (nextPageEl) {
    const clone = nextPageEl.cloneNode(true);
    nextPageEl.parentNode.replaceChild(clone, nextPageEl);
  }

  const newItemsPerPageEl = document.getElementById("itemsPerPage");
  const newPrev = document.getElementById("prevPage");
  const newNext = document.getElementById("nextPage");

  if (newItemsPerPageEl) newItemsPerPageEl.value = itensSalvos;

  if (newItemsPerPageEl) {
    newItemsPerPageEl.addEventListener("change", (e) => {
      const novoValor = parseInt(e.target.value);

      paginacaoPorPagina[pageKey].itensPorPagina = novoValor;
      paginacaoPorPagina[pageKey].paginaAtual = 1;

      localStorage.setItem(storageKey, novoValor);

      const dadosFiltrados = aplicarFiltrosAtuais();
      renderTabelaComPaginacao(dadosFiltrados, pageKey);
    });
  }

  if (newPrev) {
    newPrev.addEventListener("click", () => {
      const pag = paginacaoPorPagina[pageKey];
      if (pag.paginaAtual > 1) {
        pag.paginaAtual--;
        const dadosFiltrados = aplicarFiltrosAtuais();
        renderTabelaComPaginacao(dadosFiltrados, pageKey);
      }
    });
  }

  if (newNext) {
    newNext.addEventListener("click", () => {
      const pag = paginacaoPorPagina[pageKey];
      const dadosFiltrados = aplicarFiltrosAtuais();
      const totalPaginas = Math.ceil(dadosFiltrados.length / pag.itensPorPagina);

      if (pag.paginaAtual < totalPaginas) {
        pag.paginaAtual++;
        renderTabelaComPaginacao(dadosFiltrados, pageKey);
      }
    });
  }

  const dadosFiltrados = aplicarFiltrosAtuais();
  renderTabelaComPaginacao(dadosFiltrados, pageKey);
}


function renderTabelaComPaginacao(lista, pageKey) {
  const tableBody = document.getElementById("itemsBody");
  const table = tableBody?.closest("table");

  if (table) table.classList.add("table-fade");

  setTimeout(() => {
    let { paginaAtual, itensPorPagina } = paginacaoPorPagina[pageKey];

    const totalItens = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = lista.slice(inicio, fim);

    renderTabela(pagina, window.filtroEstadoAtual);

    paginacaoPorPagina[pageKey].paginaAtual = paginaAtual;

    const indicador = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (indicador) indicador.textContent = `${paginaAtual} / ${totalPaginas}`;
    if (prevBtn) prevBtn.disabled = paginaAtual <= 1;
    if (nextBtn) nextBtn.disabled = paginaAtual >= totalPaginas;

    if (table) {
      table.classList.remove("table-fade");
      table.classList.add("table-show");
    }
  }, 120);
}

window.initHomeSupabase = initHomeSupabase;