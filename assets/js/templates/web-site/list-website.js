let currentBrandSelected = "";

// ================================
// LIST WEBSITE (SPA)
// ================================
window.initWebsiteList = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  // ================================
  // CONFIG PAGINAÇÃO (LOCALSTORAGE)
  // ================================
  const pageKey = "list-website";
  const storageKey = `itemsPerPage_${pageKey}`;
  const DEFAULT_ITEMS_PER_PAGE = 10;

  // ================================
  // ELEMENTOS DOM
  // ================================
  const tbody = document.getElementById("websiteItemsBody");
  const filtroBrand = document.getElementById("filtroBrand");
  const filtroTitlePt = document.getElementById("filtroTitlePt");
  const filtroTextPt = document.getElementById("filtroTextPt");
  const filtroTextWrapper = document.getElementById("filtroTextWrapper");
  const btnLimpar = document.getElementById("btnLimparFiltros");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");

  // ================================
  // ESTADO
  // ================================
  let currentPage = 1;
  let itemsPerPage = parseInt(
    localStorage.getItem(storageKey) || DEFAULT_ITEMS_PER_PAGE,
  );
  itemsPerPageSelect.value = itemsPerPage;
  let totalItems = 0;

  // ================================
  // FILTROS & BRAND CHANGE
  // ================================
  function resetAndLoad() {
    currentPage = 1;
    loadData();
  }

  filtroBrand.addEventListener("change", () => {
    currentBrandSelected = filtroBrand.value;

    const isMarbles = filtroBrand.value === "marbles_&_granites";
    filtroTextWrapper.classList.toggle("d-none", !isMarbles);
    if (!isMarbles) filtroTextPt.value = "";
    resetAndLoad();
  });

  filtroTitlePt.addEventListener("input", debounce(resetAndLoad, 400));
  filtroTextPt.addEventListener("change", resetAndLoad);

  itemsPerPageSelect.addEventListener("change", () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value);
    localStorage.setItem(storageKey, itemsPerPage);
    resetAndLoad();
  });

  btnLimpar.addEventListener("click", () => {
    filtroBrand.value = "";
    filtroTitlePt.value = "";
    filtroTextPt.value = "";
    filtroTextWrapper.classList.add("d-none");
    resetAndLoad();
  });

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadData();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    const maxPage = Math.ceil(totalItems / itemsPerPage);
    if (currentPage < maxPage) {
      currentPage++;
      loadData();
    }
  });

  // ================================
  // LOAD DATA COM ESPESSURAS
  // ================================
  async function loadData() {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("website")
        .select(
          `id, "Brand", "Title_pt", "ImageURL", "Title_en", "Text_pt", "Text_en"`,
          { count: "exact" },
        )
        .order("id", { ascending: false })
        .range(from, to);

      if (filtroBrand.value) query = query.eq("Brand", filtroBrand.value);
      if (filtroTitlePt.value)
        query = query.ilike("Title_pt", `%${filtroTitlePt.value}%`);
      if (filtroBrand.value === "marbles_&_granites" && filtroTextPt.value)
        query = query.eq("Text_pt", filtroTextPt.value);

      const { data, error, count } = await query;

      if (error) throw error;

      totalItems = count || 0;

      // Carregar espessuras para cada item
      const itemsWithThickness = await Promise.all(
        (data || []).map(async (item) => {
          const { data: thicknesses } = await supabase
            .from("product_thicknesses")
            .select("thickness, type, price_per_m2")
            .eq("website_item_id", item.id)
            .order("thickness", { ascending: true });

          return {
            ...item,
            thicknesses: thicknesses || [],
          };
        })
      );

      renderTable(itemsWithThickness);
      updatePagination();

      setTimeout(() => {
        tbody.style.opacity = "1";
      }, 50);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar dados</td></tr>`;
      tbody.style.opacity = "1";
      showMessage("❌ Erro: " + err.message, "danger");
    }
  }

  // ================================
  // LOAD DATA COM AJUSTE DE PÁGINA
  // ================================
  async function loadDataWithPageAdjust() {
    try {
      const maxPage = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > maxPage && maxPage > 0) {
        currentPage = maxPage;
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("website")
        .select(
          `id, "Brand", "Title_pt", "ImageURL", "Title_en", "Text_pt", "Text_en"`,
          { count: "exact" },
        )
        .order("id", { ascending: false })
        .range(from, to);

      if (filtroBrand.value) query = query.eq("Brand", filtroBrand.value);
      if (filtroTitlePt.value)
        query = query.ilike("Title_pt", `%${filtroTitlePt.value}%`);
      if (filtroBrand.value === "marbles_&_granites" && filtroTextPt.value)
        query = query.eq("Text_pt", filtroTextPt.value);

      const { data, error, count } = await query;

      if (error) throw error;

      totalItems = count || 0;

      if (data.length === 0 && currentPage > 1) {
        currentPage--;
        return loadDataWithPageAdjust();
      }

      // Carregar espessuras
      const itemsWithThickness = await Promise.all(
        (data || []).map(async (item) => {
          const { data: thicknesses } = await supabase
            .from("product_thicknesses")
            .select("thickness, type, price_per_m2")
            .eq("website_item_id", item.id)
            .order("thickness", { ascending: true });

          return {
            ...item,
            thicknesses: thicknesses || [],
          };
        })
      );

      renderTable(itemsWithThickness);
      updatePagination();

      setTimeout(() => {
        tbody.style.opacity = "1";
      }, 50);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar dados</td></tr>`;
      tbody.style.opacity = "1";
      showMessage("❌ Erro: " + err.message, "danger");
    }
  }

  // ================================
  // RENDER TABLE COM ESPESSURAS
  // ================================
  function renderTable(items) {
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhum produto encontrado</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.dataset.id = item.id;
      tr.dataset.imageurl = item.ImageURL || "";
      tr.dataset.brand = item.Brand || "";
      tr.dataset.titlept = item.Title_pt || "";
      tr.dataset.titleen = item.Title_en || "";
      tr.dataset.textpt = item.Text_pt || "";
      tr.dataset.texten = item.Text_en || "";
      tr.dataset.thicknesses = JSON.stringify(item.thicknesses || []);

      // Formatar espessuras e preços
      let thicknessHtml = "";
      if (item.thicknesses && item.thicknesses.length > 0) {
        thicknessHtml = item.thicknesses
          .map(
            (t) =>
              `<span class="thickness-badge">${t.thickness}mm ${t.type}: <strong>${parseFloat(t.price_per_m2).toFixed(2)}€</strong></span>`
          )
          .join(" ");
      } else {
        thicknessHtml = '<span class="text-muted"></span>';
      }

      tr.innerHTML = `
        <td>
          <img src="${item.ImageURL || ""}" style="max-height:45px;object-fit:cover;border-radius:4px;">
        </td>
        <td>${brandMap[item.Brand] || formatBrand(item.Brand)}</td>
        <td>${item.Title_pt || ""}</td>
        <td>${item.Title_en || ""}</td>
        <td>${item.Text_pt || ""}</td>
        <td>${item.Text_en || ""}</td>
        <td style="font-size: 0.9rem;">${thicknessHtml}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ================================
  // PAGINATION UI
  // ================================
  function updatePagination() {
    const maxPage = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    pageIndicator.textContent = `${currentPage} / ${maxPage}`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPage;

    prevPageBtn.parentElement.classList.toggle("disabled", currentPage === 1);
    nextPageBtn.parentElement.classList.toggle(
      "disabled",
      currentPage === maxPage,
    );
  }

  // ================================
  // ELIMINAR ITEM
  // ================================
  let itemToDelete = null;

  tbody.addEventListener("click", (e) => {
    if (e.target.closest("button[title='Eliminar']")) {
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;
      const imageURL = tr.dataset.imageurl;
      itemToDelete = { id, imageURL };
      const deleteModalEl = document.getElementById("deleteModal");
      const modal = new bootstrap.Modal(deleteModalEl);
      modal.show();
    }
  });

  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async () => {
      if (!itemToDelete) return;

      try {
        const supabase = window.supabaseClient;

        // Eliminar espessuras (CASCADE vai fazer isto automaticamente)
        // mas podemos fazer explicitamente se necessário

        // Eliminar imagem do Storage
        if (itemToDelete.imageURL) {
          const url = new URL(itemToDelete.imageURL);
          const path = url.pathname.replace(
            "/storage/v1/object/public/imagens-website/",
            "",
          );
          const { error: storageError } = await supabase.storage
            .from("imagens-website")
            .remove([path]);

          if (storageError)
            console.warn("Erro ao eliminar imagem:", storageError.message);
        }

        // Eliminar do Supabase (CASCADE eliminará as espessuras)
        const { error } = await supabase
          .from("website")
          .delete()
          .eq("id", itemToDelete.id);

        if (error) throw error;

        showMessage("✅ Item eliminado com sucesso", "success");

        const deleteModalEl = document.getElementById("deleteModal");
        const modal = bootstrap.Modal.getInstance(deleteModalEl);
        modal.hide();

        loadDataWithPageAdjust();
      } catch (err) {
        showMessage("❌ Erro ao eliminar: " + err.message, "danger");
      } finally {
        itemToDelete = null;
      }
    });

  // ================================
  // EDITAR ITEM (OFFCANVAS)
  // ================================
  const websiteEditForm = document.getElementById("websiteEditForm");
  const editOffcanvasEl = document.getElementById("editOffcanvas");
  const editOffcanvas = new bootstrap.Offcanvas(editOffcanvasEl);

  const websiteEditId = document.getElementById("websiteEditId");
  const websiteEditMarca = document.getElementById("websiteEditMarca");
  const websiteEditTitlePt = document.getElementById("websiteEditTitlePt");
  const websiteEditTitleEn = document.getElementById("websiteEditTitleEn");
  const websiteEditTextPt = document.getElementById("websiteEditTextPt");
  const websiteEditTextEn = document.getElementById("websiteEditTextEn");
  const websiteEditFotoAtual = document.getElementById("websiteEditFotoAtual");
  const websiteFotoPreview = document.getElementById("websiteFotoPreview");


  // Tradução automática Texto PT -> EN
  websiteEditTextPt.addEventListener("input", () => {
    const pt = websiteEditTextPt.value.trim();
    if (pt === "Mármore") {
      websiteEditTextEn.value = "Marble";
    } else if (pt === "Granito") {
      websiteEditTextEn.value = "Granites";
    } else {
      websiteEditTextEn.value = "";
    }
  });

  // ================================
// COMBINAÇÕES EDITAR (espessura + tipo + preço)
// ================================
let editCombinations = [];

const editAddCombinationBtn = document.getElementById("editAddCombinationBtn");
const editCombinationsContainer = document.getElementById("editCombinationsContainer");

const THICKNESS_OPTIONS = [3, 6, 8, 12, 20, 30];
const TYPE_OPTIONS = ['Polido','Matte', 'Velvet', 'Feel', 'Sat', 'U. Soft', 'Riv'];

function renderEditCombinations() {
  editCombinationsContainer.innerHTML = "";

  editCombinations.forEach((combo, index) => {
    const div = document.createElement("div");
    div.className = "d-flex align-items-center gap-3 mb-2";
    div.innerHTML = `
      <div class="coolinput">
        <label class="text">Espessura:</label>
        <select class="input edit-combo-thickness" data-index="${index}">
          <option value="" disabled ${!combo.thickness ? 'selected' : ''}>Seleciona...</option>
          ${THICKNESS_OPTIONS.map(t => `<option value="${t}" ${combo.thickness == t ? 'selected' : ''}>${t}mm</option>`).join('')}
        </select>
      </div>
      <div class="coolinput">
        <label class="text">Acabamento:</label>
        <select class="input edit-combo-type" data-index="${index}">
          <option value="" disabled ${!combo.type ? 'selected' : ''}>Seleciona...</option>
          ${TYPE_OPTIONS.map(t => `<option value="${t}" ${combo.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="coolinput">
        <label class="text">Preço (€/m²):</label>
        <input type="number" step="0.01" min="0"
          class="input edit-combo-price" data-index="${index}"
          value="${combo.price || ''}" placeholder="Preço por m²">
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger edit-remove-combo align-self-center" data-index="${index}">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    editCombinationsContainer.appendChild(div);
  });

  // Eventos — atualizam o array diretamente
  editCombinationsContainer.querySelectorAll('.edit-combo-thickness').forEach(el => {
    el.addEventListener('change', e => {
      editCombinations[parseInt(e.target.dataset.index)].thickness = parseInt(e.target.value);
    });
  });
  editCombinationsContainer.querySelectorAll('.edit-combo-type').forEach(el => {
    el.addEventListener('change', e => {
      editCombinations[parseInt(e.target.dataset.index)].type = e.target.value;
    });
  });
  editCombinationsContainer.querySelectorAll('.edit-combo-price').forEach(el => {
    el.addEventListener('input', e => {
      editCombinations[parseInt(e.target.dataset.index)].price = parseFloat(e.target.value);
    });
  });
  editCombinationsContainer.querySelectorAll('.edit-remove-combo').forEach(el => {
    el.addEventListener('click', e => {
      editCombinations.splice(parseInt(e.target.closest('button').dataset.index), 1);
      renderEditCombinations();
    });
  });
}

editAddCombinationBtn.addEventListener("click", () => {
  editCombinations.push({ thickness: '', type: '', price: '' });
  renderEditCombinations();
});

  // ================================
  // ABRIR OFFCANVAS DE EDIÇÃO
  // ================================
  document.getElementById("websiteItemsBody").addEventListener("click", async (e) => {
    if (e.target.closest("button[title='Editar']")) {
      const tr = e.target.closest("tr");
      const brand = tr.dataset.brand || "";
      const itemId = tr.dataset.id;

      websiteEditId.value = itemId;
      websiteEditMarca.value = brand;
      websiteEditTitlePt.value = tr.dataset.titlept;
      websiteEditTitleEn.value = tr.dataset.titleen;
      websiteEditTextPt.value = tr.dataset.textpt;
      websiteEditTextEn.value = tr.dataset.texten;
      websiteEditFotoAtual.value = tr.dataset.imageurl;

      const websiteEditFoto = document.getElementById("websiteEditFoto");
      websiteEditFoto.value = null;
      websiteFotoPreview.src = tr.dataset.imageurl || "";

      // Mostrar apenas para Marbles & Granites
      const isMarbles = brand === "marbles_&_granites";
      document
        .getElementById("wrapperTitleEn")
        .classList.toggle("d-none", !isMarbles);
      document
        .getElementById("wrapperTextPt")
        .classList.toggle("d-none", !isMarbles);
      document
        .getElementById("wrapperTextEn")
        .classList.toggle("d-none", !isMarbles);

      // Carregar espessuras existentes
      // Carregar espessuras existentes
try {
  const { data: thicknesses, error } = await supabase
    .from("product_thicknesses")
    .select("thickness, type, price_per_m2")
    .eq("website_item_id", itemId)
    .order("thickness", { ascending: true });

  if (error) throw error;

  editCombinations = (thicknesses || []).map(t => ({
    thickness: t.thickness,
    type: t.type,
    price: parseFloat(t.price_per_m2)
  }));

  renderEditCombinations();

} catch (err) {
  console.error("Erro ao carregar espessuras:", err);
}

      editOffcanvas.show();
    }
  });

  let brandMap = {};

  async function loadBrandsDropdowns() {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      const currentFilter = filtroBrand.value;

      filtroBrand.innerHTML = `<option value="">Todas</option>`;
      websiteEditMarca.innerHTML = `<option value="" disabled selected>Selecionar uma marca</option>`;

      data.forEach((brand) => {
        brandMap[brand.website_key] = brand.display_name;

        const optFiltro = document.createElement("option");
        optFiltro.value = brand.website_key;
        optFiltro.textContent = brand.display_name;
        filtroBrand.appendChild(optFiltro);

        const optEdit = document.createElement("option");
        optEdit.value = brand.website_key;
        optEdit.textContent = brand.display_name;
        websiteEditMarca.appendChild(optEdit);
      });

      if (currentFilter) {
        filtroBrand.value = currentFilter;
      }
    } catch (err) {
      console.error("Erro ao carregar brands:", err.message);
    }
  }

  async function reloadWebsite() {
    await loadBrandsDropdowns();
    await loadDataWithPageAdjust();
  }

  // Preview da imagem
  document.getElementById("websiteEditFoto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      websiteFotoPreview.src = URL.createObjectURL(file);
    } else {
      websiteFotoPreview.src = websiteEditFotoAtual.value || "";
    }
  });

  websiteEditMarca.addEventListener("change", () => {
    const isMarbles = websiteEditMarca.value === "marbles_&_granites";

    document
      .getElementById("wrapperTitleEn")
      .classList.toggle("d-none", !isMarbles);
    document
      .getElementById("wrapperTextPt")
      .classList.toggle("d-none", !isMarbles);
    document
      .getElementById("wrapperTextEn")
      .classList.toggle("d-none", !isMarbles);

    if (!isMarbles) {
      websiteEditTitleEn.value = "";
      websiteEditTextPt.value = "";
      websiteEditTextEn.value = "";
    }
  });

  // ================================
  // SUBMIT FORMULÁRIO DE EDIÇÃO
  // ================================
  websiteEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const supabase = window.supabaseClient;
      const id = websiteEditId.value;
      let imageURL = websiteEditFotoAtual.value;

      // Validar combinações
// Sincronizar estado com os inputs antes de validar
editCombinationsContainer.querySelectorAll('.edit-combo-thickness').forEach(el => {
  editCombinations[parseInt(el.dataset.index)].thickness = parseInt(el.value) || '';
});
editCombinationsContainer.querySelectorAll('.edit-combo-type').forEach(el => {
  editCombinations[parseInt(el.dataset.index)].type = el.value || '';
});
editCombinationsContainer.querySelectorAll('.edit-combo-price').forEach(el => {
  editCombinations[parseInt(el.dataset.index)].price = parseFloat(el.value) || 0;
});

// Validar combinações
if (editCombinations.length === 0) {
  throw new Error("Adiciona pelo menos uma espessura/tipo");
}

const thicknessPrices = [];
for (const combo of editCombinations) {
  if (!combo.thickness) {
    throw new Error("Seleciona a espessura em todas as linhas");
  }
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
        .eq("Brand", websiteEditMarca.value)
        .eq("Title_pt", websiteEditTitlePt.value.trim())
        .neq("id", id); // ⭐ Exclui o próprio produto que está sendo editado

      if (checkError) throw checkError;

      if (existingProducts && existingProducts.length > 0) {
        const brandName = websiteEditMarca.options[websiteEditMarca.selectedIndex].text;
        throw new Error(`❌ Já existe outro produto "${websiteEditTitlePt.value.trim()}" na marca "${brandName}". Por favor, escolha outro nome.`);
      }

      // Upload de nova imagem se necessário
      const file = document.getElementById("websiteEditFoto").files[0];
      if (file) {
        showMessage("📸 A carregar imagem...", "info");
        
        if (websiteEditFotoAtual.value) {
          try {
            const oldUrl = new URL(websiteEditFotoAtual.value);
            const oldPath = oldUrl.pathname.replace(
              "/storage/v1/object/public/imagens-website/",
              "",
            );

            const { error: deleteError } = await supabase.storage
              .from("imagens-website")
              .remove([oldPath]);

            if (deleteError) {
              console.warn("Aviso ao eliminar foto antiga:", deleteError.message);
            }
          } catch (urlError) {
            console.warn("Erro ao processar URL da foto antiga:", urlError);
          }
        }

        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("imagens-website")
          .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("imagens-website")
          .getPublicUrl(fileName);

        imageURL = publicData.publicUrl;
      }

      const isMarbles = websiteEditMarca.value === "marbles_&_granites";

      // Atualizar produto
      const updateData = {
        Brand: websiteEditMarca.value,
        Title_pt: websiteEditTitlePt.value.trim(),
        ImageURL: imageURL,
        Title_en: isMarbles ? websiteEditTitleEn.value.trim() : null,
        Text_pt: isMarbles ? websiteEditTextPt.value : null,
        Text_en: isMarbles ? websiteEditTextEn.value : null,
      };

      const { error } = await supabase
        .from("website")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Eliminar espessuras antigas
      const { error: deleteThicknessError } = await supabase
        .from("product_thicknesses")
        .delete()
        .eq("website_item_id", id);

      if (deleteThicknessError) throw deleteThicknessError;

      // Inserir novas espessuras
      const thicknessInserts = thicknessPrices.map(tp => ({
  website_item_id: parseInt(id),
  thickness: tp.thickness,
  type: tp.type,
  price_per_m2: tp.price
}));

      const { error: thicknessError } = await supabase
        .from("product_thicknesses")
        .insert(thicknessInserts);

      if (thicknessError) throw thicknessError;

      showMessage("✅ Produto atualizado com sucesso!", "success");
      editOffcanvas.hide();
      loadDataWithPageAdjust();
    } catch (err) {
      showMessage(err.message, "danger");
    }
  });

  // ================================
  // HELPERS
  // ================================
  function formatBrand(brand) {
    return brand
      .replaceAll("_", " ")
      .replace("&", "&")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ================================
  // INIT REALTIME
  // ================================
  let cleanupRealtime = null;

  if (typeof window.initWebsiteRealtime === "function") {
    cleanupRealtime = window.initWebsiteRealtime(reloadWebsite);
  }

  // ================================
  // CLEANUP
  // ================================
  window.addEventListener("beforeunload", () => {
    if (cleanupRealtime) cleanupRealtime();
  });

  // ================================
  // INIT
  // ================================
  await loadBrandsDropdowns();
  loadData();
};