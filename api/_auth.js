// api/_auth.js — login simples e seguro (sem dependências extras, usa crypto do Node).
// Variáveis de ambiente na Vercel: ADMIN_USUARIO, ADMIN_SENHA, AUTH_SECRET.
const crypto = require('crypto');
const SECRET = process.env.AUTH_SECRET || 'defina-AUTH_SECRET-na-vercel';

function b64(s) { return Buffer.from(s).toString('base64url'); }
function safeEq(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function assinar(payloadObj) {
  const payload = b64(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verificar(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [payload, sig] = token.split('.');
  const esperado = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (!safeEq(sig, esperado)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch (e) { return null; }
}

function tokenDaRequisicao(req) {
  const h = (req.headers && req.headers['authorization']) || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function exigirAdmin(req) {
  const v = verificar(tokenDaRequisicao(req));
  if (!v || v.role !== 'admin') { const e = new Error('Não autorizado.'); e.status = 401; throw e; }
  return v;
}

module.exports = { assinar, verificar, exigirAdmin, safeEq };
