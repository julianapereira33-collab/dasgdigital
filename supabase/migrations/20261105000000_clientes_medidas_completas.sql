-- Medidas completas da cliente (idempotente, só adiciona colunas)
alter table public.clientes
  add column if not exists ombro numeric,
  add column if not exists costas numeric,
  add column if not exists sob_busto numeric,
  add column if not exists altura_cintura numeric,
  add column if not exists altura_decote numeric,
  add column if not exists compr_vestido numeric,
  add column if not exists compr_saia numeric,
  add column if not exists compr_calca numeric,
  add column if not exists compr_blusa numeric,
  add column if not exists largura_braco numeric;
