begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.pair_spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((status = 'active' and archived_at is null) or (status = 'archived' and archived_at is not null))
);

create table public.space_members (
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('active', 'history', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (space_id, user_id),
  check ((status = 'left' and left_at is not null) or (status <> 'left' and left_at is null))
);

create unique index space_members_one_active_space_per_user
  on public.space_members (user_id)
  where status = 'active';

create table public.pair_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text check (recipient_email is null or length(recipient_email) between 3 and 320),
  token_hash bytea unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (
    (status = 'pending' and recipient_email is not null and token_hash is not null and accepted_at is null)
    or (status = 'accepted' and recipient_email is null and token_hash is null and accepted_at is not null)
    or (status in ('revoked', 'expired') and recipient_email is null and token_hash is null and accepted_at is null)
  ),
  check (recipient_email is null or recipient_email = lower(recipient_email)),
  check (expires_at > created_at)
);

create unique index pair_invites_one_pending_per_inviter
  on public.pair_invites (inviter_id)
  where status = 'pending';
create index pair_invites_inviter_created_at_idx on public.pair_invites (inviter_id, created_at desc);

create table public.pair_settings (
  space_id uuid primary key references public.pair_spaces(id) on delete cascade,
  name_a text not null default 'Bạn A' check (length(name_a) <= 80),
  name_b text not null default 'Bạn B' check (length(name_b) <= 80),
  start_date date,
  theme text not null default 'deep-blue' check (theme in ('deep-blue', 'midnight', 'pastel-sky', 'sunset')),
  bg_effect text not null default 'hearts' check (bg_effect in ('hearts', 'clouds', 'fireflies', 'petals')),
  updated_at timestamptz not null default now()
);

create table public.timeline_events (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  event_date date not null,
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 4000),
  icon text not null default 'star' check (icon in ('star', 'heart', 'map', 'cake', 'gift', 'music', 'camera', 'home')),
  tag text check (tag is null or length(tag) <= 80),
  created_at timestamptz not null default now()
);

create index timeline_events_space_date_idx on public.timeline_events (space_id, event_date);

create table public.special_days (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  label text not null check (length(label) between 1 and 100),
  created_at timestamptz not null default now()
);

create index special_days_space_month_day_idx on public.special_days (space_id, month, day);

create table public.photos (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  object_path text not null unique,
  caption text not null default '' check (length(caption) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (object_path like space_id::text || '/%')
);

create index photos_space_order_idx on public.photos (space_id, sort_order, created_at);

create table public.playlist_tracks (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  object_path text not null unique,
  title text not null check (length(title) between 1 and 160),
  artist text not null default '' check (length(artist) <= 160),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (object_path like space_id::text || '/%')
);

create index playlist_tracks_space_order_idx on public.playlist_tracks (space_id, sort_order, created_at);

create table public.legacy_imports (
  space_id uuid not null references public.pair_spaces(id) on delete cascade,
  source_fingerprint bytea not null,
  imported_by uuid not null references auth.users(id) on delete restrict,
  imported_at timestamptz not null default now(),
  timeline_count integer not null default 0 check (timeline_count >= 0),
  photo_count integer not null default 0 check (photo_count >= 0),
  track_count integer not null default 0 check (track_count >= 0),
  primary key (space_id, source_fingerprint)
);

create or replace function private.assert_pair_member_count(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_status text;
  v_total integer;
  v_active integer;
  v_history integer;
  v_left integer;
begin
  select s.status into v_space_status
  from public.pair_spaces s
  where s.id = p_space_id;

  if not found then
    return;
  end if;

  select count(*),
         count(*) filter (where m.status = 'active'),
         count(*) filter (where m.status = 'history'),
         count(*) filter (where m.status = 'left')
    into v_total, v_active, v_history, v_left
  from public.space_members m
  where m.space_id = p_space_id;

  if v_total <> 2 then
    raise exception 'A pair space must retain exactly two member records';
  end if;

  if v_space_status = 'active' and v_active <> 2 then
    raise exception 'An active pair space must have exactly two active members';
  end if;

  if v_space_status = 'archived' and (v_active <> 0 or v_history + v_left <> 2) then
    raise exception 'An archived pair space must contain only history or left members';
  end if;
end;
$$;

create or replace function private.check_pair_space_members_after_space_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_pair_member_count(new.id);
  return null;
end;
$$;

create or replace function private.check_pair_space_members_after_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.assert_pair_member_count(old.space_id);
  else
    perform private.assert_pair_member_count(new.space_id);
  end if;
  return null;
end;
$$;

create constraint trigger pair_spaces_member_count_check
  after insert or update on public.pair_spaces
  deferrable initially deferred
  for each row execute function private.check_pair_space_members_after_space_change();

create constraint trigger space_members_count_check
  after insert or update or delete on public.space_members
  deferrable initially deferred
  for each row execute function private.check_pair_space_members_after_member_change();

create or replace function private.can_view_space(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members m
    join public.pair_spaces s on s.id = m.space_id
    where m.space_id = p_space_id
      and m.user_id = (select auth.uid())
      and ((m.status = 'active' and s.status = 'active')
        or (m.status = 'history' and s.status = 'archived'))
  );
$$;

create or replace function private.can_write_space(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members m
    join public.pair_spaces s on s.id = m.space_id
    where m.space_id = p_space_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and s.status = 'active'
  );
$$;

create or replace function public.create_pair_invite(p_recipient_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_confirmed_at timestamptz;
  v_provider text;
  v_recipient text := lower(btrim(p_recipient_email));
  v_token text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select u.email, u.email_confirmed_at, u.raw_app_meta_data ->> 'provider'
    into v_email, v_confirmed_at, v_provider
  from auth.users u
  where u.id = v_user_id
  for update;

  if v_email is null or v_confirmed_at is null or v_provider is distinct from 'google' then
    raise exception 'Verified Google account required';
  end if;

  if v_recipient is null
     or length(v_recipient) > 320
     or v_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Valid recipient email required';
  end if;

  if lower(v_email) = v_recipient then
    raise exception 'Invite recipient must differ from inviter';
  end if;

  if exists (
    select 1 from public.space_members m
    where m.user_id = v_user_id and m.status = 'active'
  ) then
    raise exception 'Leave the active space before creating another invite';
  end if;

  if (
    select count(*) from public.pair_invites i
    where i.inviter_id = v_user_id and i.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Invite rate limit reached';
  end if;

  update public.pair_invites
  set status = 'expired', recipient_email = null, token_hash = null
  where status = 'pending' and expires_at <= now();

  update public.pair_invites
  set status = 'revoked', recipient_email = null, token_hash = null
  where inviter_id = v_user_id and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.pair_invites (inviter_id, recipient_email, token_hash, expires_at)
  values (
    v_user_id,
    v_recipient,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    now() + interval '7 days'
  );

  return v_token;
end;
$$;

create or replace function public.redeem_pair_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_confirmed_at timestamptz;
  v_provider text;
  v_invite public.pair_invites%rowtype;
  v_space_id uuid := extensions.gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select u.email, u.email_confirmed_at, u.raw_app_meta_data ->> 'provider'
    into v_email, v_confirmed_at, v_provider
  from auth.users u
  where u.id = v_user_id;

  if v_email is null or v_confirmed_at is null or v_provider is distinct from 'google' then
    raise exception 'Verified Google account required';
  end if;

  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invite is invalid or no longer available';
  end if;

  select i.* into v_invite
  from public.pair_invites i
  where i.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
  for update;

  if not found or v_invite.status <> 'pending' then
    raise exception 'Invite is invalid or no longer available';
  end if;

  if v_invite.expires_at <= now() then
    update public.pair_invites
    set status = 'expired', recipient_email = null, token_hash = null
    where id = v_invite.id;
    return null;
  end if;

  if lower(v_invite.recipient_email) <> lower(v_email)
     or v_invite.inviter_id = v_user_id then
    raise exception 'Invite is invalid or no longer available';
  end if;

  if exists (
    select 1 from public.space_members m
    where m.user_id in (v_user_id, v_invite.inviter_id) and m.status = 'active'
  ) then
    raise exception 'Both people must leave active spaces before pairing';
  end if;

  update public.pair_invites
  set status = 'revoked', recipient_email = null, token_hash = null
  where status = 'pending'
    and inviter_id in (v_user_id, v_invite.inviter_id)
    and id <> v_invite.id;

  insert into public.pair_spaces (id) values (v_space_id);
  insert into public.space_members (space_id, user_id, status)
  values
    (v_space_id, v_invite.inviter_id, 'active'),
    (v_space_id, v_user_id, 'active');
  insert into public.pair_settings (space_id) values (v_space_id);

  update public.pair_invites
  set status = 'accepted', accepted_at = now(), recipient_email = null, token_hash = null
  where id = v_invite.id;

  return v_space_id;
end;
$$;

create or replace function public.end_relationship(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1 from public.pair_spaces s
  join public.space_members m on m.space_id = s.id
  where s.id = p_space_id
    and s.status = 'active'
    and m.user_id = v_user_id
    and m.status = 'active'
  for update of s;

  if not found then
    raise exception 'Active space not found';
  end if;

  update public.pair_spaces
  set status = 'archived', archived_at = now()
  where id = p_space_id;

  update public.space_members
  set status = case when user_id = v_user_id then 'left' else 'history' end,
      left_at = case when user_id = v_user_id then now() else null end
  where space_id = p_space_id and status = 'active';

  update public.pair_invites
  set status = 'revoked', recipient_email = null, token_hash = null
  where status = 'pending'
    and inviter_id in (
      select m.user_id from public.space_members m where m.space_id = p_space_id
    );
end;
$$;

create or replace function public.leave_archived_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.space_members m
  set status = 'left', left_at = now()
  from public.pair_spaces s
  where m.space_id = p_space_id
    and m.user_id = (select auth.uid())
    and m.status = 'history'
    and s.id = m.space_id
    and s.status = 'archived';

  if not found then
    raise exception 'Archived history membership not found';
  end if;
end;
$$;

alter table public.pair_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.pair_invites enable row level security;
alter table public.pair_settings enable row level security;
alter table public.timeline_events enable row level security;
alter table public.special_days enable row level security;
alter table public.photos enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.legacy_imports enable row level security;

create policy pair_spaces_select on public.pair_spaces
  for select to authenticated using (private.can_view_space(id));

create policy space_members_select on public.space_members
  for select to authenticated using (user_id = (select auth.uid()) or private.can_view_space(space_id));

create policy pair_invites_select_own on public.pair_invites
  for select to authenticated using (inviter_id = (select auth.uid()));

create policy pair_settings_select on public.pair_settings
  for select to authenticated using (private.can_view_space(space_id));
create policy pair_settings_insert on public.pair_settings
  for insert to authenticated with check (private.can_write_space(space_id));
create policy pair_settings_update on public.pair_settings
  for update to authenticated using (private.can_write_space(space_id)) with check (private.can_write_space(space_id));
create policy pair_settings_delete on public.pair_settings
  for delete to authenticated using (private.can_write_space(space_id));

create policy timeline_events_select on public.timeline_events
  for select to authenticated using (private.can_view_space(space_id));
create policy timeline_events_insert on public.timeline_events
  for insert to authenticated with check (private.can_write_space(space_id));
create policy timeline_events_update on public.timeline_events
  for update to authenticated using (private.can_write_space(space_id)) with check (private.can_write_space(space_id));
create policy timeline_events_delete on public.timeline_events
  for delete to authenticated using (private.can_write_space(space_id));

create policy special_days_select on public.special_days
  for select to authenticated using (private.can_view_space(space_id));
create policy special_days_insert on public.special_days
  for insert to authenticated with check (private.can_write_space(space_id));
create policy special_days_update on public.special_days
  for update to authenticated using (private.can_write_space(space_id)) with check (private.can_write_space(space_id));
create policy special_days_delete on public.special_days
  for delete to authenticated using (private.can_write_space(space_id));

create policy photos_select on public.photos
  for select to authenticated using (private.can_view_space(space_id));
create policy photos_insert on public.photos
  for insert to authenticated with check (private.can_write_space(space_id));
create policy photos_update on public.photos
  for update to authenticated using (private.can_write_space(space_id)) with check (private.can_write_space(space_id));
create policy photos_delete on public.photos
  for delete to authenticated using (private.can_write_space(space_id));

create policy playlist_tracks_select on public.playlist_tracks
  for select to authenticated using (private.can_view_space(space_id));
create policy playlist_tracks_insert on public.playlist_tracks
  for insert to authenticated with check (private.can_write_space(space_id));
create policy playlist_tracks_update on public.playlist_tracks
  for update to authenticated using (private.can_write_space(space_id)) with check (private.can_write_space(space_id));
create policy playlist_tracks_delete on public.playlist_tracks
  for delete to authenticated using (private.can_write_space(space_id));

create policy legacy_imports_select on public.legacy_imports
  for select to authenticated using (private.can_view_space(space_id));
create policy legacy_imports_insert on public.legacy_imports
  for insert to authenticated with check (
    private.can_write_space(space_id) and imported_by = (select auth.uid())
  );

revoke all on public.pair_spaces, public.space_members, public.pair_invites,
  public.pair_settings, public.timeline_events, public.special_days,
  public.photos, public.playlist_tracks, public.legacy_imports
  from anon, authenticated;

grant select on public.pair_spaces, public.space_members,
  public.pair_settings, public.timeline_events, public.special_days,
  public.photos, public.playlist_tracks, public.legacy_imports
  to authenticated;
grant insert, update, delete on public.pair_settings, public.timeline_events,
  public.special_days, public.photos, public.playlist_tracks to authenticated;
grant insert on public.legacy_imports to authenticated;

revoke all on function private.assert_pair_member_count(uuid) from public, anon, authenticated;
revoke all on function private.check_pair_space_members_after_space_change() from public, anon, authenticated;
revoke all on function private.check_pair_space_members_after_member_change() from public, anon, authenticated;
revoke all on function public.create_pair_invite(text) from public, anon, authenticated;
revoke all on function public.redeem_pair_invite(text) from public, anon, authenticated;
revoke all on function public.end_relationship(uuid) from public, anon, authenticated;
revoke all on function public.leave_archived_space(uuid) from public, anon, authenticated;
revoke all on function private.can_view_space(uuid) from public, anon, authenticated;
revoke all on function private.can_write_space(uuid) from public, anon, authenticated;
grant execute on function private.can_view_space(uuid), private.can_write_space(uuid) to authenticated;
grant execute on function public.create_pair_invite(text), public.redeem_pair_invite(text),
  public.end_relationship(uuid), public.leave_archived_space(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pair-media',
  'pair-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy pair_media_read on storage.objects
  for select to authenticated using (
    bucket_id = 'pair-media'
    and private.can_view_space(((storage.foldername(name))[1])::uuid)
  );
create policy pair_media_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'pair-media'
    and private.can_write_space(((storage.foldername(name))[1])::uuid)
  );
create policy pair_media_update on storage.objects
  for update to authenticated using (
    bucket_id = 'pair-media'
    and private.can_write_space(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id = 'pair-media'
    and private.can_write_space(((storage.foldername(name))[1])::uuid)
  );
create policy pair_media_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'pair-media'
    and private.can_write_space(((storage.foldername(name))[1])::uuid)
  );

commit;
