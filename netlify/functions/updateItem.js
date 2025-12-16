// functions/updateItem.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const item = JSON.parse(event.body);
  const idValue = /^[0-9]+$/.test(item.id) ? Number(item.id) : item.id;

  const { data, error } = await supabase
    .from("items")
    .update(item)
    .eq("id", idValue)
    .select();

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ data }) };
}
