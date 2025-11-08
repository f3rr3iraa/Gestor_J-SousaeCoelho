// assets/js/templates/form.js

async function initFormSupabase() {

    const supabaseUrl = 'https://jipdtttjsmyllnaqggwy.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcGR0dHRqc215bGxuYXFnZ3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjUzOTIsImV4cCI6MjA3Njc0MTM5Mn0.twAKANHX3L6NlKIli4amXKG-_GGD04BCQSbjm_uNCwE';

    if (!window.supabase) {
        showMessage("❌ Erro: Supabase SDK não carregado!", "danger");
        console.error("❌ Supabase SDK não foi carregado. Verifica o script no index.html");
        return;
    }

    const { createClient } = window.supabase;
    window.supabase = createClient(supabaseUrl, supabaseKey);
    const itemForm = document.getElementById("itemForm");
    if (!itemForm) {
        console.error("⚠️ Formulário #itemForm não encontrado.");
        return;
    }

    itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showMessage("⏳ A enviar dados para o servidor...", "info");

        const formData = new FormData(itemForm);
        const marca = formData.get("marca");
        const nome = formData.get("nome");
        const lote = formData.get("lote");
        const tipo = formData.get("tipo");
        const comprimento = parseFloat(formData.get("comprimento")) || 0;
        const largura = parseFloat(formData.get("largura")) || 0;
        const espessura = parseFloat(formData.get("espessura")) || 0;
        const observacoes = formData.get("observacoes");
        const fotoFile = formData.get("foto");


        let fotoUrl = null;

        if (fotoFile && fotoFile.name) {
    showMessage("📸 A carregar imagem...", "info");

    // Sanitiza o nome do ficheiro para evitar caracteres inválidos no key do Supabase
    const nome = fotoFile.name;
    // separa extensão
    const extMatch = nome.match(/(\.[^.]*)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '.jpg';
    let base = nome.replace(extMatch ? extMatch[0] : '', '');

    // 1) remove diacríticos (acentos)
    base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // 2) substitui espaços por underscore
    base = base.replace(/\s+/g, '_');
    // 3) substitui quaisquer caracteres que não sejam letras, números, ponto, underscore ou hífen por underscore
    base = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    // 4) colapsa underscores múltiplos e remove underscores no início/fim
    base = base.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    // 5) limita comprimento se quiseres (opcional) — aqui com 150 chars
    if (base.length > 150) base = base.slice(0, 150);

    const fileName = `${Date.now()}_${base}${ext}`;

    try {
        const { data: uploadData, error: uploadError } = await window.supabase
            .storage
            .from("imagens")
            .upload(fileName, fotoFile);

        if (uploadError) {
            console.error("❌ Erro no upload:", uploadError);
            showMessage("Erro ao carregar imagem: " + uploadError.message, "danger");
            return;
        }

        const { data: publicUrlData } = window.supabase
            .storage
            .from("imagens")
            .getPublicUrl(fileName);

        fotoUrl = publicUrlData.publicUrl;
    } catch (err) {
        console.error("❌ Exceção no upload:", err);
        showMessage("Erro ao carregar imagem: " + (err.message || err), "danger");
        return;
    }
}



        const { data, error } = await window.supabase
            .from("items")
            .insert([{ nome, marca, lote, tipo, comprimento, largura, espessura, observacoes, foto: fotoUrl }])
            .select();

        if (error) {
            console.error("❌ Erro ao inserir:", error);
            showMessage("Erro ao gravar no banco de dados: " + error.message, "danger");
            return;
        }

        showMessage("✅ Produto cadastrado com sucesso!", "success");
        itemForm.reset();
    });
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

    // Remove após 5 segundos
    setTimeout(() => toast.remove(), 5000);
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("itemForm")) {
        initFormSupabase();
    }
});

window.initFormSupabase = initFormSupabase;
