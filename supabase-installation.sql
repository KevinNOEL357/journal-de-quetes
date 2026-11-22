-- =====================================================================
--  Journal de quêtes : la base de données partagée (Supabase)
--  À coller UNE FOIS dans Supabase > SQL Editor, puis "Run".
-- =====================================================================
--  Idée : un "foyer" = un groupe de personnes qui partagent le même journal.
--  On rejoint un foyer avec son code (ex. K7P3-Q9XA-2M).
--  Toutes les données du journal du foyer sont rangées dans une seule case (donnees),
--  et chaque appareil fusionne ses changements avec ceux des autres.
-- =====================================================================

-- 1. Les tables
create table if not exists public.foyers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  donnees jsonb not null default '{}'::jsonb,
  version bigint not null default 0,      -- augmente à chaque enregistrement
  maj timestamptz not null default now()
);

create table if not exists public.membres (
  foyer_id uuid not null references public.foyers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (foyer_id, user_id)
);

-- 2. La sécurité : personne ne voit rien, sauf ce qu'on autorise ci-dessous
alter table public.foyers enable row level security;
alter table public.membres enable row level security;

create or replace function public.est_membre(f uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from membres where foyer_id = f and user_id = auth.uid());
$$;

drop policy if exists "lire son foyer" on public.foyers;
create policy "lire son foyer" on public.foyers
  for select to authenticated using (public.est_membre(id));

drop policy if exists "voir les membres de son foyer" on public.membres;
create policy "voir les membres de son foyer" on public.membres
  for select to authenticated using (public.est_membre(foyer_id));
-- (pas de droit d'écriture direct : tout passe par les fonctions ci-dessous)

-- 3. Créer un foyer (renvoie son code)
create or replace function public.creer_foyer(donnees_depart jsonb) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text; i int; f public.foyers;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  loop
    c := '';
    for i in 1..10 loop
      c := c || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1);
    end loop;
    exit when not exists (select 1 from foyers where code = c);
  end loop;
  insert into foyers (code, donnees, version) values (c, coalesce(donnees_depart, '{}'::jsonb), 1)
    returning * into f;
  insert into membres (foyer_id, user_id) values (f.id, auth.uid());
  return json_build_object('id', f.id, 'code', f.code, 'version', f.version);
end $$;

-- 4. Rejoindre un foyer avec son code
create or replace function public.rejoindre_foyer(code_saisi text) returns json
language plpgsql security definer set search_path = public as $$
declare f public.foyers;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  select * into f from foyers
   where code = upper(regexp_replace(coalesce(code_saisi, ''), '[^A-Za-z0-9]', '', 'g'));
  if f.id is null then raise exception 'code inconnu'; end if;
  insert into membres (foyer_id, user_id) values (f.id, auth.uid()) on conflict do nothing;
  return json_build_object('id', f.id, 'code', f.code, 'version', f.version, 'donnees', f.donnees);
end $$;

-- 5. Enregistrer le journal (refusé si quelqu'un a enregistré entre-temps : on refusionne alors)
create or replace function public.enregistrer(f uuid, nouvelles jsonb, version_attendue bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not public.est_membre(f) then raise exception 'pas membre de ce foyer'; end if;
  update foyers set donnees = nouvelles, version = version + 1, maj = now()
   where id = f and version = version_attendue
   returning version into v;
  return v;   -- vide (null) si la version a changé
end $$;

-- 6. Quitter un foyer (il est effacé quand plus personne n'y est)
create or replace function public.quitter_foyer(f uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from membres where foyer_id = f and user_id = auth.uid();
  delete from foyers where id = f and not exists (select 1 from membres where foyer_id = f);
end $$;

-- 7. Qui a le droit d'utiliser ces fonctions : seulement les appareils connectés
revoke all on function public.est_membre(uuid) from public, anon;
revoke all on function public.creer_foyer(jsonb) from public, anon;
revoke all on function public.rejoindre_foyer(text) from public, anon;
revoke all on function public.enregistrer(uuid, jsonb, bigint) from public, anon;
revoke all on function public.quitter_foyer(uuid) from public, anon;
grant execute on function public.est_membre(uuid) to authenticated;
grant execute on function public.creer_foyer(jsonb) to authenticated;
grant execute on function public.rejoindre_foyer(text) to authenticated;
grant execute on function public.enregistrer(uuid, jsonb, bigint) to authenticated;
grant execute on function public.quitter_foyer(uuid) to authenticated;

-- 7 bis. Le droit de LIRE les tables (les règles de sécurité ci-dessus filtrent ensuite les lignes)
grant usage on schema public to authenticated;
grant select on public.foyers, public.membres to authenticated;

-- 8. Le temps réel : prévenir les autres appareils dès qu'un journal change
do $$ begin
  alter publication supabase_realtime add table public.foyers;
exception when duplicate_object then null; end $$;
