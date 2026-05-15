// =====================================================
// LIST-CLIENTE.JS
// =====================================================

window.initClienteList = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  let cleanupRealtime = null;
  if (typeof window.initClienteRealtime === 'function') {
    cleanupRealtime = window.initClienteRealtime(loadData);
  }

  window.addEventListener('beforeunload', () => {
    if (cleanupRealtime) cleanupRealtime();
  });

  // =====================================================
  // CONFIG PAGINAÇÃO
  // =====================================================
  const pageKey = "list-cliente";
  const storageKey = `itemsPerPage_${pageKey}`;
  const DEFAULT_ITEMS_PER_PAGE = 10;

  // =====================================================
  // ELEMENTOS DOM
  // =====================================================
  const tbody = document.getElementById("clientesTableBody");
  const filtroCodigo = null; // removido
  const filtroDescricao = document.getElementById("filtroDescricao");
  const filtroContribuinte = document.getElementById("filtroContribuinte");
  const filtroMorada2 = document.getElementById("filtroMorada2");
  const btnLimpar = document.getElementById("btnLimparFiltros");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");

  const editOffcanvasEl = document.getElementById("editOffcanvas");
  const editOffcanvas = new bootstrap.Offcanvas(editOffcanvasEl);
  const clienteEditForm = document.getElementById("clienteEditForm");
  const editClienteId = document.getElementById("editClienteId");
  const editDescricao = document.getElementById("editDescricao");
  const editDescricao2 = document.getElementById("editDescricao2");
  const editContribuinte = document.getElementById("editContribuinte");
  const editMorada = document.getElementById("editMorada");
  const editMorada2 = document.getElementById("editMorada2");
  const editCodpostal = document.getElementById("editCodpostal");
  const editPais = document.getElementById("editPais");
  const editTelefone = document.getElementById("editTelefone");
  const editTelefone2 = document.getElementById("editTelefone2");

  // =====================================================
  // ESTADO
  // =====================================================
  let currentPage = 1;
  let itemsPerPage = parseInt(
    localStorage.getItem(storageKey) || DEFAULT_ITEMS_PER_PAGE
  );
  itemsPerPageSelect.value = itemsPerPage;
  let totalItems = 0;
  let allData = [];

  // =====================================================
  // FORMATAR CÓDIGO POSTAL NO EDITAR
  // =====================================================
  editCodpostal.addEventListener("input", () => {
    let val = editCodpostal.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4) + "-" + val.slice(4, 7);
    editCodpostal.value = val;
  });

  // =====================================================
  // CARREGAR DADOS
  // =====================================================
  async function loadData() {
    try {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">A carregar...</td></tr>`;

      let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .order("descricao", { ascending: true });

      const descricao = filtroDescricao.value.trim();
      const contribuinte = filtroContribuinte.value.trim();
      const morada2 = filtroMorada2.value.trim();

      if (descricao) query = query.or(`descricao.ilike.%${descricao}%,descricao2.ilike.%${descricao}%`);
      if (contribuinte) query = query.ilike("contribuinte", `%${contribuinte}%`);
      if (morada2) query = query.ilike("morada2", `%${morada2}%`);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      totalItems = count || 0;
      allData = data || [];

      renderTable(allData);
      renderPagination();

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-danger text-center">Erro ao carregar dados: ${err.message}</td></tr>`;
    }
  }

  // =====================================================
  // RENDERIZAR TABELA
  // =====================================================
  function renderTable(data) {
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-muted" style="background-color:#eeeeef;border-color:#cbccce;">Nenhum cliente encontrado</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => {
      const descricao2 = c.descricao2 || `<span class="text-muted fst-italic">—</span>`;
      const contribuinte = c.contribuinte || `<span class="text-muted fst-italic">—</span>`;
      const morada = c.morada || `<span class="text-muted fst-italic">—</span>`;
      const morada2 = c.morada2 || `<span class="text-muted fst-italic">—</span>`;
      const codpostal = c.codpostal || `<span class="text-muted fst-italic">—</span>`;
      const pais = c.pais || `<span class="text-muted fst-italic">—</span>`;
      const telefone = c.telefone || `<span class="text-muted fst-italic">—</span>`;
      const telefone2 = c.telefone2 || `<span class="text-muted fst-italic">—</span>`;

      return `
        <tr>
          <td class="text-start fw-semibold">${c.descricao}</td>
          <td class="text-start">${descricao2}</td>
          <td>${contribuinte}</td>
          <td class="text-start">${morada}</td>
          <td>${morada2}</td>
          <td>${codpostal}</td>
          <td>${pais}</td>
          <td>${telefone}</td>
          <td>${telefone2}</td>
          <td>
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-primary" title="Editar" data-id="${c.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" title="Eliminar" data-id="${c.id}" data-nome="${c.descricao}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // =====================================================
  // PAGINAÇÃO
  // =====================================================
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.parentElement.classList.toggle("disabled", currentPage <= 1);
    nextPageBtn.parentElement.classList.toggle("disabled", currentPage >= totalPages);
  }

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; loadData(); }
  });

  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; loadData(); }
  });

  itemsPerPageSelect.addEventListener("change", () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value);
    localStorage.setItem(storageKey, itemsPerPage);
    currentPage = 1;
    loadData();
  });

  // =====================================================
  // FILTROS
  // =====================================================
  let filterTimeout;
  function onFilterChange() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => { currentPage = 1; loadData(); }, 300);
  }

  filtroDescricao.addEventListener("input", onFilterChange);
  filtroContribuinte.addEventListener("input", onFilterChange);
  filtroMorada2.addEventListener("input", onFilterChange);

  btnLimpar.addEventListener("click", () => {
    filtroDescricao.value = "";
    filtroContribuinte.value = "";
    filtroMorada2.value = "";
    currentPage = 1;
    loadData();
  });

  // =====================================================
  // EDITAR - ABRIR OFFCANVAS
  // =====================================================
  tbody.addEventListener("click", (e) => {
    const editBtn = e.target.closest("button[title='Editar']");
    const deleteBtn = e.target.closest("button[title='Eliminar']");

    if (editBtn) {
      const id = editBtn.dataset.id;
      const cliente = allData.find(c => String(c.id) === String(id));
      if (!cliente) return;

      editClienteId.value = cliente.id;
      editDescricao.value = cliente.descricao || "";
      editDescricao2.value = cliente.descricao2 || "";
      editContribuinte.value = cliente.contribuinte || "";
      editMorada.value = cliente.morada || "";
      editMorada2.value = cliente.morada2 || "";
      editCodpostal.value = cliente.codpostal || "";
      editPais.value = cliente.pais || "";
      editTelefone.value = cliente.telefone || "";
      editTelefone2.value = cliente.telefone2 || "";

      editOffcanvas.show();
    }

    if (deleteBtn) {
      clienteToDelete = deleteBtn.dataset.id;
      document.getElementById("deleteClienteNome").textContent = deleteBtn.dataset.nome;
      const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
      modal.show();
    }
  });

  // =====================================================
  // EDITAR - SUBMIT
  // =====================================================
  clienteEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      showMessage("⏳ A guardar...", "info");

      const id = editClienteId.value;
      const contribuinte = editContribuinte.value.trim() || null;
      if (contribuinte) {
        const { data: existing, error: checkErr } = await supabase
          .from("clientes")
          .select("id, descricao")
          .eq("contribuinte", contribuinte)
          .neq("id", id)
          .limit(1);

        if (checkErr) throw checkErr;

        if (existing && existing.length > 0) {
          throw new Error(
            `❌ O contribuinte "${contribuinte}" já pertence a: ${existing[0].descricao}`
          );
        }
      }

      const { error } = await supabase
        .from("clientes")
        .update({
          descricao: editDescricao.value.trim(),
          descricao2: editDescricao2.value.trim() || null,
          contribuinte,
          morada: editMorada.value.trim() || null,
          morada2: editMorada2.value.trim() || null,
          codpostal: editCodpostal.value.trim() || null,
          pais: editPais.value.trim() || null,
          telefone: editTelefone.value.trim() || null,
          telefone2: editTelefone2.value.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      showMessage("✅ Cliente atualizado com sucesso!", "success");
      editOffcanvas.hide();
      loadData();

    } catch (err) {
      showMessage(err.message || "Erro desconhecido", "danger");
    }
  });

  // =====================================================
  // ELIMINAR
  // =====================================================
  let clienteToDelete = null;

  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!clienteToDelete) return;
    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clienteToDelete);

      if (error) throw error;

      showMessage("✅ Cliente eliminado com sucesso", "success");
      const modal = bootstrap.Modal.getInstance(document.getElementById("deleteModal"));
      modal.hide();
      loadData();

    } catch (err) {
      showMessage("❌ Erro ao eliminar: " + err.message, "danger");
    } finally {
      clienteToDelete = null;
    }
  });

  // =====================================================
  // INIT
  // =====================================================
  loadData();

  console.log("✅ Lista de Clientes inicializada");
};