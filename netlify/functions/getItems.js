// functions/getItems.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function handler(event) {
  const filtroEstado = event.queryStringParameters?.estado || "on";

  const { data, error } = await supabase
    .from("items_view")
    .select("*")
    .eq("estado", filtroEstado)
    .order(filtroEstado === "off" ? "data_off" : "id", { ascending: false });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ data }) };
}
