async function initHomeSpaceSupabase() {
  try {
    const [pedidos, produtos] = await Promise.all([
      supabaseClient.from("items").select("*").eq("estado", "off").order("data_off", { ascending: false }),
      supabaseClient.from("items").select("*").eq("estado", "on").order("id", { ascending: false }),
    ]);

    const pedidosBody = document.getElementById("pedidosBody");
    const produtosBody = document.getElementById("produtosBody");

    if (pedidos.error) pedidosBody.innerHTML = `<tr><td colspan="9">Erro: ${pedidos.error.message}</td></tr>`;
    if (produtos.error) produtosBody.innerHTML = `<tr><td colspan="9">Erro: ${produtos.error.message}</td></tr>`;

    const pedidosData = pedidos.data || [];
    const produtosData = produtos.data || [];

    // === PAGINAÇÃO CONFIG ===
    const pageSize = 4;
    let pedidosPage = 0;
    let produtosPage = 0;

    // === Função para renderizar Pedidos ===
    function renderPedidos() {
      const start = pedidosPage * pageSize;
      const end = start + pageSize;
      const pageItems = pedidosData.slice(start, end);

      pedidosBody.innerHTML = pageItems.length
        ? pageItems
          .map((item) => {
            const marcaenomeeespessura = `${item.marca ?? ""} - ${item.nome ?? ""} ${item.espessura ?? ""}`;
            return `
            <tr>
              <td>${item.id}</td>
              <td>${marcaenomeeespessura}</td>
              <td>${item.comprimento ?? ""}</td>
              <td>${item.largura ?? ""}</td>
              <td>${item.lote ?? ""}</td>
              <td>${item.tipo}</td>
              <td>${item.foto
                ? `<img src="${item.foto}" style="max-width:120px;height:60px;object-fit:cover;border-radius:4px;">`
                : ""
              }</td>
              <td>${item.observacoes ?? ""}</td>
              <td>${item.data_off
                ? new Date(item.data_off).toLocaleString("pt-PT")
                : ""
              }</td>
            </tr>`;
          })
          .join("")
        : `<tr><td colspan="9">Nenhum pedido encontrado.</td></tr>`;

    }

    // === Função para renderizar Produtos ===
    function renderProdutos() {
      const start = produtosPage * pageSize;
      const end = start + pageSize;
      const pageItems = produtosData.slice(start, end);

      produtosBody.innerHTML = pageItems.length
        ? pageItems
          .map((item) => {
            const marcaenomeeespessura = `${item.marca ?? ""} - ${item.nome ?? ""} ${item.espessura ?? ""}`;
            return `
            <tr>
              <td>${item.id}</td>
              <td>${marcaenomeeespessura}</td>
              <td>${item.comprimento ?? ""}</td>
              <td>${item.largura ?? ""}</td>
              <td>${item.lote ?? ""}</td>
              <td>${item.tipo}</td>
              <td>${item.foto
                ? `<img src="${item.foto}" style="max-width:120px;height:60px;object-fit:cover;border-radius:4px;">`
                : ""
              }</td>
              <td>${item.observacoes ?? ""}</td>
              <td>${new Date(item.created_at).toLocaleString("pt-PT")}</td>
            </tr>`;
          })
          .join("")
        : `<tr><td colspan="9">Nenhum produto encontrado.</td></tr>`;

    }

  
    // === Render inicial ===
    renderPedidos();
    renderProdutos();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

