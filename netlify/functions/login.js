import crypto from "crypto";

export async function handler(event) {
  try {
    const { user, pass } = JSON.parse(event.body);

    const hash = v => crypto.createHash("sha256").update(v).digest("hex");

    // Comparar com hashes guardados nas variáveis de ambiente
    if (
      hash(user) === process.env.ADMIN_USER_HASH &&
      hash(pass) === process.env.ADMIN_PASS_HASH
    ) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
}
