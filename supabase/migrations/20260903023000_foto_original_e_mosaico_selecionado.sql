-- Guarda a foto original enviada pela cliente em cada produto (antes so existia
-- durante a sessao do WhatsApp e se perdia depois, impedindo o "refazer" de usar
-- a foto real como referencia) e marca qual mosaico (entre varias tentativas de
-- refazer) e o oficial, usado na planilha (CSV) e como fonte do recorte em fotos
-- individuais.

alter table produtos add column if not exists foto_original_url text;
alter table produto_fotos add column if not exists selecionada boolean not null default false;

comment on column produtos.foto_original_url is 'URL da foto original enviada pela cliente (WhatsApp/CRM), usada como referencia para refazer o mosaico com fidelidade';
comment on column produto_fotos.selecionada is 'Marca qual mosaico_bruto (entre varias tentativas/refeitos) e o oficial: usado na planilha (CSV) e como fonte pro recorte em fotos individuais';
