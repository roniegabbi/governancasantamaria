// api/_db.js — acesso ao banco Neon (compartilhado pelas funções da Vercel).
// Usa a variável de ambiente DATABASE_URL (configurada no painel da Vercel).
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3
});

const pct = (x, t) => (Number(t) ? Math.round((Number(x) / Number(t)) * 100) : 0);

async function lerNps() {
  const [geralR, pautasR] = await Promise.all([
    pool.query('select * from vw_nps_geral'),
    pool.query('select * from vw_nps_pauta')
  ]);
  const g = geralR.rows[0] || {};
  const pautas = {};
  for (const p of pautasR.rows) {
    pautas[p.pauta_id] = {
      nps: Number(p.nps) || 0,
      total: Number(p.total) || 0,
      prom: pct(p.promotores, p.total),
      neu: pct(p.neutros, p.total),
      det: pct(p.detratores, p.total)
    };
  }
  return {
    geral: {
      nps: Number(g.nps) || 0,
      total: Number(g.total) || 0,
      prom: pct(g.promotores, g.total),
      det: pct(g.detratores, g.total)
    },
    pautas
  };
}

// dados PÚBLICOS (portal do cidadão): só o necessário para avaliar
async function publicData() {
  const [pautas, cfg] = await Promise.all([
    pool.query('select id, nome, descricao, pergunta, cor, icone, imagem from pautas where ativo = true order by ordem'),
    pool.query('select * from config_identidade where id = true')
  ]);
  return { pautas: pautas.rows, config: cfg.rows[0] || null };
}

// dados do ADMIN (protegidos): indicadores completos
async function adminData() {
  const [pautas, resumo, secretarias, canais, bairros, participantes, nps] = await Promise.all([
    pool.query('select id, nome, descricao, pergunta, cor, icone, imagem from pautas where ativo = true order by ordem'),
    pool.query('select * from ouvidoria_resumo order by exercicio'),
    pool.query('select * from ouvidoria_secretaria where exercicio = 2025 order by total desc'),
    pool.query('select * from ouvidoria_canal where exercicio = 2025'),
    pool.query('select * from vw_nps_bairro'),
    pool.query(`select c.nome, c.cpf, c.celular, b.nome as bairro,
                  count(a.id)::int as votos, round(avg(a.nota),1) as media, max(a.criado_em) as ultimo
                from cidadaos c
                left join bairros b on b.id = c.bairro_id
                left join avaliacoes a on a.cidadao_id = c.id
                group by c.id, b.nome
                order by max(a.criado_em) desc nulls last
                limit 500`),
    lerNps()
  ]);
  return {
    pautas: pautas.rows,
    ouvidoria: { resumo: resumo.rows, secretarias: secretarias.rows, canais: canais.rows },
    bairros: bairros.rows,
    participantes: participantes.rows,
    nps
  };
}

async function registrarAvaliacao(body) {
  const { cidadao, notas } = body || {};
  if (!cidadao || !notas || Object.keys(notas).length === 0) {
    const err = new Error('Dados incompletos.'); err.status = 400; throw err;
  }
  const cpf = String(cidadao.cpf || '').replace(/\D/g, '');
  const celular = String(cidadao.celular || '').replace(/\D/g, '');
  if (!cpfValido(cpf)) { const err = new Error('CPF inválido.'); err.status = 400; throw err; }

  const client = await pool.connect();
  try {
    await client.query('begin');
    let bairroId = null;
    if (cidadao.bairro) {
      const b = await client.query('select id from bairros where nome = $1', [cidadao.bairro]);
      bairroId = b.rows[0] ? b.rows[0].id : null;
    }
    if (!bairroId) {
      const o = await client.query("select id from bairros where nome = 'Outro'");
      bairroId = o.rows[0] ? o.rows[0].id : null;
    }
    const c = await client.query(
      `insert into cidadaos (nome, cpf, celular, bairro_id)
       values ($1, $2, $3, $4)
       on conflict (cpf) do update
         set nome = excluded.nome, celular = excluded.celular, bairro_id = excluded.bairro_id
       returning id`,
      [cidadao.nome || 'Cidadão', cpf, celular, bairroId]
    );
    const cidadaoId = c.rows[0].id;
    for (const [pautaId, nota] of Object.entries(notas)) {
      const n = parseInt(nota, 10);
      if (isNaN(n) || n < 0 || n > 10) continue;
      await client.query(
        `insert into avaliacoes (cidadao_id, pauta_id, nota)
         values ($1, $2, $3)
         on conflict (cidadao_id, pauta_id) do update
           set nota = excluded.nota, criado_em = now()`,
        [cidadaoId, pautaId, n]
      );
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
  return { ok: true, nps: await lerNps() };
}

async function setImagem(body) {
  const { id, imagem } = body || {};
  if (!id) { const err = new Error('Pauta não informada.'); err.status = 400; throw err; }
  const r = await pool.query(
    'update pautas set imagem = $1, atualizado_em = now() where id = $2 returning imagem',
    [imagem || null, id]
  );
  if (r.rowCount === 0) { const err = new Error('Pauta não encontrada.'); err.status = 404; throw err; }
  return { imagem: r.rows[0].imagem };
}

// validação real do CPF (dígitos verificadores)
function cpfValido(cpf) {
  cpf = String(cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let d1 = 11 - (s % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  let d2 = 11 - (s % 11); if (d2 >= 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

module.exports = { pool, lerNps, publicData, adminData, registrarAvaliacao, setImagem, cpfValido };
