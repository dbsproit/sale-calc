# DBS Pricing Calculator

App interno da DBS Building Services para calcular o preço a cobrar do cliente
protegendo a margem-alvo. Next.js (App Router) + Supabase (banco de dados e
login), publicado na Vercel.

O arquivo original single-file (localStorage, sem login) fica preservado em
[`legacy/Calc.html`](legacy/Calc.html) como referência.

## 1. Configurar o Supabase

1. No seu projeto Supabase, abra **SQL Editor** e rode o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) inteiro (cria as tabelas, as
   políticas de RLS e os dados padrão).
2. Em **Authentication → Providers**, deixe só **Email** habilitado e
   desative "Allow new users to sign up" (os usuários são criados manualmente
   por um admin, não há tela de cadastro no app).
3. Crie o primeiro usuário em **Authentication → Users → Add user** (email +
   senha). O trigger do schema já cria o `profile` dele automaticamente com
   `role = 'user'`.
4. Torne esse usuário admin rodando no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<user-id-do-passo-3>';
   ```
   Usuários com `role = 'admin'` podem editar a Política de Preços e as
   Regras de Serviço em Management; os demais só visualizam.
5. Em **Project Settings → API**, copie a **Project URL** e a chave
   **anon public**.

## 2. Rodar localmente

```bash
npm install
cp .env.example .env.local   # cole a URL e a anon key do passo 5 acima
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com o usuário
criado no passo 3.

## 3. Publicar na Vercel

1. `git push` para `https://github.com/dbsproit/sale-calc.git`.
2. Na Vercel, **Add New → Project**, importe esse repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.
4. Deploy.

## Estrutura

- `lib/pricing-engine.ts` — motor de cálculo (fórmulas de precificação),
  portado do `Calc.html` original sem alterar o comportamento.
- `lib/supabase/` — clients Supabase (browser/server) e tipos das tabelas.
- `lib/dal.ts` — checagem de sessão/perfil usada nas páginas server-side.
- `proxy.ts` — equivalente ao antigo `middleware.ts` no Next.js 16: mantém a
  sessão do Supabase renovada e redireciona quem não está logado para
  `/login`.
- `app/(app)/` — páginas autenticadas: `calculator`, `history`, `dashboard`,
  `management`.
- `supabase/schema.sql` — schema completo (tabelas + RLS) para rodar no seu
  projeto Supabase.

## Migrar um `history.txt` antigo

Na página **History**, use o botão **Import legacy .txt** para importar um
arquivo exportado pelo `Calc.html` antigo direto para o banco Supabase.
