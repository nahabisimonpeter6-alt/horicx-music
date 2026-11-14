-- Run ONLY in your own Supabase SQL Editor after signing up and confirming email.
-- Replace the placeholder with the exact email you registered. No default password.
do $$
declare owner_email text := 'REPLACE_WITH_YOUR_CONFIRMED_EMAIL'; owner_id uuid;
begin
 if owner_email='REPLACE_WITH_YOUR_CONFIRMED_EMAIL' then raise exception 'Replace the email placeholder first.';end if;
 select id into owner_id from auth.users where lower(email)=lower(owner_email) and email_confirmed_at is not null and not is_anonymous;
 if owner_id is null then raise exception 'No confirmed account with that email exists. Sign up and confirm it first.';end if;
 insert into public.admin_roles(user_id) values(owner_id) on conflict do nothing;
 raise notice 'Administrator access granted to the confirmed account.';
end $$;
