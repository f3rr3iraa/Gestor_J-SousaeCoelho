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
  // COMBINAÇÕES (espessura + tipo + preço)
  // =========================
  let combinations = [];

  const addCombinationBtn = document.getElementById("addCombinationBtn");
  const combinationsContainer = document.getElementById("combinationsContainer");

  const THICKNESS_OPTIONS = [3, 6, 8, 12, 20, 30];
  const TYPE_OPTIONS = ['Polido','Matte', 'Velvet', 'Feel'];

  // =========================
  // CARREGAR MARCAS
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
      novaOption.innerHTML = '<span style="color:black"></span>+ Adicionar Nova Marca';
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

    if (brand.value === "nova_marca") {
      newBrandWrapper.classList.remove("d-none");
    } else {
      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";
    }
  });

  // =========================
  // TEXT PT -> TEXT EN
  // =========================
  textPt.addEventListener("change", () => {
    if (textPt.value === "Mármore") textEn.value = "Marble";
    else if (textPt.value === "Granito") textEn.value = "Granites";
    else textEn.value = "";
  });

  // =========================
// RENDER COMBINAÇÕES
// =========================
function renderCombinations() {
  combinationsContainer.innerHTML = "";

  combinations.forEach((combo, index) => {
    const div = document.createElement("div");
    div.className = "d-flex align-items-center gap-3 mb-2";
    div.innerHTML = `
      <div class="coolinput">
        <label class="text">Espessura:</label>
        <select class="input combo-thickness" data-index="${index}">
          <option value="" disabled ${!combo.thickness ? 'selected' : ''}>Seleciona...</option>
          ${THICKNESS_OPTIONS.map(t => `<option value="${t}" ${combo.thickness == t ? 'selected' : ''}>${t}mm</option>`).join('')}
        </select>
      </div>
      <div class="coolinput">
        <label class="text">Acabamento:</label>
        <select class="input combo-type" data-index="${index}">
          <option value="" disabled ${!combo.type ? 'selected' : ''}>Seleciona...</option>
          ${TYPE_OPTIONS.map(t => `<option value="${t}" ${combo.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="coolinput">
        <label class="text">Preço (€/m²):</label>
        <input type="number" step="0.01" min="0"
          class="input combo-price" data-index="${index}"
          value="${combo.price || ''}" placeholder="Preço por m²">
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger remove-combo align-self-end" data-index="${index}">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    combinationsContainer.appendChild(div);
  });

  // Eventos
  combinationsContainer.querySelectorAll('.combo-thickness').forEach(el => {
    el.addEventListener('change', e => {
      combinations[e.target.dataset.index].thickness = parseInt(e.target.value);
    });
  });
  combinationsContainer.querySelectorAll('.combo-type').forEach(el => {
    el.addEventListener('change', e => {
      combinations[e.target.dataset.index].type = e.target.value;
    });
  });
  combinationsContainer.querySelectorAll('.combo-price').forEach(el => {
    el.addEventListener('input', e => {
      combinations[e.target.dataset.index].price = parseFloat(e.target.value);
    });
  });
  combinationsContainer.querySelectorAll('.remove-combo').forEach(el => {
    el.addEventListener('click', e => {
      combinations.splice(parseInt(e.target.closest('button').dataset.index), 1);
      renderCombinations();
    });
  });
}

addCombinationBtn.addEventListener("click", () => {
  combinations.push({ thickness: '', type: '', price: '' });
  renderCombinations();
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

    // Validar combinações
    if (combinations.length === 0) {
      throw new Error("Adiciona pelo menos uma espessura/tipo");
    }

    const thicknessPrices = [];
    for (const combo of combinations) {
      if (!combo.type) {
        throw new Error(`Seleciona o acabamento para ${combo.thickness}mm`);
      }
      if (!combo.price || combo.price <= 0) {
        throw new Error(`Preço inválido para ${combo.thickness}mm ${combo.type}`);
      }
      const key = `${combo.thickness}_${combo.type}`;
      if (thicknessPrices.some(t => `${t.thickness}_${t.type}` === key)) {
        throw new Error(`Combinação duplicada: ${combo.thickness}mm ${combo.type}`);
      }
      thicknessPrices.push({ thickness: combo.thickness, type: combo.type, price: combo.price });
    }

      
      const { data: existingProducts, error: checkError } = await supabase
        .from("website")
        .select("id, Title_pt, Brand")
        .eq("Brand", brand.value)
        .eq("Title_pt", titlePt.value.trim());

      if (checkError) throw checkError;

      if (existingProducts && existingProducts.length > 0) {
        const brandName = brand.options[brand.selectedIndex].text;
        throw new Error(`❌ Já existe um produto "${titlePt.value.trim()}" na marca "${brandName}". Por favor, escolha outro nome.`);
      }

      // Imagem é opcional — só faz upload se existir ficheiro
      const file = imageInput.files[0];
      let imageURL = null;

      if (file) {
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

        imageURL = publicData.publicUrl;
      }

      // Inserir produto
      const { data: websiteData, error: websiteError } = await supabase
        .from("website")
        .insert([{
          ImageURL: imageURL || null,
          Title_pt: titlePt.value.trim(),
          Title_en: titleEn.value.trim() || null,
          Text_pt: textPt.value || null,
          Text_en: textEn.value || null,
          Brand: brand.value
        }])
        .select();

      if (websiteError) throw websiteError;

      const websiteItemId = websiteData[0].id;

      // Inserir espessuras e preços
      const thicknessInserts = thicknessPrices.map(tp => ({
        website_item_id: websiteItemId,
        thickness: tp.thickness,
        type: tp.type,
        price_per_m2: tp.price
      }));

      const { error: thicknessError } = await supabase
        .from("product_thicknesses")
        .insert(thicknessInserts);

      if (thicknessError) throw thicknessError;

      showMessage("✅ Produto adicionado com sucesso!", "success");

      form.reset();
      titleEnWrapper.classList.add("d-none");
      textsWrapper.classList.add("d-none");
      newBrandWrapper.classList.add("d-none");
      combinations = [];
renderCombinations();

    } catch (err) {
      showMessage((err.message || err), "danger");
    }
  });
};