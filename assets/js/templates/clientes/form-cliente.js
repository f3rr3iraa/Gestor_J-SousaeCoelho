// =====================================================
// FORM-CLIENTE.JS
// =====================================================

window.initClienteForm = function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  // =====================================================
  // ELEMENTOS DOM
  // =====================================================
  const clienteDescricao    = document.getElementById("fld_a1x9k");
  const clienteDescricao2   = document.getElementById("fld_b2y7m");
  const clienteContribuinte = document.getElementById("fld_c3z5p");
  const clienteMorada       = document.getElementById("fld_d4w3q");
  const clienteMorada2      = document.getElementById("fld_e5v2r");
  const clienteCodpostal    = document.getElementById("fld_f6u1j");
  const clientePais         = document.getElementById("fld_g7t8n");
  const clienteTelefone     = document.getElementById("fld_h8s6w");
  const clienteTelefone2    = document.getElementById("fld_i9r4v");

  // =====================================================
  // RESTRIÇÃO: apenas números (bloqueia letras no input)
  // =====================================================
  function apenasNumeros(input) {
    input.addEventListener("keypress", (e) => {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });

    input.addEventListener("paste", (e) => {
      const texto = e.clipboardData.getData("text");
      if (!/^\d+$/.test(texto)) e.preventDefault();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9\-]/g, "");
    });
  }

  // Código Postal: apenas números (formato tratado abaixo)
  // Código Postal: formato 0000-000
  clienteCodpostal.setAttribute("maxlength", "8");
  clienteCodpostal.addEventListener("keypress", (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
  clienteCodpostal.addEventListener("paste", (e) => {
    const texto = e.clipboardData.getData("text");
    if (!/^\d+$/.test(texto)) e.preventDefault();
  });
  clienteCodpostal.addEventListener("input", () => {
    let val = clienteCodpostal.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4) + "-" + val.slice(4, 7);
    clienteCodpostal.value = val;
  });

  // Contribuinte: exatamente 9 dígitos
  apenasNumeros(clienteContribuinte);
  clienteContribuinte.setAttribute("maxlength", "9");
  clienteContribuinte.addEventListener("blur", () => {
    const val = clienteContribuinte.value.trim();
    if (val && val.length !== 9) {
      clienteContribuinte.setCustomValidity("O NIF/NIPC deve ter exatamente 9 dígitos.");
      clienteContribuinte.reportValidity();
    } else {
      clienteContribuinte.setCustomValidity("");
    }
  });

  // Telefone: exatamente 9 dígitos
  apenasNumeros(clienteTelefone);
  clienteTelefone.setAttribute("maxlength", "9");
  clienteTelefone.addEventListener("blur", () => {
    const val = clienteTelefone.value.trim();
    if (val && val.length !== 9) {
      clienteTelefone.setCustomValidity("O telefone deve ter exatamente 9 dígitos.");
      clienteTelefone.reportValidity();
    } else {
      clienteTelefone.setCustomValidity("");
    }
  });

  // Telefone 2: exatamente 9 dígitos
  apenasNumeros(clienteTelefone2);
  clienteTelefone2.setAttribute("maxlength", "9");
  clienteTelefone2.addEventListener("blur", () => {
    const val = clienteTelefone2.value.trim();
    if (val && val.length !== 9) {
      clienteTelefone2.setCustomValidity("O telefone 2 deve ter exatamente 9 dígitos.");
      clienteTelefone2.reportValidity();
    } else {
      clienteTelefone2.setCustomValidity("");
    }
  });

  // =====================================================
  // LIMPAR FORMULÁRIO
  // =====================================================
  btnLimpar.addEventListener("click", () => {
    form.reset();
  });

  // =====================================================
  // FORMATAR CÓDIGO POSTAL
  // =====================================================
  clienteCodpostal.addEventListener("input", () => {
    let val = clienteCodpostal.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4) + "-" + val.slice(4, 7);
    clienteCodpostal.value = val;
  });

  // =====================================================
  // SUBMIT
  // =====================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      showMessage("⏳ A guardar cliente...", "info");

      const descricao = clienteDescricao.value.trim();
      const descricao2 = clienteDescricao2.value.trim() || null;
      const contribuinte = clienteContribuinte.value.trim() || null;
      const morada = clienteMorada.value.trim() || null;
      const morada2 = clienteMorada2.value.trim() || null;
      const codpostal = clienteCodpostal.value.trim() || null;
      const pais = clientePais.value.trim() || null;
      const telefone = clienteTelefone.value.trim() || null;
      const telefone2 = clienteTelefone2.value.trim() || null;

      if (!descricao) throw new Error("O nome / descrição do cliente é obrigatório.");

      // Verificar NIF duplicado (ignora se for nulo)
      if (contribuinte) {
        const { data: existing, error: checkErr } = await supabase
          .from("clientes")
          .select("id, descricao")
          .eq("contribuinte", contribuinte)
          .limit(1);

        if (checkErr) throw checkErr;

        if (existing && existing.length > 0) {
          throw new Error(
            `❌ Já existe um cliente com o contribuinte "${contribuinte}": ${existing[0].descricao}`
          );
        }
      }

      const { error } = await supabase.from("clientes").insert([
        {
          descricao,
          descricao2,
          contribuinte,
          morada,
          morada2,
          codpostal,
          pais,
          telefone,
          telefone2,
        },
      ]);

      if (error) throw error;

      showMessage("✅ Cliente guardado com sucesso!", "success");
      form.reset();

    } catch (err) {
      showMessage(err.message || "Erro desconhecido", "danger");
    }
  });
};