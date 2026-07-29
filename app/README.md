# Governança SM — App

Aplicação web da Plataforma de Governança da Prefeitura de Santa Maria.
Login real e dados ao vivo do Supabase, com segurança por secretaria (RLS).

É um site estático de um arquivo (`index.html`) — não precisa de build.

## Antes de publicar: 1 passo obrigatório no Supabase

O app lê o schema `governanca`. Para a API do Supabase enxergá-lo:

1. Painel do Supabase → **Settings → API → Exposed schemas**
2. Adicione `governanca` à lista e salve.

Sem isso, o login funciona mas os dados não carregam.

## Publicar com GitHub + Vercel

1. **GitHub** — crie um repositório novo (ex.: `governanca-sm`) e envie o arquivo `index.html` (pode arrastar no site do GitHub em *Add file → Upload files*).
2. **Vercel** — em vercel.com → **Add New → Project → Import** o repositório.
   - Framework Preset: **Other** (site estático).
   - Build Command: deixe vazio. Output Directory: deixe vazio (raiz).
   - Clique em **Deploy**.
3. Em ~1 minuto a Vercel gera a URL pública (ex.: `governanca-sm.vercel.app`).

## Acessos de teste (senha: Governanca@2026)

- Prefeito: `prefeito@sm.gov.br` (vê tudo)
- Governança: `governanca@sm.gov.br` (vê tudo)
- Você (Secretário SMDEI): `ronie.gabbi74@gmail.com`
- Demais Secretários: `secretario.<sigla>@sm.gov.br` (ex.: `secretario.saude@sm.gov.br`)

> Troque as senhas de teste antes do uso real.

## Configuração

As credenciais públicas estão no topo do `<script>` em `index.html`:
- `SUPABASE_URL` e `SUPABASE_KEY` (chave publicável — pode ficar no código).

A segurança real é feita pelo RLS no banco, não pela chave.
