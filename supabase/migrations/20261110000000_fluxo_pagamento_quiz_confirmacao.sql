-- Fluxo do atendimento agendado: horário reservado -> pagamento -> quiz -> horário confirmado.
-- A Júlia agenda (OS + agenda); um robô do n8n roda a cada 30 min e cobra pagamento, envia/cobra o quiz e confirma o horário.
alter table public.agenda add column if not exists lembrete_pagamento_em timestamptz;
alter table public.agenda add column if not exists lembrete_quiz_em timestamptz;
alter table public.agenda add column if not exists fluxo_alerta_link_em timestamptz;
alter table public.ordens_servico add column if not exists fluxo_auto boolean not null default false;
alter table public.ordens_servico alter column fluxo_auto set default true; -- OS novas entram no fluxo automático; as antigas ficam como estão

create or replace function public._fluxo_cfg(p_tipo text)
returns table(cobra boolean, quiz text, rotulo text, preco numeric) language sql immutable as $$
  select * from (values
    ('completo'::text, true, 'completo'::text, 'Personal Stylist'::text, 397::numeric),
    ('consultivo', true, 'consultivo', 'My Consultora', 147),
    ('orcamento', false, 'orcamento', 'My Orçamento', 0),
    ('orientacao_tecido', true, 'tecido', 'My Curadoria de Tecidos', 47),
    ('cerimonial', true, null, 'Stylist Cerimonial', 497),
    ('my_personal_stylist', true, 'completo', 'My Personal Stylist', 987)
  ) v(t,c,q,r,p) where v.t = p_tipo
$$;

-- Júlia agenda: agora cria também a OS (para pagamento e quiz acompanharem o horário)
create or replace function public.julia_agendar(p_telefone text, p_nome text, p_tipo_atendimento text, p_data text, p_hora text, p_ocasiao text default null, p_data_evento text default null, p_observacoes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tel text := regexp_replace(coalesce(p_telefone,''),'\D','','g'); cid uuid; ini timestamptz; h int; d date; tipo text := coalesce(nullif(p_tipo_atendimento,''),'orcamento'); tit text; aid uuid; dtev date; oid uuid; num text; cfg record;
begin
  if length(tel) < 8 then return jsonb_build_object('ok',false,'erro','telefone inválido'); end if;
  if tipo not in ('completo','consultivo','orcamento','orientacao_tecido','cerimonial','my_personal_stylist') then tipo := 'orcamento'; end if;
  begin d := p_data::date; h := split_part(p_hora,':',1)::int; exception when others then return jsonb_build_object('ok',false,'erro','data/hora inválida'); end;
  if extract(dow from d)=0 or h not in (10,14,15,16) then return jsonb_build_object('ok',false,'erro','horário fora do atendimento (seg a sáb, 10h, 14h, 15h ou 16h)'); end if;
  ini := ((d::text||' '||lpad(h::text,2,'0')||':00')::timestamp at time zone 'America/Sao_Paulo');
  if ini < now() + interval '3 hours' then return jsonb_build_object('ok',false,'erro','horário já passou ou muito próximo'); end if;
  if exists (select 1 from agenda a where coalesce(a.status,'') not in ('cancelado','cancelada','remarcado','concluido')
             and a.data_hora < ini + interval '60 minutes' and a.data_hora + make_interval(mins => coalesce(a.duracao_min,60)) > ini) then
    return jsonb_build_object('ok',false,'erro','horário ocupado, ofereça outro');
  end if;
  select id into cid from clientes where right(regexp_replace(coalesce(telefone,''),'\D','','g'),8) = right(tel,8) order by created_at limit 1;
  if cid is null then
    insert into clientes(nome, telefone, origem) values (coalesce(nullif(trim(p_nome),''),'Cliente WhatsApp'), tel, 'WhatsApp - Júlia') returning id into cid;
  end if;
  begin dtev := nullif(p_data_evento,'')::date; exception when others then dtev := null; end;
  select * into cfg from _fluxo_cfg(tipo);
  tit := cfg.rotulo;
  select 'OS-'||extract(year from now())::int||'-'||lpad((coalesce(max(nullif(split_part(numero,'-',3),'')::int),0)+1)::text,3,'0') into num
    from ordens_servico where numero like 'OS-'||extract(year from now())::int||'-%';
  insert into ordens_servico(cliente_id, numero, tipo, tipo_atendimento, canal, status, ocasiao, data_evento, consultoria_valor, pagamento_status, descricao)
   values (cid, num, 'encomenda', tipo, 'whatsapp', 'agendamento', nullif(p_ocasiao,''), dtev, nullif(cfg.preco,0), case when cfg.cobra then 'pendente' else null end, left(coalesce(p_observacoes,''),500))
   returning id into oid;
  insert into agenda(cliente_id,ordem_servico_id,tipo,data_hora,status,duracao_min,titulo,departamento,observacoes)
   values (cid,oid,tipo,ini,'aguardando_confirmacao',60,tit,'clientes',
     trim(both ' ' from concat('Agendado pela Júlia (WhatsApp). ', case when p_ocasiao is not null then 'Ocasião: '||p_ocasiao||'. ' end, case when dtev is not null then 'Evento: '||to_char(dtev,'DD/MM/YYYY')||'. ' end, coalesce(p_observacoes,''))))
   returning id into aid;
  return jsonb_build_object('ok',true,'agenda_id',aid,'cliente_id',cid,'os',num,'atendimento',tit,'quando',to_char(d,'DD/MM/YYYY')||' às '||lpad(h::text,2,'0')||':00');
end $$;

-- Robô: o que precisa ser enviado agora. Só dispara das 8h às 20h (Brasília).
create or replace function public.fluxo_atendimento_pendencias()
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb := '[]'::jsonb; x record; cfg record; q record; tel text; ph text; prim text; quando text; link text; dh numeric; pago boolean; hora int;
begin
  hora := extract(hour from now() at time zone 'America/Sao_Paulo')::int;
  if (hora < 8 or hora >= 20) and coalesce(current_setting('app.fluxo_testar', true),'') <> '1' then return r; end if;
  for x in
    select a.id aid, a.data_hora, a.status ast, a.lembrete_pagamento_em, a.lembrete_quiz_em, a.fluxo_alerta_link_em,
           o.id oid, o.tipo_atendimento ta, o.pagamento_status ps, o.link_pagamento lp, o.pagamento_link_enviado_em ple,
           c.id cid, c.nome, c.telefone
    from agenda a join ordens_servico o on o.id = a.ordem_servico_id join clientes c on c.id = a.cliente_id
    where o.fluxo_auto and a.data_hora > now() and a.status in ('aguardando_confirmacao','agendado')
      and o.tipo_atendimento in ('completo','consultivo','orcamento','orientacao_tecido','cerimonial','my_personal_stylist')
    order by a.data_hora
  loop
    select * into cfg from _fluxo_cfg(x.ta);
    tel := regexp_replace(coalesce(x.telefone,''),'\D','','g');
    if length(tel) < 8 then continue; end if;
    ph := case when left(tel,2)='55' and length(tel)>=12 then tel else '55'||tel end;
    prim := coalesce(nullif(split_part(trim(x.nome),' ',1),''),'tudo bem');
    quando := to_char(x.data_hora at time zone 'America/Sao_Paulo','DD/MM "às" HH24"h"MI');
    dh := extract(epoch from (x.data_hora - now()))/3600;
    pago := (not cfg.cobra) or x.ps = 'pago';
    select * into q from consultoria_quiz_envios where ordem_servico_id = x.oid order by criado_em desc limit 1;

    if not pago then
      if coalesce(x.lp,'') = '' then
        if x.fluxo_alerta_link_em is null or x.fluxo_alerta_link_em < now() - interval '12 hours' then
          r := r || jsonb_build_object('acao','alertar_sem_link','agenda_id',x.aid,'destino','juliana','phone','5514997763166','nome',x.nome,
            'mensagem','⚠️ *Falta o link de pagamento* — '||x.nome||' agendou '||cfg.rotulo||' para '||quando||'. Cole o link na OS (Atendimento) e eu envio junto com a confirmação do horário.');
        end if;
      elsif x.ple is null then
        r := r || jsonb_build_object('acao','confirmacao_pagamento','agenda_id',x.aid,'destino','cliente','phone',ph,'nome',x.nome,
          'mensagem','Olá, '||prim||'! 💛 Seu horário na Maison DAS G está reservado: '||cfg.rotulo||' em '||quando||'. Para confirmar, é só concluir o pagamento (investimento de R$ '||replace(to_char(cfg.preco,'FM999G990D00'),'.',',')||'):'||E'\n\n'||x.lp||E'\n\nAssim que o pagamento for confirmado, eu te envio o questionário do atendimento, e depois dele o horário fica confirmado.');
      elsif x.lembrete_pagamento_em is null or x.lembrete_pagamento_em < now() - interval '24 hours' then
        r := r || jsonb_build_object('acao','cobrar_pagamento','agenda_id',x.aid,'destino','cliente','phone',ph,'nome',x.nome,
          'mensagem','Oi, '||prim||'! 💛 Seu horário de '||quando||' ainda está aguardando o pagamento. Para receber o questionário e confirmar seu atendimento, é só concluir por aqui:'||E'\n\n'||x.lp||case when dh < 48 then E'\n\nComo o atendimento está próximo, preciso do pagamento para manter sua reserva.' else '' end);
      end if;
    elsif cfg.quiz is not null and (q.id is null or q.status <> 'respondido') then
      if q.id is null then
        insert into consultoria_quiz_envios(cliente_id, ordem_servico_id, tipo_quiz, nome_cliente, telefone) values (x.cid, x.oid, cfg.quiz, x.nome, x.telefone) returning * into q;
      end if;
      link := 'https://dasgdigital-crm.vercel.app/?quiz='||q.token;
      if q.enviado_em is null then
        r := r || jsonb_build_object('acao','enviar_quiz','agenda_id',x.aid,'destino','cliente','phone',ph,'nome',x.nome,'quiz_id',q.id,
          'mensagem','Pagamento confirmado, '||prim||'! 💛 Agora falta só o seu questionário (uns 5 minutos), ele já é o início do seu atendimento e é com ele que a Ju prepara tudo para você:'||E'\n\n'||link||E'\n\nAssim que você responder, seu horário de '||quando||' fica confirmado.');
      elsif x.lembrete_quiz_em is null or x.lembrete_quiz_em < now() - (case when dh < 24 then interval '6 hours' else interval '24 hours' end) then
        r := r || jsonb_build_object('acao','cobrar_quiz','agenda_id',x.aid,'destino','cliente','phone',ph,'nome',x.nome,
          'mensagem','Oi, '||prim||'! 💛 Seu questionário ainda não foi respondido. '||case when dh < 24 then 'Seu atendimento é '||quando||' e preciso das suas respostas antes para te atender bem' else 'Preciso dele antes do seu atendimento de '||quando||' para me preparar' end||':'||E'\n\n'||link||E'\n\nSó depois dele o horário fica confirmado.');
      end if;
    elsif x.ast <> 'confirmado' then
      r := r || jsonb_build_object('acao','confirmar_horario','agenda_id',x.aid,'destino','cliente','phone',ph,'nome',x.nome,
        'mensagem','Tudo certo, '||prim||'! ✅ Seu horário está confirmado: '||cfg.rotulo||' em '||quando||'. Qualquer coisa é só me chamar por aqui. Te espero! 💛');
    end if;
  end loop;
  return r;
end $$;

-- Robô: depois de enviar, registra o que foi feito (e guarda a mensagem na conversa do painel)
create or replace function public.fluxo_atendimento_marcar(p_agenda_id uuid, p_acao text, p_mensagem text default null, p_quiz_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare a record; c record;
begin
  select * into a from agenda where id = p_agenda_id;
  if a.id is null then return; end if;
  if p_acao = 'alertar_sem_link' then update agenda set fluxo_alerta_link_em = now() where id = a.id; return; end if;
  if p_acao = 'confirmacao_pagamento' then
    update ordens_servico set pagamento_status = 'link_enviado', pagamento_link_enviado_em = now() where id = a.ordem_servico_id;
    update agenda set lembrete_pagamento_em = now(), confirmacao_enviada_em = now(), confirmacao_mensagem = p_mensagem where id = a.id;
  elsif p_acao = 'cobrar_pagamento' then update agenda set lembrete_pagamento_em = now() where id = a.id;
  elsif p_acao = 'enviar_quiz' then
    update consultoria_quiz_envios set status = 'enviado', enviado_em = now() where id = p_quiz_id;
    update agenda set lembrete_quiz_em = now() where id = a.id;
  elsif p_acao = 'cobrar_quiz' then update agenda set lembrete_quiz_em = now() where id = a.id;
  elsif p_acao = 'confirmar_horario' then update agenda set status = 'confirmado', confirmado_em = now() where id = a.id;
  end if;
  select * into c from clientes where id = a.cliente_id;
  if p_mensagem is not null and c.telefone is not null then
    insert into conversas_whatsapp(phone, nome, canal, direcao, mensagem, lida)
    values (case when left(regexp_replace(c.telefone,'\D','','g'),2)='55' then regexp_replace(c.telefone,'\D','','g') else '55'||regexp_replace(c.telefone,'\D','','g') end, c.nome, 'whatsapp', 'out_julia', p_mensagem, true);
  end if;
end $$;

-- Para o webhook de pagamento (Cakto/outro): marca a OS como paga pelo telefone ou pelo id da OS
create or replace function public.fluxo_pagamento_confirmar(p_os_id uuid default null, p_telefone text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare oid uuid := p_os_id; tel text := regexp_replace(coalesce(p_telefone,''),'\D','','g');
begin
  if oid is null and length(tel) >= 8 then
    select o.id into oid from ordens_servico o join clientes c on c.id = o.cliente_id
     where right(regexp_replace(coalesce(c.telefone,''),'\D','','g'),8) = right(tel,8) and o.pagamento_status in ('pendente','link_enviado')
     order by o.created_at desc limit 1;
  end if;
  if oid is null then return jsonb_build_object('ok',false,'erro','OS não encontrada'); end if;
  update ordens_servico set pagamento_status='pago', pago_em=now() where id = oid;
  return jsonb_build_object('ok',true,'os_id',oid);
end $$;

revoke all on function public.julia_agendar(text,text,text,text,text,text,text,text), public.fluxo_atendimento_pendencias(), public.fluxo_atendimento_marcar(uuid,text,text,uuid), public.fluxo_pagamento_confirmar(uuid,text), public._fluxo_cfg(text) from public, anon, authenticated;
grant execute on function public.julia_agendar(text,text,text,text,text,text,text,text), public.fluxo_atendimento_pendencias(), public.fluxo_atendimento_marcar(uuid,text,text,uuid), public.fluxo_pagamento_confirmar(uuid,text), public._fluxo_cfg(text) to service_role;
