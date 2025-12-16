// netlify/functions/login.js

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const { username, password } = JSON.parse(event.body || "{}");

        // Variáveis de ambiente definidas no Netlify
        const OGIN_WEB_USER = process.env.OGIN_WEB_USER;
        const LOGIN_WEB_PASS = process.env.LOGIN_WEB_PASS;

        if (!username || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Username and password required" }),
            };
        }

        if (username === OGIN_WEB_USER && password === LOGIN_WEB_PASS) {
            // Gera um token simples (base64)
            const token = Buffer.from(`${username}:no-exp`).toString("base64");

            return {
                statusCode: 200,
                body: JSON.stringify({ token }),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Invalid credentials" }),
            };
        }

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server error" }),
        };
    }
};
