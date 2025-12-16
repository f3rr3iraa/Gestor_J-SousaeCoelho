export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;

    // Validação segura
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = Buffer.from(`${username}:no-exp`).toString("base64");
      return {
        statusCode: 200,
        body: JSON.stringify({ token })
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Credenciais inválidas" })
    };
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Requisição inválida" })
    };
  }
}
