# 🎈 PinkBalloon

Plataforma de treino de programação competitiva feita para o grupo de maratonistas da minha universidade! O nome é uma referência ao balão rosa que a gente ganha quando resolve um problema em competição.

## O que é?

O PinkBalloon é um site onde as participantes do nosso grupo podem acompanhar seus treinos de programação competitiva. A ideia é simples: todo dia tem um exercício do Codeforces pra resolver, e o sistema verifica automaticamente se você já mandou a solução. Conforme vai resolvendo, ganha pontos e aparece no ranking.

## Como funciona

- **Exercícios diários e semanais** — A admin publica exercícios do Codeforces e o sistema calcula a data de expiração automaticamente
- **Verificação automática** — O sistema checa as submissões no Codeforces a cada 3 minutos e atribui os pontos automaticamente
- **Ranking** — Todas as participantes podem ver quem está na frente no período ativo
- **Períodos de pontuação** — Dá pra criar períodos (tipo mês ou semestre) pra organizar as temporadas de pontuação
- **Painel admin** — Gerenciamento de exercícios, avisos, usuárias e períodos
- **Pontos por prática** — Além dos exercícios oficiais, resolver qualquer problema no Codeforces também dá pontos extras

## Tecnologias

- **Next.js** (App Router) — Framework fullstack React
- **Prisma** — ORM para o banco de dados
- **PostgreSQL** (Neon) — Banco de dados em produção
- **TypeScript** — Tipagem em tudo
- **Codeforces API** — Integração pra buscar submissões e validar handles
- **JWT + bcrypt** — Autenticação segura com cookies httpOnly
- **Nodemailer** — Envio de email pra recuperação de senha

## Rodando localmente

```bash
# Instalar dependências
npm install

# Configurar o .env (copie o .env.example e preencha)
cp .env.example .env

# Criar as tabelas no banco
npx prisma db push

# Criar o usuário admin
npm run db:seed

# Rodar o servidor
npm run dev
```

O site roda em [http://localhost:3001](http://localhost:3001).

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Chave secreta para autenticação |
| `CRON_SECRET` | Chave para o cron job do verificador |
| `GMAIL_USER` | Email Gmail para envio de emails |
| `GMAIL_APP_PASSWORD` | Senha de app do Gmail |
| `NEXT_PUBLIC_APP_URL` | URL pública do site |

## Deploy

O site roda na **Vercel** com banco **PostgreSQL no Neon**. O cron job que verifica as submissões é configurado externamente no [cron-job.org](https://cron-job.org) porque o plano gratuito da Vercel não suporta cron nativo.

## Estrutura

```
src/
├── app/
│   ├── api/           # Rotas da API (auth, exercises, ranking, admin...)
│   ├── dashboard/     # Página do dashboard da usuária
│   ├── ranking/       # Página do ranking
│   ├── profile/       # Página do perfil
│   └── admin/         # Painel administrativo
├── components/        # Componentes React (AuthPage, HomePage, AdminView...)
├── contexts/          # Context de autenticação
└── lib/               # Utilitários (auth, prisma, codeforces, checker, email)
```

---

Feito com 💖 para a Turma das Maratonistas
