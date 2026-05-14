// =====================================================
// FORM-ORCAMENTO.JS - VERSÃO COM COMPRIMENTO/LARGURA 4 DECIMAIS
// ✅ Aceita entrada com vírgula ou ponto (1,2324 ou 1.2324)
// ✅ Exibe sempre 4 casas decimais na tabela
// ✅ Valida e formata automaticamente
// =====================================================

window.initOrcamentoForm = function () {
  console.log("🚀 Iniciando formulário de orçamento...");
  
  if (!window.supabaseClient) {
    console.error("❌ Supabase não está inicializado!");
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  console.log("✅ Supabase client encontrado");
  const supabase = window.supabaseClient;

  // =====================================================
  // ELEMENTOS DOM
  // =====================================================
  const form = document.getElementById("orcamentoForm");
  const clienteNome = document.getElementById("clienteNome");
  
  // Campos do produto - AUTOCOMPLETE
  const produtoTipo = document.getElementById("produtoTipo");
  const produtoTipoId = document.getElementById("produtoTipoId");
  const tipoDropdown = document.getElementById("tipoDropdown");
  
  const produtoBrand = document.getElementById("produtoBrand");
  const produtoBrandKey = document.getElementById("produtoBrandKey");
  const brandDropdown = document.getElementById("brandDropdown");
  
  const produtoDescricao = document.getElementById("produtoDescricao");
  const produtoDescricaoId = document.getElementById("produtoDescricaoId");
  const descricaoDropdown = document.getElementById("descricaoDropdown");
  
  const produtoEspessura = document.getElementById("produtoEspessura");
  const produtoEspessuraValue = document.getElementById("produtoEspessuraValue");
  const espessuraDropdown = document.getElementById("espessuraDropdown");
  
  const produtoQuantidade = document.getElementById("produtoQuantidade");
  const produtoComprimento = document.getElementById("produtoComprimento");
  const produtoLargura = document.getElementById("produtoLargura");
  const produtoMt2 = document.getElementById("produtoMt2");
  const produtoPrecoMt2 = document.getElementById("produtoPrecoMt2");
  const produtoDesconto = document.getElementById("produtoDesconto");
  const produtoSubtotal = document.getElementById("produtoSubtotal");
  const produtoTotal = document.getElementById("produtoTotal");
  
  // Botões Clear
  const clearTipo = document.getElementById("clearTipo");
  const clearBrand = document.getElementById("clearBrand");
  const clearDescricao = document.getElementById("clearDescricao");
  const clearEspessura = document.getElementById("clearEspessura");
  
  // Botões
  const btnAdicionarProduto = document.getElementById("btnAdicionarProduto");
  const btnLimparProduto = document.getElementById("btnLimparProduto");
  const btnLimparOrcamento = document.getElementById("btnLimparOrcamento");
  const btnVerPrecario = document.getElementById("btnVerPrecario");
  
  // Tabela
  const produtosTableBody = document.getElementById("produtosTableBody");
  const totalGeralEl = document.getElementById("totalGeral");

  // Preçário
  const precarioModal = document.getElementById("precarioModal");
  const precarioTitulo = document.getElementById("precarioTitulo");
  const precarioTableBody = document.getElementById("precarioTableBody");
  const btnFecharPrecario = document.getElementById("btnFecharPrecario");

  
  const newTipoWrapper = document.getElementById("newTipoWrapper");
  const newTipoInput = document.getElementById("newTipo");
  const btnAddNewTipo = document.getElementById("btnAddNewTipo");

  const clienteId = document.getElementById("clienteId");
  const clienteDropdown = document.getElementById("clienteDropdown");
  const clearCliente = document.getElementById("clearCliente");
  const clienteDetalhes = document.getElementById("clienteDetalhes");
  let clientesData = []; // Cache local para pesquisa
  let modoAtualDiversos = false;

  console.log("✅ Elementos DOM carregados com sucesso");

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
  produtoComprimento.addEventListener("blur", function() {
    formatarComprimentoLargura(this);
    calcularValores();
  });

  produtoLargura.addEventListener("blur", function() {
    formatarComprimentoLargura(this);
    calcularValores();
  });

  // Permitir entrada com vírgula durante digitação
  produtoComprimento.addEventListener("input", function() {
    // Só recalcular, não formatar ainda (espera o blur)
    calcularValores();
  });

  produtoLargura.addEventListener("input", function() {
    // Só recalcular, não formatar ainda (espera o blur)
    calcularValores();
  });

  // =====================================================
  // ESTADO DA APLICAÇÃO
  // =====================================================
  let produtosAdicionados = [];
  let produtosWebsite = [];
  let precosPorProduto = {};
  
  // Dados para autocomplete
  let tiposData = [];
  let brandsData = [];
  let produtosDaMarca = [];
  let espessurasDisponiveis = [];

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
  produtoTipo.addEventListener("input", () => {
    toggleClearButton(produtoTipo, clearTipo);
  });

  clearTipo.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoTipo.value = "";
    produtoTipoId.value = "";
    clearTipo.classList.add("d-none");
    newTipoWrapper.classList.add("d-none");
    newTipoInput.value = "";

    // ✅ Reset modo diversos
    activarModoDiversos(false);

    produtoTipo.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - MARCA (CORRIGIDO)
  // =====================================================
  produtoBrand.addEventListener("input", () => {
    toggleClearButton(produtoBrand, clearBrand);
  });

  clearBrand.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoBrand.value = "";
    produtoBrandKey.value = "";
    clearBrand.classList.add("d-none");
    
    newBrandWrapper.classList.add("d-none");
    newBrandInput.value = "";
    
    produtoDescricao.value = "";
    produtoDescricaoId.value = "";
    produtoDescricao.disabled = true;
    produtoDescricao.placeholder = "Primeiro seleciona a marca...";
    clearDescricao.classList.add("d-none");
    
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";
    produtoEspessura.disabled = true;
    produtoEspessura.placeholder = "Primeiro seleciona a descrição...";
    clearEspessura.classList.add("d-none");
    
    resetCamposDependentes();
    
    produtoBrand.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - DESCRIÇÃO (CORRIGIDO)
  // =====================================================
  produtoDescricao.addEventListener("input", () => {
    toggleClearButton(produtoDescricao, clearDescricao);
  });

  clearDescricao.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoDescricao.value = "";
    produtoDescricaoId.value = "";
    clearDescricao.classList.add("d-none");
    
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";
    produtoEspessura.disabled = true;
    produtoEspessura.placeholder = "Primeiro seleciona a descrição...";
    clearEspessura.classList.add("d-none");
    
    resetCamposDependentes();
    produtoDescricao.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - ESPESSURA
  // =====================================================
  produtoEspessura.addEventListener("input", () => {
    toggleClearButton(produtoEspessura, clearEspessura);
  });

  clearEspessura.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";
    clearEspessura.classList.add("d-none");
    produtoPrecoMt2.value = "";
    calcularValores();
    produtoEspessura.focus();
  });

  // =====================================================
  // ✅ FUNÇÃO PARA VERIFICAR SE HÁ DADOS NO FORMULÁRIO
  // =====================================================
  function formularioTemDados() {
    return produtoTipo.value.trim() !== "" ||
           produtoBrand.value.trim() !== "" ||
           produtoDescricao.value.trim() !== "" ||
           produtoEspessura.value !== "" ||
           parseFloat(normalizeDecimalInput(produtoComprimento.value)) > 0 ||
           parseFloat(normalizeDecimalInput(produtoLargura.value)) > 0 ||
           parseFloat(produtoPrecoMt2.value) > 0 ||
           parseFloat(produtoDesconto.value) > 0;
  }

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
  // FUNÇÃO AUTOCOMPLETE GENÉRICA - MOSTRA TUDO AO CLICAR
  // =====================================================
  function setupAutocomplete(input, dropdown, data, onSelect, getDisplay = item => item.display, getValue = item => item.value) {
    let currentFocus = -1;
    
    if (!allDropdowns.includes(dropdown)) {
      allDropdowns.push(dropdown);
    }
    
    const clearBtn = input.parentElement.querySelector('.input-clear-btn');
    
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
        div.className = "autocomplete-item";
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
    
    // No evento click do input:
    input.addEventListener("click", function(e) {
      e.stopPropagation();
      // ✅ ADICIONADO: Se for o campo descrição em modo Diversos, não mostra dropdown
      if (input === produtoDescricao && modoAtualDiversos) return;
      showOptions(this.value.trim());
    });

    // No evento focus do input:
    input.addEventListener("focus", function(e) {
      // ✅ ADICIONADO: Se for o campo descrição em modo Diversos, não mostra dropdown
      if (input === produtoDescricao && modoAtualDiversos) return;
      showOptions(this.value.trim());
    });

    // No evento input do input:
    input.addEventListener("input", function() {
      // ✅ ADICIONADO: Se for o campo descrição em modo Diversos, não mostra dropdown
      if (input === produtoDescricao && modoAtualDiversos) return;
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
        if (currentFocus > -1 && items[currentFocus]) {
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

  async function loadClientes() {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("descricao", { ascending: true });

    if (error) throw error;

    // Formatamos os dados para mostrar as duas descrições no dropdown
    clientesData = data.map(c => ({
      display: c.descricao2 ? `${c.descricao} (${c.descricao2})` : c.descricao,
      search: `${c.descricao} ${c.descricao2 || ""}`.toLowerCase(),
      value: c.id,
      original: c
    }));

    setupAutocomplete(
      clienteNome,
      clienteDropdown,
      clientesData,
      (item) => {
        // Ao selecionar o cliente:
        clienteId.value = item.value;
        clienteNome.value = item.original.descricao; // Define o nome principal no input
        
        // Preenche info extra para o orçamento (opcional mostrar no ecrã)
        clienteDetalhes.innerHTML = `
            ${item.original.contribuinte || '---'} | 
            <strong>Telefone:</strong> ${item.original.telefone || '---'}<br>
            <small>${item.original.morada || ''}</small>
        `;
        
        // Aqui podes guardar outros campos no teu objeto de orçamento final
        window.selectedClienteData = item.original; 
      },
      item => item.display
    );

  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
  }
}

// Chamar a função no final do init


clienteNome.addEventListener("input", () => {
  toggleClearButton(clienteNome, clearCliente);
});

clearCliente.addEventListener("click", (e) => {
  e.stopPropagation();
  clienteNome.value = "";
  clienteId.value = "";
  clienteDetalhes.innerHTML = "";
  window.selectedClienteData = null;
  clearCliente.classList.add("d-none");
  clienteNome.focus();
});
  // =====================================================
  // CARREGAR TIPOS DE PRODUTO
  // =====================================================
  async function loadTipos() {
    try {
      console.log("🔄 Carregando tipos de produto...");
      
      const { data, error } = await supabase
        .from("type_products")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (error) throw error;

      console.log("✅ Tipos carregados:", data);

      if (!data || data.length === 0) {
        console.warn("⚠️ Nenhum tipo encontrado");
        return;
      }

      tiposData = data.map(tipo => ({
        display: tipo.nome,
        value: tipo.id,
        id: tipo.id,
        nome: tipo.nome
      }));
      
      tiposData.push({
        display: "+ Adicionar Novo Tipo",
        value: "novo_tipo",
        id: "novo_tipo",
        nome: "+ Adicionar Novo Tipo"
      });

      setupAutocomplete(
        produtoTipo,
        tipoDropdown,
        tiposData,
        (item) => {
          if (item.value === "novo_tipo") {
            produtoTipoId.value = "";
            newTipoWrapper.classList.remove("d-none");
            activarModoDiversos(false);
          } else {
            produtoTipoId.value = item.id;
            newTipoWrapper.classList.add("d-none");
            newTipoInput.value = "";

            // ✅ Verifica se é "Diversos"
            const isDiversos = item.nome.trim().toLowerCase() === "diversos";
            activarModoDiversos(isDiversos);
          }
        }
      );

      console.log(`✅ ${data.length} tipos configurados no autocomplete`);

    } catch (err) {
      console.error("❌ Erro ao carregar tipos:", err);
      showMessage("Erro ao carregar tipos: " + (err.message || err), "danger");
    }
  }

  // =====================================================
  // CARREGAR MARCAS
  // =====================================================
  async function loadBrands() {
    try {
      console.log("🔄 Carregando marcas...");
      
      const { data, error } = await supabase
        .from("brands")
        .select("display_name, website_key")
        .order("display_name", { ascending: true });

      if (error) throw error;

      console.log("✅ Marcas carregadas:", data);

      if (!data || data.length === 0) {
        console.warn("⚠️ Nenhuma marca encontrada");
        return;
      }

      brandsData = data.map(brand => ({
        display: brand.display_name,
        value: brand.website_key,
        website_key: brand.website_key,
        display_name: brand.display_name
      }));
      


      setupAutocomplete(
        produtoBrand,
        brandDropdown,
        brandsData,
        async (item) => {
          produtoBrandKey.value = item.website_key;
          await carregarDescricoesDaMarca(item.website_key);
        }
      );

      console.log(`✅ ${data.length} marcas configuradas no autocomplete`);

    } catch (err) {
      console.error("❌ Erro ao carregar marcas:", err);
      showMessage("Erro ao carregar marcas: " + (err.message || err), "danger");
    }
  }

  // =====================================================
  // CARREGAR PRODUTOS DO WEBSITE (CACHE)
  // =====================================================
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
  // ✅ CARREGAR DESCRIÇÕES DA MARCA SELECIONADA (CORRIGIDO)
  // =====================================================
  async function carregarDescricoesDaMarca(brandKey) {
    produtoDescricao.value = "";
    produtoDescricaoId.value = "";
    produtoDescricao.disabled = false;
    produtoDescricao.placeholder = "Seleciona a descrição...";
    clearDescricao.classList.add("d-none");
    
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";
    produtoEspessura.disabled = true;
    produtoEspessura.placeholder = "Primeiro seleciona a descrição...";
    clearEspessura.classList.add("d-none");
    
    resetCamposDependentes();

    produtosDaMarca = produtosWebsite.filter(p => p.Brand === brandKey).map(p => ({
      display: p.Title_pt,
      value: p.id,
      id: p.id,
      title: p.Title_pt
    }));

    if (produtosDaMarca.length === 0) {
      produtoDescricao.disabled = true;
      produtoDescricao.placeholder = "Nenhum produto disponível para esta marca";
      showMessage("⚠️ Nenhum produto disponível para esta marca", "warning");
      return;
    }

    setupAutocomplete(
      produtoDescricao,
      descricaoDropdown,
      produtosDaMarca,
      async (item) => {
        produtoDescricaoId.value = item.id;
        await carregarEspessuras(item.id);
      }
    );
  }

  // =====================================================
  // ✅ CARREGAR ESPESSURAS DISPONÍVEIS (AUTOCOMPLETE) (CORRIGIDO)
  // =====================================================
  async function carregarEspessuras(produtoId) {
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";
    produtoEspessura.disabled = false;
    produtoEspessura.placeholder = "Seleciona a espessura...";
    clearEspessura.classList.add("d-none");
    produtoPrecoMt2.value = "";
    btnVerPrecario.classList.add("d-none");
    espessurasDisponiveis = [];

    try {
      const { data: thicknesses, error } = await supabase
        .from("product_thicknesses")
        .select("thickness, price_per_m2")
        .eq("website_item_id", produtoId)
        .order("thickness", { ascending: true });

      if (error) throw error;

      if (!thicknesses || thicknesses.length === 0) {
        produtoEspessura.disabled = true;
        produtoEspessura.placeholder = "Sem espessuras disponíveis";
        showMessage("⚠️ Este produto não tem espessuras configuradas", "warning");
        return;
      }

      precosPorProduto[produtoId] = {};
      thicknesses.forEach(t => {
        precosPorProduto[produtoId][t.thickness] = t.price_per_m2;
      });

      espessurasDisponiveis = thicknesses.map(t => ({
        display: `${t.thickness}mm`,
        value: t.thickness,
        thickness: t.thickness,
        price: t.price_per_m2
      }));

      setupAutocomplete(
        produtoEspessura,
        espessuraDropdown,
        espessurasDisponiveis,
        (item) => {
          produtoEspessuraValue.value = item.thickness;
          calcularValores();
        }
      );

      btnVerPrecario.classList.remove("d-none");

    } catch (err) {
      console.error("Erro ao carregar espessuras:", err);
      showMessage("Erro ao carregar espessuras: " + err.message, "danger");
      produtoEspessura.disabled = true;
    }
  }

  // =====================================================
  // ✅ RESETAR CAMPOS DEPENDENTES
  // =====================================================
  function resetCamposDependentes() {
    espessurasDisponiveis = [];
    produtoPrecoMt2.value = "";
    btnVerPrecario.classList.add("d-none");
    if (precarioAberto) {
      fecharPrecario();
    }
  }

  // =====================================================
  // ✅ MODO DIVERSOS - Ativa/desativa campos especiais
  // =====================================================
  function activarModoDiversos(ativo) {
    modoAtualDiversos = ativo;

    descricaoDropdown.classList.remove("show");
  descricaoDropdown.innerHTML = "";
  const modoDiversosBadge = document.getElementById("modoDiversosBadge");

  // Wrappers das colunas (col-md-X que envolvem os campos)
  const colMarca = produtoBrand.closest(".col-md-3");
  const colEspessura = produtoEspessura.closest(".col-md-3");
  const colComprimento = produtoComprimento.closest(".col-md-2");
  const colLargura = produtoLargura.closest(".col-md-2");

  if (ativo) {
    // Descrição livre
    produtoDescricao.value = "";
    produtoDescricao.disabled = false;
    produtoDescricao.placeholder = "Descreve o artigo...";
    produtoDescricaoId.value = "diversos";

    // ESCONDE colunas que não se usam
    if (colMarca) colMarca.classList.add("d-none");
    if (colEspessura) colEspessura.classList.add("d-none");
    if (colComprimento) colComprimento.classList.add("d-none");
    if (colLargura) colLargura.classList.add("d-none");

    // Limpa valores internos
    produtoBrand.value = "";
    produtoBrandKey.value = "diversos";
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "0";
    produtoComprimento.value = "";
    produtoLargura.value = "";

    btnVerPrecario.classList.add("d-none");
    if (modoDiversosBadge) modoDiversosBadge.classList.remove("d-none");

  } else {
    // MOSTRA todas as colunas novamente
    if (colMarca) colMarca.classList.remove("d-none");
    if (colEspessura) colEspessura.classList.remove("d-none");
    if (colComprimento) colComprimento.classList.remove("d-none");
    if (colLargura) colLargura.classList.remove("d-none");


    // Restaura estado normal
    produtoBrand.disabled = false;
    produtoDescricao.disabled = true;
    produtoDescricao.placeholder = "Primeiro seleciona a marca...";
    produtoDescricaoId.value = "";
    produtoBrand.value = "";
    produtoBrandKey.value = "";

    produtoEspessura.disabled = true;
    produtoEspessura.value = "";
    produtoEspessuraValue.value = "";

    produtoComprimento.disabled = false;
    produtoComprimento.value = "";
    produtoLargura.disabled = false;
    produtoLargura.value = "";

    if (modoDiversosBadge) modoDiversosBadge.classList.add("d-none");
  }
  calcularValores();
}

  // =====================================================
  // ADICIONAR NOVO TIPO
  // =====================================================
  btnAddNewTipo.addEventListener("click", async () => {
    const novoTipoNome = newTipoInput.value.trim();
    
    if (!novoTipoNome) {
      showMessage("⚠️ Digite o nome do novo tipo", "warning");
      newTipoInput.focus();
      return;
    }

    try {
      showMessage("⏳ Adicionando novo tipo...", "info");

      const { data, error } = await supabase
        .from("type_products")
        .insert([{ nome: novoTipoNome }])
        .select();

      if (error) throw error;

      showMessage("✅ Novo tipo adicionado com sucesso!", "success");

      await loadTipos();

      produtoTipo.value = novoTipoNome;
      produtoTipoId.value = data[0].id;
      clearTipo.classList.remove("d-none");

      newTipoWrapper.classList.add("d-none");
      newTipoInput.value = "";

    } catch (err) {
      console.error("Erro ao adicionar tipo:", err);
      showMessage("❌ Erro ao adicionar tipo: " + (err.message || err), "danger");
    }
  });



  // =====================================================
  // VALIDAÇÃO DO CAMPO DESCONTO
  // =====================================================
  produtoDesconto.addEventListener("input", (e) => {
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
    
    calcularValores();
  });

  // =====================================================
  // ✅ CALCULAR M², SUBTOTAL E TOTAL (COM NORMALIZAÇÃO)
  // =====================================================
  function calcularValores() {
  const qtd = parseInt(produtoQuantidade.value) || 0;
  const isDiversos = produtoTipoId.value !== "" &&
    produtoTipo.value.trim().toLowerCase() === "diversos";

  let compM, largM;

  if (isDiversos) {
    // m² = quantidade (comprimento e largura = 1)
    compM = 1;
    largM = 1;
  } else {
    compM = parseFloat(normalizeDecimalInput(produtoComprimento.value)) || 0;
    largM = parseFloat(normalizeDecimalInput(produtoLargura.value)) || 0;
  }

  const precoMt2 = parseFloat(produtoPrecoMt2.value) || 0;
  let desconto = parseFloat(produtoDesconto.value) || 0;
  if (desconto < 0) desconto = 0;
  if (desconto > 100) desconto = 100;

  const mt2 = qtd * compM * largM;
  produtoMt2.value = mt2.toFixed(4);

  const fatorDesconto = 1 - (desconto / 100);
  const subtotal = compM * largM * precoMt2 * fatorDesconto;
  produtoSubtotal.value = subtotal > 0 ? subtotal.toFixed(2) : "0.00";

  const total = subtotal * qtd;
  produtoTotal.value = total > 0 ? total.toFixed(2) : "0.00";
}

  produtoQuantidade.addEventListener("input", calcularValores);
  produtoPrecoMt2.addEventListener("input", calcularValores);

  produtoDesconto.addEventListener("focus", function() {
    this.select();
  });

  // =====================================================
  // VER PREÇÁRIO
  // =====================================================
  let precarioAberto = false;

  btnVerPrecario.addEventListener("click", () => {
    if (precarioAberto) {
      fecharPrecario();
    } else {
      abrirPrecario();
    }
  });

  btnFecharPrecario.addEventListener("click", () => {
    fecharPrecario();
  });

  function abrirPrecario() {
    const produtoId = produtoDescricaoId.value;
    if (!produtoId || !precosPorProduto[produtoId]) {
      showMessage("⚠️ Seleciona uma descrição primeiro", "warning");
      return;
    }

    precarioTitulo.textContent = produtoDescricao.value;

    precarioTableBody.innerHTML = "";
    const precos = precosPorProduto[produtoId];
    
    Object.keys(precos).sort((a, b) => a - b).forEach(thickness => {
      const preco = precos[thickness];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${thickness}mm</strong></td>
        <td class="text-end">${parseFloat(preco).toFixed(2)} €</td>
      `;
      precarioTableBody.appendChild(tr);
    });

    precarioModal.classList.remove("d-none");
    precarioAberto = true;

    btnVerPrecario.innerHTML = '<i class="bi bi-x-circle me-2"></i> Fechar Preçário';
    btnVerPrecario.style.backgroundColor = "#dc3545";
  }

  function fecharPrecario() {
    precarioModal.classList.add("closing");
    
    setTimeout(() => {
      precarioModal.classList.add("d-none");
      precarioModal.classList.remove("closing");
      precarioAberto = false;
      
      btnVerPrecario.innerHTML = '<i class="bi bi-table me-2"></i> Ver Preçário';
      btnVerPrecario.style.backgroundColor = "#5b899f";
    }, 300);
  }

  // =====================================================
  // ✅ ADICIONAR PRODUTO À TABELA (COM NORMALIZAÇÃO)
  // =====================================================
  btnAdicionarProduto.addEventListener("click", () => {
  const isDiversos = produtoTipo.value.trim().toLowerCase() === "diversos";

  if (!produtoTipoId.value) {
    showMessage("⚠️ Seleciona o tipo", "warning");
    return;
  }

  if (isDiversos) {
    if (!produtoDescricao.value.trim()) {
      showMessage("⚠️ Escreve a descrição do artigo", "warning");
      return;
    }
  } else {
    if (!produtoBrandKey.value) {
      showMessage("⚠️ Seleciona a marca", "warning");
      return;
    }
    if (!produtoDescricaoId.value) {
      showMessage("⚠️ Seleciona a descrição", "warning");
      return;
    }
    if (!produtoEspessuraValue.value) {
      showMessage("⚠️ Seleciona a espessura", "warning");
      return;
    }
    const compM = parseFloat(normalizeDecimalInput(produtoComprimento.value));
    const largM = parseFloat(normalizeDecimalInput(produtoLargura.value));
    if (!compM || compM <= 0) {
      showMessage("⚠️ Comprimento deve ser maior que zero", "warning");
      return;
    }
    if (!largM || largM <= 0) {
      showMessage("⚠️ Largura deve ser maior que zero", "warning");
      return;
    }
  }

  if (!produtoQuantidade.value || produtoQuantidade.value <= 0) {
    showMessage("⚠️ Quantidade deve ser maior que zero", "warning");
    return;
  }
  if (!produtoPrecoMt2.value || produtoPrecoMt2.value <= 0) {
    showMessage("⚠️ Preço/m² deve ser maior que zero", "warning");
    return;
  }

  const compM = isDiversos ? 1 : parseFloat(normalizeDecimalInput(produtoComprimento.value));
  const largM = isDiversos ? 1 : parseFloat(normalizeDecimalInput(produtoLargura.value));

  const produto = {
    id: Date.now(),
    isDiversos: isDiversos,
    tipo_id: parseInt(produtoTipoId.value),
    tipoNome: produtoTipo.value,
    brand: isDiversos ? "" : produtoBrandKey.value,
    brandNome: isDiversos ? "" : produtoBrand.value,
    descricao: produtoDescricao.value,
    quantidade: parseInt(produtoQuantidade.value),
    comprimento: compM,
    largura: largM,
    espessura: isDiversos ? null : parseInt(produtoEspessuraValue.value),
    mt2: parseFloat(produtoMt2.value),
    preco_mt2: parseFloat(produtoPrecoMt2.value),
    desconto_percentagem: parseFloat(produtoDesconto.value) || 0,
    subtotal: parseFloat(produtoSubtotal.value),
    total: parseFloat(produtoTotal.value)
  };

  produtosAdicionados.push(produto);
  renderProdutosTable();
  limparCamposProduto();
});

  // =====================================================
  // ✅ BOTÃO LIMPAR PRODUTO
  // =====================================================
  btnLimparProduto.addEventListener("click", () => {
    if (!formularioTemDados()) {
      showMessage("⚠️ Não há dados para limpar", "warning");
      return;
    }
    limparCamposProduto();
    showMessage("🧹 Formulário limpo", "info");
  });

  // =====================================================
  // ✅ RENDERIZAR TABELA DE PRODUTOS (EXIBIR 4 DECIMAIS)
  // =====================================================
  function renderProdutosTable() {
    if (produtosAdicionados.length === 0) {
      produtosTableBody.innerHTML = `
        <tr>
          <td colspan="13" class="text-muted" style="background-color: #eeeeef; border-color: #cbccce;">Nenhum produto adicionado</td>
        </tr>
      `;
      totalGeralEl.textContent = "0.00 €";
      return;
    }

    produtosTableBody.innerHTML = "";
    let totalGeral = 0;

    produtosAdicionados.forEach((produto, index) => {
      totalGeral += produto.total;

      const tr = document.createElement("tr");
      tr.className = "produto-row";
      tr.innerHTML = `
        <td>${produto.tipoNome}</td>
        <td>${produto.isDiversos ? "" : produto.brandNome}</td>
        <td class="text-start">${produto.descricao}</td>
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
          <button type="button" class="btn-remove" data-index="${index}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      produtosTableBody.appendChild(tr);
    });

    totalGeralEl.textContent = totalGeral.toFixed(2) + " €";
  }

  // =====================================================
  // REMOVER PRODUTO
  // =====================================================
  produtosTableBody.addEventListener("click", (e) => {
    if (e.target.closest(".btn-remove")) {
      const index = parseInt(e.target.closest(".btn-remove").dataset.index);
      produtosAdicionados.splice(index, 1);
      renderProdutosTable();
      showMessage("🗑️ Produto removido", "info");
    }
  });

  // =====================================================
  // ✅ LIMPAR CAMPOS DO PRODUTO (CORRIGIDO)
  // =====================================================
  function limparCamposProduto() {
    produtoTipo.value = "";
    produtoTipoId.value = "";
    clearTipo.classList.add("d-none");
    
    produtoBrand.value = "";
    produtoBrandKey.value = "";
    clearBrand.classList.add("d-none");
    
    produtoDescricao.value = "";
    produtoDescricao.disabled = true;
    produtoDescricao.placeholder = "Primeiro seleciona a marca...";
    produtoDescricaoId.value = "";
    clearDescricao.classList.add("d-none");
    
    produtoEspessura.value = "";
    produtoEspessura.disabled = true;
    produtoEspessura.placeholder = "Primeiro seleciona a descrição...";
    produtoEspessuraValue.value = "";
    clearEspessura.classList.add("d-none");
    espessurasDisponiveis = [];
    
    produtoQuantidade.value = 1;
    produtoComprimento.value = "";
    produtoLargura.value = "";
    produtoMt2.value = "";
    produtoPrecoMt2.value = "";
    produtoDesconto.value = "0";
    produtoDesconto.dataset.lastValid = "0";
    produtoSubtotal.value = "";
    produtoTotal.value = "";
    
    btnVerPrecario.classList.add("d-none");
    if (precarioAberto) {
      fecharPrecario();
    }

    // ✅ Restaura todos os campos visíveis após adicionar produto
    activarModoDiversos(false);
  }

  // =====================================================
  // LIMPAR TODO O ORÇAMENTO
  // =====================================================
  btnLimparOrcamento.addEventListener("click", () => {
    if (produtosAdicionados.length === 0 && !clienteNome.value.trim()) {
      showMessage("⚠️ Não há dados para limpar", "warning");
      return;
    }
    
    const limparModal = new bootstrap.Modal(document.getElementById('limparOrcamentoModal'));
    limparModal.show();
  });

  document.getElementById('confirmLimparOrcamentoBtn').addEventListener('click', () => {
    const limparModal = bootstrap.Modal.getInstance(document.getElementById('limparOrcamentoModal'));
    limparModal.hide();
    
    clienteNome.value = "";
    clienteId.value = "";
    clienteDetalhes.innerHTML = "";
    window.selectedClienteData = null;
    clearCliente.classList.add("d-none");
    produtosAdicionados = [];
    limparCamposProduto();
    renderProdutosTable();
    showMessage("🔄 Orçamento limpo com sucesso", "success");
  });

  // =====================================================
  // ✅ SUBMIT DO FORMULÁRIO (COM NORMALIZAÇÃO)
  // =====================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!clienteNome.value.trim()) {
      showMessage("⚠️ Digite o nome do cliente", "warning");
      clienteNome.focus();
      return;
    }

    if (formularioTemDados()) {
      showMessage("⚠️ Ainda tem dados no formulário de produto! Use o botão 'Limpar Produto' ou adicione o produto antes de guardar.", "warning");
      return;
    }

    if (produtosAdicionados.length === 0) {
      showMessage("⚠️ Adicione pelo menos um produto ao orçamento", "warning");
      return;
    }

    try {
      showMessage("⏳ A guardar orçamento...", "info");

      const totalGeral = produtosAdicionados.reduce((sum, p) => sum + p.total, 0);

      // Dentro do form.addEventListener("submit", ...)
      const dadosParaInserir = {
          cliente_nome: clienteNome.value.trim(),
          cliente_id: clienteId.value ? parseInt(clienteId.value) : null,
          total_geral: totalGeral,
          data_criacao: new Date().toISOString()
      };

      // Se tiveres uma coluna orcamento_json ou similar para guardar tudo:
      // dadosParaInserir.detalhes_json = JSON.stringify(items); 

      const { data: orcamentoData, error: orcamentoError } = await supabase
          .from("orcamentos")
          .insert([dadosParaInserir])
          .select();

      if (orcamentoError) {
          console.error("Erro detalhado do Supabase:", orcamentoError);
          throw new Error(orcamentoError.message);
      }
      const orcamentoId = orcamentoData[0].id;

      const itensParaInserir = produtosAdicionados.map(p => ({
        orcamento_id: orcamentoId,
        tipo_id: p.tipo_id,
        brand: p.brand,
        descricao: p.descricao,
        quantidade: p.quantidade,
        comprimento: p.comprimento,
        largura: p.largura,
        espessura: p.espessura ?? 0,        // ✅ Se null (Diversos), guarda 0
        preco_mt2: p.preco_mt2,
        desconto_percentagem: p.desconto_percentagem
      }));

      const { error: itensError } = await supabase
        .from("orcamento_itens")
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      showMessage("✅ Orçamento guardado com sucesso!", "success");

      clienteNome.value = "";
      clienteId.value = "";
      clienteDetalhes.innerHTML = "";
      window.selectedClienteData = null;
      clearCliente.classList.add("d-none");
      produtosAdicionados = [];
      limparCamposProduto();
      renderProdutosTable();

    } catch (err) {
      console.error("❌ Erro ao guardar:", err);
      showMessage("❌ Erro ao guardar orçamento: " + (err.message || err), "danger");
    }
  });

  // =====================================================
  // ATALHOS DE TECLADO
  // =====================================================
  clienteNome.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      produtoTipo.focus();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      btnAdicionarProduto.click();
    }
  });

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================
  loadTipos();
  loadBrands();
  loadProdutosWebsite();
  loadClientes();

  console.log("✅ Formulário de Orçamento inicializado - Versão com Comprimento/Largura 4 Decimais");
};