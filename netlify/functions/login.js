// Função de login para verificar as credenciais
exports.handler = async (event, context) => {
    // Pegando as variáveis de ambiente do Netlify
    const LOGIN_USER = process.env.LOGIN_USER;
    const LOGIN_PASS = process.env.LOGIN_PASS;

    // Verifique se a requisição é do tipo POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido' })
        };
    }

    // Pega o corpo da requisição
    const { username, password } = JSON.parse(event.body);

    // Verifica as credenciais
    if (username === LOGIN_USER && password === LOGIN_PASS) {
        // Gerar um token fictício
        const token = Buffer.from(`${username}:no-exp`).toString('base64');

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Login bem-sucedido', token })
        };
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: '❌ Utilizador ou senha inválidos!' })
        };
    }
};
