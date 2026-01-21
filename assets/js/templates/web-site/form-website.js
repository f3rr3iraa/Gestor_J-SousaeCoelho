window.initWebsiteForm = function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  const form = document.getElementById("itemForm");
  const imageInput = document.getElementById("image");
  const brand = document.getElementById("brand");
  const titlePt = document.getElementById("title_pt");
  const titleEn = document.getElementById("title_en");
  const textPt = document.getElementById("text_pt");
  const textEn = document.getElementById("text_en");

  const titleEnWrapper = document.getElementById("titleEnWrapper");
  const textsWrapper = document.getElementById("textsWrapper");

  const newBrandWrapper = document.getElementById("newBrandWrapper");
  const newBrandInput = document.getElementById("new_brand");
  const addNewBrandBtn = document.getElementById("addNewBrand");

  // =========================
  // FUNÇÃO CARREGAR MARCAS
  // =========================
  async function loadBrands() {
    try {
      const { data: brands, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      brand.innerHTML = `<option value="" disabled selected>Seleciona a marca...</option>`;

      brands.forEach(b => {
        const option = document.createElement("option");
        option.value = b.website_key;
        option.textContent = b.display_name;
        brand.appendChild(option);
      });

      const novaOption = document.createElement("option");
      novaOption.value = "nova_marca";
      novaOption.innerHTML = '<span style="color:black"></span>+ Adicionar nova marca';
      brand.appendChild(novaOption);

    } catch (err) {
      showMessage("Erro ao carregar marcas: " + (err.message || err), "danger");
    }
  }

  loadBrands();

  // =========================
  // BRAND CHANGE
  // =========================
  brand.addEventListener("change", () => {
    const isMarbles = brand.value === "marbles_&_granites";

    titleEnWrapper.classList.toggle("d-none", !isMarbles);
    textsWrapper.classList.toggle("d-none", !isMarbles);

    titleEn.required = isMarbles;
    textPt.required = isMarbles;
    textEn.required = isMarbles;

    if (!isMarbles) {
      titleEn.value = "";
      textPt.value = "";
      textEn.value = "";
    }

    // Mostrar input nova marca
    if (brand.value === "nova_marca") {
      newBrandWrapper.classList.remove("d-none");
    } else {
      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";
    }
  });

  // =========================
  // TEXT PT -> TEXT EN AUTOMATICO
  // =========================
  textPt.addEventListener("change", () => {
    if (textPt.value === "Mármore") textEn.value = "Marble";
    else if (textPt.value === "Granito") textEn.value = "Granites";
    else textEn.value = "";
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
      brand.value = websiteKey;

      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";

    } catch (err) {
      showMessage("Erro ao adicionar nova marca: " + (err.message || err), "danger");
    }
  });

  // =========================
  // SUBMIT FORMULÁRIO
  // =========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      showMessage("⏳ A guardar ...", "info");

      const file = imageInput.files[0];
      if (!file) throw new Error("Imagem obrigatória");

      showMessage("📸 A carregar imagem...", "info");
      const fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase
        .storage
        .from("imagens-website")
        .upload(fileName, file);

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicData, error: publicError } = supabase
        .storage
        .from("imagens-website")
        .getPublicUrl(fileName);

      if (publicError) throw new Error(publicError.message);

      const imageURL = publicData.publicUrl;

      const { error } = await supabase
        .from("website")
        .insert([{
          ImageURL: imageURL,
          Title_pt: titlePt.value,
          Title_en: titleEn.value || null,
          Text_pt: textPt.value || null,
          Text_en: textEn.value || null,
          Brand: brand.value
        }]);

      if (error) throw error;

      showMessage("✅ Produto no Catálogo com sucesso!", "success");

      form.reset();
      titleEnWrapper.classList.add("d-none");
      textsWrapper.classList.add("d-none");
      newBrandWrapper.classList.add("d-none");

    } catch (err) {
      showMessage("Erro: " + (err.message || err), "danger");
    }
  });
};
