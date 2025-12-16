// netlify/functions/login.js

exports.handler = async (event, context) => {
  const { username, password } = JSON.parse(event.body);

  // Obtém as credenciais do ambiente
  const LOGIN_WEB_USER = process.env.LOGIN_WEB_USER;
  const LOGIN_WEB_PASS = process.env.LOGIN_WEB_PASS;

  if (username === LOGIN_WEB_USER && password === LOGIN_WEB_PASS) {
    // Se a autenticação for bem-sucedida, gera o token
    const token = Buffer.from(`${username}:no-exp`).toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ token }),
    };
  } else {
    // Se as credenciais não forem válidas
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Usuário ou Palavra Passe inválidos!' }),
    };
  }
};
