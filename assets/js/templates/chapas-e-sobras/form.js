async function initFormSupabase() {
  if (!window.supabaseClient) {
    showMessage("❌ Erro: Supabase SDK não carregado!", "danger");
    return;
  }

  const supabase = window.supabaseClient;
  const itemForm = document.getElementById("itemForm");
  const marcaSelect = document.getElementById("marca");
  const newBrandWrapper = document.getElementById("newBrandWrapper");
  const newBrandInput = document.getElementById("new_brand");
  const addNewBrandBtn = document.getElementById("addNewBrand");
  const fotoInput = document.getElementById("foto");

  // =========================
  // CARREGAR MARCAS DINAMICAMENTE
  // =========================
  async function loadBrands() {
    try {
      const { data: brands, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      marcaSelect.innerHTML = `<option value="" disabled selected>Seleciona a marca...</option>`;

      brands.forEach(b => {
        const option = document.createElement("option");
        option.value = b.website_key;
        option.textContent = b.display_name;
        marcaSelect.appendChild(option);
      });

      // Opção para adicionar nova marca
      const novaOption = document.createElement("option");
      novaOption.value = "nova_marca";
      novaOption.innerHTML = '<span style="color:black"></span>+ Adicionar nova marca';
      marcaSelect.appendChild(novaOption);

    } catch (err) {
      showMessage("Erro ao carregar marcas: " + (err.message || err), "danger");
    }
  }

  await loadBrands();

  // =========================
  // SELECIONAR ADICIONAR NOVA MARCA
  // =========================
  marcaSelect.addEventListener("change", () => {
    if (marcaSelect.value === "nova_marca") {
      newBrandWrapper.classList.remove("d-none");
    } else {
      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";
    }
  });

  // =========================
  // ADICIONAR NOVA MARCA
  // =========================
  addNewBrandBtn.addEventListener("click", async () => {
    const displayName = newBrandInput.value.trim();
    if (!displayName) {
      showMessage("Escreve o nome da nova marca!", "danger");
      return;
    }

    const websiteKey = displayName.toLowerCase().replace(/\s+/g, "_");
    const itemsKey = displayName;

    try {
      const { error } = await supabase
        .from("brands")
        .insert([{ display_name: displayName, website_key: websiteKey, items_key: itemsKey }]);

      if (error) throw error;

      showMessage("✅ Nova marca adicionada!", "success");

      await loadBrands();
      marcaSelect.value = websiteKey;
      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";

    } catch (err) {
      showMessage("Erro ao adicionar nova marca: " + (err.message || err), "danger");
    }
  });


  // =========================
// SUBMIT FORM
// =========================
itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("⏳ A guardar o produto...", "info");

  const formData = new FormData(itemForm);
  const selectedWebsiteKey = formData.get("marca");
  const nome = formData.get("nome");
  const lote = formData.get("lote");
  const tipo = formData.get("tipo");
  const comprimento = parseFloat(formData.get("comprimento")) || 0;
  const largura = parseFloat(formData.get("largura")) || 0;
  const espessura = parseFloat(formData.get("espessura")) || 0;
  const observacoes = formData.get("observacoes");
  const fotoFile = formData.get("foto");

  // Encontrar o items_key correspondente ao website_key selecionado
  let marca = null;
  if (selectedWebsiteKey && selectedWebsiteKey !== "nova_marca") {
    try {
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("items_key")
        .eq("website_key", selectedWebsiteKey)
        .single();
      if (brandError) throw brandError;
      marca = brandData.items_key;
    } catch (err) {
      showMessage("Erro ao obter marca: " + (err.message || err), "danger");
      return;
    }
  }

  let fotoUrl = null;

  // UPLOAD FOTO (mantém igual)
  if (fotoFile && fotoFile.name) {
    const extMatch = fotoFile.name.match(/(\.[^.]*)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '.jpg';
    let base = fotoFile.name.replace(extMatch ? extMatch[0] : '', '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (base.length > 150) base = base.slice(0, 150);
    const fileName = `${Date.now()}_${base}${ext}`;

    try {
      const { data, error: uploadError } = await supabase
        .storage.from("imagens")
        .upload(fileName, fotoFile);
      if (uploadError) throw uploadError;

      const { data: publicData, error: publicError } = await supabase
        .storage.from("imagens")
        .getPublicUrl(fileName);
      if (publicError) throw publicError;

      fotoUrl = publicData.publicUrl;
    } catch (err) {
      showMessage("Erro ao carregar imagem: " + (err.message || err), "danger");
      return;
    }
  }

  // INSERT NO SUPABASE
  try {
    const { data, error } = await supabase
      .from("items")
      .insert([{ nome, marca, lote, tipo, comprimento, largura, espessura, observacoes, foto: fotoUrl }])
      .select();

    if (error) throw error;

    showMessage("✅ Produto registado com sucesso!", "success");
    itemForm.reset();
  } catch (err) {
    showMessage("Erro ao gravar no banco de dados: " + (err.message || err), "danger");
  }
});

}

// =========================
// FUNÇÃO DE MENSAGEM
// =========================
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("itemForm")) {
    initFormSupabase();
  }
});

window.initFormSupabase = initFormSupabase;
