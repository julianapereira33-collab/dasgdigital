# Das G Digital — CRM/ERP

Sistema de gestão do ateliê Das G by Juliana Pereira.

## Stack
- React 18 + Vite
- Supabase (banco de dados — configurar em `.env`)
- Deploy: Vercel

## Rodar localmente

```bash
npm install
npm run dev
```

## Deploy Vercel

1. Subir este repositório no GitHub
2. Importar no Vercel (vercel.com/new)
3. Framework: Vite
4. Adicionar variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Módulos

- Dashboard — métricas, próximos compromissos, OS em andamento
- Clientes — cadastro completo com medidas, endereço NF-e, histórico
- Ordens de Serviço — peças, provas, anotações, impressão PDF
- Orçamentos — formação de preço com overhead e margem
- Financeiro — pedidos de venda, a receber, a pagar, fluxo de caixa
- Agenda — compromissos vinculados às OS
- Briefing & Dossiê — questionário raio-x, briefing IA, imagens IA, dossiê com fluxo de aprovação

## Próxima fase
- Conexão real com Supabase
- Integração Bling API (sync clientes + pedidos de venda)
- Google Calendar sync
- Z-API WhatsApp (confirmações, lembretes, envio de dossiê)
- Confirmação de pagamento PIX via webhook n8n + InfinitePay
