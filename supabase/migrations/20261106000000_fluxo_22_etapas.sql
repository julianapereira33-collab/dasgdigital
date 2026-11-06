-- Fluxo da OS em 22 etapas (cliente → ... → marketing). Migra o status antigo para o novo.
alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
update public.ordens_servico set status = case status
  when 'lead' then 'cliente' when 'qualificacao' then 'atendimento' when 'agendado' then 'agendamento'
  when 'orcamento_enviado' then 'orcamento' when 'aprovado' then 'aprovacao' when 'entrada' then 'venda'
  when 'os_aberta' then 'os' when 'briefing' then 'criacao' when 'dossie' then 'criacao'
  when 'modelagem' then 'tecido' when 'costura' then 'montagem' when 'acabamento' then 'montagem'
  when 'ajustes1' then 'ajuste1' when 'pgto_final' then 'finalizacao' when 'feedback' then 'pos_venda'
  else status end;
alter table public.ordens_servico add constraint ordens_servico_status_check check (status in
 ('cliente','atendimento','agendamento','consultoria','criacao','orcamento','aprovacao','venda','os','tecido','corte','montagem','prova1','ajuste1','prova2','ajuste2','prova_final','prova4','finalizacao','entrega','pos_venda','marketing'));
alter table public.ordens_servico alter column status set default 'cliente';
