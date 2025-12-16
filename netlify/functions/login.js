exports.handler = async (event) => {
  const { username, password } = JSON.parse(event.body || "{}");

  if (
    username === process.env.APP_LOGIN_USER &&
    password === process.env.APP_LOGIN_SECRET
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  }

  return {
    statusCode: 401,
    body: JSON.stringify({ error: "Credenciais inválidas" })
  };
};

