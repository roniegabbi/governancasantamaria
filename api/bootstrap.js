// api/bootstrap.js — dados PÚBLICOS do portal (pautas + identidade). Sem indicadores.
const { publicData } = require('./_db');

module.exports = async (req, res) => {
  try {
    res.status(200).json(await publicData());
  } catch (e) {
    console.error('bootstrap:', e.message);
    res.status(500).json({ error: 'Falha ao carregar dados.' });
  }
};
