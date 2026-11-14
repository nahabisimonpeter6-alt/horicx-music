-- Horicx Music: private media, protected roles, and server-owned advert state.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=100),
 is_anonymous boolean not null default false, created_at timestamptz not null default now()
);
create table public.admin_roles (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;grant execute on function public.is_admin() to anon,authenticated;
create or replace function public.sync_profile() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 insert into public.profiles(id,display_name,is_anonymous) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100),coalesce(new.is_anonymous,false))
 on conflict(id) do update set is_anonymous=excluded.is_anonymous;
 return new;end $$;
create trigger on_auth_user_profile after insert or update of is_anonymous on auth.users for each row execute function public.sync_profile();
create table public.artists(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 100),bio text not null default '' check(length(bio)<=2000),created_at timestamptz not null default now());
create table public.albums(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),artist_id uuid not null references public.artists(id) on delete restrict,release_date date not null default current_date,unique(title,artist_id));
create table public.tracks(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),artist_id uuid not null references public.artists(id) on delete restrict,album_id uuid references public.albums(id) on delete restrict,genre text not null check(length(genre) between 1 and 50),duration numeric not null check(duration>0 and duration<=1800),description text not null default '' check(length(description)<=2000),release_date date not null default current_date,published boolean not null default false,original boolean not null default false,created_at timestamptz not null default now());
create table public.track_media(track_id uuid primary key references public.tracks(id) on delete cascade,audio_path text not null unique,cover_path text);
create table public.playlists(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(name) between 1 and 80),created_at timestamptz not null default now());
create table public.playlist_tracks(playlist_id uuid not null references public.playlists(id) on delete cascade,track_id uuid not null references public.tracks(id) on delete cascade,added_at timestamptz not null default now(),primary key(playlist_id,track_id));
create table public.favourites(user_id uuid not null references auth.users(id) on delete cascade,track_id uuid not null references public.tracks(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,track_id));
create table public.adverts(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),duration numeric not null check(duration between 4 and 120),active boolean not null default false,position integer not null default 0 check(position between 0 and 999),created_at timestamptz not null default now());
create table public.advert_media(advert_id uuid primary key references public.adverts(id) on delete cascade,video_path text not null unique);
create table public.settings(id boolean primary key default true check(id),listening_minutes integer not null default 30 check(listening_minutes between 1 and 120));
insert into public.settings(id) values(true);
create table public.advert_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,advert_id uuid references public.adverts(id) on delete set null,duration numeric not null check(duration between 4 and 120),pass_minutes integer not null check(pass_minutes between 1 and 120),started_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default (clock_timestamp()+interval '10 minutes'),last_seen_at timestamptz not null default clock_timestamp(),last_position numeric not null default 0,observed_seconds numeric not null default 0,progress_checks integer not null default 0,completed_at timestamptz);
create table public.listening_passes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,session_id uuid not null unique references public.advert_sessions(id) on delete cascade,expires_at timestamptz not null,created_at timestamptz not null default now());
create table public.play_events(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,track_id uuid not null references public.tracks(id) on delete cascade,created_at timestamptz not null default now());
create table public.api_rate_limits(key text not null,bucket bigint not null,requests integer not null default 1,primary key(key,bucket));
create index tracks_published_idx on public.tracks(published,created_at desc);
create index playlists_user_idx on public.playlists(user_id);
create index play_events_user_idx on public.play_events(user_id,created_at desc);
create index passes_user_expiry_idx on public.listening_passes(user_id,expires_at desc);
create index sessions_user_idx on public.advert_sessions(user_id,started_at desc);
alter table public.profiles enable row level security;alter table public.admin_roles enable row level security;
alter table public.artists enable row level security;alter table public.albums enable row level security;alter table public.tracks enable row level security;alter table public.track_media enable row level security;
alter table public.playlists enable row level security;alter table public.playlist_tracks enable row level security;alter table public.favourites enable row level security;
alter table public.adverts enable row level security;alter table public.advert_media enable row level security;alter table public.settings enable row level security;
alter table public.advert_sessions enable row level security;alter table public.listening_passes enable row level security;alter table public.play_events enable row level security;alter table public.api_rate_limits enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_edit_name on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke all on public.profiles from anon,authenticated;grant select on public.profiles to authenticated;grant update(display_name) on public.profiles to authenticated;
create policy own_admin_role on public.admin_roles for select to authenticated using(user_id=auth.uid());
revoke all on public.admin_roles from anon,authenticated;grant select on public.admin_roles to authenticated;
create policy artists_catalogue on public.artists for select to anon,authenticated using(true);
create policy albums_catalogue on public.albums for select to anon,authenticated using(true);
create policy tracks_catalogue on public.tracks for select to anon,authenticated using(published or public.is_admin());
create policy settings_read on public.settings for select to anon,authenticated using(true);
-- Every administrative write is checked in both the Edge Function and these policies.
create policy artists_admin on public.artists for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy albums_admin on public.albums for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy tracks_admin on public.tracks for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy track_media_admin on public.track_media for select to authenticated using(public.is_admin());
create policy adverts_admin on public.adverts for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy advert_media_admin on public.advert_media for select to authenticated using(public.is_admin());
create policy settings_admin on public.settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy playlists_owner on public.playlists for all to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy playlist_tracks_owner on public.playlist_tracks for all to authenticated using(exists(select 1 from public.playlists where id=playlist_id and user_id=auth.uid())) with check(exists(select 1 from public.playlists where id=playlist_id and user_id=auth.uid()) and exists(select 1 from public.tracks where id=track_id and published));
create policy favourites_owner on public.favourites for all to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.tracks where id=track_id and published));
-- No client policies on sessions, passes, events, or rate limits. Only the server writes them.
revoke all on public.advert_sessions,public.listening_passes,public.play_events,public.api_rate_limits,public.track_media,public.advert_media from anon,authenticated;
grant select on public.track_media,public.advert_media to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('music','music',false,20971520,array['audio/mpeg']),
 ('covers','covers',false,2097152,array['image/jpeg','image/png','image/webp']),
 ('adverts','adverts',false,31457280,array['video/mp4','video/webm']);
-- No browser INSERT/UPDATE/DELETE policies: uploads pass server size/type validation first.
create policy media_admin_read on storage.objects for select to authenticated using(bucket_id in ('music','covers','adverts') and public.is_admin());
create or replace function public.consume_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare b bigint:=floor(extract(epoch from clock_timestamp())/60);n integer;
begin
 insert into public.api_rate_limits(key,bucket) values(p_key,b) on conflict(key,bucket) do update set requests=api_rate_limits.requests+1 returning requests into n;
 if n=1 then delete from public.api_rate_limits where bucket<b-10;end if;
 return n<=p_limit;
end $$;
-- Row locks make progress and completion atomic across concurrent requests.
create or replace function public.record_ad_progress(p_user uuid,p_session uuid,p_position numeric) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.advert_sessions;stamp timestamptz:=clock_timestamp();elapsed numeric;delta numeric;
begin
 select * into s from public.advert_sessions where id=p_session and user_id=p_user for update;
 if not found or s.completed_at is not null or s.expires_at<=stamp then raise exception 'Advert session is invalid, expired, or already used.';end if;
 elapsed:=extract(epoch from stamp-s.last_seen_at);delta:=p_position-s.last_position;
 if p_position<0 or p_position>s.duration+0.5 or delta<0 or delta>least(elapsed+0.8,4.5) or (s.progress_checks>0 and delta>0 and elapsed>10) then raise exception 'Playback progress could not be verified. Restart the advert and watch at normal speed.';end if;
 if p_position>extract(epoch from stamp-s.started_at)+0.6 then raise exception 'Playback was completed too quickly.';end if;
 update public.advert_sessions set last_seen_at=stamp,last_position=p_position,observed_seconds=observed_seconds+greatest(0,least(delta,elapsed+0.05)),progress_checks=progress_checks+case when delta>0 then 1 else 0 end where id=s.id;
end $$;
create or replace function public.complete_ad_session(p_user uuid,p_session uuid) returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.advert_sessions;stamp timestamptz:=clock_timestamp();expiry timestamptz;
begin
 select * into s from public.advert_sessions where id=p_session and user_id=p_user for update;
 if not found or s.completed_at is not null or s.expires_at<=stamp then raise exception 'Advert session is invalid, expired, or already used.';end if;
 if stamp-s.started_at<(s.duration-0.35)*interval '1 second' or s.last_position<s.duration-0.35 or s.observed_seconds<s.duration-0.6 or s.progress_checks<greatest(2,floor(s.duration/3)) or stamp-s.last_seen_at>interval '5 seconds' then raise exception 'The advert has not been fully verified. Watch it from beginning to end.';end if;
 expiry:=stamp+make_interval(mins=>s.pass_minutes);
 update public.advert_sessions set completed_at=stamp where id=s.id;
 insert into public.listening_passes(user_id,session_id,expires_at) values(p_user,p_session,expiry);
 return expiry;
end $$;
revoke all on function public.sync_profile() from public,anon,authenticated;
revoke all on function public.consume_rate_limit(text,integer),public.record_ad_progress(uuid,uuid,numeric),public.complete_ad_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer),public.record_ad_progress(uuid,uuid,numeric),public.complete_ad_session(uuid,uuid) to service_role;
-- Explicit grants avoid dependence on project-specific default privileges.
grant select on public.artists,public.albums,public.tracks,public.settings to anon,authenticated;
grant insert,update,delete on public.artists,public.albums,public.tracks,public.adverts to authenticated;
grant select on public.adverts to authenticated;grant update on public.settings to authenticated;
grant select,insert,update,delete on public.playlists,public.playlist_tracks,public.favourites to authenticated;
grant all on all tables in schema public to service_role;grant usage,select on all sequences in schema public to service_role;
