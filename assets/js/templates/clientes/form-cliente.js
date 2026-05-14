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
  const form = document.getElementById("clienteForm");
  const clienteDescricao = document.getElementById("clienteDescricao");
  const clienteDescricao2 = document.getElementById("clienteDescricao2");
  const clienteContribuinte = document.getElementById("clienteContribuinte");
  const clienteMorada = document.getElementById("clienteMorada");
  const clienteMorada2 = document.getElementById("clienteMorada2");
  const clienteCodpostal = document.getElementById("clienteCodpostal");
  const clientePais = document.getElementById("clientePais");
  const clienteTelefone = document.getElementById("clienteTelefone");
  const clienteTelefone2 = document.getElementById("clienteTelefone2");
  const btnLimpar = document.getElementById("btnLimparCliente");

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