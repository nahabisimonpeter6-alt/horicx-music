/** Runs the actual migration and RLS/functions against embedded PostgreSQL.
 * auth/storage schemas below are local test doubles; no cloud credentials required. */
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();let assertions=0;
async function sql(s,params){return await db.query(s,params);}
async function ok(name,fn){await fn();assertions++;console.log(`✓ ${name}`);}
async function rejects(s,pattern){await assert.rejects(()=>sql(s),pattern);}
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,is_anonymous boolean not null default false,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage,public to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to anon,authenticated,service_role; grant select on storage.buckets to service_role;
 grant execute on all functions in schema auth to anon,authenticated,service_role;
`);
let migration=await readFile(new URL('../supabase/migrations/202611140001_horicx.sql',import.meta.url),'utf8');
// gen_random_uuid is built into PostgreSQL. PGlite does not ship the pgcrypto extension.
migration=migration.replace('create extension if not exists pgcrypto;','');
await db.exec(migration);
await db.exec(await readFile(new URL('../supabase/migrations/202611170001_listening_features.sql',import.meta.url),'utf8'));
const u1='11111111-1111-4111-8111-111111111111',u2='22222222-2222-4222-8222-222222222222',owner='33333333-3333-4333-8333-333333333333',guest='44444444-4444-4444-8444-444444444444';
await db.exec(`insert into auth.users(id,email) values('${u1}','a@example.test'),('${u2}','b@example.test'),('${owner}','owner@example.test');insert into auth.users(id,is_anonymous) values('${guest}',true);insert into public.admin_roles(user_id) values('${owner}');`);
const artist=(await sql("insert into artists(name) values('Original Artist') returning id")).rows[0].id;
const track=(await sql("insert into tracks(title,artist_id,genre,duration,published) values('Published',$1,'Chill',20,true) returning id",[artist])).rows[0].id;
await sql("insert into tracks(title,artist_id,genre,duration,published) values('Draft',$1,'Chill',20,false)",[artist]);
await sql("insert into track_media(track_id,audio_path) values($1,'private/song.mp3')",[track]);
const ad=(await sql("insert into adverts(title,duration,active) values('Test advert',8,true) returning id")).rows[0].id;
await sql("insert into storage.objects(bucket_id,name) values('music','private/song.mp3')");
async function as(role,id='',anonymous=false){await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await sql("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,is_anonymous:anonymous})]);await db.exec(`set role ${role}`);}
await ok('migration applies and all 17 application tables enable RLS',async()=>{const r=await sql("select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity");assert.equal(r.rows.length,0);});
await ok('profile trigger creates real and guest profiles',async()=>{assert.equal((await sql('select count(*)::int n from profiles')).rows[0].n,4);assert.equal((await sql('select is_anonymous from profiles where id=$1',[guest])).rows[0].is_anonymous,true);});
await as('anon');
await ok('unauthenticated browse sees published catalogue only',async()=>assert.deepEqual((await sql('select title from tracks')).rows,[{title:'Published'}]));
await ok('anonymous browser cannot read private media paths',async()=>rejects('select * from track_media',/permission denied/));
await ok('anonymous browser cannot download music storage objects',async()=>assert.equal((await sql('select * from storage.objects')).rows.length,0));
await ok('anonymous browser cannot read profiles',async()=>rejects('select * from profiles',/permission denied/));
await as('authenticated',u1);
await ok('listener cannot insert or promote an admin role',async()=>rejects(`insert into admin_roles(user_id) values('${u1}')`,/permission denied/));
await ok('listener cannot change protected anonymous flag',async()=>rejects(`update profiles set is_anonymous=true where id='${u1}'`,/permission denied/));
await ok('listener cannot publish tracks',async()=>{await sql('update tracks set published=true');await as('service_role');assert.equal((await sql("select published from tracks where title='Draft'")).rows[0].published,false);await as('authenticated',u1);});
await ok('listener cannot insert a track',async()=>rejects(`insert into tracks(title,artist_id,genre,duration) values('Bad','${artist}','Chill',10)`,/row-level security/));
await ok('listener cannot read private paths even with authenticated role',async()=>assert.equal((await sql('select * from track_media')).rows.length,0));
await ok('listener cannot access storage objects or upload directly',async()=>{assert.equal((await sql('select * from storage.objects')).rows.length,0);await rejects("insert into storage.objects(bucket_id,name) values('music','bad.mp3')",/row-level security/);});
await ok('listener cannot mint or inspect passes',async()=>{await rejects('select * from listening_passes',/permission denied/);await rejects(`insert into listening_passes(user_id,session_id,expires_at) values('${u1}',gen_random_uuid(),now()+interval '1 hour')`,/permission denied/);});
await ok('listener cannot call completion or progress RPCs directly',async()=>{await rejects(`select complete_ad_session('${u1}',gen_random_uuid())`,/permission denied/);await rejects(`select record_ad_progress('${u1}',gen_random_uuid(),8)`,/permission denied/);});
await ok('listener may update only their display name',async()=>{await sql(`update profiles set display_name='My name' where id='${u1}'`);assert.equal((await sql('select display_name from profiles')).rows[0].display_name,'My name');});
const playlist=(await sql("insert into playlists(user_id,name) values($1,'My songs') returning id",[u1])).rows[0].id;
await sql('insert into playlist_tracks(playlist_id,track_id) values($1,$2)',[playlist,track]);
await as('authenticated',u2);
await ok('another listener cannot see a private playlist or its tracks',async()=>{assert.equal((await sql('select * from playlists')).rows.length,0);assert.equal((await sql('select * from playlist_tracks')).rows.length,0);});
await ok('another listener cannot add tracks to a private playlist',async()=>rejects(`insert into playlist_tracks(playlist_id,track_id) values('${playlist}','${track}') on conflict do nothing`,/row-level security/));
await ok('another listener cannot read private favourites',async()=>{await as('authenticated',u1);await sql('insert into favourites(user_id,track_id) values($1,$2)',[u1,track]);await as('authenticated',u2);assert.equal((await sql('select * from favourites')).rows.length,0);});
await as('authenticated',guest,true);
await ok('guest cannot create a cloud playlist or favourite',async()=>{await rejects(`insert into playlists(user_id,name) values('${guest}','Guest songs')`,/row-level security/);await rejects(`insert into favourites(user_id,track_id) values('${guest}','${track}')`,/row-level security/);});
await as('authenticated',owner);
await ok('verified administrator can see drafts and private media metadata',async()=>{assert.equal((await sql('select * from tracks')).rows.length,2);assert.equal((await sql('select * from track_media')).rows.length,1);assert.equal((await sql('select * from storage.objects')).rows.length,1);});
await as('service_role');
async function session(){return (await sql('insert into advert_sessions(user_id,advert_id,duration,pass_minutes) values($1,$2,8,30) returning id',[u1,ad])).rows[0].id;}
await ok('premature advert completion is rejected',async()=>{const s=await session();await rejects(`select complete_ad_session('${u1}','${s}')`,/not been fully verified/);});
await ok('faked early playback progress is rejected',async()=>{const s=await session();await rejects(`select record_ad_progress('${u1}','${s}',8)`,/progress could not be verified/);});
await ok('a different user cannot complete a session',async()=>{const s=await session();await rejects(`select complete_ad_session('${u2}','${s}')`,/invalid, expired, or already used/);});
await ok('expired sessions cannot be completed',async()=>{const s=await session();await sql("update advert_sessions set expires_at=now()-interval '1 second' where id=$1",[s]);await rejects(`select complete_ad_session('${u1}','${s}')`,/invalid, expired, or already used/);});
await ok('heartbeats with implausible gaps are rejected',async()=>{const s=await session();await sql("update advert_sessions set started_at=now()-interval '20 seconds',last_seen_at=now()-interval '12 seconds',last_position=2,progress_checks=1 where id=$1",[s]);await rejects(`select record_ad_progress('${u1}','${s}',4)`,/progress could not be verified/);});
await ok('complete progress creates exactly one listening pass; reuse fails',async()=>{const s=await session();await sql("update advert_sessions set started_at=now()-interval '8 seconds',last_seen_at=now()-interval '2 seconds',last_position=6,observed_seconds=6,progress_checks=3 where id=$1",[s]);await sql('select record_ad_progress($1,$2,8)',[u1,s]);const result=await sql('select complete_ad_session($1,$2) expiry',[u1,s]);assert.ok(Date.parse(result.rows[0].expiry)>Date.now()+29*60000);await rejects(`select complete_ad_session('${u1}','${s}')`,/invalid, expired, or already used/);assert.equal((await sql('select count(*)::int n from listening_passes where session_id=$1',[s])).rows[0].n,1);});
await ok('fixed-window rate limits reject requests above the limit',async()=>{assert.equal((await sql("select consume_rate_limit('test-limit',2) ok")).rows[0].ok,true);assert.equal((await sql("select consume_rate_limit('test-limit',2) ok")).rows[0].ok,true);assert.equal((await sql("select consume_rate_limit('test-limit',2) ok")).rows[0].ok,false);});
await ok('private buckets have strict size caps and MIME allowlists',async()=>{const buckets=(await sql('select * from storage.buckets')).rows;assert.equal(buckets.length,3);assert.ok(buckets.every(b=>!b.public&&b.file_size_limit<=31457280&&b.allowed_mime_types.length>0));});

await as('authenticated',u1);
await ok('registered listener may follow artists in their own library',async()=>{await sql('insert into artist_follows(user_id,artist_id) values($1,$2)',[u1,artist]);assert.equal((await sql('select * from artist_follows')).rows.length,1);});
await as('authenticated',u2);
await ok('followed artists stay private to their owner',async()=>assert.equal((await sql('select * from artist_follows')).rows.length,0));
await ok('a listener cannot follow an artist on behalf of another account',async()=>rejects(`insert into artist_follows(user_id,artist_id) values('${u1}','${artist}')`,/row-level security/));
await ok('listeners cannot invoke the privileged playlist-order RPC',async()=>rejects(`select reorder_playlist('${u1}','${playlist}',array['${track}']::uuid[])`,/permission denied/));
await as('authenticated',guest,true);
await ok('anonymous sessions cannot save artist follows',async()=>rejects(`insert into artist_follows(user_id,artist_id) values('${guest}','${artist}')`,/row-level security/));
await as('service_role');
const otherTrack=(await sql("insert into tracks(title,artist_id,genre,duration,published) values('Second track',$1,'Chill',15,true) returning id",[artist])).rows[0].id;
await ok('new playlist additions append after the existing track',async()=>{await sql('select set_playlist_track($1,$2,$3,true)',[u1,playlist,otherTrack]);const ids=(await sql('select track_id from playlist_tracks where playlist_id=$1 order by position',[playlist])).rows.map(x=>x.track_id);assert.deepEqual(ids,[track,otherTrack]);});
await ok('owner playlist reorder is atomic and preserves every track',async()=>{await sql('select reorder_playlist($1,$2,$3::uuid[])',[u1,playlist,[otherTrack,track]]);assert.deepEqual((await sql('select track_id from playlist_tracks where playlist_id=$1 order by position',[playlist])).rows.map(x=>x.track_id),[otherTrack,track]);});
await ok('playlist reorder rejects another owner, incomplete lists and duplicates',async()=>{await rejects(`select reorder_playlist('${u2}','${playlist}',array['${track}','${otherTrack}']::uuid[])`,/does not belong/);await rejects(`select reorder_playlist('${u1}','${playlist}',array['${track}']::uuid[])`,/playlist changed/);await rejects(`select reorder_playlist('${u1}','${playlist}',array['${track}','${track}']::uuid[])`,/playlist changed/);});
await ok('playlist mutations reject a foreign owner and unpublished tracks',async()=>{await rejects(`select set_playlist_track('${u2}','${playlist}','${track}',false)`,/does not belong/);const draft=(await sql("select id from tracks where title='Draft'")).rows[0].id;await rejects(`select set_playlist_track('${u1}','${playlist}','${draft}',true)`,/unavailable/);});
await as('authenticated',u2);
await ok('another account cannot rename or describe a private playlist',async()=>{await sql(`update playlists set name='Stolen',description='Bad edit' where id='${playlist}'`);await as('service_role');assert.equal((await sql('select name from playlists where id=$1',[playlist])).rows[0].name,'My songs');});
await as('authenticated',u1);
await ok('playlist owners can save a name and description',async()=>{await sql(`update playlists set name='My new mix',description='For late nights' where id='${playlist}'`);assert.equal((await sql('select description from playlists where id=$1',[playlist])).rows[0].description,'For late nights');});
console.log(`\n${assertions} PostgreSQL migration, RLS and advert-security checks passed.`);await db.close();
