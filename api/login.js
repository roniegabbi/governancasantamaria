// api/login.js — valida usuário/senha (env) e devolve um token de 8 horas.
const { assinar, safeEq } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const U = process.env.ADMIN_USUARIO || '';
    const S = process.env.ADMIN_SENHA || '';
    if (!U || !S) return res.status(500).json({ error: 'Login não configurado no servidor.' });
    if (safeEq(body.usuario || '', U) && safeEq(body.senha || '', S)) {
      const token = assinar({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 8 });
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro no login.' });
  }
};
