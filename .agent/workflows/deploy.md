---
description: Como fazer o deploy do PinkBalloon na Vercel
---

## Deploy do PinkBalloon

### 1. Preparar o código
- Commitar todas as alterações no Git
- Push para o GitHub

### 2. Deploy na Vercel
- Conectar o repositório na Vercel (se ainda não estiver)
- Configurar as variáveis de ambiente no painel da Vercel:
  - `DATABASE_URL` (string de conexão do PostgreSQL, ex: Neon)
  - `JWT_SECRET` (chave secreta para autenticação)
  - `CRON_SECRET` (ex: `pinkballoon_secret_key_123`)
- Fazer o deploy

### 3. ⚠️ IMPORTANTE: Configurar o Cron Job externo (cron-job.org)
O cron que verifica as submissões no Codeforces **NÃO roda sozinho na Vercel** (plano gratuito).
Você DEVE configurar um serviço externo gratuito para chamar a API a cada 3 minutos:

1. Acesse https://cron-job.org e crie uma conta gratuita
2. Crie um novo cron job com:
   - **URL**: `https://SEU-DOMINIO.vercel.app/api/checker`
   - **Método**: `POST`
   - **Headers**: adicionar `x-cron-secret` com o valor da env `CRON_SECRET`
   - **Frequência**: A cada 3 minutos (`*/3 * * * *`)
3. Ativar o cron job
4. Testar manualmente para confirmar que retorna 200

Sem isso, as pontuações das meninas NÃO serão atualizadas automaticamente!

### 4. Verificar
- Acessar o site e fazer login
- Ir no painel admin e clicar "Forçar Verificação" para testar
- Confirmar que o cron-job.org está disparando a cada 3 minutos
