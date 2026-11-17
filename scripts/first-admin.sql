-- Run ONLY in your own Supabase SQL Editor after signing up and confirming email.
-- Configured for the requested owner. This SQL contains no password.
do $$
declare owner_email text := 'lordsimonpro@gmail.com'; owner_id uuid;
begin
 select id into owner_id from auth.users where lower(email)=lower(owner_email) and email_confirmed_at is not null and not is_anonymous;
 if owner_id is null then raise exception 'No confirmed account with that email exists. Sign up and confirm it first.';end if;
 insert into public.admin_roles(user_id) values(owner_id) on conflict do nothing;
 raise notice 'Administrator access granted to the confirmed account.';
end $$;
