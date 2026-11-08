-- Anexos do quiz da consultoria (fotos de referência, paleta do evento): bucket privado, envio só com token de quiz válido.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-anexos', 'quiz-anexos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.quiz_token_valido(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.consultoria_quiz_envios where token = p_token and status <> 'respondido')
$$;
grant execute on function public.quiz_token_valido(text) to anon, authenticated;

drop policy if exists quiz_anexos_anon_insert on storage.objects;
create policy quiz_anexos_anon_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'quiz-anexos' and public.quiz_token_valido((storage.foldername(name))[1]));
drop policy if exists quiz_anexos_leitura_equipe on storage.objects;
create policy quiz_anexos_leitura_equipe on storage.objects for select to authenticated using (bucket_id = 'quiz-anexos');
drop policy if exists quiz_anexos_apagar_equipe on storage.objects;
create policy quiz_anexos_apagar_equipe on storage.objects for delete to authenticated using (bucket_id = 'quiz-anexos');
