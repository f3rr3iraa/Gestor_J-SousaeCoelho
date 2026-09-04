// =====================================================
// FORM-ORCAMENTO.JS - VERSÃO COM COMPRIMENTO/LARGURA 4 DECIMAIS
// ✅ Aceita entrada com vírgula ou ponto (1,2324 ou 1.2324)
// ✅ Exibe sempre 4 casas decimais na tabela
// ✅ Valida e formata automaticamente
// ✅ Preço/m² NÃO assumido automaticamente
// ✅ Quantidade e Desconto: seleciona tudo ao focar
// ✅ Enter no Desconto abre modal de confirmação
// =====================================================

window.initOrcamentoForm = async function () {
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

  const produtoTipoAcabamento = document.getElementById("produtoTipoAcabamento");
  const produtoTipoAcabamentoValue = document.getElementById("produtoTipoAcabamentoValue");
  const tipoAcabamentoDropdown = document.getElementById("tipoAcabamentoDropdown");
  const clearTipoAcabamento = document.getElementById("clearTipoAcabamento");
  
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
  let clientesData = [];
  let modoAtualDiversos = false;

  console.log("✅ Elementos DOM carregados com sucesso");

  // =====================================================
  // ✅ PERSISTÊNCIA DO RASCUNHO (não perder dados ao trocar de página)
  // Guarda tudo em sessionStorage: mantém-se ao navegar entre páginas
  // da aplicação e só desaparece quando o utilizador limpa/guarda
  // o orçamento ou fecha a página/separador do browser.
  // =====================================================
  const ORCAMENTO_STORAGE_KEY = "orcamentoFormDraft_v1";

  function coletarEstadoOrcamento() {
    return {
      cliente: {
        nome: clienteNome.value,
        id: clienteId.value,
        detalhesHtml: clienteDetalhes.innerHTML,
        original: window.selectedClienteData || null,
      },
      produtos: produtosAdicionados,
      produtoAtual: {
        modoDiversos: modoAtualDiversos,
        tipoNome: produtoTipo.value,
        tipoId: produtoTipoId.value,
        brandNome: produtoBrand.value,
        brandKey: produtoBrandKey.value,
        descricao: produtoDescricao.value,
        descricaoId: produtoDescricaoId.value,
        espessuraTexto: produtoEspessura.value,
        espessuraValue: produtoEspessuraValue.value,
        tipoAcabamentoTexto: produtoTipoAcabamento.value,
        tipoAcabamentoValue: produtoTipoAcabamentoValue.value,
        quantidade: produtoQuantidade.value,
        comprimento: produtoComprimento.value,
        largura: produtoLargura.value,
        precoMt2: produtoPrecoMt2.value,
        desconto: produtoDesconto.value,
      },
    };
  }

  let guardarEstadoTimeout = null;
  function guardarEstadoOrcamento() {
    clearTimeout(guardarEstadoTimeout);
    guardarEstadoTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(ORCAMENTO_STORAGE_KEY, JSON.stringify(coletarEstadoOrcamento()));
      } catch (err) {
        console.warn("⚠️ Não foi possível guardar o rascunho do orçamento:", err);
      }
    }, 150);
  }

  function limparEstadoOrcamento() {
    clearTimeout(guardarEstadoTimeout);
    try {
      sessionStorage.removeItem(ORCAMENTO_STORAGE_KEY);
    } catch (err) {
      // ignora
    }
  }

  // Guarda automaticamente qualquer alteração escrita nos campos do formulário
  form.addEventListener("input", guardarEstadoOrcamento);
  form.addEventListener("change", guardarEstadoOrcamento);

  async function restaurarEstadoOrcamento() {
    let raw;
    try {
      raw = sessionStorage.getItem(ORCAMENTO_STORAGE_KEY);
    } catch (err) {
      return;
    }
    if (!raw) return;

    let estado;
    try {
      estado = JSON.parse(raw);
    } catch (err) {
      return;
    }

    // Cliente
    if (estado.cliente) {
      clienteNome.value = estado.cliente.nome || "";
      clienteId.value = estado.cliente.id || "";
      clienteDetalhes.innerHTML = estado.cliente.detalhesHtml || "";
      window.selectedClienteData = estado.cliente.original || null;
      toggleClearButton(clienteNome, clearCliente);
    }

    // Produtos já adicionados ao orçamento
    if (Array.isArray(estado.produtos) && estado.produtos.length > 0) {
      produtosAdicionados = estado.produtos;
      renderProdutosTable();
    }

    // Linha de produto que estava a ser preenchida
    const p = estado.produtoAtual;
    if (p && (p.tipoNome || p.descricao || p.brandNome)) {
      produtoTipo.value = p.tipoNome || "";
      produtoTipoId.value = p.tipoId || "";
      toggleClearButton(produtoTipo, clearTipo);

      if (p.modoDiversos) {
        activarModoDiversos(true);
        produtoDescricao.value = p.descricao || "";
        produtoDescricaoId.value = "diversos";
      } else if (p.brandKey) {
        produtoBrand.value = p.brandNome || "";
        produtoBrandKey.value = p.brandKey;
        toggleClearButton(produtoBrand, clearBrand);

        try {
          await carregarDescricoesDaMarca(p.brandKey);

          if (p.descricaoId) {
            produtoDescricao.value = p.descricao || "";
            produtoDescricaoId.value = p.descricaoId;
            toggleClearButton(produtoDescricao, clearDescricao);

            await carregarEspessuras(p.descricaoId);

            if (p.espessuraValue) {
              produtoEspessura.value = p.espessuraTexto || "";
              produtoEspessuraValue.value = p.espessuraValue;
              toggleClearButton(produtoEspessura, clearEspessura);
              produtoTipoAcabamento.disabled = false;
              produtoTipoAcabamento.placeholder = "Seleciona...";
              carregarTiposAcabamento(p.descricaoId, p.espessuraValue);
              btnVerPrecario.classList.remove("d-none");

              if (p.tipoAcabamentoValue) {
                produtoTipoAcabamento.value = p.tipoAcabamentoTexto || "";
                produtoTipoAcabamentoValue.value = p.tipoAcabamentoValue;
                toggleClearButton(produtoTipoAcabamento, clearTipoAcabamento);
              }
            }
          }
        } catch (err) {
          console.warn("⚠️ Não foi possível restaurar por completo a linha de produto:", err);
        }
      }

      produtoQuantidade.value = p.quantidade || 1;
      produtoComprimento.value = p.comprimento || "";
      produtoLargura.value = p.largura || "";
      produtoPrecoMt2.value = p.precoMt2 || "";
      produtoDesconto.value = p.desconto || "0";
      produtoDesconto.dataset.lastValid = p.desconto || "0";

      calcularValores();
    }
  }

  // =====================================================
  // ✅ FUNÇÃO PARA NORMALIZAR ENTRADA DE NÚMEROS DECIMAIS
  // =====================================================
  function normalizeDecimalInput(value) {
    if (!value || value.trim() === "") return "";
    return value.replace(",", ".");
  }

  // =====================================================
  // ✅ FORMATAÇÃO DE COMPRIMENTO E LARGURA (4 DECIMAIS)
  // =====================================================
  function formatarComprimentoLargura(input) {
    let valor = input.value.trim();
    if (!valor) return;
    valor = normalizeDecimalInput(valor);
    const numero = parseFloat(valor);
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

  produtoComprimento.addEventListener("input", function() {
    calcularValores();
  });

  produtoLargura.addEventListener("input", function() {
    calcularValores();
  });

  // ✅ Quantidade e Preço/m² também têm de recalcular Subtotal/Total
  produtoQuantidade.addEventListener("input", function() {
    calcularValores();
  });

  produtoPrecoMt2.addEventListener("input", function() {
    calcularValores();
  });

  // =====================================================
  // ✅ [ALTERAÇÃO 2] SELECIONAR TUDO AO FOCAR - QUANTIDADE E DESCONTO
  // =====================================================
  produtoQuantidade.addEventListener("focus", function() {
    this.select();
  });

  produtoDesconto.addEventListener("focus", function() {
    this.select();
  });

  // =====================================================
  // ESTADO DA APLICAÇÃO
  // =====================================================
  let produtosAdicionados = [];
  let produtosWebsite = [];
  let precosPorProduto = {};
  
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
    activarModoDiversos(false);
    guardarEstadoOrcamento();
    produtoTipo.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - MARCA
  // =====================================================
  produtoBrand.addEventListener("input", () => {
    toggleClearButton(produtoBrand, clearBrand);
  });

  clearBrand.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoBrand.value = "";
    produtoBrandKey.value = "";
    clearBrand.classList.add("d-none");
    
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

    produtoTipoAcabamento.value = "";
    produtoTipoAcabamentoValue.value = "";
    produtoTipoAcabamento.disabled = true;
    produtoTipoAcabamento.placeholder = "Primeiro seleciona espessura...";
    clearTipoAcabamento.classList.add("d-none");
    
    resetCamposDependentes();
    guardarEstadoOrcamento();
    produtoBrand.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - DESCRIÇÃO
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

    produtoTipoAcabamento.value = "";
    produtoTipoAcabamentoValue.value = "";
    produtoTipoAcabamento.disabled = true;
    produtoTipoAcabamento.placeholder = "Primeiro seleciona espessura...";
    clearTipoAcabamento.classList.add("d-none");
    
    resetCamposDependentes();
    guardarEstadoOrcamento();
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
    produtoTipoAcabamento.value = "";
    produtoTipoAcabamentoValue.value = "";
    produtoTipoAcabamento.disabled = true;
    produtoTipoAcabamento.placeholder = "Primeiro seleciona espessura...";
    clearTipoAcabamento.classList.add("d-none");
    produtoPrecoMt2.value = "";
    calcularValores();
    guardarEstadoOrcamento();
    produtoEspessura.focus();
  });

  // =====================================================
  // ✅ EVENTOS CLEAR - ACABAMENTO
  // =====================================================
  produtoTipoAcabamento.addEventListener("input", () => {
    toggleClearButton(produtoTipoAcabamento, clearTipoAcabamento);
  });

  clearTipoAcabamento.addEventListener("click", (e) => {
    e.stopPropagation();
    produtoTipoAcabamento.value = "";
    produtoTipoAcabamentoValue.value = "";
    clearTipoAcabamento.classList.add("d-none");
    produtoPrecoMt2.value = "";
    calcularValores();
    guardarEstadoOrcamento();
    produtoTipoAcabamento.focus();
  });

  // =====================================================
  // ✅ ESCRITA MANUAL — Descrição, Espessura e Acabamento
  // Permite escrever estes campos mesmo que o valor não
  // exista na base de dados / preçário, sem obrigar a
  // escolher uma opção da lista de sugestões.
  // =====================================================
  function parseNumeroLivre(texto) {
    if (!texto) return null;
    const match = texto.replace(",", ".").match(/[\d]+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  produtoDescricao.addEventListener("blur", () => {
    setTimeout(() => {
      if (modoAtualDiversos) return;
      if (produtoDescricao.disabled) return;
      if (produtoDescricao.value.trim() === "") return;
      if (produtoDescricaoId.value) return; // já selecionado da lista

      produtoDescricaoId.value = "manual";
      toggleClearButton(produtoDescricao, clearDescricao);

      produtoEspessura.disabled = false;
      produtoEspessura.placeholder = "Escreve a espessura manualmente (mm)...";
      btnVerPrecario.classList.add("d-none");
      guardarEstadoOrcamento();
    }, 200);
  });

  produtoEspessura.addEventListener("blur", () => {
    setTimeout(() => {
      if (produtoEspessura.disabled) return;
      if (produtoEspessura.value.trim() === "") return;
      if (produtoEspessuraValue.value) return; // já selecionado da lista

      const numero = parseNumeroLivre(produtoEspessura.value);
      produtoEspessuraValue.value = numero !== null ? numero : produtoEspessura.value.trim();
      toggleClearButton(produtoEspessura, clearEspessura);

      produtoTipoAcabamento.disabled = false;
      produtoTipoAcabamento.placeholder = "Escreve o acabamento manualmente...";
      btnVerPrecario.classList.add("d-none");
      calcularValores();
      guardarEstadoOrcamento();
    }, 200);
  });

  produtoTipoAcabamento.addEventListener("blur", () => {
    setTimeout(() => {
      if (produtoTipoAcabamento.disabled) return;
      if (produtoTipoAcabamento.value.trim() === "") return;
      if (produtoTipoAcabamentoValue.value) return; // já selecionado da lista

      produtoTipoAcabamentoValue.value = produtoTipoAcabamento.value.trim();
      toggleClearButton(produtoTipoAcabamento, clearTipoAcabamento);
      calcularValores();
      guardarEstadoOrcamento();
    }, 200);
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
  // ✅ AVANÇAR PARA O CAMPO SEGUINTE
  // Usado quando o Enter é pressionado num autocomplete que
  // mostra "Nenhum resultado encontrado" — em vez de bloquear
  // o Enter (que antes não fazia nada), avança para o campo
  // seguinte do formulário, respeitando a ordem natural do DOM.
  // =====================================================
  function focarProximoCampo(campoAtual) {
    const focaveis = Array.from(
      form.querySelectorAll("input, select, textarea, button")
    ).filter(el => {
      if (el.disabled) return false;
      if (el.type === "hidden") return false;
      if (el.offsetParent === null) return false; // escondido (d-none, etc.)
      return true;
    });

    const indexAtual = focaveis.indexOf(campoAtual);
    if (indexAtual === -1) return;

    for (let i = indexAtual + 1; i < focaveis.length; i++) {
      focaveis[i].focus();
      if (document.activeElement === focaveis[i]) return;
    }
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
          if (clearBtn) clearBtn.classList.remove("d-none");
        });

        dropdown.appendChild(div);
      });

      currentFocus = 0;
      dropdown.classList.add("show");
    }
    
    input.addEventListener("click", function(e) {
      e.stopPropagation();
      if (input === produtoDescricao && modoAtualDiversos) return;
      showOptions(this.value.trim());
    });

    input.addEventListener("focus", function(e) {
      if (input === produtoDescricao && modoAtualDiversos) return;
      showOptions(this.value.trim());
    });

    input.addEventListener("input", function() {
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

        // ✅ Se o dropdown está a mostrar "Nenhum resultado encontrado",
        // não bloqueia o Enter: fecha a lista e avança para o campo seguinte.
        const semResultados = dropdown.querySelector(".autocomplete-item.disabled");
        if (semResultados) {
          closeAllLists();
          focarProximoCampo(input);
          return;
        }

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

  async function loadClientes() {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("descricao", { ascending: true });

      if (error) throw error;

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
          clienteId.value = item.value;
          clienteNome.value = item.original.descricao;
          clienteDetalhes.innerHTML = `
            ${item.original.contribuinte || '---'} | 
            <strong>Telefone:</strong> ${item.original.telefone || '---'}<br>
            <small>${item.original.morada || ''}</small>
          `;
          window.selectedClienteData = item.original;
          guardarEstadoOrcamento();
          setTimeout(() => produtoTipo.focus(), 50);
        },
        item => item.display
      );

    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

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
    guardarEstadoOrcamento();
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
            const isDiversos = item.nome.trim().toLowerCase() === "diversos";
            activarModoDiversos(isDiversos);
            guardarEstadoOrcamento();
            setTimeout(() => {
              if (isDiversos) {
                produtoDescricao.focus();
              } else {
                produtoBrand.focus();
              }
            }, 50);
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
          guardarEstadoOrcamento();
          setTimeout(() => produtoDescricao.focus(), 50);
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
  // CARREGAR DESCRIÇÕES DA MARCA SELECIONADA
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
      produtoDescricao.placeholder = "Sem produtos na base de dados — escreve a descrição manualmente...";
      showMessage("⚠️ Nenhum produto na base de dados para esta marca. Podes escrever manualmente.", "warning");
    }

    setupAutocomplete(
      produtoDescricao,
      descricaoDropdown,
      produtosDaMarca,
      async (item) => {
        produtoDescricaoId.value = item.id;
        await carregarEspessuras(item.id);
        guardarEstadoOrcamento();
        setTimeout(() => produtoEspessura.focus(), 50);
      }
    );
  }

  // =====================================================
  // CARREGAR ESPESSURAS DISPONÍVEIS (AUTOCOMPLETE)
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
        .select("thickness, type, price_per_m2")
        .eq("website_item_id", produtoId)
        .order("thickness", { ascending: true });

      if (error) throw error;

      if (!thicknesses || thicknesses.length === 0) {
        produtoEspessura.placeholder = "Sem espessuras na tabela — escreve manualmente (mm)...";
        showMessage("⚠️ Este produto não tem espessuras configuradas. Podes escrever manualmente.", "warning");
        return;
      }

      precosPorProduto[produtoId] = {};
      thicknesses.forEach(t => {
        if (!precosPorProduto[produtoId][t.thickness]) {
          precosPorProduto[produtoId][t.thickness] = [];
        }
        precosPorProduto[produtoId][t.thickness].push({
          type: t.type,
          price_per_m2: t.price_per_m2
        });
      });

      const espessurasUnicas = [...new Set(thicknesses.map(t => t.thickness))];

      espessurasDisponiveis = espessurasUnicas.map(thickness => ({
        display: `${thickness}mm`,
        value: thickness,
        thickness: thickness
      }));

      setupAutocomplete(
        produtoEspessura,
        espessuraDropdown,
        espessurasDisponiveis,
        (item) => {
          produtoEspessuraValue.value = item.thickness;
          produtoTipoAcabamento.value = "";
          produtoTipoAcabamentoValue.value = "";
          produtoTipoAcabamento.disabled = false;
          produtoTipoAcabamento.placeholder = "Seleciona...";
          clearTipoAcabamento.classList.add("d-none");
          produtoPrecoMt2.value = "";
          carregarTiposAcabamento(produtoId, item.thickness);
          calcularValores();
          guardarEstadoOrcamento();
        },
        item => item.display,
        item => item.value,
        (item, filter) => {
          const num = filter.replace(/mm$/i, "").trim();
          return item.display.toLowerCase().startsWith(num.toLowerCase());
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
  // ✅ [ALTERAÇÃO 1] CARREGAR TIPOS DE ACABAMENTO
  // Preço/m² NÃO é preenchido automaticamente,
  // mesmo quando só existe 1 acabamento disponível.
  // O utilizador tem sempre de confirmar/ver o preço.
  // =====================================================
  function carregarTiposAcabamento(produtoId, thickness) {
    const tiposParaEspessura = (precosPorProduto[produtoId]?.[thickness] || []);

    const tiposAcabamentoData = tiposParaEspessura.map(t => ({
      display: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      value: t.type,
      price: t.price_per_m2
    }));

    if (tiposAcabamentoData.length === 0) {
      produtoTipoAcabamento.disabled = false;
      produtoTipoAcabamento.placeholder = "Sem acabamentos na tabela — escreve manualmente...";
      return;
    }

    if (tiposAcabamentoData.length === 1) {
      // ✅ Preenche o texto do campo e o valor hidden,
      // mas NÃO preenche o Preço/m² automaticamente.
      produtoTipoAcabamento.value = tiposAcabamentoData[0].display;
      produtoTipoAcabamentoValue.value = tiposAcabamentoData[0].value;
      clearTipoAcabamento.classList.remove("d-none");
      // produtoPrecoMt2 fica vazio — utilizador preenche manualmente
      calcularValores();
      guardarEstadoOrcamento();
      // Foco vai para Quantidade para o utilizador confirmar e avançar
      setTimeout(() => produtoQuantidade.focus(), 50);
      return;
    }

    setupAutocomplete(
      produtoTipoAcabamento,
      tipoAcabamentoDropdown,
      tiposAcabamentoData,
      (item) => {
        produtoTipoAcabamentoValue.value = item.value;
        // ✅ Preço/m² também NÃO é preenchido aqui automaticamente
        calcularValores();
        guardarEstadoOrcamento();
        setTimeout(() => produtoQuantidade.focus(), 50);
      }
    );

    setTimeout(() => produtoTipoAcabamento.focus(), 50);
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
  // ✅ MODO DIVERSOS
  // =====================================================
  function activarModoDiversos(ativo) {
    modoAtualDiversos = ativo;

    descricaoDropdown.classList.remove("show");
    descricaoDropdown.innerHTML = "";
    const modoDiversosBadge = document.getElementById("modoDiversosBadge");

    const colMarca = produtoBrand.closest(".col-md-3");
    const colEspessura = document.getElementById("colEspessura");
    const colAcabamento = document.getElementById("colAcabamento");
    const colComprimento = produtoComprimento.closest(".col-md-2");
    const colLargura = produtoLargura.closest(".col-md-2");

    if (ativo) {
      produtoDescricao.value = "";
      produtoDescricao.disabled = false;
      produtoDescricao.placeholder = "Descreve o artigo...";
      produtoDescricaoId.value = "diversos";

      if (colMarca) colMarca.classList.add("d-none");
      if (colEspessura) colEspessura.classList.add("d-none");
      if (colAcabamento) colAcabamento.classList.add("d-none");
      if (colComprimento) colComprimento.classList.add("d-none");
      if (colLargura) colLargura.classList.add("d-none");

      produtoBrand.value = "";
      produtoBrandKey.value = "diversos";
      produtoEspessura.value = "";
      produtoEspessuraValue.value = "0";
      produtoComprimento.value = "";
      produtoLargura.value = "";

      btnVerPrecario.classList.add("d-none");
      if (modoDiversosBadge) modoDiversosBadge.classList.remove("d-none");

    } else {
      if (colMarca) colMarca.classList.remove("d-none");
      if (colEspessura) colEspessura.classList.remove("d-none");
      if (colAcabamento) colAcabamento.classList.remove("d-none");
      if (colComprimento) colComprimento.classList.remove("d-none");
      if (colLargura) colLargura.classList.remove("d-none");

      produtoBrand.disabled = false;

      // ✅ ADICIONAR ESTAS LINHAS — limpar descrição ao sair do modo diversos
      produtoDescricao.value = "";
      produtoDescricaoId.value = "";
      clearDescricao.classList.add("d-none");

      if (!produtoBrandKey.value) {
        produtoDescricao.disabled = true;
        produtoDescricao.placeholder = "Primeiro seleciona a marca...";
      }

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
      guardarEstadoOrcamento();

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
  // ✅ CALCULAR M², SUBTOTAL E TOTAL
  // =====================================================
  function calcularValores() {
    const qtd = parseInt(produtoQuantidade.value) || 0;
    const isDiversos = produtoTipoId.value !== "" &&
      produtoTipo.value.trim().toLowerCase() === "diversos";

    let compM, largM;

    if (isDiversos) {
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

  // =====================================================
  // ✅ [ALTERAÇÃO 3] NAVEGAÇÃO POR ENTER + MODAL CONFIRMAÇÃO
  // =====================================================

  // Definir a função que abre o modal de confirmação
  function abrirModalConfirmarProduto() {
    const modal = new bootstrap.Modal(document.getElementById('confirmarProdutoModal'));
    modal.show();
  }

  // Ligar o botão de confirmação do modal ao btnAdicionarProduto
  const confirmarAdicionarProdutoBtn = document.getElementById("confirmarAdicionarProdutoBtn");
  if (confirmarAdicionarProdutoBtn) {
    confirmarAdicionarProdutoBtn.addEventListener("click", () => {
      // Fechar o modal
      const modalEl = document.getElementById('confirmarProdutoModal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
      // Acionar o clique no botão de adicionar
      btnAdicionarProduto.click();
    });
  }

  // Navegação Enter nos campos numéricos
  // Navegação Enter nos campos numéricos
  produtoQuantidade.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (modoAtualDiversos) {
        produtoPrecoMt2.focus();
      } else {
        produtoComprimento.focus();
      }
    }
  });
  produtoComprimento.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); produtoLargura.focus(); }
  });
  produtoLargura.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); produtoPrecoMt2.focus(); }
  });
  produtoPrecoMt2.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); produtoDesconto.focus(); }
  });
  produtoDesconto.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnAdicionarProduto.click();
    }
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
      const tipos = precos[thickness];
      tipos.forEach(t => {
        const tr = document.createElement("tr");
        const tipoLabel = t.type.charAt(0).toUpperCase() + t.type.slice(1);
        tr.innerHTML = `
          <td><strong>${thickness}mm ${tipoLabel}</strong></td>
          <td class="text-end">${parseFloat(t.price_per_m2).toFixed(2)} €</td>
        `;
        precarioTableBody.appendChild(tr);
      });
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
  // ✅ ADICIONAR PRODUTO À TABELA
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
      if (!produtoTipoAcabamentoValue.value) {
        showMessage("⚠️ Seleciona o acabamento", "warning");
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
      tipoAcabamento: isDiversos ? null : produtoTipoAcabamentoValue.value,
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
  // ✅ RENDERIZAR TABELA DE PRODUTOS
  // =====================================================
  function renderProdutosTable() {
    if (produtosAdicionados.length === 0) {
      produtosTableBody.innerHTML = `
        <tr>
          <td colspan="13" class="text-muted" style="background-color: #eeeeef; border-color: #cbccce;">Nenhum produto adicionado</td>
        </tr>
      `;
      totalGeralEl.textContent = "0.00 €";
      guardarEstadoOrcamento();
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
        <td class="text-start">${produto.descricao}${!produto.isDiversos && produto.tipoAcabamento ? ' ' + produto.tipoAcabamento.charAt(0).toUpperCase() + produto.tipoAcabamento.slice(1) : ''}</td>
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
          <button type="button" class="btn-edit" data-index="${index}" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn-remove" data-index="${index}" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      produtosTableBody.appendChild(tr);
    });

    totalGeralEl.textContent = totalGeral.toFixed(2) + " €";
    guardarEstadoOrcamento();
  }

  // =====================================================
  // REMOVER / EDITAR PRODUTO
  // =====================================================
  produtosTableBody.addEventListener("click", (e) => {
    if (e.target.closest(".btn-edit")) {
      const index = parseInt(e.target.closest(".btn-edit").dataset.index);
      editarProduto(index);
      return;
    }

    if (e.target.closest(".btn-remove")) {
      const index = parseInt(e.target.closest(".btn-remove").dataset.index);
      produtosAdicionados.splice(index, 1);
      renderProdutosTable();
      showMessage("🗑️ Produto removido", "info");
    }
  });

  // =====================================================
  // ✅ EDITAR PRODUTO JÁ ADICIONADO
  // Carrega os dados do produto de volta para o formulário
  // (reconstruindo a cascata Tipo → Marca → Descrição →
  // Espessura → Acabamento) e remove-o da lista. O produto
  // volta a entrar na lista quando o utilizador clicar em
  // "Adicionar Produto" com os dados já corrigidos.
  // =====================================================
  async function editarProduto(index) {
    const produto = produtosAdicionados[index];
    if (!produto) return;

    if (formularioTemDados()) {
      showMessage("⚠️ Termina ou limpa o produto atual antes de editar outro.", "warning");
      return;
    }

    limparCamposProduto();

    // ----- TIPO -----
    produtoTipo.value = produto.tipoNome;
    produtoTipoId.value = produto.tipo_id;
    toggleClearButton(produtoTipo, clearTipo);

    if (produto.isDiversos) {
      // ----- MODO DIVERSOS -----
      activarModoDiversos(true);
      produtoDescricao.value = produto.descricao;
      produtoDescricaoId.value = "diversos";
      toggleClearButton(produtoDescricao, clearDescricao);

      produtoQuantidade.value = produto.quantidade;
      produtoPrecoMt2.value = produto.preco_mt2;
      produtoDesconto.value = produto.desconto_percentagem;
      produtoDesconto.dataset.lastValid = produto.desconto_percentagem;

    } else {
      // ----- MARCA -----
      activarModoDiversos(false);
      produtoBrand.value = produto.brandNome;
      produtoBrandKey.value = produto.brand;
      toggleClearButton(produtoBrand, clearBrand);

      await carregarDescricoesDaMarca(produto.brand);

      // Tenta encontrar o produto correspondente na base/website
      // para conseguir repor as espessuras e acabamentos disponíveis.
      const itemWebsite = produtosWebsite.find(
        p => p.Brand === produto.brand && p.Title_pt === produto.descricao
      );

      // ----- DESCRIÇÃO -----
      produtoDescricao.value = produto.descricao;
      produtoDescricaoId.value = itemWebsite ? itemWebsite.id : "manual";
      toggleClearButton(produtoDescricao, clearDescricao);

      if (itemWebsite) {
        await carregarEspessuras(itemWebsite.id);

        // ----- ESPESSURA -----
        produtoEspessura.value = produto.espessura + "mm";
        produtoEspessuraValue.value = produto.espessura;
        toggleClearButton(produtoEspessura, clearEspessura);

        produtoTipoAcabamento.disabled = false;
        produtoTipoAcabamento.placeholder = "Seleciona...";
        carregarTiposAcabamento(itemWebsite.id, produto.espessura);
        btnVerPrecario.classList.remove("d-none");
      } else {
        // Produto não encontrado na base de dados: mantém edição manual
        produtoEspessura.disabled = false;
        produtoEspessura.value = produto.espessura ? produto.espessura + "mm" : "";
        produtoEspessuraValue.value = produto.espessura || "";
        toggleClearButton(produtoEspessura, clearEspessura);

        produtoTipoAcabamento.disabled = false;
        produtoTipoAcabamento.placeholder = "Escreve o acabamento manualmente...";
      }

      // ----- ACABAMENTO -----
      if (produto.tipoAcabamento) {
        produtoTipoAcabamento.value = produto.tipoAcabamento.charAt(0).toUpperCase() + produto.tipoAcabamento.slice(1);
        produtoTipoAcabamentoValue.value = produto.tipoAcabamento;
        toggleClearButton(produtoTipoAcabamento, clearTipoAcabamento);
      }

      produtoQuantidade.value = produto.quantidade;
      produtoComprimento.value = produto.comprimento.toFixed(4);
      produtoLargura.value = produto.largura.toFixed(4);
      produtoPrecoMt2.value = produto.preco_mt2;
      produtoDesconto.value = produto.desconto_percentagem;
      produtoDesconto.dataset.lastValid = produto.desconto_percentagem;
    }

    calcularValores();

    // Remove da lista — volta a ser adicionado ao clicar em "Adicionar Produto"
    produtosAdicionados.splice(index, 1);
    renderProdutosTable();
    guardarEstadoOrcamento();

    showMessage("✏️ Produto carregado para edição. Corrige os dados e clica em 'Adicionar Produto'.", "info");

    setTimeout(() => {
      (produto.isDiversos ? produtoQuantidade : produtoComprimento).focus();
    }, 60);
  }

  // =====================================================
  // ✅ LIMPAR CAMPOS DO PRODUTO
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
    
    produtoTipoAcabamento.value = "";
    produtoTipoAcabamento.disabled = true;
    produtoTipoAcabamento.placeholder = "Primeiro seleciona espessura...";
    produtoTipoAcabamentoValue.value = "";
    clearTipoAcabamento.classList.add("d-none");

    btnVerPrecario.classList.add("d-none");
    if (precarioAberto) {
      fecharPrecario();
    }

    activarModoDiversos(false);
    guardarEstadoOrcamento();
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
    limparEstadoOrcamento();
    showMessage("🔄 Orçamento limpo com sucesso", "success");
  });

  // =====================================================
  // ✅ SUBMIT DO FORMULÁRIO
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

      const dadosParaInserir = {
        cliente_nome: clienteNome.value.trim(),
        cliente_id: clienteId.value ? parseInt(clienteId.value) : null,
        total_geral: totalGeral,
        data_criacao: new Date().toISOString()
      };

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
        espessura: p.espessura ?? 0,
        type: p.tipoAcabamento || null,
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
      limparEstadoOrcamento();

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

  // ✅ Verifica se o dropdown tem, neste momento, alguma opção real
  // (e não apenas a mensagem "Nenhum resultado encontrado")
  function temOpcaoRealNoDropdown(dropdown) {
    return (
      dropdown.classList.contains("show") &&
      dropdown.querySelectorAll(".autocomplete-item:not(.disabled)").length > 0
    );
  }

  // ✅ DESCRIÇÃO — Enter sem resultados avança para Espessura
  produtoDescricao.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    if (modoAtualDiversos) {
      e.preventDefault();
      setTimeout(() => produtoQuantidade.focus(), 50);
      return;
    }

    if (produtoDescricao.disabled) return;
    if (temOpcaoRealNoDropdown(descricaoDropdown)) return; // deixa o autocomplete selecionar

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!produtoDescricao.value.trim()) {
      focarProximoCampo(produtoDescricao);
      return;
    }

    if (!produtoDescricaoId.value) {
      produtoDescricaoId.value = "manual";
      toggleClearButton(produtoDescricao, clearDescricao);
      produtoEspessura.disabled = false;
      produtoEspessura.placeholder = "Escreve a espessura manualmente (mm)...";
      btnVerPrecario.classList.add("d-none");
      guardarEstadoOrcamento();
    }

    closeAllDropdowns();
    setTimeout(() => produtoEspessura.focus(), 50);
  });

  // ✅ ESPESSURA — Enter sem resultados avança para Acabamento
  // (valor sempre tratado como numérico manual)
  produtoEspessura.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (produtoEspessura.disabled) return;
    if (temOpcaoRealNoDropdown(espessuraDropdown)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!produtoEspessura.value.trim()) {
      focarProximoCampo(produtoEspessura);
      return;
    }

    if (!produtoEspessuraValue.value) {
      const numero = parseNumeroLivre(produtoEspessura.value);
      produtoEspessuraValue.value = numero !== null ? numero : produtoEspessura.value.trim();
      toggleClearButton(produtoEspessura, clearEspessura);
      produtoTipoAcabamento.disabled = false;
      produtoTipoAcabamento.placeholder = "Escreve o acabamento manualmente...";
      btnVerPrecario.classList.add("d-none");
      calcularValores();
      guardarEstadoOrcamento();
    }

    closeAllDropdowns();
    setTimeout(() => produtoTipoAcabamento.focus(), 50);
  });

  // ✅ ACABAMENTO — Enter sem resultados avança para Quantidade
  produtoTipoAcabamento.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (produtoTipoAcabamento.disabled) return;
    if (temOpcaoRealNoDropdown(tipoAcabamentoDropdown)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!produtoTipoAcabamento.value.trim()) {
      focarProximoCampo(produtoTipoAcabamento);
      return;
    }

    if (!produtoTipoAcabamentoValue.value) {
      produtoTipoAcabamentoValue.value = produtoTipoAcabamento.value.trim();
      toggleClearButton(produtoTipoAcabamento, clearTipoAcabamento);
      calcularValores();
      guardarEstadoOrcamento();
    }

    closeAllDropdowns();
    setTimeout(() => produtoQuantidade.focus(), 50);
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
  await Promise.all([
    loadTipos(),
    loadBrands(),
    loadProdutosWebsite(),
    loadClientes(),
  ]);

  // ✅ Restaura o que estava preenchido antes de sair desta página
  // (fica guardado até guardares/limpares o orçamento ou fechares a página)
  await restaurarEstadoOrcamento();

  console.log("✅ Formulário de Orçamento inicializado");
};