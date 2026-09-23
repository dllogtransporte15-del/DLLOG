# 🚀 Guia de Implantação 24h: WhatsApp Gateway Transcunha

Este guia ensina como colocar o servidor da **Evolution API** no ar em 5 minutos para que os disparos automáticos e a conexão do WhatsApp funcionem **24 horas por dia, 7 dias por semana, sem depender do seu computador ligado**.

---

## 🌟 OPÇÃO 1: Deploy Rápido no Railway (Recomendado - Sem código)

O **Railway** é a forma mais fácil e estável para manter o WhatsApp 24h online com custo quase zero ou gratuito nos créditos iniciais.

### Passo 1: Criar o Projeto no Railway
1. Acesse [railway.app](https://railway.app) e faça login (com GitHub ou e-mail).
2. Clique no botão **`+ New Project`**.
3. Selecione **`Deploy from Template`** ou **`Empty Project`**.

### Passo 2: Adicionar o Banco PostgreSQL e o Redis
1. Dentro do projeto no Railway, clique em **`+ New`** > **`Database`** > **`Add PostgreSQL`**.
2. Clique novamente em **`+ New`** > **`Database`** > **`Add Redis`**.

### Passo 3: Adicionar a Evolution API
1. Clique em **`+ New`** > **`Docker Image`**.
2. Digite a imagem oficial: `evoapicloud/evolution-api:latest` e pressione Enter.
3. Clique no card do serviço da Evolution API que acabou de ser criado e vá na aba **`Variables`**.
4. Adicione as seguintes variáveis de ambiente:

| Variável | Valor Recomendado |
| :--- | :--- |
| `SERVER_PORT` | `8080` |
| `SERVER_TYPE` | `http` |
| `AUTHENTICATION_API_KEY` | `transcunha_secret_key_2026_xyz` *(ou crie uma chave sua)* |
| `CORS_ORIGIN` | `*` |
| `DATABASE_ENABLED` | `true` |
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_CONNECTION_URI` | `${{Postgres.DATABASE_URL}}` *(o Railway preenche sozinho)* |
| `CACHE_REDIS_ENABLED` | `true` |
| `CACHE_REDIS_URI` | `${{Redis.REDIS_URL}}` *(o Railway preenche sozinho)* |
| `CONFIG_SESSION_PHONE_CLIENT` | `Transcunha Logística` |

### Passo 4: Gerar o Domínio Público
1. Na aba **`Settings`** do serviço Evolution API no Railway, role até **`Networking`**.
2. Clique em **`Generate Domain`** (exemplo gerado: `https://evolution-api-production-xxxx.up.railway.app`).

### Passo 5: Conectar no Transcunha
1. Abra o sistema Transcunha e vá em **Operacional > Canal WhatsApp**.
2. Clique em **Configurações do Servidor (Gateway)** no canto superior.
3. Preencha:
   * **URL da API:** `https://evolution-api-production-xxxx.up.railway.app`
   * **API Key:** `transcunha_secret_key_2026_xyz`
   * **Nome da Instância:** `transcunha_matriz`
4. Clique em **Testar Conexão** e **Salvar**.
5. Clique em **Gerar QR Code**, aponte o WhatsApp do celular e pronto! 🚀

---

## 🖥️ OPÇÃO 2: Deploy em VPS Própria (Hostinger, DigitalOcean, Hetzner, AWS)

Se você já possui uma VPS Linux (Ubuntu/Debian):

1. Conecte na VPS via SSH:
   ```bash
   ssh root@seu-ip-do-servidor
   ```
2. Instale o Docker e Docker Compose se ainda não tiver:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Crie a pasta do projeto:
   ```bash
   mkdir -p /opt/transcunha-whatsapp && cd /opt/transcunha-whatsapp
   ```
4. Copie o arquivo `docker-compose.yml` da pasta `deploy-railway/docker-compose.yml` para este diretório.
5. Inicie os serviços com reinício automático:
   ```bash
   docker compose up -d
   ```
6. O servidor estará rodando na porta `8080` (ex: `http://SEU_IP:8080` ou sob seu domínio com SSL Nginx/Traefik).

---

## 🔒 Persistência de Dados & Segurança
* As mensagens, histórico de envios e modelos de texto ficam persistidos com segurança no **Supabase** da Transcunha.
* As chaves da sessão do WhatsApp ficam salvas no PostgreSQL e Redis do servidor de nuvem.
* **Resultado:** O computador pode ser desligado, as abas fechadas e mesmo assim quando uma nova carga ou adiantamento for liberado, o WhatsApp disparará automaticamente!
