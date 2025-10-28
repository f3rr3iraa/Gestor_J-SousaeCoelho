// supabase.js
const supabaseUrl = 'https://jipdtttjsmyllnaqggwy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcGR0dHRqc215bGxuYXFnZ3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjUzOTIsImV4cCI6MjA3Njc0MTM5Mn0.twAKANHX3L6NlKIli4amXKG-_GGD04BCQSbjm_uNCwE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function initHomeSupabase(filtroEstado = 'on') {
    try {
        const tableBody = document.getElementById("itemsBody");
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="8">A carregar dados...</td></tr>`;

        // Buscar dados filtrados por estado
        const { data, error } = await supabaseClient
            .from("items")
            .select("*")
            .eq("estado", filtroEstado)
            .order("id", { ascending: false });

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="8">Erro ao carregar dados: ${error.message}</td></tr>`;
            showMessage(`Erro ao carregar dados: ${error.message}`, 'danger');
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8">Nenhum item encontrado.</td></tr>`;
            return;
        }

        const isProductsPage = filtroEstado === 'on';
        const hasActions = isProductsPage;

        tableBody.innerHTML = data.map(item => `
            <tr data-id="${item.id}">
                <td>${item.nome}</td>
                <td>${item.comprimento ?? "-"}</td>
                <td>${item.largura ?? "-"}</td>
                <td>${item.tipo}</td>
                <td>${item.observacoes ?? ""}</td>
                <td>${item.foto ? `<img src="${item.foto}" alt="foto" style="max-width:120px;height:60px;object-fit:cover;border-radius:4px;">` : "-"}</td>
                <td>${new Date(item.created_at).toLocaleString("pt-PT")}</td>
                ${hasActions ? `
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning btn-move" title="Mover para Ordens">
            <i class="bi bi-arrow-right-square"></i>
        </button>
                    </td>
                ` : ""}
            </tr>
        `).join("");

        // Modal Delete
        let itemToDelete = null;
        const deleteModalEl = document.getElementById('deleteModal');
        const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;

        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const row = e.target.closest("tr");
                const id = row.getAttribute("data-id");
                itemToDelete = { id, row };
                deleteModal?.show();
            });
        });

        document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
            if (!itemToDelete) return;

            const { error: deleteError } = await supabaseClient
                .from("items")
                .delete()
                .eq("id", itemToDelete.id);

            if (deleteError) {
                showMessage(`Erro ao eliminar: ${deleteError.message}`, 'danger');
            } else {
                showMessage("Item eliminado com sucesso!", 'success');
                itemToDelete.row.remove();
            }

            deleteModal?.hide();
            itemToDelete = null;
        });

        // Offcanvas Edit
        const editOffcanvasEl = document.getElementById('editOffcanvas');
        const editOffcanvas = editOffcanvasEl ? new bootstrap.Offcanvas(editOffcanvasEl) : null;

        document.querySelectorAll(".btn-outline-primary").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const row = e.target.closest("tr");
                const itemId = row.getAttribute("data-id");
                const item = data.find(i => i.id == itemId);
                if (!item) return;

                document.getElementById("editId").value = item.id;
                document.getElementById("editNome").value = item.nome;
                document.getElementById("editComprimento").value = item.comprimento ?? "";
                document.getElementById("editLargura").value = item.largura ?? "";
                document.getElementById("editTipo").value = item.tipo;
                document.getElementById("editObservacoes").value = item.observacoes ?? "";
                document.getElementById("editFotoAtual").value = item.foto ?? "";
                document.getElementById("fotoPreview").src = item.foto ?? "";
                document.getElementById("editFoto").value = "";

                editOffcanvas?.show();
            });
        });

        /*
        Meter em baixo do botao eliminar

        <button class="btn btn-sm btn-outline-warning btn-move" title="Mover para Ordens">
            <i class="bi bi-arrow-right-square"></i>
        </button>

        _____________________________________________________________________________________
        
        document.querySelectorAll(".btn-move").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const row = e.target.closest("tr");
                const id = row.getAttribute("data-id");

                const { error } = await supabaseClient
                    .from("items")
                    .update({ estado: 'off' })
                    .eq("id", id);

                if (error) {
                    showMessage(`Erro ao mover: ${error.message}`, 'danger');
                } else {
                    showMessage("Item movido para Ordens!", 'success');
                    row.remove();
                }
            });
        });
        */

         document.querySelectorAll(".btn-move").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const row = e.target.closest("tr");
                const id = row.getAttribute("data-id");

                const { error } = await supabaseClient
                    .from("items")
                    .update({ estado: 'off' })
                    .eq("id", id);

                if (error) {
                    showMessage(`Erro ao mover: ${error.message}`, 'danger');
                } else {
                    showMessage("Item movido para Ordens!", 'success');
                    row.remove();
                }
            });
        });
        // Form Edit
        document.getElementById("editForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("editId").value;
            const fileInput = document.getElementById("editFoto");
            const fotoAtual = document.getElementById("editFotoAtual").value;

            let fotoUrl = fotoAtual;

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileName = `${Date.now()}_${file.name}`;

                const { error: uploadError } = await supabaseClient
                    .storage
                    .from("imagens")
                    .upload(fileName, file, { upsert: true });

                if (uploadError) {
                    showMessage(`Erro ao enviar imagem: ${uploadError.message}`, 'danger');
                    return;
                }

                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from("imagens")
                    .getPublicUrl(fileName);

                fotoUrl = publicUrlData.publicUrl;
            }

            const updatedItem = {
                nome: document.getElementById("editNome").value,
                comprimento: document.getElementById("editComprimento").value || null,
                largura: document.getElementById("editLargura").value || null,
                tipo: document.getElementById("editTipo").value,
                observacoes: document.getElementById("editObservacoes").value,
                foto: fotoUrl,
            };

            const { error } = await supabaseClient
                .from("items")
                .update(updatedItem)
                .eq("id", id);

            if (error) {
                showMessage(`Erro ao atualizar: ${error.message}`, 'danger');
            } else {
                showMessage("Item atualizado com sucesso!", 'success');
                editOffcanvas?.hide();
                initHomeSupabase(filtroEstado);
            }
        });

    } catch (err) {
        const tableBody = document.getElementById("itemsBody");
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8">Erro inesperado ao carregar dados.</td></tr>`;
        showMessage("Erro inesperado ao carregar dados.", 'danger');
        console.error(err);
    }
}

// Tornar a função acessível globalmente para o router SPA
window.initHomeSupabase = initHomeSupabase;
