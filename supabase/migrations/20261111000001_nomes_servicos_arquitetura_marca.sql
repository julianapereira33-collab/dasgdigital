-- Arquitetura da marca (Revisão Novembro 2026): novos nomes e valores nos textos da Júlia e na configuração do fluxo.
create or replace function public._marca_nomes(t text) returns text language plpgsql immutable as $f$
declare p text[]; r text := t;
begin
  if r is null then return null; end if;
  for p in select array[a,b] from (values
    ('My Personal Stylist','§MPS§'),
    ('MY PERSONAL STYLIST','§MPSU§'),
    ('Personal Stylist','Estilista com Ju Pereira'),
    ('PERSONAL STYLIST','ESTILISTA COM JU PEREIRA'),
    ('§MPS§','My Personal Stylist'),
    ('§MPSU§','MY PERSONAL STYLIST'),
    ('My Consultora','Curadoria Consultiva'),
    ('MY CONSULTORA','CURADORIA CONSULTIVA'),
    ('My Orçamento','Orçamento Couture'),
    ('MY ORÇAMENTO','ORÇAMENTO COUTURE'),
    ('My Paleta R$ 127','Minha Paleta R$ 147'),
    ('MY PALETA — R$ 127','MINHA PALETA — R$ 147'),
    ('My Paleta','Minha Paleta'),
    ('MY PALETA','MINHA PALETA'),
    ('R$ 987','R$ 947'),
    ('Das G Tissu','DAS G Têxtil'),
    ('DAS G TISSU','DAS G TÊXTIL'),
    ('MAISON DAS G — Moda Festa','DAS G — Moda Festa'),
    ('bem-vinda à Maison DAS G','bem-vinda à DAS G'),
    ('atendimento da Maison Das G','atendimento da DAS G'),
    ('Aqui é da Maison Das G','Aqui é da DAS G'),
    ('que a Maison Das G faça','que a DAS G faça'),
    ('escopo da Maison Das G','escopo da DAS G'),
    ('Você SÓ fala sobre: Maison Das G,','Você SÓ fala sobre: DAS G (a marca; a Maison DAS G é a casa física),'),
    (' na Maison Das G',' na Maison DAS G'),
    ('recebe o upgrade para o My Personal Stylist sem pagar a diferença (as regras de prazo e quais pedidos dão direito: confirme com a equipe, não detalhe)','ao fechar a criação de um novo vestido Couture personalizado, recebe o My Personal Stylist completo (valor de referência R$ 947) sem cobrança adicional; não prometa abatimento dos valores já pagos e confirme regras com a equipe'),
    ('Maison Das G','DAS G'),
    ('Show Room','Showroom'),
    ('SHOW ROOM','SHOWROOM')
  ) v(a,b) loop r := replace(r, p[1], p[2]); end loop;
  return r;
end $f$;
update prompts_ia set conteudo = _marca_nomes(conteudo) where ativo;
update conhecimento_julia set conteudo = _marca_nomes(conteudo), titulo = _marca_nomes(titulo) where ativo;
update respostas_automaticas set resposta = _marca_nomes(resposta), titulo = _marca_nomes(titulo);
update agenda_modelos_msg set texto = _marca_nomes(texto), titulo = _marca_nomes(titulo);
drop function public._marca_nomes(text);
create or replace function public._fluxo_cfg(p_tipo text)
returns table(cobra boolean, quiz text, rotulo text, preco numeric) language sql immutable as $$
  select v.c, v.q, v.r, v.p from (values
    ('completo'::text, true, 'completo'::text, 'Estilista com Ju Pereira'::text, 397::numeric),
    ('consultivo', true, 'consultivo', 'Curadoria Consultiva', 147),
    ('orcamento', false, 'orcamento', 'Orçamento Couture', 0),
    ('orientacao_tecido', true, 'tecido', 'My Curadoria de Tecidos', 47),
    ('cerimonial', true, null, 'Stylist Cerimonial', 497),
    ('my_personal_stylist', true, 'completo', 'My Personal Stylist', 947)
  ) v(t,c,q,r,p) where v.t = p_tipo
$$;
