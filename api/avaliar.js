// api/avaliar.js — registra o cidadão e suas notas (POST).
const { registrarAvaliacao } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    res.status(200).json(await registrarAvaliacao(body));
  } catch (e) {
    console.error('avaliar:', e.message);
    res.status(e.status || 500).json({ error: e.message || 'Erro ao registrar avaliação.' });
  }
};
