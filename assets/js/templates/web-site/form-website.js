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
  const pricesWrapper = document.getElementById("pricesWrapper");
  const priceInputs = document.getElementById("priceInputs");

  const newBrandWrapper = document.getElementById("newBrandWrapper");
  const newBrandInput = document.getElementById("new_brand");
  const addNewBrandBtn = document.getElementById("addNewBrand");

  const thicknessCheckboxes = document.querySelectorAll(".thickness-check");

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
  // ESPESSURAS - MOSTRAR PREÇOS
  // =========================
  thicknessCheckboxes.forEach(checkbox => {
    checkbox.addEventListener("change", updatePriceInputs);
  });

  function updatePriceInputs() {
    const selectedThicknesses = Array.from(thicknessCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    if (selectedThicknesses.length === 0) {
      pricesWrapper.classList.add("d-none");
      priceInputs.innerHTML = "";
      return;
    }

    pricesWrapper.classList.remove("d-none");
    priceInputs.innerHTML = "";

    selectedThicknesses.forEach(thickness => {
      const div = document.createElement("div");
      div.className = "coolinput col-2 price-input-group";
      div.innerHTML = `
        <label for="price_${thickness}" class="text">Preço ${thickness}mm (€/m²):</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="price_${thickness}"
          id="price_${thickness}"
          class="input price-input"
          placeholder="Preço por m²"
          required
        />
      `;
      priceInputs.appendChild(div);
    });
  }

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

      // Validar espessuras selecionadas
      const selectedThicknesses = Array.from(thicknessCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      if (selectedThicknesses.length === 0) {
        throw new Error("Seleciona pelo menos uma espessura");
      }

      // Validar preços
      const thicknessPrices = [];
      for (const thickness of selectedThicknesses) {
        const priceInput = document.getElementById(`price_${thickness}`);
        const price = parseFloat(priceInput.value);
        
        if (!price || price <= 0) {
          throw new Error(`Preço inválido para espessura ${thickness}mm`);
        }
        
        thicknessPrices.push({ thickness: parseInt(thickness), price });
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
      pricesWrapper.classList.add("d-none");
      priceInputs.innerHTML = "";

    } catch (err) {
      showMessage((err.message || err), "danger");
    }
  });
};