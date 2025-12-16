// functions/deleteItem.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { id } = JSON.parse(event.body);
  if (!id) return { statusCode: 400, body: "ID obrigatório" };

  // Pegar item para possivelmente mover a imagem (lógica semelhante ao seu supabase.js)
  const { data: itemData } = await supabase
    .from("items")
    .select("foto")
    .eq("id", id)
    .maybeSingle();

  if (itemData?.foto) {
    const fileName = itemData.foto.split("/").pop();
    const newPath = `arquivadas/${fileName}`;

    // copiar e remover da pasta antiga
    await supabase.storage.from("imagens").copy(fileName, newPath);
    await supabase.storage.from("imagens").remove([fileName]);

    // atualizar URL no banco
    const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(newPath);
    await supabase.from("items").update({ foto: urlData.publicUrl }).eq("id", id);
  }

  // deletar item
  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}
