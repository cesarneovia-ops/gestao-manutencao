# Sistema de Gestão de Manutenção Predial

Aplicativo React + Supabase para gestão de ordens de serviço, mapa de OS, dashboard e cadastros.
Hospedado no **GitHub Pages** com deploy automático via GitHub Actions.

## Stack

- **Frontend**: React 18 + Vite + TypeScript (sem Lovable — código 100% próprio)
- **Backend**: Supabase (Auth, Postgres com RLS, Storage para fotos e planta do mapa)
- **Hospedagem**: GitHub Pages (branch `gh-pages`, mantida pelo workflow)

## Estrutura

```
src/
├── main.tsx             → bootstrap
├── App.tsx              → rotas/abas + telas de login/config
├── index.css            → tema claro/escuro (portado do sistema original)
├── lib/
│   ├── supabase.ts      → cliente Supabase (env vars)
│   ├── types.ts         → tipos + helpers (status, ícones, permissões)
│   ├── api.ts           → CRUD de OS, configurações, storage
│   └── auth.tsx         → AuthProvider (login, perfil, permissões)
└── components/
    ├── Login.tsx        → tela de login
    ├── Layout.tsx       → header + abas + tema
    ├── Home.tsx         → cards de atalho + OS críticas
    ├── AberturaOS.tsx   → abrir nova OS (form + foto + marcação no mapa)
    ├── Dashboard.tsx    → KPIs + 5 gráficos (Chart.js)
    ├── Historico.tsx    → tabela de OS + filtros + visualização em mapa
    ├── Cadastros.tsx    → configs + gestão de usuários (Dev)
    ├── Mapa.tsx         → planta com zoom/pan/pinos/tooltips
    └── Modal.tsx        → dialog + badges

supabase/
└── migrations/0001_initial_schema.sql → schema + RLS + seed + storage
```

## Como publicar (passo a passo)

### 1. Criar o repositório e subir o código

```bash
git init
git add .
git commit -m "Sistema de Gestao de Manutenção Predial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gestao-manutencao.git
git push -u origin main
```

### 2. Criar o projeto Supabase

1. Acesse https://supabase.com → **New project** (dê um nome, escolha região e senha do Postgres).
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/migrations/0001_initial_schema.sql`, clique em **Run**.
3. Ainda no painel: **Authentication → Sign In / Up → Providers → Email** — mantenha habililitado.
   - Recomendado: em **Authentication → Settings**, desative **"Confirm email"** (para contas criadas pelo Dev já entrarem direto).

### 3. Buscar as chaves

1. **Project Settings → API Keys**:
   - `Project URL` (ex.: `https://abcdef.supabase.co`)
   - `anon` / `public` key
2. Vá para o repositório no GitHub → **Settings → Secrets and variables → Actions → Variables** e adicione:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon key
   > Usamos **Variables** (públicas por design — a anon key é exposta no bundle do navegador de qualquer forma).

### 4. Ativar o GitHub Pages

1. **Settings → Pages** → em **Build and deployment**, escolha **Deploy from a branch** → branch `gh-pages`, pasta `/ (root)`. Clique **Save**.
2. O primeiro build roda automaticamente após o push (workflow `deploy.yml`). Após concluir, o site estará em:
   `https://SEU-USUARIO.github.io/gestao-manutencao/`

### 5. Criar o primeiro acesso

No painel Supabase **Authentication → Users → Add user**, crie uma conta (ex.: `dev@sistema.local`) — ou use a aba **Cadastros Gerais** do sistema depois que o primeiro Dev existir. Em seguida, no SQL Editor, vincule o perfil:

```sql
insert into public.perfis (id, usuario, nome, perfil)
select id, 'dev', 'Desenvolvedor', 'Dev'
from auth.users where email = 'dev@sistema.local'
on conflict (id) do update set perfil = 'Dev';
```

Pronto — entre no site com esse login e use a aba **4. Cadastros Gerais** para criar os demais usuários, edifícios, categorias, etc.

## Desenvolvimento local

```bash
npm install
# copie .env.example para .env.local e preencha as chaves
npm run dev
```

## Deploy manual (alternativo)

Se quiser disparar um deploy sem novo push, vá em **Actions → Deploy GitHub Pages → Run workflow**.

---

## Observações de segurança

- A anon key é pública no navegador por design — o acesso ao banco é protegido por **RLS** (políticas em `0001_initial_schema.sql`).
- Perfis: `Usuario` (abre e vê OS), `Admin` (mesmas + edita/exclui/config), `Dev` (tudo + usuários).
- Fotos de evidência e a planta do mapa ficam em buckets públicos do Storage (URLs diretas para exibição no mapa/tooltip).