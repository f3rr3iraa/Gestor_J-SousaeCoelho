exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");


    
    if (
      username === process.env.ADMIN_USER &&
      password === process.env.ADMIN_PASS
    ) {
      const token = Buffer
        .from(`${username}:no-exp`)
        .toString("base64");

      return {
        statusCode: 200,
        body: JSON.stringify({ token })
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Credenciais inválidas" })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro no servidor" })
    };
  }
};
