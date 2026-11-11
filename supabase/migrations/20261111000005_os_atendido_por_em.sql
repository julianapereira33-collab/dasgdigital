alter table ordens_servico add column if not exists atendido_por text;
alter table ordens_servico add column if not exists atendido_em timestamptz;
