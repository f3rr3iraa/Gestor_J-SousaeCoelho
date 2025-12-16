export const handler = async () => {
  // Só se for seguro expor a chave anon
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  return {
    statusCode: 200,
    body: JSON.stringify({ supabaseUrl, supabaseKey })
  };
};
