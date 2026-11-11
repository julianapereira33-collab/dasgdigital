create table if not exists departamentos (
  chave text primary key,
  nome text not null,
  curto text,
  cor text default '#6b7280',
  ativo boolean default true,
  base boolean default false,
  ordem integer default 100,
  created_at timestamptz default now()
);
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  departamento text,
  funcao text,
  telefone text,
  valor_hora numeric,
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table departamentos enable row level security;
alter table colaboradores enable row level security;
drop policy if exists authenticated_full_access on departamentos;
create policy authenticated_full_access on departamentos for all to authenticated using (true) with check (true);
drop policy if exists authenticated_full_access on colaboradores;
create policy authenticated_full_access on colaboradores for all to authenticated using (true) with check (true);
insert into departamentos (chave, nome, curto, cor, base, ordem) values
 ('adm','ADM','ADM','#c4a45a',true,1),
 ('clientes','Clientes','Clientes','#d97706',true,2),
 ('atelie','Ateliê','Ateliê','#0ea5e9',true,3),
 ('marketing','Marketing','Marketing','#e11d48',true,4),
 ('financeira','Financeira 🔒','Financeira','#0f766e',true,5),
 ('tissu','Das G Tissu (tecidos)','Das G Tissu','#7c3aed',true,6)
on conflict (chave) do nothing;
