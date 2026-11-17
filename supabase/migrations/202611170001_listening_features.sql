-- Personal artist library and ordered, editable playlists.
alter table public.playlists add column description text not null default '' check(length(description)<=300);
alter table public.playlist_tracks add column position integer not null default 0 check(position>=0);
with ordered as (select playlist_id,track_id,row_number() over(partition by playlist_id order by added_at,track_id)-1 as n from public.playlist_tracks)
update public.playlist_tracks p set position=ordered.n from ordered where p.playlist_id=ordered.playlist_id and p.track_id=ordered.track_id;
create index playlist_tracks_position_idx on public.playlist_tracks(playlist_id,position);
create table public.artist_follows(
 user_id uuid not null references auth.users(id) on delete cascade,
 artist_id uuid not null references public.artists(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,artist_id)
);
alter table public.artist_follows enable row level security;
create policy artist_follows_owner on public.artist_follows for all to authenticated
 using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
 with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
revoke all on public.artist_follows from anon,authenticated;
grant select,insert,delete on public.artist_follows to authenticated;
grant all on public.artist_follows to service_role;
-- Atomically reorder exactly the owner's existing track set; stale lists are rejected.
create function public.reorder_playlist(p_user uuid,p_playlist uuid,p_tracks uuid[]) returns void
 language plpgsql security definer set search_path=public,pg_temp as $$
declare total integer;
begin
 perform 1 from public.playlists where id=p_playlist and user_id=p_user for update;
 if not found then raise exception 'This playlist does not belong to your account.';end if;
 if p_tracks is null or array_position(p_tracks,null) is not null then raise exception 'Invalid playlist order.';end if;
 select count(*) into total from public.playlist_tracks where playlist_id=p_playlist;
 if cardinality(p_tracks)<>total or (select count(distinct x) from unnest(p_tracks) x)<>total
 or exists(select 1 from unnest(p_tracks) x where not exists(select 1 from public.playlist_tracks where playlist_id=p_playlist and track_id=x)) then
 raise exception 'The playlist changed. Refresh before reordering.';end if;
 update public.playlist_tracks t set position=o.n-1 from unnest(p_tracks) with ordinality o(id,n) where t.playlist_id=p_playlist and t.track_id=o.id;
end $$;
-- Mutations lock the same playlist row so an add/remove cannot race a reorder.
create function public.set_playlist_track(p_user uuid,p_playlist uuid,p_track uuid,p_enabled boolean) returns void
 language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.playlists where id=p_playlist and user_id=p_user for update;
 if not found then raise exception 'This playlist does not belong to your account.';end if;
 if p_enabled then
 if not exists(select 1 from public.tracks where id=p_track and published) then raise exception 'This track is unavailable.';end if;
 insert into public.playlist_tracks(playlist_id,track_id,position)
 select p_playlist,p_track,coalesce(max(position)+1,0) from public.playlist_tracks where playlist_id=p_playlist on conflict do nothing;
 else delete from public.playlist_tracks where playlist_id=p_playlist and track_id=p_track;end if;
end $$;
revoke all on function public.reorder_playlist(uuid,uuid,uuid[]),public.set_playlist_track(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reorder_playlist(uuid,uuid,uuid[]),public.set_playlist_track(uuid,uuid,uuid,boolean) to service_role;
