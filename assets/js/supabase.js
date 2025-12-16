// supabase.js
async function initSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient; 

    const res = await fetch('/.netlify/functions/getSupabase');
    const { supabaseUrl, supabaseKey } = await res.json();
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized:", window.supabaseClient);
    return window.supabaseClient;
}



/**
 * initHomeSupabase
 * @param {string} filtroEstado - 'on' (ativos) ou 'off' (arquivados)
 */
async function initHomeSupabase(filtroEstado = 'on') {
    try {
        const tableBody = document.getElementById("itemsBody");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="10">A carregar dados...</td></tr>`;

        const orderField = filtroEstado === 'off' ? 'data_off' : 'id';

        // ===== Buscar dados do Supabase =====
        const { data, error } = await supabaseClient
            .from("items_view")
            .select("*")
            .eq("estado", filtroEstado)
            .order(orderField, { ascending: false });

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="10">Erro ao carregar dados: ${error.message}</td></tr>`;
            showMessage(`Erro ao carregar dados: ${error.message}`, 'danger');
            return;
        }


        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10">Nenhum produto encontrado.</td></tr>`;
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
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">Erro inesperado ao carregar dados.</td></tr>`;
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
        const nomeValor = (filtroNome.value || "")
    .toLowerCase()           // minusculas
    .replace(/-/g, '')       // remove hífen
    .replace(/\s+/g, '')     // remove espaços
    .trim();

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
            const nomeOk = !nomeValor || (item.marca_nome_espessura_clean || "").includes(nomeValor);
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
        tableBody.innerHTML = `<tr><td colspan="10">Nenhum produto encontrado.</td></tr>`;
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

    const itemId = itemToDelete.id;

    // 1. Ir buscar foto atual
    const { data: itemData } = await supabaseClient
        .from("items")
        .select("foto")
        .eq("id", itemId)
        .maybeSingle();

    let novaFoto = null;

    if (itemData?.foto) {
        const url = itemData.foto;
        const fileName = url.split("/").pop();

        // caminho novo no "arquivo"
        const newPath = `arquivadas/${fileName}`;

        // 2. Copiar ficheiro
        const { error: copyError } = await supabaseClient
            .storage
            .from("imagens")
            .copy(fileName, newPath);

        if (copyError) {
            console.error(copyError);
            showMessage("Erro ao mover imagem para arquivo", "danger");
        } else {
            // 3. Atualiza URL no item para apontar para a nova imagem
            const { data: urlData } = supabaseClient
                .storage
                .from("imagens")
                .getPublicUrl(newPath);

            novaFoto = urlData.publicUrl;

            await supabaseClient
                .from("items")
                .update({ foto: novaFoto })
                .eq("id", itemId);

            // 4. Remover ficheiro original
            await supabaseClient
                .storage
                .from("imagens")
                .remove([fileName]);
        }
    }

    // 5. Agora sim, eliminar o item
    const { error: delError } = await supabaseClient
        .from("items")
        .delete()
        .eq("id", itemId);

    if (delError) {
        showMessage("Erro ao eliminar item", "danger");
        return;
    }

    showMessage("Item eliminado (imagem movida para arquivo)", "success");
    itemToDelete.row?.remove();
    deleteModal?.hide();
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
    if (form.id !== "editForm") return;

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
        // === SE EXISTE NOVA FOTO ===
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const newFile = fileInput.files[0];

            // 1) APAGAR A IMAGEM ANTIGA
            if (fotoAtual) {
                try {
                    const oldName = fotoAtual.split("/").pop();
                    if (oldName) {
                        const { error: deleteErr } = await supabaseClient
                            .storage
                            .from("imagens")
                            .remove([oldName]); // 🔥 DELETE DEFINITIVO

                        if (deleteErr) {
                            console.error(deleteErr);
                            showMessage("Aviso: Não foi possível apagar a imagem antiga.", "warning");
                        }
                    }
                } catch (err) {
                    console.error("Erro ao eliminar imagem antiga:", err);
                }
            }

            // 2) UPLOAD DA NOVA
            const cleanName = newFile.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9._-]/g, "_");

            const fileName = `${Date.now()}_${cleanName}`;

            const { error: uploadError } = await supabaseClient
                .storage
                .from("imagens")
                .upload(fileName, newFile, { upsert: true });

            if (uploadError) {
                console.error(uploadError);
                showMessage("Erro ao enviar nova imagem.", "danger");
                return;
            }

            // 3) GET PUBLIC URL
            const { data: publicData } = supabaseClient
                .storage
                .from("imagens")
                .getPublicUrl(fileName);

            fotoUrl = publicData.publicUrl;
        }

        // ==== PREPARAR DADOS PARA UPDATE ====
        const updatedItem = {
            marca: document.getElementById("editMarca").value || null,
            nome: document.getElementById("editNome").value || null,
            lote: document.getElementById("editLote").value || null,
            tipo: document.getElementById("editTipo").value || null,
            comprimento: document.getElementById("editComprimento").value || null,
            largura: document.getElementById("editLargura").value || null,
            espessura: document.getElementById("editEspessura").value || null,
            observacoes: document.getElementById("editObservacoes").value || null,
            foto: fotoUrl
        };

        // === ID numérico ===
        const idValue = /^[0-9]+$/.test(id) ? Number(id) : id;

        // === UPDATE FINAL ===
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

        // Fechar offcanvas
        const editOffcanvasEl = document.getElementById("editOffcanvas");
        const offcanvas = bootstrap.Offcanvas.getInstance(editOffcanvasEl);
        offcanvas.hide();

        // Atualizar lista
        await initHomeSupabase(window.filtroEstadoAtual || "on");

    } catch (err) {
        console.error(err);
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
