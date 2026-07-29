// api/pauta-imagem.js — define/remove a imagem de uma pauta (PROTEGIDO por login).
const { setImagem } = require('./_db');
const { exigirAdmin } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    exigirAdmin(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    res.status(200).json(await setImagem(body));
  } catch (e) {
    console.error('pauta-imagem:', e.message);
    res.status(e.status || 500).json({ error: e.message || 'Falha ao salvar imagem.' });
  }
};
