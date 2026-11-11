alter table os_arquivos add column if not exists fase text;
alter table os_arquivos add column if not exists marketing_status text default 'novo';
alter table os_arquivos add column if not exists uso_autorizado boolean default false;
alter table os_arquivos add column if not exists marketing_obs text;
create index if not exists os_arquivos_conteudo_idx on os_arquivos(categoria, marketing_status);
