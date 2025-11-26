// supabase.js
const supabaseUrl = 'https://jipdtttjsmyllnaqggwy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcGR0dHRqc215bGxuYXFnZ3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjUzOTIsImV4cCI6MjA3Njc0MTM5Mn0.twAKANHX3L6NlKIli4amXKG-_GGD04BCQSbjm_uNCwE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


/**
 * initHomeSupabase
 * @param {string} filtroEstado - 'on' (ativos) ou 'off' (arquivados)
 */
async function initHomeSupabase(filtroEstado = 'on') {
    try {
        const tableBody = document.getElementById("itemsBody");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="9">A carregar dados...</td></tr>`;

        const orderField = filtroEstado === 'off' ? 'data_off' : 'id';

        // ===== Buscar dados do Supabase =====
        const { data, error } = await supabaseClient
            .from("items")
            .select("*")
            .eq("estado", filtroEstado)
            .order(orderField, { ascending: false });

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="9">Erro ao carregar dados: ${error.message}</td></tr>`;
            showMessage(`Erro ao carregar dados: ${error.message}`, 'danger');
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9">Nenhum produto encontrado.</td></tr>`;
            // limpar filtros de UI
            window.dadosOriginais = [];
            preencherFiltroMarcas(); // vai resetar select
            return;
        }

        // Guardar cópia para filtros
window.dadosOriginais = data;
window.filtroEstadoAtual = filtroEstado;

// Popular select de marcas
preencherFiltroMarcas();

// --- ATIVAR PAGINAÇÃO AQUI ---
ativarPaginacao();

// Inicializar lógica de filtros
initFiltros();


    } catch (err) {
        const tableBody = document.getElementById("itemsBody");
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="9">Erro inesperado ao carregar dados.</td></tr>`;
        showMessage("Erro inesperado ao carregar dados.", "danger");
        console.error(err);
    }
}

/* ============================
   Funções de Filtros & UI
   ============================ */

function preencherFiltroMarcas() {
    const filtroMarca = document.getElementById("filtroMarca");
    if (!filtroMarca) return;

    const mapaMarcas = new Map();

    (window.dadosOriginais || []).forEach(item => {
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
    filtroMarca.innerHTML = `<option value="">Todas</option>` +
        Array.from(mapaMarcas.values())
            .sort((a, b) => a.localeCompare(b))
            .map(m => `<option value="${m}">${m}</option>`)
            .join("");
}



function initFiltros() {
    const filtroId = document.getElementById("filtroid");
    const filtroMarca = document.getElementById("filtroMarca");
    const filtroNome = document.getElementById("filtroNome");
    const filtroTipo = document.getElementById("filtroTipo");
    const btnLimpar = document.getElementById("btnLimparFiltros");

    if (!filtroId || !filtroMarca || !filtroNome || !filtroTipo || !btnLimpar) return;

    const aplicarFiltros = () => {
        const refValor = filtroId.value.trim().toLowerCase();
        const marcaValor = filtroMarca.value.trim().toLowerCase();
        const nomeValor = filtroNome.value.trim().toLowerCase();
        const tipoValor = filtroTipo.value.trim().toLowerCase();

        const filtrados = (window.dadosOriginais || []).filter(item => {
            // === FILTRO DE REFERÊNCIA ===
            let refOk = true;
            if (refValor) {
                const refId = String(item.id || "").toLowerCase();
                const refCampo = String(item.referencia || "").toLowerCase();

                // Só aceita se o ID ou referência COMEÇAR pelo valor digitado (não conter no meio)
                refOk = refId.startsWith(refValor) || refCampo.startsWith(refValor);
            }

            // === RESTANTES FILTROS ===
            const marcaOk = !marcaValor || (item.marca || "").trim().toLowerCase() === marcaValor.trim().toLowerCase();
            const nomeOk = !nomeValor || (item.nome || "").toLowerCase().includes(nomeValor);
            const tipoOk = !tipoValor || (item.tipo || "").toLowerCase() === tipoValor;

            return refOk && marcaOk && nomeOk && tipoOk;
        });

        renderTabela(filtrados, window.filtroEstadoAtual || 'on');
    };


    // eventos
    [filtroId, filtroNome].forEach(el => el.addEventListener("input", aplicarFiltros));
    [filtroMarca, filtroTipo].forEach(el => { el.addEventListener("change", aplicarFiltros); el.addEventListener("input", aplicarFiltros); });

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
        tableBody.innerHTML = `<tr><td colspan="9">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    tableBody.innerHTML = lista.map(item => {
        const fotoHtml = item.foto ? `<img src="${escapeHtml(item.foto)}" alt="foto" style="max-width:120px;height:60px;object-fit:cover;border-radius:4px;">` : "";
        const dataCol = estadoAtual === 'off' ? (item.data_off ? new Date(item.data_off).toLocaleString("pt-PT") : "") : (item.created_at ? new Date(item.created_at).toLocaleString("pt-PT") : "");
        const marcaenomeeespessura = `${item.marca ?? ""} - ${item.nome ?? ""} ${item.espessura ?? ""}`;
        return `
            <tr data-id="${escapeHtml(String(item.id))}">
                <td>${escapeHtml(String(item.id))}</td>
                <td>${escapeHtml(marcaenomeeespessura ?? "")}</td>
                <td>${escapeHtml(item.comprimento ?? "")}</td>
                <td>${escapeHtml(item.largura ?? "")}</td>
                <td>${escapeHtml(item.lote ?? "")}</td>
                <td>${escapeHtml(item.tipo ?? "")}</td>
                <td>${escapeHtml(item.observacoes ?? "")}</td>
                <td>${fotoHtml}</td>
                <td>${escapeHtml(dataCol)}</td>
                <td>
                    ${estadoAtual === 'on' ? `
                        <button class="btn btn-sm btn-outline-primary me-1 btn-edit" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success me-1 btn-move-nosso" title="Mover para Produtos">
                            <i class="bi bi-arrow-right-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success btn-move-on" title="Mover para Produtos">
                            <i class="bi bi-arrow-right-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join("");

    // Depois de renderizar, configurar eventos nas linhas (editar, eliminar, mover)
    configurarEventosTabela();
}

function configurarEventosTabela() {
    // DELETE
    let itemToDelete = null;
    const deleteModalEl = document.getElementById('deleteModal');
    const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.removeEventListener?.("click", onDeleteClick); // tentativa de limpeza (se suportado)
        btn.addEventListener("click", onDeleteClick);
    });

    function onDeleteClick(e) {
        const row = e.currentTarget.closest("tr");
        const id = row?.getAttribute("data-id");
        if (!id) return;
        itemToDelete = { id, row };
        deleteModal?.show();
    }

    document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
        if (!itemToDelete) return;

        const { error: deleteError } = await supabaseClient
            .from("items")
            .delete()
            .eq("id", itemToDelete.id);

        if (deleteError) {
            showMessage(`Erro ao eliminar: ${deleteError.message}`, 'danger');
        } else {
            showMessage("Produto eliminado com sucesso!", 'success');
            // remover linha da tabela
            itemToDelete.row?.remove();
            // atualizar dados originais localmente
            window.dadosOriginais = (window.dadosOriginais || []).filter(i => String(i.id) !== String(itemToDelete.id));
            preencherFiltroMarcas();
            const pageKey = window.currentRoute || window.location.pathname;
renderTabelaComPaginacao(window.dadosOriginais, pageKey);
        }

        deleteModal?.hide();
        itemToDelete = null;
    });

    // MOVE / REACTIVATE (para estado 'off' -> 'on')
    let itemToReactivate = null;
    const reactivateModalEl = document.getElementById('reactivateModal');
    const reactivateModal = reactivateModalEl ? new bootstrap.Modal(reactivateModalEl) : null;

    document.querySelectorAll(".btn-move-on").forEach(btn => {
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

    document.getElementById("confirmReactivateBtn")?.addEventListener("click", async () => {
        if (!itemToReactivate) return;

        const { error } = await supabaseClient
            .from("items")
            .update({
                estado: 'on',
                data_off: null
            })
            .eq("id", itemToReactivate.id);

        if (error) {
            showMessage(`Erro ao reativar: ${error.message}`, 'danger');
        } else {
            showMessage("Produto reativado com sucesso!", "success");
            // remover linha da vista atual (assumindo que era 'off')
            itemToReactivate.row?.remove();
            // atualizar dados locais
            window.dadosOriginais = (window.dadosOriginais || []).filter(i => String(i.id) !== String(itemToReactivate.id));
            preencherFiltroMarcas();
            const pageKey = window.currentRoute || window.location.pathname;
renderTabelaComPaginacao(window.dadosOriginais, pageKey);
        }

        reactivateModal?.hide();
        itemToReactivate = null;
    });


    // MOVE PARA "NOSSO"
    let itemToMoveNosso = null;
    const moveNossoModalEl = document.getElementById('moveNossoModal');
    const moveNossoModal = moveNossoModalEl ? new bootstrap.Modal(moveNossoModalEl) : null;

    document.querySelectorAll(".btn-move-nosso").forEach(btn => {
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

    document.getElementById("confirmMoveNossoBtn")?.addEventListener("click", async () => {
        if (!itemToMoveNosso) return;

        const { error } = await supabaseClient
            .from("items")
            .update({
                estado: 'nosso',
                data_off: new Date().toISOString()
            })
            .eq("id", itemToMoveNosso.id);

        if (error) {
            showMessage(`Erro ao mover para "nosso": ${error.message}`, 'danger');
        } else {
            showMessage("Produto movido para 'Nossas Reservas' com sucesso!", 'success');
            itemToMoveNosso.row?.remove();
            window.dadosOriginais = (window.dadosOriginais || []).filter(i => String(i.id) !== String(itemToMoveNosso.id));
            preencherFiltroMarcas();
            const pageKey = window.currentRoute || window.location.pathname;
renderTabelaComPaginacao(window.dadosOriginais, pageKey);
        }

        moveNossoModal?.hide();
        itemToMoveNosso = null;
    });


    // EDIT (Offcanvas)
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.removeEventListener?.("click", onEditClick);
        btn.addEventListener("click", onEditClick);
    });

    function onEditClick(e) {
        const row = e.currentTarget.closest("tr");
        const itemId = row?.getAttribute("data-id");
        if (!itemId) return;

        const item = (window.dadosOriginais || []).find(i => String(i.id) === String(itemId));
        if (!item) return;

        // Preencher offcanvas inputs
        const editOffcanvasEl = document.getElementById('editOffcanvas');
        const editOffcanvas = editOffcanvasEl ? new bootstrap.Offcanvas(editOffcanvasEl) : null;

        document.getElementById("editId").value = item.id;
        document.getElementById("editMarca").value = item.marca ?? "";
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

        editOffcanvas?.show();
    }
}



/* ============================
   Edit Form (Offcanvas) - versão FINAL CORRIGIDA
   ============================ */

window.addEventListener("load", () => {

    // === Captura o evento de SUBMIT do form dinamicamente ===
    document.addEventListener("submit", async (e) => {
        const form = e.target;
        if (form.id !== "editForm") return; // ignora outros forms

        e.preventDefault();

        const id = document.getElementById("editId")?.value;
        const fileInput = document.getElementById("editFoto");
        const fotoAtual = document.getElementById("editFotoAtual")?.value || "";

        if (!id) {
            showMessage("Erro: ID do produto não encontrado.", "danger");
            return;
        }

        let fotoUrl = fotoAtual;

        try {
            // === Upload da imagem (se houver nova) ===
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const file = fileInput.files[0];

                // 🔧 Sanitiza o nome do ficheiro (remove acentos e espaços)
                const cleanName = file.name
                    .normalize("NFD") // separa acentos
                    .replace(/[\u0300-\u036f]/g, "") // remove acentos
                    .replace(/[^a-zA-Z0-9._-]/g, "_"); // substitui espaços e caracteres inválidos

                const fileName = `${Date.now()}_${cleanName}`;

                // === Faz o upload seguro ===
                const { error: uploadError } = await supabaseClient
                    .storage
                    .from("imagens")
                    .upload(fileName, file, { upsert: true });

                if (uploadError) {
                    console.error("❌ Erro upload:", uploadError);
                    showMessage(`Erro ao enviar imagem: ${uploadError.message}`, "danger");
                    return;
                }

                // === Obtém URL público da imagem ===
                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from("imagens")
                    .getPublicUrl(fileName);

                fotoUrl = publicUrlData?.publicUrl ?? fotoUrl;
            }

            // === Dados atualizados ===
            const updatedItem = {
                marca: document.getElementById("editMarca")?.value || null,
                nome: document.getElementById("editNome")?.value || null,
                lote: document.getElementById("editLote")?.value || null,
                tipo: document.getElementById("editTipo")?.value || null,
                comprimento: document.getElementById("editComprimento")?.value || null,
                largura: document.getElementById("editLargura")?.value || null,
                espessura: document.getElementById("editEspessura")?.value || null,
                observacoes: document.getElementById("editObservacoes")?.value || null,
                foto: fotoUrl,
            };

            // === Detetar se o ID é número ou UUID ===
            const isNumericId = /^[0-9]+$/.test(id);
            const idValue = isNumericId ? Number(id) : id;

            // === Atualizar no Supabase ===
            const { data, error } = await supabaseClient
                .from("items")
                .update(updatedItem)
                .eq("id", idValue)
                .select();

            if (error) {
                console.error("❌ Erro ao atualizar:", error);
                showMessage(`Erro ao atualizar: ${error.message}`, "danger");
                return;
            }

            if (!data || data.length === 0) {
                showMessage("⚠️ Nenhum registo encontrado para atualizar.", "warning");
                return;
            }

            showMessage("Produto atualizado com sucesso!", "success");

            // === Fechar o offcanvas ===
            const editOffcanvasEl = document.getElementById("editOffcanvas");
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(editOffcanvasEl)
                || new bootstrap.Offcanvas(editOffcanvasEl);
            offcanvasInstance.hide();

            // === Recarregar lista mantendo filtro ===
            if (typeof initHomeSupabase === "function") {
                await initHomeSupabase(window.filtroEstadoAtual || "on");
            }
        } catch (err) {
            console.error("❌ Erro inesperado:", err);
            showMessage("Erro inesperado ao atualizar item.", "danger");
        }
    });

    // === Preview da Imagem ===
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
            reader.onload = (ev) => { fotoPreview.src = ev.target.result; };
            reader.readAsDataURL(f);
        }
    });
});



/* ============================
   Utilitárias
   ============================ */

// Escapa texto para inserir em HTML (previne XSS simples)
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Toast simples
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
const defaultItensPorPagina = 10; // itens padrão

function ativarPaginacao() {
    const pageKey = window.currentRoute || window.location.pathname;
    const storageKey = `itemsPerPage_${pageKey}`; // chave única por página

    /* ==============================
       LER / DEFINIR ITENS POR PÁGINA
       ============================== */
    let itensSalvos = localStorage.getItem(storageKey);

    if (!itensSalvos) {
        itensSalvos = defaultItensPorPagina;
        localStorage.setItem(storageKey, defaultItensPorPagina);
    } else {
        itensSalvos = parseInt(itensSalvos);
    }

    // Estado inicial da página
    paginacaoPorPagina[pageKey] = {
        paginaAtual: 1,
        itensPorPagina: itensSalvos
    };

    /* ==============================
       REINICIAR LISTENERS
       ============================== */
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

    // Re-obter elementos depois dos clones
    const newItemsPerPageEl = document.getElementById("itemsPerPage");
    const newPrev = document.getElementById("prevPage");
    const newNext = document.getElementById("nextPage");

    // Colocar valor inicial no select
    if (newItemsPerPageEl) newItemsPerPageEl.value = itensSalvos;

    /* ==============================
       ALTERAR ITENS POR PÁGINA
       ============================== */
    if (newItemsPerPageEl) {
        newItemsPerPageEl.addEventListener("change", (e) => {
            const novoValor = parseInt(e.target.value);

            paginacaoPorPagina[pageKey].itensPorPagina = novoValor;
            paginacaoPorPagina[pageKey].paginaAtual = 1;

            // SALVAR para esta página específica
            localStorage.setItem(storageKey, novoValor);

            renderTabelaComPaginacao(window.dadosOriginais || [], pageKey);
        });
    }

    /* ==============================
       BOTÃO ANTERIOR
       ============================== */
    if (newPrev) {
        newPrev.addEventListener("click", () => {
            const pag = paginacaoPorPagina[pageKey];
            if (pag.paginaAtual > 1) {
                pag.paginaAtual--;
                renderTabelaComPaginacao(window.dadosOriginais || [], pageKey);
            }
        });
    }

    /* ==============================
       BOTÃO SEGUINTE
       ============================== */
    if (newNext) {
        newNext.addEventListener("click", () => {
            const pag = paginacaoPorPagina[pageKey];
            const totalPaginas = Math.ceil(
                (window.dadosOriginais?.length || 0) / pag.itensPorPagina
            );

            if (pag.paginaAtual < totalPaginas) {
                pag.paginaAtual++;
                renderTabelaComPaginacao(window.dadosOriginais || [], pageKey);
            }
        });
    }

    /* ==============================
       RENDER INICIAL
       ============================== */
    renderTabelaComPaginacao(window.dadosOriginais || [], pageKey);
}




function renderTabelaComPaginacao(lista, pageKey) {
    // Lê estado atual
    let { paginaAtual, itensPorPagina } = paginacaoPorPagina[pageKey];

    const totalItens = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

    // Ajusta página atual se exceder total de páginas
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    // Slice da lista para a página atual
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = lista.slice(inicio, fim);

    // Renderiza os itens da página atual
    renderTabela(pagina, window.filtroEstadoAtual);

    // Atualiza estado de paginação
    paginacaoPorPagina[pageKey].paginaAtual = paginaAtual;

    // Atualiza indicadores e botões
    const indicador = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (indicador) indicador.textContent = `${paginaAtual} / ${totalPaginas}`;
    if (prevBtn) prevBtn.disabled = paginaAtual <= 1;
    if (nextBtn) nextBtn.disabled = paginaAtual >= totalPaginas;
}




/* ============================
   Export / disponibilidade global
   ============================ */

window.initHomeSupabase = initHomeSupabase;
window.supabaseClient = supabaseClient;
