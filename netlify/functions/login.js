// netlify/functions/login.js

const crypto = require('crypto');  // Importar o módulo crypto para gerar o HMAC

exports.handler = async (event, context) => {
  const { username, password } = JSON.parse(event.body);

  // Obtém as credenciais do ambiente
  const LOGIN_WEB_USER = process.env.LOGIN_WEB_USER;
  const LOGIN_WEB_PASS = process.env.LOGIN_WEB_PASS;

  if (username === LOGIN_WEB_USER && password === LOGIN_WEB_PASS) {
    // Se a autenticação for bem-sucedida, gera o token usando o TOKEN_SECRET
    const token = crypto
      .createHmac('sha256', process.env.TOKEN_SECRET) // Utilizando o TOKEN_SECRET para criar o HMAC
      .update(username)  // Utilizando o nome do usuário como dado a ser "assinado"
      .digest('hex');    // Gerar o token em formato hexadecimal

    return {
      statusCode: 200,
      body: JSON.stringify({ token }),  // Retorna o token gerado
    };
  } else {
    // Se as credenciais não forem válidas
    return {
      statusCode: 401,
      body: JSON.stringify({ error: '❌ Usuário ou Palavra Passe inválidos!' }),
    };
  }
};
