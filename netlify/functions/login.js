// functions/login.js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, password } = JSON.parse(event.body);

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({ token: btoa(`${username}:no-exp`) }),
    };
  }

  return {
    statusCode: 401,
    body: JSON.stringify({ error: "Utilizador ou senha inválidos" }),
  };
}
