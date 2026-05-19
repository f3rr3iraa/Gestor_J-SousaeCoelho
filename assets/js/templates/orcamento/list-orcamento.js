// =====================================================
// LIST-ORCAMENTO.JS - VERSÃO COM EDIÇÃO DE PRODUTOS EXISTENTES E CANCELAR EDIÇÃO
// ✅ Todos os campos com autocomplete (Tipo, Marca, Descrição, Espessura)
// ✅ Botões Clear (×) em todos os inputs
// ✅ Preenchimento automático do preço ao selecionar espessura
// ✅ Edição de produtos existentes
// ✅ NOVO: Botão "Cancelar Edição" ao lado do "Atualizar Produto"
// =====================================================

window.initOrcamentoList = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  let cleanupRealtime = null;

try {
  if (typeof window.initOrcamentoRealtime === 'function') {
    cleanupRealtime = window.initOrcamentoRealtime(loadData);
  }
} catch (err) {
  console.warn("⚠️ Realtime não iniciado:", err);
}

window.addEventListener('beforeunload', () => {
  if (cleanupRealtime) cleanupRealtime();
});

  // =====================================================
  // CONFIG PAGINAÇÃO
  // =====================================================
  const pageKey = "list-orcamento";
  const storageKey = `itemsPerPage_${pageKey}`;
  const DEFAULT_ITEMS_PER_PAGE = 10;

  // =====================================================
  // ELEMENTOS DOM
  // =====================================================
  const tbody = document.getElementById("orcamentosTableBody");
  const filtroReferencia = document.getElementById("filtroReferencia");
  const filtroCliente = document.getElementById("filtroCliente");
  const filtroProduto = document.getElementById("filtroProduto");
  const btnLimpar = document.getElementById("btnLimparFiltros");
  const itemsPerPageSelect = document.getElementById("itemsPerPage");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");

  const editOffcanvasEl = document.getElementById("editOffcanvas");
  const editOffcanvas = new bootstrap.Offcanvas(editOffcanvasEl);
  const orcamentoEditForm = document.getElementById("orcamentoEditForm");
  const editOrcamentoId = document.getElementById("editOrcamentoId");
  const editClienteNome = document.getElementById("editClienteNome");
  const editProdutosTableBody = document.getElementById("editProdutosTableBody");
  const editTotalGeral = document.getElementById("editTotalGeral");

  // Campos do produto - AUTOCOMPLETE
  const editProdutoTipo = document.getElementById("editProdutoTipo");
  const editProdutoTipoId = document.getElementById("editProdutoTipoId");
  const editTipoDropdown = document.getElementById("editTipoDropdown");
  
  const editProdutoBrand = document.getElementById("editProdutoBrand");
  const editProdutoBrandKey = document.getElementById("editProdutoBrandKey");
  const editBrandDropdown = document.getElementById("editBrandDropdown");
  
  const editProdutoDescricao = document.getElementById("editProdutoDescricao");
  const editProdutoDescricaoId = document.getElementById("editProdutoDescricaoId");
  const editDescricaoDropdown = document.getElementById("editDescricaoDropdown");
  
  const editProdutoEspessura = document.getElementById("editProdutoEspessura");
  const editProdutoEspessuraValue = document.getElementById("editProdutoEspessuraValue");
  const editEspessuraDropdown = document.getElementById("editEspessuraDropdown");
  
  // Botões Clear
  const editClearTipo = document.getElementById("editClearTipo");
  const editClearBrand = document.getElementById("editClearBrand");
  const editClearDescricao = document.getElementById("editClearDescricao");
  const editClearEspessura = document.getElementById("editClearEspessura");
  
  const editProdutoQuantidade = document.getElementById("editProdutoQuantidade");
  const editProdutoComprimento = document.getElementById("editProdutoComprimento");
  const editProdutoLargura = document.getElementById("editProdutoLargura");
  const editProdutoMt2 = document.getElementById("editProdutoMt2");
  const editProdutoPrecoMt2 = document.getElementById("editProdutoPrecoMt2");
  const editProdutoDesconto = document.getElementById("editProdutoDesconto");
  const editProdutoSubtotal = document.getElementById("editProdutoSubtotal");
  const editProdutoTotal = document.getElementById("editProdutoTotal");
  const btnAdicionarProdutoEdit = document.getElementById("btnAdicionarProdutoEdit");
  const btnCancelarEdicaoEdit = document.getElementById("btnCancelarEdicaoEdit");
  const btnLimparFormularioEdit = document.getElementById("btnLimparFormularioEdit");

  const btnVerPrecarioEdit = document.getElementById("btnVerPrecarioEdit");
  const precarioModalEdit = document.getElementById("precarioModalEdit");
  const precarioTituloEdit = document.getElementById("precarioTituloEdit");
  const precarioTableBodyEdit = document.getElementById("precarioTableBodyEdit");
  const btnFecharPrecarioEdit = document.getElementById("btnFecharPrecarioEdit");

  const editProdutoAcabamento = document.getElementById("editProdutoAcabamento");

  // =====================================================
  // ESTADO
  // =====================================================
  let currentPage = 1;
  let itemsPerPage = parseInt(
    localStorage.getItem(storageKey) || DEFAULT_ITEMS_PER_PAGE
  );
  itemsPerPageSelect.value = itemsPerPage;
  let totalItems = 0;
  let brandMap = {};
  let tiposMap = {};
  let currentOrcamento = null;
  let produtosWebsite = [];
  let precosPorProduto = {};
  let produtosEdit = [];
  let precarioEditAberto = false;
  let produtoEmEdicao = null; // ✅ Controlar qual produto está sendo editado
  let modoAtualDiversosEdit = false;

  // Dados para autocomplete
  let tiposData = [];
  let brandsData = [];
  let produtosDaMarca = [];
  let espessurasDisponiveis = [];

  // =====================================================
  // ✅ FUNÇÃO PARA NORMALIZAR ENTRADA DE NÚMEROS DECIMAIS
  // =====================================================
  function normalizeDecimalInput(value) {
    if (!value || value.trim() === "") return "";
    // Substituir vírgula por ponto
    return value.replace(",", ".");
  }

  // =====================================================
  // ✅ FORMATAÇÃO DE COMPRIMENTO E LARGURA (4 DECIMAIS)
  // =====================================================
  function formatarComprimentoLargura(input) {
    let valor = input.value.trim();
    if (!valor) return;
    
    // Substituir vírgula por ponto
    valor = normalizeDecimalInput(valor);
    
    // Converter para número
    const numero = parseFloat(valor);
    
    // Se for um número válido, formatar com 4 casas decimais
    if (!isNaN(numero) && numero >= 0) {
      input.value = numero.toFixed(4);
    }
  }

  // =====================================================
// ✅ EVENTOS DE FORMATAÇÃO PARA COMPRIMENTO E LARGURA
// =====================================================
editProdutoComprimento.addEventListener("blur", function() {
  formatarComprimentoLargura(this);
  calcularValoresEdit();
});

editProdutoLargura.addEventListener("blur", function() {
  formatarComprimentoLargura(this);
  calcularValoresEdit();
});

// Permitir entrada com vírgula durante digitação
editProdutoComprimento.addEventListener("input", function() {
  calcularValoresEdit();
});

editProdutoLargura.addEventListener("input", function() {
  calcularValoresEdit();
});

  // =====================================================
  // ✅ FUNÇÃO PARA MOSTRAR/ESCONDER BOTÃO CLEAR
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
  // ✅ EVENTOS CLEAR - TIPO
  // =====================================================
  editProdutoTipo.addEventListener("input", () => {
    toggleClearButton(editProdutoTipo, editClearTipo);
  });

  editClearTipo.addEventListener("click", (e) => {
    e.stopPropagation();
    editProdutoTipo.value = "";
    editProdutoTipoId.value = "";
    editClearTipo.classList.add("d-none");
    editProdutoTipo.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - MARCA
  // =====================================================
  editProdutoBrand.addEventListener("input", () => {
    toggleClearButton(editProdutoBrand, editClearBrand);
  });

  editClearBrand.addEventListener("click", (e) => {
    e.stopPropagation();
    editProdutoBrand.value = "";
    editProdutoBrandKey.value = "";
    editClearBrand.classList.add("d-none");
    
    editProdutoDescricao.value = "";
    editProdutoDescricaoId.value = "";
    editProdutoDescricao.disabled = true;
    editProdutoDescricao.placeholder = "Primeiro seleciona a marca...";
    editClearDescricao.classList.add("d-none");
    
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "";
    editProdutoEspessura.disabled = true;
    editProdutoEspessura.placeholder = "Primeiro seleciona a descrição...";
    editClearEspessura.classList.add("d-none");
    
    resetCamposDependentes();
    
    editProdutoBrand.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - DESCRIÇÃO
  // =====================================================
  editProdutoDescricao.addEventListener("input", () => {
    toggleClearButton(editProdutoDescricao, editClearDescricao);
  });

  editClearDescricao.addEventListener("click", (e) => {
    e.stopPropagation();
    editProdutoDescricao.value = "";
    editProdutoDescricaoId.value = "";
    editClearDescricao.classList.add("d-none");
    
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "";
    editProdutoEspessura.disabled = true;
    editProdutoEspessura.placeholder = "Primeiro seleciona a descrição...";
    editClearEspessura.classList.add("d-none");
    
    resetCamposDependentes();
    editProdutoDescricao.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - ESPESSURA
  // =====================================================
  editProdutoEspessura.addEventListener("input", () => {
    toggleClearButton(editProdutoEspessura, editClearEspessura);
  });

  editClearEspessura.addEventListener("click", (e) => {
    e.stopPropagation();
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "";
    editClearEspessura.classList.add("d-none");
    editProdutoPrecoMt2.value = "";
    calcularValoresEdit();
    editProdutoEspessura.focus();
  });

  // =====================================================
  // ✅ CONTROLE GLOBAL DE DROPDOWNS
  // =====================================================
  let allDropdowns = [];
  
  function closeAllDropdowns() {
    allDropdowns.forEach(dropdown => {
      dropdown.classList.remove("show");
      dropdown.innerHTML = "";
    });
  }

  // =====================================================
  // FUNÇÃO AUTOCOMPLETE GENÉRICA
  // =====================================================
  function setupAutocomplete(input, dropdown, data, onSelect, getDisplay = item => item.display, getValue = item => item.value, customFilter = null) {
    let currentFocus = -1;
    
    if (!allDropdowns.includes(dropdown)) {
      allDropdowns.push(dropdown);
    }
    
    const clearBtn = input.parentElement.querySelector('.input-clear-btn');
    
    function showOptions(filterValue = "") {
      closeAllDropdowns();
      
      const filtered = filterValue
  ? data.filter(item => customFilter
      ? customFilter(item, filterValue)
      : getDisplay(item).toLowerCase().includes(filterValue.toLowerCase()))
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
        
        div.addEventListener("click", function(e) {
          e.stopPropagation();
          input.value = getDisplay(item);
          onSelect(item);
          closeAllLists();
          
          if (clearBtn) {
            clearBtn.classList.remove("d-none");
          }
        });
        
        dropdown.appendChild(div);
      });
      
      dropdown.classList.add("show");
      currentFocus = -1;
    }
    
    input.addEventListener("click", function(e) {
      e.stopPropagation();
      if (input === editProdutoDescricao && modoAtualDiversosEdit) return;
      showOptions(this.value.trim());
    });

    input.addEventListener("focus", function(e) {
      if (input === editProdutoDescricao && modoAtualDiversosEdit) return;
      showOptions(this.value.trim());
    });

    input.addEventListener("input", function() {
      if (input === editProdutoDescricao && modoAtualDiversosEdit) return;
      const val = this.value.trim();
      showOptions(val);
      
      if (clearBtn) {
        toggleClearButton(input, clearBtn);
      }
    });
    input.addEventListener("keydown", function(e) {
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
    
    document.addEventListener("click", function(e) {
      if (e.target !== input && !dropdown.contains(e.target)) {
        closeAllLists();
      }
    });
  }

  // =====================================================
  // ✅ FUNÇÃO PARA VERIFICAR SE HÁ DADOS NO FORMULÁRIO
  // =====================================================
  function formularioTemDados() {
  return editProdutoTipo.value.trim() !== "" ||
         editProdutoBrand.value.trim() !== "" ||
         editProdutoDescricao.value.trim() !== "" ||
         editProdutoEspessura.value !== "" ||
         parseFloat(normalizeDecimalInput(editProdutoComprimento.value)) > 0 ||
         parseFloat(normalizeDecimalInput(editProdutoLargura.value)) > 0 ||
           parseFloat(editProdutoPrecoMt2.value) > 0 ||
           (parseFloat(editProdutoDesconto.value) > 0);
  }

  // =====================================================
  // ✅ VERIFICAR FORMULÁRIO AO FECHAR OFFCANVAS
  // =====================================================
  editOffcanvasEl.addEventListener('hide.bs.offcanvas', function (e) {
    if (formularioTemDados()) {
      e.preventDefault();
      e.stopPropagation();
      showMessage("⚠️ Ainda tem dados no formulário de adicionar produto! Use o botão 'Limpar Formulário' ou adicione o produto antes de fechar.", "warning");
      return false;
    } else {
      if (precarioEditAberto) {
        fecharPrecarioEdit();
      }
    }
  });

  // =====================================================
  // ✅ BOTÃO DE LIMPAR FORMULÁRIO
  // =====================================================
  btnLimparFormularioEdit.addEventListener("click", () => {
    limparCamposProdutoEdit();
    produtoEmEdicao = null;
    atualizarBotaoAdicionar();
    renderEditProdutosTable(); // ✅ Atualizar tabela para remover destaque
    showMessage("🧹 Formulário limpo", "info");
  });

  // =====================================================
  // ✅ BOTÃO CANCELAR EDIÇÃO
  // =====================================================
  btnCancelarEdicaoEdit.addEventListener("click", () => {
    limparCamposProdutoEdit();
    produtoEmEdicao = null;
    atualizarBotaoAdicionar();
    renderEditProdutosTable(); // ✅ Atualizar tabela para remover destaque
    showMessage("↩️ Edição cancelada", "info");
  });

  // =====================================================
  // FUNÇÕES DE CARREGAMENTO
  // =====================================================
  async function loadBrands() {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });
      if (error) throw error;
      
      data.forEach(brand => {
        brandMap[brand.website_key] = brand.display_name;
      });
      
      brandsData = data.map(brand => ({
        display: brand.display_name,
        value: brand.website_key,
        website_key: brand.website_key,
        display_name: brand.display_name
      }));
      
      setupAutocomplete(
        editProdutoBrand,
        editBrandDropdown,
        brandsData,
        async (item) => {
          editProdutoBrandKey.value = item.website_key;
          await carregarDescricoesDaMarca(item.website_key);
          setTimeout(() => editProdutoDescricao.focus(), 50);
        }
      );
      
    } catch (err) {
      console.error("Erro ao carregar brands:", err);
    }
  }

  async function loadTipos() {
    try {
      const { data, error } = await supabase
        .from("type_products")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (error) throw error;
      
      tiposMap = {};
      data.forEach(tipo => {
        tiposMap[tipo.id] = tipo.nome;
      });
      
      tiposData = data.map(tipo => ({
        display: tipo.nome,
        value: tipo.id,
        id: tipo.id,
        nome: tipo.nome
      }));
      
      setupAutocomplete(
        editProdutoTipo,
        editTipoDropdown,
        tiposData,
        (item) => {
          editProdutoTipoId.value = item.id;
          const isDiversos = item.nome.trim().toLowerCase() === "diversos";
          activarModoDiversosEdit(isDiversos);
          setTimeout(() => {
            if (isDiversos) {
              editProdutoDescricao.focus();
            } else {
              editProdutoBrand.focus();
            }
          }, 50);
        }
      );
      
    } catch (err) {
      console.error("Erro ao carregar tipos:", err);
    }
  }

  async function loadProdutosWebsite() {
    try {
      const { data, error } = await supabase
        .from("website")
        .select("id, Brand, Title_pt");
      if (error) throw error;
      produtosWebsite = data || [];
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  }

  // =====================================================
  // ✅ CARREGAR DESCRIÇÕES DA MARCA SELECIONADA
  // =====================================================
  async function carregarDescricoesDaMarca(brandKey) {
    editProdutoDescricao.value = "";
    editProdutoDescricaoId.value = "";
    editProdutoDescricao.disabled = false;
    editProdutoDescricao.placeholder = "Seleciona a descrição...";
    editClearDescricao.classList.add("d-none");
    
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "";
    editProdutoEspessura.disabled = true;
    editProdutoEspessura.placeholder = "Primeiro seleciona a descrição...";
    editClearEspessura.classList.add("d-none");
    
    resetCamposDependentes();

    produtosDaMarca = produtosWebsite.filter(p => p.Brand === brandKey).map(p => ({
      display: p.Title_pt,
      value: p.id,
      id: p.id,
      title: p.Title_pt
    }));

    if (produtosDaMarca.length === 0) {
      editProdutoDescricao.disabled = true;
      editProdutoDescricao.placeholder = "Nenhum produto disponível para esta marca";
      showMessage("⚠️ Nenhum produto disponível para esta marca", "warning");
      return;
    }

    setupAutocomplete(
      editProdutoDescricao,
      editDescricaoDropdown,
      produtosDaMarca,
      async (item) => {
        editProdutoDescricaoId.value = item.id;
        await carregarEspessuras(item.id);
        setTimeout(() => editProdutoEspessura.focus(), 50);
      }
    );
  }

  // =====================================================
  // ✅ CARREGAR ESPESSURAS (AUTOCOMPLETE)
  // =====================================================
async function carregarEspessuras(produtoId) {
  // Reset de campos
  editProdutoAcabamento.value = "";
  editProdutoAcabamento.disabled = true;
  editProdutoEspessura.value = "";
  editProdutoEspessuraValue.value = "";
  editProdutoEspessura.disabled = false;
  editProdutoEspessura.placeholder = "Seleciona a espessura...";
  
  editProdutoPrecoMt2.value = "";
  btnVerPrecarioEdit.classList.add("d-none");
  
  espessurasDisponiveis = [];

  try {
    const { data: thicknesses, error } = await supabase
      .from("product_thicknesses")
      .select("thickness, price_per_m2, type")
      .eq("website_item_id", produtoId)
      .order("thickness", { ascending: true });

    if (error) throw error;

    if (!thicknesses || thicknesses.length === 0) {
      editProdutoEspessura.disabled = true;
      return;
    }

    // Guardamos todos os dados para filtrar os acabamentos depois
    window.dadosDestaEspessura = thicknesses;

    // Criar lista de espessuras únicas para o primeiro dropdown
    const espessurasUnicas = [...new Set(thicknesses.map(t => t.thickness))];
    
    const listaParaAutocomplete = espessurasUnicas.map(e => ({
      display: `${e}mm`,
      value: e
    }));

    setupAutocomplete(
      editProdutoEspessura,
      editEspessuraDropdown,
      listaParaAutocomplete,
      (item) => {
        editProdutoEspessuraValue.value = item.value;
        prepararAcabamentos(item.value);
        setTimeout(() => editProdutoAcabamento.focus(), 50);
      },
      item => item.display,
      item => item.value,
      (item, filter) => {
        const num = filter.replace(/mm$/i, "").trim();
        return item.display.toLowerCase().startsWith(num.toLowerCase());
      }
    );

    btnVerPrecarioEdit.classList.remove("d-none");
  } catch (err) {
    console.error("Erro:", err);
  }
}

// Variável no topo do scope (junto às outras declarações de estado)
let acabamentoListenerController = null;

function prepararAcabamentos(espessuraSelecionada) {
  const acabamentosParaEstaEspessura = window.dadosDestaEspessura.filter(
    t => t.thickness == espessuraSelecionada
  );

  const ddAcabamento = document.getElementById("editAcabamentoDropdown");
  const clearBtn = document.getElementById("editClearAcabamento");

  // ─── Cancelar listeners anteriores ───
  if (acabamentoListenerController) {
    acabamentoListenerController.abort();
  }
  acabamentoListenerController = new AbortController();
  const signal = acabamentoListenerController.signal;

  // Reset visual
  editProdutoAcabamento.value = "";
  editProdutoAcabamento.disabled = false;
  editProdutoAcabamento.readOnly = false;
  editProdutoAcabamento.style.cursor = "text";
  editProdutoAcabamento.placeholder = "Selecione o acabamento...";
  if (clearBtn) clearBtn.classList.add("d-none");
  ddAcabamento.classList.remove("show");
  ddAcabamento.innerHTML = "";

  const listaAcabamentos = acabamentosParaEstaEspessura.map(a => ({
    display: a.type,
    value: a.type,
    price: a.price_per_m2
  }));

  function abrirDropdown(e) {
    e.stopPropagation();
    closeAllDropdowns();
    const filterVal = editProdutoAcabamento.value.trim().toLowerCase();
    const filtered = filterVal
      ? listaAcabamentos.filter(a => a.display.toLowerCase().includes(filterVal))
      : listaAcabamentos;
    ddAcabamento.innerHTML = "";

    filtered.forEach((a, idx) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item" + (idx === 0 ? " autocomplete-active" : "");
      div.textContent = a.display;
      div.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        editProdutoAcabamento.value = a.display;
        if (clearBtn) clearBtn.classList.remove("d-none");
        calcularValoresEdit();
        ddAcabamento.classList.remove("show");
        ddAcabamento.innerHTML = "";
        setTimeout(() => editProdutoQuantidade.focus(), 50);
      });
      ddAcabamento.appendChild(div);
    });

    ddAcabamento.classList.add("show");
  }

  editProdutoAcabamento.addEventListener("click", abrirDropdown, { signal });
  editProdutoAcabamento.addEventListener("focus", abrirDropdown, { signal });
  editProdutoAcabamento.addEventListener("input", abrirDropdown, { signal });
  editProdutoAcabamento.addEventListener("keydown", (e) => {
    const items = ddAcabamento.querySelectorAll(".autocomplete-item");
    if (!items.length) return;
    const current = ddAcabamento.querySelector(".autocomplete-active");
    let idx = Array.from(items).indexOf(current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < items.length - 1) idx++;
      else idx = 0;
      items.forEach(i => i.classList.remove("autocomplete-active"));
      items[idx].classList.add("autocomplete-active");
      items[idx].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) idx--;
      else idx = items.length - 1;
      items.forEach(i => i.classList.remove("autocomplete-active"));
      items[idx].classList.add("autocomplete-active");
      items[idx].scrollIntoView({ block: "nearest" });
    }
  }, { signal });
  editProdutoAcabamento.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Se há opção destacada no dropdown, selecionar primeiro
      const activeItem = ddAcabamento.querySelector(".autocomplete-active");
      if (activeItem) {
        activeItem.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        return;
      }
      // Se só há um item visível, selecionar esse
      const items = ddAcabamento.querySelectorAll(".autocomplete-item");
      if (items.length === 1) {
        items[0].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        return;
      }
      // Sem dropdown aberto — avançar direto para quantidade
      ddAcabamento.classList.remove("show");
      ddAcabamento.innerHTML = "";
      setTimeout(() => editProdutoQuantidade.focus(), 50);
    }
  }, { signal });

  // Se só há um acabamento, seleccionar automaticamente e avançar
  if (listaAcabamentos.length === 1) {
    editProdutoAcabamento.value = listaAcabamentos[0].display;
    if (clearBtn) clearBtn.classList.remove("d-none");
    calcularValoresEdit();
    setTimeout(() => editProdutoQuantidade.focus(), 50);
  }
}

  // =====================================================
  // ✅ RESETAR CAMPOS DEPENDENTES
  // =====================================================
  function resetCamposDependentes() {
    espessurasDisponiveis = [];
    editProdutoPrecoMt2.value = "";
    btnVerPrecarioEdit.classList.add("d-none");
    if (precarioEditAberto) {
      fecharPrecarioEdit();
    }
  }

  function activarModoDiversosEdit(ativo) {
  modoAtualDiversosEdit = ativo;

  editDescricaoDropdown.classList.remove("show");
  editDescricaoDropdown.innerHTML = "";

  const colMarca = editProdutoBrand.closest(".col-md-3");
  const colEspessura = editProdutoEspessura.closest("[class*='col-']");
  const colComprimento = editProdutoComprimento.closest(".col-md-2");
  const colLargura = editProdutoLargura.closest(".col-md-2");
  const colAcabamento = editProdutoAcabamento.closest(".col-md-2");

  if (ativo) {
    editProdutoDescricao.disabled = false;
    editProdutoDescricao.placeholder = "Descreve o artigo...";
    editProdutoDescricaoId.value = "diversos";

    if (colMarca) colMarca.classList.add("d-none");
    if (colEspessura) colEspessura.classList.add("d-none");
    if (colComprimento) colComprimento.classList.add("d-none");
    if (colLargura) colLargura.classList.add("d-none");
if (colAcabamento) colAcabamento.classList.add("d-none");
editProdutoAcabamento.value = "";
editProdutoAcabamento.disabled = true;

    editProdutoBrand.value = "";
    editProdutoBrandKey.value = "diversos";
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "0";
    editProdutoComprimento.value = "";
    editProdutoLargura.value = "";

    btnVerPrecarioEdit.classList.add("d-none");

  } else {
    if (colMarca) colMarca.classList.remove("d-none");
    if (colEspessura) colEspessura.classList.remove("d-none");
    if (colComprimento) colComprimento.classList.remove("d-none");
    if (colLargura) colLargura.classList.remove("d-none");
  if (colAcabamento) colAcabamento.classList.remove("d-none");



    editProdutoBrand.disabled = false;

    // ✅ ADICIONAR ESTAS LINHAS
    editProdutoDescricao.value = "";
    editProdutoDescricaoId.value = "";
    editClearDescricao.classList.add("d-none");

    editProdutoDescricao.disabled = true;
    editProdutoDescricao.placeholder = "Primeiro seleciona a marca...";
    editProdutoDescricaoId.value = "";
    editProdutoBrand.value = "";
    editProdutoBrandKey.value = "";

    editProdutoEspessura.disabled = true;
    editProdutoEspessura.value = "";
    editProdutoEspessuraValue.value = "";

    editProdutoComprimento.disabled = false;
    editProdutoComprimento.value = "";
    editProdutoLargura.disabled = false;
    editProdutoLargura.value = "";
  }
  calcularValoresEdit();
}

  // =====================================================
  // ✅ VALIDAÇÃO DO CAMPO DESCONTO EDIT
  // =====================================================
  editProdutoDesconto.addEventListener("input", (e) => {
    let valor = parseFloat(e.target.value);
    
    if (valor > 100) {
      e.target.value = e.target.dataset.lastValid || "0";
      return;
    }
    
    if (valor < 0) {
      e.target.value = "0";
      e.target.dataset.lastValid = "0";
      return;
    }
    
    if (!isNaN(valor)) {
      e.target.dataset.lastValid = e.target.value;
    }
    
    calcularValoresEdit();
  });

  function calcularValoresEdit() {
  const qtd = parseInt(editProdutoQuantidade.value) || 0;
  const isDiversos = editProdutoTipoId.value !== "" &&
    editProdutoTipo.value.trim().toLowerCase() === "diversos";

  let compM, largM;
  if (isDiversos) {
    compM = 1;
    largM = 1;
  } else {
    compM = parseFloat(normalizeDecimalInput(editProdutoComprimento.value)) || 0;
    largM = parseFloat(normalizeDecimalInput(editProdutoLargura.value)) || 0;
  }
    const precoMt2 = parseFloat(editProdutoPrecoMt2.value) || 0;
    let desconto = parseFloat(editProdutoDesconto.value) || 0;
    
    if (desconto < 0) desconto = 0;
    if (desconto > 100) desconto = 100;
    
    const mt2 = qtd * compM * largM;
    editProdutoMt2.value = mt2.toFixed(4);
    
    const fatorDesconto = 1 - (desconto / 100);
    const subtotal = compM * largM * precoMt2 * fatorDesconto;
    editProdutoSubtotal.value = subtotal > 0 ? subtotal.toFixed(2) : "0.00";
    
    const total = subtotal * qtd;
    editProdutoTotal.value = total > 0 ? total.toFixed(2) : "0.00";
  }

  editProdutoQuantidade.addEventListener("input", calcularValoresEdit);
  editProdutoComprimento.addEventListener("input", calcularValoresEdit);
  editProdutoLargura.addEventListener("input", calcularValoresEdit);
  editProdutoPrecoMt2.addEventListener("input", calcularValoresEdit);
  editProdutoDesconto.addEventListener("focus", function() {
    this.select();
  });

  editProdutoQuantidade.addEventListener("focus", function() {
    this.select();
  });

  editProdutoDescricao.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && modoAtualDiversosEdit) {
      e.preventDefault();
      setTimeout(() => editProdutoQuantidade.focus(), 50);
    }
  });

  // Navegação por Enter
  // Navegação por Enter
  editProdutoQuantidade.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (modoAtualDiversosEdit) {
        editProdutoPrecoMt2.focus();
      } else {
        editProdutoComprimento.focus();
      }
    }
  });
  editProdutoComprimento.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); editProdutoLargura.focus(); }
  });
  editProdutoLargura.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); editProdutoPrecoMt2.focus(); }
  });
  editProdutoPrecoMt2.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); editProdutoDesconto.focus(); }
  });
  editProdutoDesconto.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); btnAdicionarProdutoEdit.click(); }
  });

  btnVerPrecarioEdit.addEventListener("click", () => {
    if (precarioEditAberto) {
      fecharPrecarioEdit();
    } else {
      abrirPrecarioEdit();
    }
  });

  btnFecharPrecarioEdit.addEventListener("click", () => {
    fecharPrecarioEdit();
  });

  function abrirPrecarioEdit() {
  const produtoId = editProdutoDescricaoId.value;
  
  if (!produtoId || !window.dadosDestaEspessura || window.dadosDestaEspessura.length === 0) {
    showMessage("⚠️ Seleciona uma descrição primeiro", "warning");
    return;
  }

  const descricaoTexto = editProdutoDescricao.value;
  precarioTituloEdit.textContent = descricaoTexto;
  precarioTableBodyEdit.innerHTML = "";

  // Agrupar por espessura
  const agrupado = {};
  window.dadosDestaEspessura.forEach(t => {
    if (!agrupado[t.thickness]) agrupado[t.thickness] = [];
    agrupado[t.thickness].push({ type: t.type, price: t.price_per_m2 });
  });

  Object.keys(agrupado)
    .sort((a, b) => a - b)
    .forEach(thickness => {
      agrupado[thickness].forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${thickness}mm</strong> ${item.type ? `${item.type}` : ""}</td>
          <td class="text-end">${parseFloat(item.price).toFixed(2)} €</td>
        `;
        precarioTableBodyEdit.appendChild(tr);
      });
    });

  precarioModalEdit.classList.remove("d-none");
  precarioEditAberto = true;
  btnVerPrecarioEdit.innerHTML = '<i class="bi bi-x-circle me-2"></i>Fechar Preçário';
  btnVerPrecarioEdit.style.backgroundColor = "#dc3545";
}

  function fecharPrecarioEdit() {
    precarioModalEdit.classList.add("closing");
    setTimeout(() => {
      precarioModalEdit.classList.add("d-none");
      precarioModalEdit.classList.remove("closing");
      precarioEditAberto = false;
      btnVerPrecarioEdit.innerHTML = '<i class="bi bi-table me-2"></i>Ver Preçário';
      btnVerPrecarioEdit.style.backgroundColor = "#5b899f";
    }, 300);
  }

  // =====================================================
  // PAGINAÇÃO E FILTROS
  // =====================================================
  
  function resetAndLoad() {
    currentPage = 1;
    loadData();
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  filtroReferencia.addEventListener("input", debounce(resetAndLoad, 400));
  filtroCliente.addEventListener("input", debounce(resetAndLoad, 400));
  filtroProduto.addEventListener("input", debounce(resetAndLoad, 400));

  itemsPerPageSelect.addEventListener("change", () => {
    itemsPerPage = parseInt(itemsPerPageSelect.value);
    localStorage.setItem(storageKey, itemsPerPage);
    resetAndLoad();
  });

  btnLimpar.addEventListener("click", () => {
    filtroReferencia.value = "";
    filtroCliente.value = "";
    filtroProduto.value = "";
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

  async function loadData() {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      let query = supabase
        .from("orcamentos")
.select(`
  *,
  clientes (
    descricao,
    descricao2,
    morada,
    morada2,
    codpostal,
    contribuinte
  )
`, { count: "exact" })
        .order("id", { ascending: false });
      if (filtroReferencia.value) {
        query = query.eq("id", parseInt(filtroReferencia.value) || 0);
      }
      if (filtroCliente.value) {
        query = query.ilike("cliente_nome", `%${filtroCliente.value}%`);
      }
      const { data: allOrcamentos, error } = await query;
      if (error) throw error;
      let orcamentosComItens = await Promise.all(
        (allOrcamentos || []).map(async (orcamento) => {
          const { data: itens } = await supabase
            .from("orcamento_itens")
            .select("*")
            .eq("orcamento_id", orcamento.id)
            .order("id", { ascending: true });
          return {
            ...orcamento,
            itens: itens || []
          };
        })
      );
      if (filtroProduto.value) {
        const termoProduto = filtroProduto.value
          .toLowerCase()
          .replace(/-/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        orcamentosComItens = orcamentosComItens.filter(orc => {
          return orc.itens.some(item => {
            const brandName = brandMap[item.brand] || formatBrand(item.brand);
            const descricaoCompleta = `${brandName} ${item.descricao}`
              .toLowerCase()
              .replace(/-/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            return descricaoCompleta.includes(termoProduto);
          });
        });
      }
      totalItems = orcamentosComItens.length;
      const orcamentosPaginados = orcamentosComItens.slice(from, to + 1);
      renderTable(orcamentosPaginados);
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

  function renderTable(orcamentos) {
    if (!orcamentos.length) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhum orçamento encontrado</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    orcamentos.forEach((orc) => {
      const tr = document.createElement("tr");
      tr.dataset.id = orc.id;
      const data = new Date(orc.data_criacao);
      const dataFormatada = data.toLocaleDateString("pt-PT");
      let descricaoProdutos = "";
      if (orc.itens && orc.itens.length > 0) {
        descricaoProdutos = orc.itens
  .map(item => {
    const isDiversos = item.brand === "diversos" || item.espessura === 0;
    if (isDiversos) {
      return `<span class="produto-badge">${item.descricao}</span>`;
    }
    const brandName = brandMap[item.brand] || formatBrand(item.brand);
   const acabamento = item.type ? ` ${item.type}` : "";
return `<span class="produto-badge"><b>${brandName}</b> - ${item.descricao}${acabamento}</span>`;
  })
  .join(" ");
      } else {
        descricaoProdutos = '<span class="text-muted">Sem produtos</span>';
      }
      tr.innerHTML = `
        <td><strong>${orc.id}</strong></td>
       <td>
        ${orc.clientes 
          ? `${orc.clientes.descricao}`
          : orc.cliente_nome}
      </td>
        <td>
          <div class="produto-descricao">
            ${descricaoProdutos}
          </div>
        </td>
        <td><strong>${parseFloat(orc.total_geral).toFixed(2)} €</strong></td>
        <td>${dataFormatada}</td>
        <td>
          <button class="btn btn-sm btn-view" title="Ver Completo" data-id="${orc.id}">
            <i class="bi bi-eye"></i> Ver
          </button>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-secondary me-1" title="Duplicar" data-id="${orc.id}">
            <i class="bi bi-back"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary me-1" title="Editar" data-id="${orc.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" title="Eliminar" data-id="${orc.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updatePagination() {
    const maxPage = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    pageIndicator.textContent = `${currentPage} / ${maxPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPage;
    prevPageBtn.parentElement.classList.toggle("disabled", currentPage === 1);
    nextPageBtn.parentElement.classList.toggle("disabled", currentPage === maxPage);
  }

  tbody.addEventListener("click", async (e) => {
    if (e.target.closest(".btn-view")) {
      const orcamentoId = e.target.closest(".btn-view").dataset.id;
      await mostrarOrcamentoCompleto(orcamentoId);
    } else if (e.target.closest("button[title='Editar']")) {
      const orcamentoId = e.target.closest("button[title='Editar']").dataset.id;
      await abrirEdicaoOrcamento(orcamentoId);
    }
  });

  async function mostrarOrcamentoCompleto(orcamentoId) {
    try {
      const { data: orcamento, error: orcError } = await supabase
        .from("orcamentos")
        .select(`
          *,
          clientes (
            descricao,
            descricao2,
            morada,
            morada2,
            codpostal,
            contribuinte
          )
        `)
        .eq("id", orcamentoId)
        .single();
      if (orcError) throw orcError;
      const { data: itens, error: itensError } = await supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .order("id", { ascending: true });
      if (itensError) throw itensError;
      currentOrcamento = { ...orcamento, itens: itens || [] };
      document.getElementById("viewRefPrint").textContent = `${orcamento.id}`;
      const cliente = orcamento.clientes;

if (cliente) {
  const linhas = [];
  const estiloLinha = 'font-size: 11px; color: #000;'; // ← substitui pelos valores reais do teu CSS
  if (cliente.descricao) linhas.push(`<strong style="color: #000;">${cliente.descricao}</strong>`);
  if (cliente.descricao2)   linhas.push(`<span style="${estiloLinha}">${cliente.descricao2}</span>`);
  if (cliente.morada)       linhas.push(`<span style="${estiloLinha}">${cliente.morada}</span>`);
  const localidade = [cliente.codpostal, cliente.morada2].filter(Boolean).join(' ');
  if (localidade)           linhas.push(`<span style="${estiloLinha}">${localidade}</span>`);
  if (cliente.contribuinte) linhas.push(`<span style="${estiloLinha}">${cliente.contribuinte}</span>`);
  document.getElementById("viewClientePrint").innerHTML = linhas.join('<br>');
} else {
  document.getElementById("viewClientePrint").textContent = orcamento.cliente_nome;
}
      const data = new Date(orcamento.data_criacao);
      document.getElementById("viewDataPrint").innerHTML = 
  `<strong>${data.toLocaleDateString("pt-PT")}</strong>`;
      const viewProdutosBodyPrint = document.getElementById("viewProdutosBodyPrint");
      viewProdutosBodyPrint.innerHTML = "";
      
      let descontoTotal = 0;
      if (itens && itens.length > 0) {
        itens.forEach(item => {
  const tipoNome = tiposMap[item.tipo_id] || `Tipo ${item.tipo_id}`;
  const isDiversos = item.brand === "diversos" || item.espessura === 0;
  const brandName = isDiversos ? "" : (brandMap[item.brand] || formatBrand(item.brand));

  const precoSemDesconto = item.quantidade * item.comprimento * item.largura * item.preco_mt2;
  const descontoItem = Math.max(0, precoSemDesconto - item.total);
  descontoTotal += descontoItem;

  let descontoFormatado;
  if (item.desconto_percentagem && item.desconto_percentagem > 0) {
    const valorDescontado = (item.quantidade * item.comprimento * item.largura * item.preco_mt2) - item.total;
    descontoFormatado = `${item.desconto_percentagem.toFixed(2)}% <span style="font-size: 8px;">[${Math.max(0, valorDescontado).toFixed(2)} €]</span>`;
  } else {
    descontoFormatado = '0.00%';
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${tipoNome}</td>
    <td>${isDiversos ? item.descricao : brandName + " - " + item.descricao + (item.type ? " " + item.type : "")}</td>


    <td>${item.quantidade}</td>
    <td>${isDiversos ? "" : item.comprimento.toFixed(4)}</td>
    <td>${isDiversos ? "" : item.largura.toFixed(4)}</td>
    <td>${isDiversos ? "" : item.espessura}</td>
    <td>${isDiversos ? Number(item.quantidade).toFixed(4) : item.mt2.toFixed(4)}</td>
    <td>${item.preco_mt2.toFixed(2)} €</td>
    <td>${descontoFormatado}</td>
    <td>${item.subtotal.toFixed(2)} €</td>
    <td>${item.total.toFixed(2)} €</td>
  `;
  viewProdutosBodyPrint.appendChild(tr);
});
      } else {
        viewProdutosBodyPrint.innerHTML = `<tr><td colspan="11">Sem produtos</td></tr>`;
      }
      
      const totalGeral = parseFloat(orcamento.total_geral);
      const subtotalSemIVA = totalGeral / 1.23;
      const valorIVA = totalGeral - subtotalSemIVA;
      
      document.getElementById("viewDescontoTotal").textContent = Math.max(0, descontoTotal).toFixed(2) + " €";
      document.getElementById("viewSubtotalSemIVA").textContent = subtotalSemIVA.toFixed(2) + " €";
      document.getElementById("viewValorIVA").textContent = valorIVA.toFixed(2) + " €";
      document.getElementById("viewTotalGeralPrint").textContent = totalGeral.toFixed(2) + " €";
      const viewOffcanvas = new bootstrap.Offcanvas(document.getElementById("viewOffcanvas"));
      viewOffcanvas.show();
    } catch (err) {
      console.error("Erro ao carregar orçamento:", err);
      showMessage("❌ Erro ao carregar orçamento: " + err.message, "danger");
    }
  }

  async function abrirEdicaoOrcamento(orcamentoId) {
    try {
      const { data: orcamento, error: orcError } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("id", orcamentoId)
        .single();
      if (orcError) throw orcError;
      const { data: itens, error: itensError } = await supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", orcamentoId)
        .order("id", { ascending: true });
      if (itensError) throw itensError;
      editOrcamentoId.value = orcamento.id;
      editClienteNome.value = orcamento.cliente_nome;
      produtosEdit = (itens || []).map(item => {
      const isDiversos = item.brand === "diversos" || item.espessura === 0;
      return {
        id: item.id,
        isDiversos: isDiversos,
        tipo_id: item.tipo_id,
        tipoNome: tiposMap[item.tipo_id] || `Tipo ${item.tipo_id}`,
        brand: item.brand,
        brandNome: isDiversos ? "" : (brandMap[item.brand] || formatBrand(item.brand)),
        descricao: item.descricao,
        quantidade: item.quantidade,
        comprimento: item.comprimento,
        largura: item.largura,
        espessura: item.espessura,
        mt2: item.mt2,
        preco_mt2: item.preco_mt2,
        desconto_percentagem: item.desconto_percentagem || 0,
        subtotal: item.subtotal,
        total: item.total,
        type: item.type || null,
        isNew: false
      };
    });
      renderEditProdutosTable();
      limparCamposProdutoEdit();
      produtoEmEdicao = null;
      atualizarBotaoAdicionar();
      editOffcanvas.show();
    } catch (err) {
      console.error("Erro ao carregar orçamento para edição:", err);
      showMessage("❌ Erro ao carregar orçamento: " + err.message, "danger");
    }
  }

  // =====================================================
  // ✅ FUNÇÃO PARA ATUALIZAR O BOTÃO ADICIONAR/ATUALIZAR E CANCELAR
  // =====================================================
  function atualizarBotaoAdicionar() {
    const legendElement = document.querySelector('#editOffcanvas fieldset:last-of-type legend');

    if (produtoEmEdicao !== null) {
      // ✅ MODO EDIÇÃO
      btnAdicionarProdutoEdit.innerHTML = '<i class="bi bi-check-square me-2"></i>Atualizar Produto';
      btnAdicionarProdutoEdit.style.backgroundColor = "#ffc107"; // Amarelo para indicar edição
      btnCancelarEdicaoEdit.classList.remove("d-none"); // ✅ MOSTRAR BOTÃO CANCELAR
      btnLimparFormularioEdit.classList.add("d-none"); // ✅ ESCONDER BOTÃO LIMPAR

      if (legendElement) {
      legendElement.textContent = "Editar Produto";
    }

    } else {
      // ✅ MODO ADICIONAR
      btnAdicionarProdutoEdit.innerHTML = '<i class="bi bi-plus-square me-2"></i>Adicionar Produto';
      btnAdicionarProdutoEdit.style.backgroundColor = ""; // Cor padrão
      btnCancelarEdicaoEdit.classList.add("d-none"); // ✅ ESCONDER BOTÃO CANCELAR
      btnLimparFormularioEdit.classList.remove("d-none"); // ✅ MOSTRAR BOTÃO LIMPAR

      if (legendElement) {
      legendElement.textContent = "Adicionar Novo Produto";
    }
    }
  }

  // =====================================================
  // ✅ RENDERIZAR TABELA DE PRODUTOS (COM BOTÃO EDITAR)
  // =====================================================
  function renderEditProdutosTable() {
    if (produtosEdit.length === 0) {
      editProdutosTableBody.innerHTML = `
        <tr>
          <td colspan="13" class="text-muted" style="background-color: #eeeeef; border-color: #cbccce;">Nenhum produto adicionado</td>
        </tr>
      `;
      editTotalGeral.textContent = "0.00 €";
      return;
    }
    editProdutosTableBody.innerHTML = "";
    let totalGeral = 0;
    produtosEdit.forEach((produto, index) => {
      totalGeral += produto.total;
      const tr = document.createElement("tr");
      tr.className = "produto-row";
      if (produto.isNew) {
        tr.classList.add("row-updated");
      }
      
      // ✅ Destacar produto em edição
      if (produtoEmEdicao === index) {
        tr.style.backgroundColor = "#fff3cd"; // Amarelo claro
      }
      
      tr.innerHTML = `
        <td>${produto.tipoNome}</td>  
        <td>${produto.isDiversos ? "" : produto.brandNome}</td>
       <td>${produto.descricao}${produto.type ? ` ${produto.type}` : ""}</td>


        <td>${produto.quantidade}</td>
        <td>${produto.isDiversos ? "" : produto.comprimento.toFixed(4)}</td>
        <td>${produto.isDiversos ? "" : produto.largura.toFixed(4)}</td>
        <td>${produto.isDiversos ? "" : produto.espessura + "mm"}</td>
        <td>${produto.isDiversos ? Number(produto.quantidade).toFixed(4) : produto.mt2.toFixed(4)}</td>
        <td>${produto.preco_mt2.toFixed(2)} €</td>
        <td>${produto.desconto_percentagem.toFixed(2)}%</td>
        <td>${produto.subtotal.toFixed(2)} €</td>
        <td>${produto.total.toFixed(2)} €</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-primary me-1" title="Editar produto" data-index="${index}">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" title="Remover produto" data-index="${index}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      editProdutosTableBody.appendChild(tr);
    });
    editTotalGeral.textContent = totalGeral.toFixed(2) + " €";
  }

  // =====================================================
  // ✅ EVENTO DE CLIQUE NA TABELA DE PRODUTOS (EDITAR E REMOVER)
  // =====================================================
  editProdutosTableBody.addEventListener("click", async (e) => {
    // ✅ BOTÃO EDITAR
    if (e.target.closest(".btn-outline-primary")) {
      const index = parseInt(e.target.closest(".btn-outline-primary").dataset.index);
      await carregarProdutoParaEdicao(index);
    }
    
    // ✅ BOTÃO REMOVER
    if (e.target.closest(".btn-outline-danger")) {
      const index = parseInt(e.target.closest(".btn-outline-danger").dataset.index);
      
      // Se estiver editando este produto, cancelar edição
      if (produtoEmEdicao === index) {
        limparCamposProdutoEdit();
        produtoEmEdicao = null;
        atualizarBotaoAdicionar();
      }
      
      produtosEdit.splice(index, 1);
      
      // Ajustar índice se necessário
      if (produtoEmEdicao !== null && produtoEmEdicao > index) {
        produtoEmEdicao--;
      } else if (produtoEmEdicao === index) {
        produtoEmEdicao = null;
      }
      
      renderEditProdutosTable();
      showMessage("🗑️ Produto removido", "info");
    }
  });

  // =====================================================
  // ✅ CARREGAR PRODUTO PARA EDIÇÃO
  // =====================================================
  async function carregarProdutoParaEdicao(index) {
    const produto = produtosEdit[index];
    
    // Preencher campos básicos
    editProdutoTipo.value = produto.tipoNome;
    editProdutoTipoId.value = produto.tipo_id; // ← ANTES do activar

    const isDiversos = produto.tipoNome.trim().toLowerCase() === "diversos";
    activarModoDiversosEdit(isDiversos);

    editProdutoTipoId.value = produto.tipo_id; // ← TAMBÉM DEPOIS (activar pode limpar)
    toggleClearButton(editProdutoTipo, editClearTipo);

if (isDiversos) {
  // Só preencher a descrição livre — tudo o resto já foi tratado pelo activarModoDiversosEdit
  editProdutoDescricao.value = produto.descricao;
  toggleClearButton(editProdutoDescricao, editClearDescricao);
} else {
  editProdutoBrand.value = produto.brandNome;
  editProdutoBrandKey.value = produto.brand;
  toggleClearButton(editProdutoBrand, editClearBrand);

  await carregarDescricoesDaMarca(produto.brand);

  editProdutoDescricao.value = produto.descricao;
  editProdutoDescricaoId.value = "";
  toggleClearButton(editProdutoDescricao, editClearDescricao);


  const produtoWebsite = produtosWebsite.find(p =>
  p.Brand === produto.brand && p.Title_pt === produto.descricao
);

if (produtoWebsite) {
  editProdutoDescricaoId.value = produtoWebsite.id;
  await carregarEspessuras(produtoWebsite.id);
}

editProdutoEspessura.value = `${produto.espessura}mm`;
editProdutoEspessuraValue.value = produto.espessura;
toggleClearButton(editProdutoEspessura, editClearEspessura);

// ─── Chamar prepararAcabamentos com a espessura do produto ───
prepararAcabamentos(produto.espessura);

// ─── Preencher acabamento APÓS prepararAcabamentos ───
if (produto.type) {
  editProdutoAcabamento.value = produto.type;
  editProdutoAcabamento.disabled = false;
  const clearAcab = document.getElementById("editClearAcabamento");
  if (clearAcab) clearAcab.classList.remove("d-none");
}


}
    
    // Preencher campos numéricos
    editProdutoQuantidade.value = produto.quantidade;
    editProdutoComprimento.value = produto.comprimento.toFixed(4);
    editProdutoLargura.value = produto.largura.toFixed(4);
    editProdutoPrecoMt2.value = produto.preco_mt2;
    editProdutoDesconto.value = produto.desconto_percentagem;
    
    // Calcular valores
    calcularValoresEdit();
    
    // Marcar produto em edição
    produtoEmEdicao = index;
    atualizarBotaoAdicionar();
    renderEditProdutosTable();
    
    // Scroll para o formulário
    document.querySelector('fieldset legend:contains("Adicionar Novo Produto")') || 
    document.querySelector('#btnAdicionarProdutoEdit').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    showMessage("✏️ Produto carregado para edição. Altere os campos e clique em 'Atualizar Produto'", "info");
  }

  // =====================================================
  // ✅ BOTÃO ADICIONAR/ATUALIZAR PRODUTO
  // =====================================================
  btnAdicionarProdutoEdit.addEventListener("click", () => {
    // Validações
     const compM = parseFloat(normalizeDecimalInput(editProdutoComprimento.value));
  const largM = parseFloat(normalizeDecimalInput(editProdutoLargura.value));
  

   const isDiversosEdit = editProdutoTipo.value.trim().toLowerCase() === "diversos";

if (isDiversosEdit) {
  if (!editProdutoDescricao.value.trim()) {
    showMessage("⚠️ Escreve a descrição do artigo", "warning");
    return;
  }
} else {
  if (!editProdutoBrandKey.value) {
    showMessage("⚠️ Seleciona a marca", "warning");
    return;
  }
  if (!editProdutoDescricao.value) {
    showMessage("⚠️ Seleciona a descrição", "warning");
    return;
  }
  if (!editProdutoEspessuraValue.value) {
    showMessage("⚠️ Seleciona a espessura", "warning");
    return;
  }
  if (!compM || compM <= 0) {
    showMessage("⚠️ Comprimento deve ser maior que zero", "warning");
    return;
  }
  if (!largM || largM <= 0) {
    showMessage("⚠️ Largura deve ser maior que zero", "warning");
    return;
  }
}
    if (!editProdutoPrecoMt2.value || editProdutoPrecoMt2.value <= 0) {
      showMessage("⚠️ Preço/m² deve ser maior que zero", "warning");
      return;
    }
    
    const produto = {
  id: produtoEmEdicao !== null ? produtosEdit[produtoEmEdicao].id : null,
  isDiversos: isDiversosEdit,
  tipo_id: parseInt(editProdutoTipoId.value),
  tipoNome: editProdutoTipo.value,
  brand: isDiversosEdit ? "" : editProdutoBrandKey.value,
  brandNome: isDiversosEdit ? "" : editProdutoBrand.value,
  descricao: editProdutoDescricao.value,
  quantidade: parseInt(editProdutoQuantidade.value),
  comprimento: isDiversosEdit ? 1 : compM,
  largura: isDiversosEdit ? 1 : largM,
  espessura: isDiversosEdit ? null : parseInt(editProdutoEspessuraValue.value),
type: isDiversosEdit ? null : (editProdutoAcabamento.value || null),
  mt2: parseFloat(editProdutoMt2.value),
  preco_mt2: parseFloat(editProdutoPrecoMt2.value),
  desconto_percentagem: parseFloat(editProdutoDesconto.value) || 0,
  subtotal: parseFloat(editProdutoSubtotal.value),
  total: parseFloat(editProdutoTotal.value),
  isNew: produtoEmEdicao === null ? true : produtosEdit[produtoEmEdicao].isNew
};
    
    if (produtoEmEdicao !== null) {
      // ✅ ATUALIZAR produto existente
      produtosEdit[produtoEmEdicao] = produto;
      showMessage("✅ Produto atualizado!", "success");
      produtoEmEdicao = null;
    } else {
      // ✅ ADICIONAR novo produto
      produtosEdit.push(produto);
      showMessage("✅ Produto adicionado!", "success");
    }
    
    renderEditProdutosTable();
    limparCamposProdutoEdit();
    atualizarBotaoAdicionar();
  });

  // =====================================================
  // ✅ LIMPAR CAMPOS DO PRODUTO
  // =====================================================
  function limparCamposProdutoEdit() {
    editProdutoTipo.value = "";
    editProdutoTipoId.value = "";
    editClearTipo.classList.add("d-none");
    
    editProdutoBrand.value = "";
    editProdutoBrandKey.value = "";
    editClearBrand.classList.add("d-none");
    
    editProdutoDescricao.value = "";
    editProdutoDescricao.disabled = true;
    editProdutoDescricao.placeholder = "Primeiro seleciona a marca...";
    editProdutoDescricaoId.value = "";
    editClearDescricao.classList.add("d-none");
    
    editProdutoEspessura.value = "";
    editProdutoEspessura.disabled = true;
    editProdutoEspessura.placeholder = "Primeiro seleciona a descrição...";
    editProdutoEspessuraValue.value = "";
    editClearEspessura.classList.add("d-none");
    espessurasDisponiveis = [];
    
    editProdutoAcabamento.value = "";
editProdutoAcabamento.disabled = true;

    editProdutoQuantidade.value = 1;
    editProdutoComprimento.value = "";
    editProdutoLargura.value = "";
    editProdutoMt2.value = "";
    editProdutoPrecoMt2.value = "";
    editProdutoDesconto.value = "0";
    editProdutoDesconto.dataset.lastValid = "0";
    editProdutoSubtotal.value = "";
    editProdutoTotal.value = "";
    
    btnVerPrecarioEdit.classList.add("d-none");
    if (precarioEditAberto) {
      fecharPrecarioEdit();
    }

    activarModoDiversosEdit(false);
  }

  // =====================================================
  // GUARDAR ALTERAÇÕES DO ORÇAMENTO
  // =====================================================
  orcamentoEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Verificar se há produto em edição não guardado
    if (produtoEmEdicao !== null) {
      showMessage("⚠️ Tem um produto em edição! Clique em 'Atualizar Produto' ou 'Cancelar Edição' antes de guardar.", "warning");
      return;
    }
    
    if (!editClienteNome.value.trim()) {
      showMessage("⚠️ Digite o nome do cliente", "warning");
      editClienteNome.focus();
      return;
    }
    if (produtosEdit.length === 0) {
      showMessage("⚠️ Adicione pelo menos um produto ao orçamento", "warning");
      return;
    }
    try {
      showMessage("⏳ A guardar alterações...", "info");
      const orcamentoId = parseInt(editOrcamentoId.value);
      const totalGeral = produtosEdit.reduce((sum, p) => sum + p.total, 0);
      const { error: updateError } = await supabase
        .from("orcamentos")
        .update({
          cliente_nome: editClienteNome.value.trim(),
          total_geral: totalGeral
        })
        .eq("id", orcamentoId);
      if (updateError) throw updateError;
      const { error: deleteError } = await supabase
        .from("orcamento_itens")
        .delete()
        .eq("orcamento_id", orcamentoId);
      if (deleteError) throw deleteError;
      const itensParaInserir = produtosEdit.map(p => ({
        orcamento_id: orcamentoId,
        tipo_id: p.tipo_id,
        brand: p.brand,
        descricao: p.descricao,
        quantidade: p.quantidade,
        comprimento: p.comprimento,
        largura: p.largura,
        espessura: p.espessura ?? 0,
type: p.type || null,
        preco_mt2: p.preco_mt2,
        desconto_percentagem: p.desconto_percentagem
      }));
      const { error: insertError } = await supabase
        .from("orcamento_itens")
        .insert(itensParaInserir);
      if (insertError) throw insertError;
      showMessage("✅ Orçamento atualizado com sucesso!", "success");
      editOffcanvas.hide();
      loadData();
    } catch (err) {
      console.error("❌ Erro ao atualizar orçamento:", err);
      showMessage("❌ Erro ao atualizar: " + (err.message || err), "danger");
    }
  });

  // =====================================================
  // SUBSTITUA APENAS A PARTE DO btnDownloadPDF
  // TRUNCAMENTO AUTOMÁTICO BASEADO NA LARGURA DA COLUNA
  // =====================================================

  document.getElementById("btnDownloadPDF").addEventListener("click", async () => {
    if (!currentOrcamento) {
      showMessage("❌ Nenhum orçamento selecionado", "danger");
      return;
    }

    try {
      showMessage("⏳ A Gerar PDF...", "info");

      // Carregar bibliotecas
      if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      // ✅ FUNÇÃO AUTOMÁTICA: Calcula quantos caracteres cabem baseado na largura da célula
      function getMaxCharsForCell(cell) {
        const cellWidth = cell.offsetWidth;
        const fontSize = parseFloat(window.getComputedStyle(cell).fontSize);
        
        // Fórmula aproximada: largura / (fontSize * 0.6)
        // 0.6 é um fator de proporção média para caracteres
        const maxChars = Math.floor(cellWidth / (fontSize * 0.6));
        
        // Garantir um mínimo de 5 caracteres
        return Math.max(5, maxChars);
      }

      // ✅ FUNÇÃO PARA TRUNCAR TEXTO COM "..."
      function truncateText(element, maxLength) {
        // ✅ Se o elemento contém HTML (como o desconto com span), não truncar
        if (element.querySelector('span')) {
          return null; // Não mexer em elementos com HTML interno
        }
        
        const originalText = element.textContent.trim();
        if (originalText.length > maxLength) {
          element.textContent = originalText.substring(0, maxLength) + '...';
          return originalText;
        }
        return null;
      }

      // ✅ GUARDAR TEXTOS ORIGINAIS E TRUNCAR AUTOMATICAMENTE
      const textsToRestore = [];
      
      // 1. Cliente tem HTML com <br> — não truncar para preservar a formatação em linhas

      // 2. Truncar células da tabela AUTOMATICAMENTE baseado na largura de cada célula
      const tableRows = document.querySelectorAll('#viewProdutosBodyPrint tr');
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell) => {
          // ✅ CALCULA AUTOMATICAMENTE quantos caracteres cabem nesta célula
          const maxChars = getMaxCharsForCell(cell);
          const originalText = truncateText(cell, maxChars);
          if (originalText) textsToRestore.push({ element: cell, text: originalText });
        });
      });

      // 3. Truncar dados da empresa
      const empresaNome = document.querySelector('.empresa-nome');
      if (empresaNome) {
        const maxChars = getMaxCharsForCell(empresaNome);
        const originalEmpresaNome = truncateText(empresaNome, maxChars);
        if (originalEmpresaNome) textsToRestore.push({ element: empresaNome, text: originalEmpresaNome });
      }

      const empresaParas = document.querySelectorAll('.pdf-header-empresa p');
      empresaParas.forEach(p => {
        const maxChars = getMaxCharsForCell(p);
        const originalText = truncateText(p, maxChars);
        if (originalText) textsToRestore.push({ element: p, text: originalText });
      });

      // 4. Aguardar renderização do DOM com texto truncado
      await new Promise(resolve => setTimeout(resolve, 250));

      const filename = `Orcamento_${currentOrcamento.id}.pdf`;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Elementos do PDF
      const headerElement = document.querySelector('.pdf-page-header');
      const clienteElement = document.querySelector('.pdf-cliente');
      const tabelaElement = document.querySelector('.pdf-table');
      const totaisElement = document.querySelector('.pdf-totais');
      const footerElement = document.querySelector('.pdf-page-footer');
      
      // Largura fixa para captura
      const FIXED_WIDTH = 900;
      
      // Guardar larguras originais
      const originalWidths = {
        header: headerElement.style.width,
        cliente: clienteElement.style.width,
        tabela: tabelaElement.style.width,
        totais: totaisElement.style.width,
        footer: footerElement.style.width
      };
      
      // Definir largura fixa
      headerElement.style.width = FIXED_WIDTH + 'px';
      clienteElement.style.width = FIXED_WIDTH + 'px';
      tabelaElement.style.width = FIXED_WIDTH + 'px';
      totaisElement.style.width = FIXED_WIDTH + 'px';
      footerElement.style.width = FIXED_WIDTH + 'px';

      // Forçar quebra de linha no bloco do cliente antes da captura
      const clienteRefDiv = headerElement.querySelector('.pdf-header-ref');
      const clienteNomeDiv = headerElement.querySelector('#viewClientePrint');
      if (clienteRefDiv) {
        clienteRefDiv.style.whiteSpace = 'normal';
        clienteRefDiv.style.overflow = 'visible';
        clienteRefDiv.style.height = 'auto';
        clienteRefDiv.style.maxHeight = 'none';
      }
      if (clienteNomeDiv) {
        clienteNomeDiv.style.whiteSpace = 'normal';
        clienteNomeDiv.style.overflow = 'visible';
        clienteNomeDiv.style.wordBreak = 'break-word';
        clienteNomeDiv.style.width = '100%';
      }
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const scale = 2.5;
      
      // Capturar header (inclui cliente no topo direito), ref (nº+data), totais e footer
      const headerCanvas = await html2canvas(headerElement, { 
        scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      const clienteCanvas = await html2canvas(clienteElement, { 
        scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      const totaisCanvas = await html2canvas(totaisElement, { 
        scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      const footerCanvas = await html2canvas(footerElement, { 
        scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      // Capturar cada linha da tabela individualmente
      const thead = tabelaElement.querySelector('thead');
      const tbody = tabelaElement.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      const theadCanvas = await html2canvas(thead, {
        scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
      });
      
      const rowCanvases = [];
      for (const row of rows) {
        const rowCanvas = await html2canvas(row, {
          scale: scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff'
        });
        rowCanvases.push(rowCanvas);
      }
      
      // ✅ RESTAURAR TEXTOS ORIGINAIS IMEDIATAMENTE
      textsToRestore.forEach(({ element, text }) => {
        element.textContent = text;
      });
      
      // Restaurar larguras
      headerElement.style.width  = originalWidths.header;
      clienteElement.style.width = originalWidths.cliente;
      tabelaElement.style.width  = originalWidths.tabela;
      totaisElement.style.width  = originalWidths.totais;
      footerElement.style.width  = originalWidths.footer;
      
      // Converter para imagens
      const headerImg  = headerCanvas.toDataURL('image/jpeg', 0.98);
      const clienteImg = clienteCanvas.toDataURL('image/jpeg', 0.98);
      const theadImg   = theadCanvas.toDataURL('image/jpeg', 0.98);
      const totaisImg  = totaisCanvas.toDataURL('image/jpeg', 0.98);
      const footerImg  = footerCanvas.toDataURL('image/jpeg', 0.98);
      
      const rowImages = rowCanvases.map(canvas => canvas.toDataURL('image/jpeg', 0.98));
      
      // Calcular dimensões
      const margin = 9;
      const usableWidth = pageWidth - (margin * 2);
      
      const headerHeight  = (headerCanvas.height  * usableWidth) / headerCanvas.width;
      const clienteHeight = (clienteCanvas.height * usableWidth) / clienteCanvas.width;
      const theadHeight   = (theadCanvas.height   * usableWidth) / theadCanvas.width;
      const totaisHeight  = (totaisCanvas.height  * usableWidth) / totaisCanvas.width;
      const footerHeight  = (footerCanvas.height  * usableWidth) / footerCanvas.width;
      
      const rowHeights = rowCanvases.map(canvas => 
        (canvas.height * usableWidth) / canvas.width
      );
      
      const topMargin = 5;
      const bottomMargin = 5;
      const betweenMargin = 1;
      
      // Montar PDF linha por linha
      let currentY = topMargin;
      let pageNumber = 1;
      
      // Header (contém logo, empresa, nº orçamento e data)
      pdf.addImage(headerImg, 'JPEG', margin, currentY, usableWidth, headerHeight);
      currentY += headerHeight + betweenMargin;
      
      // Cliente
      pdf.addImage(clienteImg, 'JPEG', margin, currentY, usableWidth, clienteHeight);
      currentY += clienteHeight + 2;
      
      // Cabeçalho da tabela
      pdf.addImage(theadImg, 'JPEG', margin, currentY, usableWidth, theadHeight);
      currentY += theadHeight;
      
      const footerStartY   = pageHeight - footerHeight - bottomMargin; // última página
      const pageBottomY    = pageHeight - bottomMargin;                 // páginas intermédias
      const spaceForTotais = totaisHeight + 5;
      
      // Adicionar linhas uma a uma
      for (let i = 0; i < rowImages.length; i++) {
        const rowHeight = rowHeights[i];
        const isLastRow = (i === rowImages.length - 1);
        
        // Limite desta página: na última reservar espaço para footer+totais, nas outras usar tudo
        const limitY = isLastRow ? footerStartY : pageBottomY;
        let spaceNeeded = rowHeight;
        if (isLastRow) spaceNeeded += spaceForTotais;
        
        if (currentY + spaceNeeded > limitY) {
          // Nova página — sem footer nas páginas intermédias
          pdf.addPage();
          pageNumber++;
          
          currentY = topMargin;
          pdf.addImage(headerImg, 'JPEG', margin, currentY, usableWidth, headerHeight);
          currentY += headerHeight + betweenMargin;
          
          pdf.addImage(theadImg, 'JPEG', margin, currentY, usableWidth, theadHeight);
          currentY += theadHeight;
        }
        
        // Adicionar linha completa
        pdf.addImage(rowImages[i], 'JPEG', margin, currentY, usableWidth, rowHeight);
        currentY += rowHeight;
        
        // Se for última linha, empurrar totais para baixo do conteúdo e antes do footer
        if (isLastRow) {
          const spaceBeforeFooter = footerStartY - currentY;
          const pushDown = Math.max(0, spaceBeforeFooter - totaisHeight - 2);
          currentY += pushDown + 3;
          
          pdf.addImage(totaisImg, 'JPEG', margin, currentY, usableWidth, totaisHeight);
        }
      }
      
      // Footer apenas na última página
      pdf.addImage(footerImg, 'JPEG', margin, footerStartY, usableWidth, footerHeight);
      
      // ✅ ADICIONAR NÚMEROS DE PÁGINA NO CANTO INFERIOR ESQUERDO
      const totalPages = pageNumber;
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0); // Cor do PDF (#2c3e50)

        const pageText = `${p} / ${totalPages}`;

        pdf.text(
          pageText,
          pageWidth - margin,        // margem direita
          pageHeight - 6,             // 6mm do fundo
          { align: "right" }          // alinhamento à direita
        );
      }
      
      // Salvar
      pdf.save(filename);
      
      showMessage("✅ PDF gerado com sucesso!", "success");
      console.log("✅ PDF gerado com", pageNumber, "página(s) - Truncamento automático aplicado");

    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      showMessage("❌ Erro ao gerar PDF: " + err.message, "danger");
    }
  });


  // =====================================================
// IMPRIMIR PDF - MESMO PROCESSO DO DOWNLOAD
// =====================================================
document.getElementById("btnPrintPDF").addEventListener("click", async () => {
  if (!currentOrcamento) {
    showMessage("❌ Nenhum orçamento selecionado", "danger");
    return;
  }

  try {
    showMessage("⏳ A preparar impressão...", "info");

    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    function getMaxCharsForCell(cell) {
      const cellWidth = cell.offsetWidth;
      const fontSize = parseFloat(window.getComputedStyle(cell).fontSize);
      return Math.max(5, Math.floor(cellWidth / (fontSize * 0.6)));
    }

    function truncateText(element, maxLength) {
      if (element.querySelector('span')) return null;
      const originalText = element.textContent.trim();
      if (originalText.length > maxLength) {
        element.textContent = originalText.substring(0, maxLength) + '...';
        return originalText;
      }
      return null;
    }

    const textsToRestore = [];

    // Cliente tem HTML com <br> — não truncar para preservar a formatação em linhas

    document.querySelectorAll('#viewProdutosBodyPrint tr').forEach(row => {
      row.querySelectorAll('td').forEach(cell => {
        const orig = truncateText(cell, getMaxCharsForCell(cell));
        if (orig) textsToRestore.push({ element: cell, text: orig });
      });
    });

    const empresaNomeEl = document.querySelector('.empresa-nome');
    if (empresaNomeEl) {
      const orig = truncateText(empresaNomeEl, getMaxCharsForCell(empresaNomeEl));
      if (orig) textsToRestore.push({ element: empresaNomeEl, text: orig });
    }

    document.querySelectorAll('.pdf-header-empresa p').forEach(p => {
      const orig = truncateText(p, getMaxCharsForCell(p));
      if (orig) textsToRestore.push({ element: p, text: orig });
    });

    await new Promise(resolve => setTimeout(resolve, 250));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const headerElement  = document.querySelector('.pdf-page-header');
    const clienteElement = document.querySelector('.pdf-cliente');
    const tabelaElement  = document.querySelector('.pdf-table');
    const totaisElement  = document.querySelector('.pdf-totais');
    const footerElement  = document.querySelector('.pdf-page-footer');

    const FIXED_WIDTH = 900;
    const originalWidths = {
      header:  headerElement.style.width,
      cliente: clienteElement.style.width,
      tabela:  tabelaElement.style.width,
      totais:  totaisElement.style.width,
      footer:  footerElement.style.width
    };

    headerElement.style.width  = FIXED_WIDTH + 'px';
    clienteElement.style.width = FIXED_WIDTH + 'px';
    tabelaElement.style.width  = FIXED_WIDTH + 'px';
    totaisElement.style.width  = FIXED_WIDTH + 'px';
    footerElement.style.width  = FIXED_WIDTH + 'px';

    // Forçar quebra de linha no bloco do cliente antes da captura
    const clienteRefDivP = headerElement.querySelector('.pdf-header-ref');
    const clienteNomeDivP = headerElement.querySelector('#viewClientePrint');
    if (clienteRefDivP) {
      clienteRefDivP.style.whiteSpace = 'normal';
      clienteRefDivP.style.overflow = 'visible';
      clienteRefDivP.style.height = 'auto';
      clienteRefDivP.style.maxHeight = 'none';
    }
    if (clienteNomeDivP) {
      clienteNomeDivP.style.whiteSpace = 'normal';
      clienteNomeDivP.style.overflow = 'visible';
      clienteNomeDivP.style.wordBreak = 'break-word';
      clienteNomeDivP.style.width = '100%';
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    const scale = 2.5;

    const headerCanvas   = await html2canvas(headerElement,  { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const clienteCanvas  = await html2canvas(clienteElement, { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const totaisCanvas   = await html2canvas(totaisElement,  { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const footerCanvas   = await html2canvas(footerElement,  { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });

    const thead = tabelaElement.querySelector('thead');
    const tbodyEl = tabelaElement.querySelector('tbody');
    const rows = Array.from(tbodyEl.querySelectorAll('tr'));

    const theadCanvas = await html2canvas(thead, { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });

    const rowCanvases = [];
    for (const row of rows) {
      const rowCanvas = await html2canvas(row, { scale, width: FIXED_WIDTH, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      rowCanvases.push(rowCanvas);
    }

    // Restaurar textos e larguras
    textsToRestore.forEach(({ element, text }) => { element.textContent = text; });
    headerElement.style.width  = originalWidths.header;
    clienteElement.style.width = originalWidths.cliente;
    tabelaElement.style.width  = originalWidths.tabela;
    totaisElement.style.width  = originalWidths.totais;
    footerElement.style.width  = originalWidths.footer;

    const headerImg   = headerCanvas.toDataURL('image/jpeg', 0.98);
    const clienteImg  = clienteCanvas.toDataURL('image/jpeg', 0.98);
    const theadImg    = theadCanvas.toDataURL('image/jpeg', 0.98);
    const totaisImg   = totaisCanvas.toDataURL('image/jpeg', 0.98);
    const footerImg   = footerCanvas.toDataURL('image/jpeg', 0.98);
    const rowImages   = rowCanvases.map(c => c.toDataURL('image/jpeg', 0.98));

    const margin = 9;
    const usableWidth = pageWidth - (margin * 2);

    const headerHeight  = (headerCanvas.height  * usableWidth) / headerCanvas.width;
    const clienteHeight = (clienteCanvas.height * usableWidth) / clienteCanvas.width;
    const theadHeight   = (theadCanvas.height   * usableWidth) / theadCanvas.width;
    const totaisHeight  = (totaisCanvas.height  * usableWidth) / totaisCanvas.width;
    const footerHeight  = (footerCanvas.height  * usableWidth) / footerCanvas.width;
    const rowHeights    = rowCanvases.map(c => (c.height * usableWidth) / c.width);

    const topMargin = 5;
    const bottomMargin = 5;
    const betweenMargin = 1;

    let currentY = topMargin;
    let pageNumber = 1;

    // Header (contém logo, empresa, nº orçamento e data)
    pdf.addImage(headerImg,  'JPEG', margin, currentY, usableWidth, headerHeight);
    currentY += headerHeight + betweenMargin;

    // Cliente
    pdf.addImage(clienteImg, 'JPEG', margin, currentY, usableWidth, clienteHeight);
    currentY += clienteHeight + 2;

    pdf.addImage(theadImg,   'JPEG', margin, currentY, usableWidth, theadHeight);
    currentY += theadHeight;

    const footerStartY   = pageHeight - footerHeight - bottomMargin;
    const pageBottomY    = pageHeight - bottomMargin;
    const spaceForTotais = totaisHeight + 5;

    for (let i = 0; i < rowImages.length; i++) {
      const rowHeight = rowHeights[i];
      const isLastRow = (i === rowImages.length - 1);
      let spaceNeeded = rowHeight;
      if (isLastRow) spaceNeeded += spaceForTotais;

      const limitY = isLastRow ? footerStartY : pageBottomY;

      if (currentY + spaceNeeded > limitY) {
        // Nova página — sem footer nas páginas intermédias
        pdf.addPage();
        pageNumber++;
        currentY = topMargin;
        pdf.addImage(headerImg, 'JPEG', margin, currentY, usableWidth, headerHeight);
        currentY += headerHeight + betweenMargin;
        pdf.addImage(theadImg,  'JPEG', margin, currentY, usableWidth, theadHeight);
        currentY += theadHeight;
      }

      pdf.addImage(rowImages[i], 'JPEG', margin, currentY, usableWidth, rowHeight);
      currentY += rowHeight;

      if (isLastRow) {
        const pushDown = Math.max(0, (footerStartY - currentY) - totaisHeight - 2);
        currentY += pushDown + 3;
        pdf.addImage(totaisImg, 'JPEG', margin, currentY, usableWidth, totaisHeight);
      }
    }

    // Footer apenas na última página
    pdf.addImage(footerImg, 'JPEG', margin, footerStartY, usableWidth, footerHeight);

    // Números de página
    const totalPages = pageNumber;
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${p} / ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    }

    // ✅ DIFERENÇA: Abre o diálogo de impressão em vez de fazer download
    pdf.autoPrint();
    window.open(pdf.output('bloburl'), '_blank');

    showMessage("✅ PDF pronto para imprimir!", "success");

  } catch (err) {
    console.error("Erro ao imprimir PDF:", err);
    showMessage("❌ Erro ao imprimir: " + err.message, "danger");
  }
});

  // =====================================================
  // ELIMINAR ORÇAMENTO
  // =====================================================
  let orcamentoToDelete = null;

  tbody.addEventListener("click", (e) => {
    if (e.target.closest("button[title='Eliminar']")) {
      const orcamentoId = e.target.closest("button").dataset.id;
      orcamentoToDelete = orcamentoId;
      const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));
      deleteModal.show();
    }
  });

  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!orcamentoToDelete) return;
    try {
      const { error } = await supabase
        .from("orcamentos")
        .delete()
        .eq("id", orcamentoToDelete);
      if (error) throw error;
      showMessage("✅ Orçamento eliminado com sucesso", "success");
      const deleteModal = bootstrap.Modal.getInstance(document.getElementById("deleteModal"));
      deleteModal.hide();
      loadData();
    } catch (err) {
      showMessage("❌ Erro ao eliminar: " + err.message, "danger");
    } finally {
      orcamentoToDelete = null;
    }
  });

  function formatBrand(brand) {
    return brand
      .replaceAll("_", " ")
      .replace("&", "&")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // =====================================================
// ✅ DUPLICAR ORÇAMENTO — com autocomplete igual ao editor
// =====================================================
let orcamentoToDuplicate = null;
let duplicateItens = [];

tbody.addEventListener("click", (e) => {
  if (e.target.closest("button[title='Duplicar']")) {
    const id = e.target.closest("button[title='Duplicar']").dataset.id;
    abrirModalDuplicar(id);
  }
});

async function abrirModalDuplicar(orcamentoId) {
  try {
    const { data: orc, error: e1 } = await supabase
      .from("orcamentos")
      .select("*, clientes(descricao)")
      .eq("id", orcamentoId).single();
    if (e1) throw e1;

    const { data: itens, error: e2 } = await supabase
      .from("orcamento_itens").select("*")
      .eq("orcamento_id", orcamentoId).order("id", { ascending: true });
    if (e2) throw e2;

    orcamentoToDuplicate = orc;
    duplicateItens = itens.map(item => ({ ...item }));

    document.getElementById("duplicateOrcRef").textContent = `#${orc.id}`;
    document.getElementById("duplicateClienteNome").textContent = orc.clientes?.descricao || orc.cliente_nome || "";
    await renderDuplicateTable();

    const offcanvasEl = document.getElementById("duplicateModal");
    new bootstrap.Offcanvas(offcanvasEl).show();

    // Reset scroll ao topo sempre que abre
    offcanvasEl.addEventListener("shown.bs.offcanvas", () => {
      const scrollArea = offcanvasEl.querySelector("[style*='overflow-y: auto']");
      if (scrollArea) scrollArea.scrollTop = 0;
    }, { once: true });

  } catch (err) {
    showMessage("❌ Erro ao carregar orçamento: " + err.message, "danger");
  }
}

// ─── cache para os dropdowns do modal duplicar ───────────────────
let dupBrandsCache = {};   // index → { display_name, website_key }
let dupProdutosCache = {}; // index → lista de produtos da marca
let dupEspCache = {};      // index → lista de espessuras do produto

async function renderDuplicateTable() {
  const tbody = document.getElementById("duplicateItensBody");
  tbody.innerHTML = "";
  recalcDuplicateTotal();

  for (let index = 0; index < duplicateItens.length; index++) {
    const item = duplicateItens[index];
    const isDiversos = item.brand === "diversos" || item.espessura === 0;
    const tipoNome = tiposMap[item.tipo_id] || `Tipo ${item.tipo_id}`;
    const brandName = isDiversos ? "" : (brandMap[item.brand] || formatBrand(item.brand));

    const tr = document.createElement("tr");
    tr.id = `dup-row-${index}`;

    tr.innerHTML = `
      <td class="text-center small">${tipoNome}</td>

      <!-- MARCA -->
      <td>
        ${isDiversos
          ? `<span class="text-muted small">—</span>`
          : `<div class="coolinput autocomplete-wrapper mb-0" style="min-width:130px">
               <div class="input-with-clear">
                 <input type="text" class="input dup-marca-input" data-index="${index}"
                   value="${brandName}" placeholder="Marca..." autocomplete="off"
                   style="font-size:12px;padding:4px 28px 4px 8px;">
                 <button type="button" class="input-clear-btn ${brandName ? '' : 'd-none'} dup-clear-marca" data-index="${index}">
                   <i class="bi bi-x"></i>
                 </button>
               </div>
               <div class="autocomplete-dropdown" id="dup-marca-dd-${index}"></div>
             </div>`
        }
      </td>

      <!-- DESCRIÇÃO -->
      <td>
        ${isDiversos
          ? `<input type="text" class="dup-diversos-desc"
               data-index="${index}" value="${item.descricao}"
               style="min-width:160px;font-size:12px;width:100%;border:1px solid #dee2e6;border-radius:0;outline:none;padding:4px 8px;background:#fff;">`
          : `<div class="coolinput autocomplete-wrapper mb-0" style="min-width:160px">
               <div class="input-with-clear">
                 <input type="text" class="input dup-desc-input" data-index="${index}"
                   value="${item.descricao}" placeholder="Descrição..." autocomplete="off"
                   style="font-size:12px;padding:4px 28px 4px 8px;">
                 <button type="button" class="input-clear-btn ${item.descricao ? '' : 'd-none'} dup-clear-desc" data-index="${index}">
                   <i class="bi bi-x"></i>
                 </button>
               </div>
               <div class="autocomplete-dropdown" id="dup-desc-dd-${index}"></div>
             </div>`
        }
      </td>

      <!-- ESPESSURA -->
      <td>
        ${isDiversos
          ? `<span class="text-muted small">—</span>`
          : `<div class="coolinput autocomplete-wrapper mb-0" style="min-width:90px">
              <div class="input-with-clear">
                <input type="text" class="input dup-esp-input" data-index="${index}"
                  value="${item.espessura}mm" placeholder="Esp..." autocomplete="off"
                  style="font-size:12px;padding:4px 28px 4px 8px;">
                <button type="button" class="input-clear-btn dup-clear-esp" data-index="${index}">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <div class="autocomplete-dropdown" id="dup-esp-dd-${index}"></div>
            </div>`
        }
      </td>

      <!-- ACABAMENTO -->
      <td>
        ${isDiversos
          ? `<span class="text-muted small">—</span>`
          : `<div class="coolinput autocomplete-wrapper mb-0" style="min-width:110px">
              <div class="input-with-clear">
                <input type="text" class="input dup-acab-input" data-index="${index}"
                  value="${item.type || ''}" placeholder="Acab..." autocomplete="off"
                  style="font-size:12px;padding:4px 28px 4px 8px;" disabled>
                <button type="button" class="input-clear-btn ${item.type ? '' : 'd-none'} dup-clear-acab" data-index="${index}">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <div class="autocomplete-dropdown" id="dup-acab-dd-${index}"></div>
            </div>`
        }
      </td>

      
      <td class="text-center small">${item.quantidade}</td>
      <td class="text-center small">${isDiversos ? "—" : item.comprimento.toFixed(4)}</td>
      <td class="text-center small">${isDiversos ? "—" : item.largura.toFixed(4)}</td>

      <!-- PREÇO -->
      <td>
        <input type="number" class="form-control form-control-sm dup-preco"
          data-index="${index}" value="${item.preco_mt2}" min="0" step="0.01"
          style="min-width:70px;font-size:12px;">
      </td>

      <!-- DESCONTO -->
      <td>
        <input type="number" class="form-control form-control-sm dup-desconto"
          data-index="${index}" value="${item.desconto_percentagem || 0}"
          min="0" max="100" step="0.01" style="min-width:60px;font-size:12px;">
      </td>

      <!-- TOTAL -->
      <td class="text-center small fw-bold" id="dup-total-${index}">
        ${calcDupLineTotal(item).toFixed(2)} €
      </td>
    `;

    tbody.appendChild(tr);

    // ── Inicializar autocompletes desta linha ──
    if (!isDiversos) {
      await initDupMarcaAutocomplete(index, item);
    }
  }

  // Eventos preço / desconto
  // DEPOIS
  document.getElementById("duplicateItensBody").addEventListener("input", (e) => {
    const index = parseInt(e.target.dataset.index);
    if (isNaN(index)) return;

    // DEPOIS
    if (e.target.classList.contains("dup-preco")) {
      duplicateItens[index].preco_mt2 = parseFloat(e.target.value) || 0;
      duplicateItens[index].desconto_percentagem = 0;
      const descInput = document.querySelector(`.dup-desconto[data-index="${index}"]`);
      if (descInput) descInput.value = 0;
    } else if (e.target.classList.contains("dup-desconto")) {
      duplicateItens[index].desconto_percentagem = parseFloat(e.target.value) || 0;
    } else if (e.target.classList.contains("dup-diversos-desc")) {
      duplicateItens[index].descricao = e.target.value;
    }

    const cell = document.getElementById(`dup-total-${index}`);
    if (cell) cell.textContent = calcDupLineTotal(duplicateItens[index]).toFixed(2) + " €";
    recalcDuplicateTotal();
  });

  document.getElementById("duplicateItensBody").addEventListener("focusin", (e) => {
    if (e.target.classList.contains("dup-preco") ||
        e.target.classList.contains("dup-desconto")) {
      e.target.select();
    }
  });

  document.getElementById("duplicateItensBody").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const index = parseInt(e.target.dataset.index);
    if (isNaN(index)) return;

    if (e.target.classList.contains("dup-preco")) {
      e.preventDefault();
      const desc = document.querySelector(`.dup-desconto[data-index="${index}"]`);
      if (desc) { desc.focus(); desc.select(); }
    // DEPOIS
    // DEPOIS
    } else if (e.target.classList.contains("dup-desconto")) {
      e.preventDefault();
      const confirmBtn = document.getElementById("confirmDuplicateBtn");
      confirmBtn.focus();
      confirmBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
}

// ─── Calcular total de uma linha ─────────────────────────────────
function calcDupLineTotal(item) {
  const fator = 1 - ((item.desconto_percentagem || 0) / 100);
  return item.quantidade * item.comprimento * item.largura * item.preco_mt2 * fator;
}

// ─── Recalcular total geral ───────────────────────────────────────
function recalcDuplicateTotal() {
  const total = duplicateItens.reduce((s, item) => s + calcDupLineTotal(item), 0);
  document.getElementById("duplicateTotalGeral").textContent = total.toFixed(2) + " €";
}

// ─── Autocomplete MARCA ──────────────────────────────────────────
async function initDupMarcaAutocomplete(index, item) {
  const input = document.querySelector(`.dup-marca-input[data-index="${index}"]`);
  const dd = document.getElementById(`dup-marca-dd-${index}`);
  const clearBtn = document.querySelector(`.dup-clear-marca[data-index="${index}"]`);
  if (!input || !dd) return;

  function showMarcaOptions(filter = "") {
    closeAllDupDropdowns();
    const filtered = filter
      ? brandsData.filter(b => b.display.toLowerCase().includes(filter.toLowerCase()))
      : brandsData;

    dd.innerHTML = "";
    filtered.slice(0, 50).forEach((b, idx) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item" + (idx === 0 ? " autocomplete-active" : "");
      div.textContent = b.display;
      div.addEventListener("click", async (e) => {
        e.stopPropagation();
        input.value = b.display;
        duplicateItens[index].brand = b.website_key;
        duplicateItens[index]._brandDisplay = b.display;
        if (clearBtn) clearBtn.classList.remove("d-none");
        dd.classList.remove("show"); dd.innerHTML = "";
        duplicateItens[index].descricao = "";
        duplicateItens[index].espessura = null;
        duplicateItens[index].preco_mt2 = 0;
        const descInput = document.querySelector(`.dup-desc-input[data-index="${index}"]`);
        const espInput = document.querySelector(`.dup-esp-input[data-index="${index}"]`);
        if (descInput) { descInput.value = ""; descInput.disabled = false; }
        if (espInput) { espInput.value = ""; espInput.disabled = false; }
        await initDupDescAutocomplete(index, b.website_key);
        setTimeout(() => {
          const descInput2 = document.querySelector(`.dup-desc-input[data-index="${index}"]`);
          if (descInput2) descInput2.focus();
        }, 50);
      });
      dd.appendChild(div);
    });
    if (filtered.length === 0) {
      dd.innerHTML = '<div class="autocomplete-item disabled">Sem resultados</div>';
    }
    dd.classList.add("show");
  }

  function moveDupFocus(dd, direction) {
    const items = dd.querySelectorAll(".autocomplete-item:not(.disabled)");
    if (!items.length) return;
    const current = dd.querySelector(".autocomplete-active");
    let idx = Array.from(items).indexOf(current);
    items.forEach(i => i.classList.remove("autocomplete-active"));
    if (direction === "down") idx = (idx < items.length - 1) ? idx + 1 : 0;
    else idx = (idx > 0) ? idx - 1 : items.length - 1;
    items[idx].classList.add("autocomplete-active");
    items[idx].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("click", (e) => { e.stopPropagation(); showMarcaOptions(input.value); });
  input.addEventListener("focus", () => showMarcaOptions(input.value));
  input.addEventListener("input", () => {
    showMarcaOptions(input.value);
    if (clearBtn) clearBtn.classList.toggle("d-none", !input.value.trim());
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); moveDupFocus(dd, "down"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveDupFocus(dd, "up"); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const active = dd.querySelector(".autocomplete-active");
      if (active) active.click();
      else { dd.classList.remove("show"); dd.innerHTML = ""; }
    } else if (e.key === "Escape") { dd.classList.remove("show"); dd.innerHTML = ""; }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      input.value = "";
      clearBtn.classList.add("d-none");
      duplicateItens[index].brand = "";
      duplicateItens[index].descricao = "";
      duplicateItens[index].espessura = null;
      duplicateItens[index].preco_mt2 = 0;
      duplicateItens[index].desconto_percentagem = 0;
      dd.classList.remove("show"); dd.innerHTML = "";
      // Limpar campos visuais da linha
      const descInput = document.querySelector(`.dup-desc-input[data-index="${index}"]`);
      const espInput = document.querySelector(`.dup-esp-input[data-index="${index}"]`);
      const precoInput = document.querySelector(`.dup-preco[data-index="${index}"]`);
      const descontoInput = document.querySelector(`.dup-desconto[data-index="${index}"]`);
      if (descInput) { descInput.value = ""; const cb = document.querySelector(`.dup-clear-desc[data-index="${index}"]`); if(cb) cb.classList.add("d-none"); }
      if (espInput) { espInput.value = ""; const cb = document.querySelector(`.dup-clear-esp[data-index="${index}"]`); if(cb) cb.classList.add("d-none"); }
      if (precoInput) precoInput.value = 0;
      if (descontoInput) descontoInput.value = 0;
      const cell = document.getElementById(`dup-total-${index}`);
      if (cell) cell.textContent = "0.00 €";
      recalcDuplicateTotal();
    });
  }

  // Inicializar também descrição e espessura com os valores actuais
  await initDupDescAutocomplete(index, item.brand, item.descricao, item.espessura, item.preco_mt2);
}

// ─── Autocomplete DESCRIÇÃO ──────────────────────────────────────
async function initDupDescAutocomplete(index, brandKey, currentDesc = "", currentEsp = null, currentPreco = null) {
  const input = document.querySelector(`.dup-desc-input[data-index="${index}"]`);
  const dd = document.getElementById(`dup-desc-dd-${index}`);
  const clearBtn = document.querySelector(`.dup-clear-desc[data-index="${index}"]`);
  if (!input || !dd) return;

  const produtos = produtosWebsite.filter(p => p.Brand === brandKey).map(p => ({
    display: p.Title_pt, id: p.id
  }));

  function showDescOptions(filter = "") {
    closeAllDupDropdowns();
    const filtered = filter
      ? produtos.filter(p => p.display.toLowerCase().includes(filter.toLowerCase()))
      : produtos;

    dd.innerHTML = "";
    filtered.slice(0, 50).forEach((p, idx) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item" + (idx === 0 ? " autocomplete-active" : "");
      div.textContent = p.display;
      div.addEventListener("click", async (e) => {
        e.stopPropagation();
        input.value = p.display;
        duplicateItens[index].descricao = p.display;
        duplicateItens[index]._produtoId = p.id;
        if (clearBtn) clearBtn.classList.remove("d-none");
        dd.classList.remove("show"); dd.innerHTML = "";
        await initDupEspAutocomplete(index, p.id);
        setTimeout(() => {
          const espInput2 = document.querySelector(`.dup-esp-input[data-index="${index}"]`);
          if (espInput2) espInput2.focus();
        }, 50);
      });
      dd.appendChild(div);
    });
    if (filtered.length === 0) {
      dd.innerHTML = '<div class="autocomplete-item disabled">Sem resultados</div>';
    }
    dd.classList.add("show");
  }

  function moveDupDescFocus(direction) {
    const items = dd.querySelectorAll(".autocomplete-item:not(.disabled)");
    if (!items.length) return;
    const current = dd.querySelector(".autocomplete-active");
    let idx = Array.from(items).indexOf(current);
    items.forEach(i => i.classList.remove("autocomplete-active"));
    if (direction === "down") idx = (idx < items.length - 1) ? idx + 1 : 0;
    else idx = (idx > 0) ? idx - 1 : items.length - 1;
    items[idx].classList.add("autocomplete-active");
    items[idx].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("click", (e) => { e.stopPropagation(); showDescOptions(input.value); });
  input.addEventListener("focus", () => showDescOptions(input.value));
  input.addEventListener("input", () => {
    showDescOptions(input.value);
    if (clearBtn) clearBtn.classList.toggle("d-none", !input.value.trim());
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); moveDupDescFocus("down"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveDupDescFocus("up"); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const active = dd.querySelector(".autocomplete-active");
      if (active) active.click();
      else { dd.classList.remove("show"); dd.innerHTML = ""; }
    } else if (e.key === "Escape") { dd.classList.remove("show"); dd.innerHTML = ""; }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      input.value = "";
      clearBtn.classList.add("d-none");
      duplicateItens[index].descricao = "";
      duplicateItens[index].espessura = null;
      duplicateItens[index].preco_mt2 = 0;
      duplicateItens[index].desconto_percentagem = 0;
      dd.classList.remove("show"); dd.innerHTML = "";
      const espInput = document.querySelector(`.dup-esp-input[data-index="${index}"]`);
      const precoInput = document.querySelector(`.dup-preco[data-index="${index}"]`);
      const descontoInput = document.querySelector(`.dup-desconto[data-index="${index}"]`);
      if (espInput) { espInput.value = ""; const cb = document.querySelector(`.dup-clear-esp[data-index="${index}"]`); if(cb) cb.classList.add("d-none"); }
      if (precoInput) precoInput.value = 0;
      if (descontoInput) descontoInput.value = 0;
      const cell = document.getElementById(`dup-total-${index}`);
      if (cell) cell.textContent = "0.00 €";
      recalcDuplicateTotal();
    });
  }

  // Se já há descrição, carregar espessuras
  if (currentDesc) {
    const prod = produtos.find(p => p.display === currentDesc);
    if (prod) {
      duplicateItens[index]._produtoId = prod.id;
      await initDupEspAutocomplete(index, prod.id, currentEsp, currentPreco);
    }
  }
}

// ─── Autocomplete ESPESSURA ──────────────────────────────────────
async function initDupEspAutocomplete(index, produtoId, currentEsp = null, currentPreco = null) {
  const input = document.querySelector(`.dup-esp-input[data-index="${index}"]`);
  const dd = document.getElementById(`dup-esp-dd-${index}`);
  const clearBtn = document.querySelector(`.dup-clear-esp[data-index="${index}"]`);
  if (!input || !dd) return;

  // Buscar espessuras se não estiver em cache
  if (!precosPorProduto[produtoId]) {
    try {
      const { data, error } = await supabase
        .from("product_thicknesses")
        .select("thickness, price_per_m2")
        .eq("website_item_id", produtoId)
        .order("thickness", { ascending: true });
      if (!error && data) {
        precosPorProduto[produtoId] = {};
        data.forEach(t => { precosPorProduto[produtoId][t.thickness] = t.price_per_m2; });
      }
    } catch (err) { console.error(err); }
  }

  const espessuras = precosPorProduto[produtoId]
    ? Object.entries(precosPorProduto[produtoId]).map(([t, p]) => ({
        display: `${t}mm`, thickness: parseInt(t), price: p
      }))
    : [];

  function showEspOptions(filter = "") {
    closeAllDupDropdowns();
    const filtered = filter
      ? espessuras.filter(e => {
          const num = filter.replace(/mm$/i, "").trim();
          return e.display.toLowerCase().startsWith(num.toLowerCase());
        })
      : espessuras;

    dd.innerHTML = "";
    filtered.forEach((e, idx) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item" + (idx === 0 ? " autocomplete-active" : "");
      div.textContent = e.display;
      div.addEventListener("click", (ev) => {
        ev.stopPropagation();
        input.value = e.display;
        duplicateItens[index].espessura = e.thickness;
        if (clearBtn) clearBtn.classList.remove("d-none");
        dd.classList.remove("show"); dd.innerHTML = "";
        // DEPOIS
        initDupAcabAutocomplete(index, e.thickness).then(() => {
          setTimeout(() => {
            const acabInput2 = document.querySelector(`.dup-acab-input[data-index="${index}"]`);
            if (acabInput2 && !acabInput2.disabled) acabInput2.focus();
            else {
              const precoInput2 = document.querySelector(`.dup-preco[data-index="${index}"]`);
              if (precoInput2) precoInput2.focus();
            }
          }, 50);
        });
        const cell = document.getElementById(`dup-total-${index}`);
        if (cell) cell.textContent = calcDupLineTotal(duplicateItens[index]).toFixed(2) + " €";
        recalcDuplicateTotal();
      });
      dd.appendChild(div);
    });
    if (filtered.length === 0) {
      dd.innerHTML = '<div class="autocomplete-item disabled">Sem espessuras</div>';
    }
    dd.classList.add("show");
  }

  function moveDupEspFocus(direction) {
    const items = dd.querySelectorAll(".autocomplete-item:not(.disabled)");
    if (!items.length) return;
    const current = dd.querySelector(".autocomplete-active");
    let idx = Array.from(items).indexOf(current);
    items.forEach(i => i.classList.remove("autocomplete-active"));
    if (direction === "down") idx = (idx < items.length - 1) ? idx + 1 : 0;
    else idx = (idx > 0) ? idx - 1 : items.length - 1;
    items[idx].classList.add("autocomplete-active");
    items[idx].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("click", (e) => { e.stopPropagation(); showEspOptions(input.value); });
  input.addEventListener("focus", () => showEspOptions(input.value));
  input.addEventListener("input", () => {
    showEspOptions(input.value);
    if (clearBtn) clearBtn.classList.toggle("d-none", !input.value.trim());
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); moveDupEspFocus("down"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveDupEspFocus("up"); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const active = dd.querySelector(".autocomplete-active");
      if (active) active.click();
      else { dd.classList.remove("show"); dd.innerHTML = ""; }
    } else if (e.key === "Escape") { dd.classList.remove("show"); dd.innerHTML = ""; }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      input.value = "";
      clearBtn.classList.add("d-none");
      duplicateItens[index].espessura = null;
      duplicateItens[index].type = null;
      duplicateItens[index].preco_mt2 = 0;
      duplicateItens[index].desconto_percentagem = 0;
      dd.classList.remove("show"); dd.innerHTML = "";
      // Limpar e desabilitar acabamento
      const acabInput = document.querySelector(`.dup-acab-input[data-index="${index}"]`);
      const acabClear = document.querySelector(`.dup-clear-acab[data-index="${index}"]`);
      if (acabInput) { acabInput.value = ""; acabInput.disabled = true; }
      if (acabClear) acabClear.classList.add("d-none");
      const precoInput = document.querySelector(`.dup-preco[data-index="${index}"]`);
      const descontoInput = document.querySelector(`.dup-desconto[data-index="${index}"]`);
      if (precoInput) precoInput.value = 0;
      if (descontoInput) descontoInput.value = 0;
      const cell = document.getElementById(`dup-total-${index}`);
      if (cell) cell.textContent = "0.00 €";
      recalcDuplicateTotal();
    });
  }

  // Preencher valor atual
  if (currentEsp !== null) {
    input.value = `${currentEsp}mm`;
    if (clearBtn) clearBtn.classList.remove("d-none");
    // Inicializar acabamentos com a espessura atual
    initDupAcabAutocomplete(index, currentEsp, duplicateItens[index].type);
  }
  if (currentPreco !== null) {
    duplicateItens[index].preco_mt2 = currentPreco;
  }
}

// ─── Autocomplete ACABAMENTO ─────────────────────────────────────
async function initDupAcabAutocomplete(index, espessuraSelecionada, currentAcab = null) {
  const input = document.querySelector(`.dup-acab-input[data-index="${index}"]`);
  const dd = document.getElementById(`dup-acab-dd-${index}`);
  const clearBtn = document.querySelector(`.dup-clear-acab[data-index="${index}"]`);
  if (!input || !dd) return;

  const produtoId = duplicateItens[index]._produtoId;
  if (!produtoId || !precosPorProduto[produtoId]) {
    input.disabled = true;
    return;
  }

  // Buscar acabamentos disponíveis para esta espessura
  let acabamentosData = [];
  try {
    const { data, error } = await supabase
      .from("product_thicknesses")
      .select("type, price_per_m2")
      .eq("website_item_id", produtoId)
      .eq("thickness", espessuraSelecionada);
    if (!error && data) {
      acabamentosData = data.map(a => ({ display: a.type, value: a.type, price: a.price_per_m2 }));
    }
  } catch (err) { console.error(err); }

  // Habilitar campo
  input.disabled = false;
  input.value = "";
  if (clearBtn) clearBtn.classList.add("d-none");
  duplicateItens[index].type = null;
  dd.classList.remove("show"); dd.innerHTML = "";



  // Preencher valor atual se passado
  if (currentAcab) {
    input.value = currentAcab;
    duplicateItens[index].type = currentAcab;
    if (clearBtn) clearBtn.classList.remove("d-none");
  }

  // Remover listeners anteriores clonando o input
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  const inp = document.querySelector(`.dup-acab-input[data-index="${index}"]`);

  function showAcabOptions(filter = "") {
    closeAllDupDropdowns();
    const filtered = filter
      ? acabamentosData.filter(a => a.display.toLowerCase().includes(filter.toLowerCase()))
      : acabamentosData;

    dd.innerHTML = "";
    filtered.forEach((a, idx) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item" + (idx === 0 ? " autocomplete-active" : "");
      div.textContent = a.display;
      const priceSpan = document.createElement("span");
      priceSpan.textContent = ` — ${parseFloat(a.price).toFixed(2)} €/m²`;
      priceSpan.style.fontSize = "11px";
      priceSpan.style.opacity = "0.7";
      div.appendChild(priceSpan);
      div.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        inp.value = a.display;
        duplicateItens[index].type = a.value;
        if (clearBtn) clearBtn.classList.remove("d-none");
        dd.classList.remove("show"); dd.innerHTML = "";
        setTimeout(() => {
          const precoInput2 = document.querySelector(`.dup-preco[data-index="${index}"]`);
          if (precoInput2) precoInput2.focus();
        }, 50);
        const cell = document.getElementById(`dup-total-${index}`);
        if (cell) cell.textContent = calcDupLineTotal(duplicateItens[index]).toFixed(2) + " €";
        recalcDuplicateTotal();
      });
      dd.appendChild(div);
    });
    if (filtered.length === 0) {
      dd.innerHTML = '<div class="autocomplete-item disabled">Sem acabamentos</div>';
    }
    dd.classList.add("show");
  }

  function moveDupAcabFocus(direction) {
    const items = dd.querySelectorAll(".autocomplete-item:not(.disabled)");
    if (!items.length) return;
    const current = dd.querySelector(".autocomplete-active");
    let idx = Array.from(items).indexOf(current);
    items.forEach(i => i.classList.remove("autocomplete-active"));
    if (direction === "down") idx = (idx < items.length - 1) ? idx + 1 : 0;
    else idx = (idx > 0) ? idx - 1 : items.length - 1;
    items[idx].classList.add("autocomplete-active");
    items[idx].scrollIntoView({ block: "nearest" });
  }

  inp.addEventListener("click", (e) => { e.stopPropagation(); showAcabOptions(inp.value); });
  inp.addEventListener("focus", () => showAcabOptions(inp.value));
  inp.addEventListener("input", () => {
    showAcabOptions(inp.value);
    if (clearBtn) clearBtn.classList.toggle("d-none", !inp.value.trim());
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); moveDupAcabFocus("down"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveDupAcabFocus("up"); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const active = dd.querySelector(".autocomplete-active");
      if (active) active.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      else { dd.classList.remove("show"); dd.innerHTML = ""; }
    } else if (e.key === "Escape") { dd.classList.remove("show"); dd.innerHTML = ""; }
  });

  if (clearBtn) {
    // Clonar para remover listeners antigos
    const newClear = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClear, clearBtn);
    const cb = document.querySelector(`.dup-clear-acab[data-index="${index}"]`);
    cb.addEventListener("click", (e) => {
      e.stopPropagation();
      inp.value = "";
      cb.classList.add("d-none");
      duplicateItens[index].type = null;
      dd.classList.remove("show"); dd.innerHTML = "";
      const cell = document.getElementById(`dup-total-${index}`);
      if (cell) cell.textContent = calcDupLineTotal(duplicateItens[index]).toFixed(2) + " €";
      recalcDuplicateTotal();
    });
  }
}

// ─── Fechar todos os dropdowns do modal duplicar ─────────────────
function closeAllDupDropdowns() {
  document.querySelectorAll("#duplicateModal .autocomplete-dropdown").forEach(dd => {
    dd.classList.remove("show");
    dd.innerHTML = "";
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#duplicateModal .autocomplete-wrapper")) {
    closeAllDupDropdowns();
  }
});

// ─── Confirmar duplicação ────────────────────────────────────────
// DEPOIS
document.getElementById("confirmDuplicateBtn").addEventListener("click", async () => {
  if (!orcamentoToDuplicate || duplicateItens.length === 0) return;

  for (let i = 0; i < duplicateItens.length; i++) {
    const item = duplicateItens[i];
    const isDiversos = item.brand === "diversos" || item.espessura === 0 || !item.brand;

    if (isDiversos) {
      if (!item.descricao || item.descricao.trim() === "") {
        showMessage(`⚠️ Linha ${i + 1}: preenche a descrição`, "warning"); return;
      }
    } else {
      if (!item.brand) {
        showMessage(`⚠️ Linha ${i + 1}: seleciona a marca`, "warning"); return;
      }
      if (!item.descricao || item.descricao.trim() === "") {
        showMessage(`⚠️ Linha ${i + 1}: seleciona a descrição`, "warning"); return;
      }
      // DEPOIS
      if (!item.espessura) {
        showMessage(`⚠️ Linha ${i + 1}: seleciona a espessura`, "warning"); return;
      }
      if (!item.type || item.type.trim() === "") {
        showMessage(`⚠️ Linha ${i + 1}: seleciona o acabamento`, "warning"); return;
      }
    }

    if (!item.preco_mt2 || item.preco_mt2 <= 0) {
      showMessage(`⚠️ Linha ${i + 1}: preço/m² deve ser maior que zero`, "warning"); return;
    }
  }

  try {
    showMessage("⏳ A duplicar orçamento...", "info");

    const totalGeral = duplicateItens.reduce((s, item) => s + calcDupLineTotal(item), 0);

    const { data: novoOrc, error: e1 } = await supabase
      .from("orcamentos")
      .insert({
        cliente_nome: orcamentoToDuplicate.cliente_nome,
        cliente_id: orcamentoToDuplicate.cliente_id || null,
        total_geral: totalGeral
      })
      .select().single();
    if (e1) throw e1;

    const itensParaInserir = duplicateItens.map(item => ({
      orcamento_id: novoOrc.id,
      tipo_id: item.tipo_id,
      brand: item.brand,
      descricao: item.descricao,
      quantidade: item.quantidade,
      comprimento: item.comprimento,
      largura: item.largura,
      espessura: item.espessura ?? 0,
      type: item.type || null,
      preco_mt2: item.preco_mt2,
      desconto_percentagem: item.desconto_percentagem || 0
    }));

    const { error: e2 } = await supabase.from("orcamento_itens").insert(itensParaInserir);
    if (e2) throw e2;

    showMessage(`✅ Orçamento duplicado! Novo nº: ${novoOrc.id}`, "success");

    bootstrap.Offcanvas.getInstance(document.getElementById("duplicateModal")).hide();
    orcamentoToDuplicate = null;
    duplicateItens = [];
    loadData();

  } catch (err) {
    console.error("Erro ao duplicar:", err);
    showMessage("❌ Erro ao duplicar: " + err.message, "danger");
  }
});

  await loadBrands();
  await loadTipos();
  await loadProdutosWebsite();
  loadData();

  console.log("✅ Lista de Orçamentos - Versão com Edição de Produtos Existentes e Botão Cancelar Edição");
};