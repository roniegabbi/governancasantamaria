// api/admin.js — indicadores completos (PROTEGIDO por login).
const { exigirAdmin } = require('./_auth');
const { adminData } = require('./_db');

module.exports = async (req, res) => {
  try {
    exigirAdmin(req);
    res.status(200).json(await adminData());
  } catch (e) {
    console.error('admin:', e.message);
    res.status(e.status || 500).json({ error: e.message || 'Erro ao carregar painel.' });
  }
};
