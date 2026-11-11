alter table os_producao add column if not exists departamento text;
alter table tarefas add column if not exists os_producao_id uuid references os_producao(id) on delete cascade;
create unique index if not exists tarefas_os_producao_uniq on tarefas(os_producao_id) where os_producao_id is not null;
