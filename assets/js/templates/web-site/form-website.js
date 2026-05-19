window.initWebsiteForm = function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  const form = document.getElementById("itemForm");
  const imageInput = document.getElementById("image");

  // =====================================================
  // MARCA - AUTOCOMPLETE (igual ao formulário de orçamento)
  // =====================================================
  const brandInput = document.getElementById("brand");
  const brandKey = document.getElementById("brandKey");
  const brandDropdown = document.getElementById("brandDropdown");
  const clearBrand = document.getElementById("clearBrand");

  const titlePt = document.getElementById("title_pt");
  const titleEn = document.getElementById("title_en");
  const textPt = document.getElementById("text_pt");
  const textEn = document.getElementById("text_en");

  const titleEnWrapper = document.getElementById("titleEnWrapper");
  const textsWrapper = document.getElementById("textsWrapper");

  const newBrandWrapper = document.getElementById("newBrandWrapper");
  const newBrandInput = document.getElementById("new_brand");
  const addNewBrandBtn = document.getElementById("addNewBrand");

  // =====================================================
  // ESTADO
  // =====================================================
  let brandsData = [];
  let combinations = [];

  const addCombinationBtn = document.getElementById("addCombinationBtn");
  const combinationsContainer = document.getElementById("combinationsContainer");

  const THICKNESS_OPTIONS = [3, 6, 8, 12, 20, 30];
  const TYPE_OPTIONS = ['Polido', 'Matte', 'Velvet', 'Feel', 'Sat', 'U. Soft', 'Riv'];

  // =====================================================
  // FUNÇÃO AUTOCOMPLETE GENÉRICA
  // (igual à do formulário de orçamento)
  // =====================================================
  function setupAutocomplete(input, dropdown, data, onSelect, getDisplay = item => item.display) {
    let currentFocus = -1;
    let allDropdowns = [dropdown];

    function closeAllDropdowns() {
      allDropdowns.forEach(d => {
        d.classList.remove("show");
        d.innerHTML = "";
      });
    }

    function showOptions(filterValue = "") {
      closeAllDropdowns();

      const filtered = filterValue
        ? data.filter(item => getDisplay(item).toLowerCase().includes(filterValue.toLowerCase()))
        : data;

      if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item disabled">Nenhum resultado encontrado</div>';
        dropdown.classList.add("show");
        return;
      }

      dropdown.innerHTML = "";
      filtered.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "autocomplete-item" + (index === 0 ? " autocomplete-active" : "");
        div.textContent = getDisplay(item);

        div.addEventListener("click", function (e) {
          e.stopPropagation();
          input.value = getDisplay(item);
          onSelect(item);
          closeAllLists();
          if (clearBrand) clearBrand.classList.remove("d-none");
        });

        dropdown.appendChild(div);
      });

      currentFocus = 0;
      dropdown.classList.add("show");
    }

    input.addEventListener("click", function (e) {
      e.stopPropagation();
      showOptions(this.value.trim());
    });

    input.addEventListener("focus", function () {
      showOptions(this.value.trim());
    });

    input.addEventListener("input", function () {
      const val = this.value.trim();
      showOptions(val);
      toggleClearButton(input, clearBrand);
    });

    input.addEventListener("keydown", function (e) {
      let items = dropdown.getElementsByClassName("autocomplete-item");

      if (e.keyCode === 40) {
        e.preventDefault();
        currentFocus++;
        addActive(items);
      } else if (e.keyCode === 38) {
        e.preventDefault();
        currentFocus--;
        addActive(items);
      } else if (e.keyCode === 13) {
        e.preventDefault();
        if (currentFocus === -1 && items.length > 0) {
          items[0].click();
        } else if (currentFocus > -1 && items[currentFocus]) {
          items[currentFocus].click();
        }
      } else if (e.keyCode === 27) {
        closeAllLists();
      }
    });

    function addActive(items) {
      if (!items || items.length === 0) return;
      removeActive(items);
      if (currentFocus >= items.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items[currentFocus].classList.add("autocomplete-active");
      items[currentFocus].scrollIntoView({ block: "nearest" });
    }

    function removeActive(items) {
      for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("autocomplete-active");
      }
    }

    function closeAllLists() {
      dropdown.classList.remove("show");
      dropdown.innerHTML = "";
      currentFocus = -1;
    }

    document.addEventListener("click", function (e) {
      if (e.target !== input && !dropdown.contains(e.target)) {
        closeAllLists();
      }
    });
  }

  // =====================================================
  // MOSTRAR/ESCONDER BOTÃO CLEAR
  // =====================================================
  function toggleClearButton(input, clearBtn) {
    if (!clearBtn) return;
    if (input.value.trim() !== "") {
      clearBtn.classList.remove("d-none");
    } else {
      clearBtn.classList.add("d-none");
    }
  }

  // =====================================================
  // CLEAR DA MARCA
  // =====================================================
  brandInput.addEventListener("input", () => {
    toggleClearButton(brandInput, clearBrand);
  });

  clearBrand.addEventListener("click", (e) => {
    e.stopPropagation();
    brandInput.value = "";
    brandKey.value = "";
    clearBrand.classList.add("d-none");
    newBrandWrapper.classList.add("d-none");
    newBrandInput.value = "";
    titleEnWrapper.classList.add("d-none");
    textsWrapper.classList.add("d-none");
    titleEn.required = false;
    textPt.required = false;
    textEn.required = false;
    titleEn.value = "";
    textPt.value = "";
    textEn.value = "";
    brandInput.focus();
  });

  // =====================================================
  // CARREGAR MARCAS → AUTOCOMPLETE
  // =====================================================
  async function loadBrands() {
    try {
      const { data: brands, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      brandsData = brands.map(b => ({
        display: b.display_name,
        value: b.website_key,
        website_key: b.website_key,
        display_name: b.display_name
      }));

      // Opção para adicionar nova marca
      brandsData.push({
        display: "+ Adicionar Nova Marca",
        value: "nova_marca",
        website_key: "nova_marca",
        display_name: "+ Adicionar Nova Marca"
      });

      setupAutocomplete(
        brandInput,
        brandDropdown,
        brandsData,
        (item) => {
          if (item.value === "nova_marca") {
            brandKey.value = "";
            brandInput.value = "";
            clearBrand.classList.add("d-none");
            newBrandWrapper.classList.remove("d-none");
            titleEnWrapper.classList.add("d-none");
            textsWrapper.classList.add("d-none");
            setTimeout(() => newBrandInput.focus(), 50);
          } else {
            brandKey.value = item.website_key;
            newBrandWrapper.classList.add("d-none");

            const isMarbles = item.website_key === "marbles_&_granites";
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

            // ✅ Enter seleciona primeiro item → foco passa para Título (PT)
            setTimeout(() => titlePt.focus(), 50);
          }
        }
      );

    } catch (err) {
      showMessage("Erro ao carregar marcas: " + (err.message || err), "danger");
    }
  }

  loadBrands();

  // =====================================================
  // TEXT PT -> TEXT EN
  // =====================================================
  textPt.addEventListener("change", () => {
    if (textPt.value === "Mármore") textEn.value = "Marble";
    else if (textPt.value === "Granito") textEn.value = "Granites";
    else textEn.value = "";
  });

  // =====================================================
  // RENDER COMBINAÇÕES
  // =====================================================
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
        <button type="button" class="btn btn-sm btn-outline-danger remove-combo align-self-end mb-2" data-index="${index}">
          <i class="bi bi-x-lg"></i>
        </button>
      `;
      combinationsContainer.appendChild(div);
    });

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

  // =====================================================
  // ADICIONAR NOVA MARCA
  // =====================================================
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

      brandInput.value = displayName;
      brandKey.value = websiteKey;
      clearBrand.classList.remove("d-none");

      newBrandWrapper.classList.add("d-none");
      newBrandInput.value = "";

      setTimeout(() => titlePt.focus(), 50);

    } catch (err) {
      showMessage("Erro ao adicionar nova marca: " + (err.message || err), "danger");
    }
  });

  // =====================================================
  // SUBMIT FORMULÁRIO
  // =====================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      showMessage("⏳ A guardar ...", "info");

      if (!brandKey.value) {
        throw new Error("Seleciona uma marca");
      }

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
        .eq("Brand", brandKey.value)
        .eq("Title_pt", titlePt.value.trim());

      if (checkError) throw checkError;

      if (existingProducts && existingProducts.length > 0) {
        throw new Error(`❌ Já existe um produto "${titlePt.value.trim()}" nesta marca. Por favor, escolha outro nome.`);
      }

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

      const { data: websiteData, error: websiteError } = await supabase
        .from("website")
        .insert([{
          ImageURL: imageURL || null,
          Title_pt: titlePt.value.trim(),
          Title_en: titleEn.value.trim() || null,
          Text_pt: textPt.value || null,
          Text_en: textEn.value || null,
          Brand: brandKey.value
        }])
        .select();

      if (websiteError) throw websiteError;

      const websiteItemId = websiteData[0].id;

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
      brandInput.value = "";
      brandKey.value = "";
      clearBrand.classList.add("d-none");
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