import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event, context) {
  try {
    const estado = event.queryStringParameters?.estado || 'on';
    const orderField = estado === 'off' ? 'data_off' : 'id';

    const { data, error } = await supabase
      .from('items_view')
      .select('*')
      .eq('estado', estado)
      .order(orderField, { ascending: false });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro inesperado ao buscar itens' })
    };
  }
}
