# Migrations — Das G Digital

A partir de 12/08/2026, todo o schema do banco (projeto Supabase `gfmvyujaxlwizmvwmcfm`) é
versionado aqui. Nenhum SQL deve mais ser aplicado à mão pelo SQL Editor do painel Supabase.

## Regras

- Este repositório é o **dono do schema**. Os workflows n8n (VPS `n8n.srv1890228.hstgr.cloud`)
  **consomem** dados, mas nunca criam ou alteram tabela — se um workflow precisar de coluna
  nova, a migration nasce aqui primeiro.
- Toda mudança de schema é um arquivo novo `YYYYMMDDHHMMSS_descricao.sql` neste diretório,
  nunca uma edição do baseline.
- `20260812000000_baseline.sql` captura o estado real de produção no momento em que o controle
  de versão começou — não é uma migration "desejada", é o retrato do que já existia.

## Contexto

Ver `Das G Digital/ARQUITETURA-AUDITORIA-2026-08-12.md` (fora deste repo, na pasta de projeto
local da Juliana) para o plano de arquitetura completo — schema novo de Vitrine/Estoque,
estratégia de RLS/segurança e o plano faseado 0→5.
