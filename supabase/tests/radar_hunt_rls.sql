insert into auth.users values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2'),('00000000-0000-0000-0000-0000000000e1') on conflict do nothing;
insert into public.or_ai_user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000e1','medical_editor') on conflict do nothing;
insert into public.rh_profiles(user_id, first_name, last_name, license_number, professional_email, specialty, hospital, career_stage, verification_status, residency_year)
values ('00000000-0000-0000-0000-0000000000a1','Lucía','García','282812345','l@h.es','Oftalmología','HCSC','attending','verified',null),
       ('00000000-0000-0000-0000-0000000000a2','Pablo','Ruiz','282899999','p@h.es','Oftalmología','HULP','resident','pending',2);
grant usage on schema public to authenticated, anon;
\echo '--- jugador a1: ve 1 perfil (el suyo), 0 preguntas, 34 ligas'
set role authenticated; set test.uid='00000000-0000-0000-0000-0000000000a1';
select (select count(*) from public.rh_profiles) perfiles, (select count(*) from public.rh_questions) preguntas, (select count(*) from public.rh_leagues) ligas;
\echo '--- editor e1: ve 2 perfiles y todo el banco'
set test.uid='00000000-0000-0000-0000-0000000000e1';
select (select count(*) from public.rh_profiles) perfiles, (select count(*) from public.rh_questions) preguntas;
\echo '--- jugador no puede auto-verificarse (sin política de escritura)'
set test.uid='00000000-0000-0000-0000-0000000000a2';
\set ON_ERROR_STOP 0
update public.rh_profiles set verification_status='verified' where user_id='00000000-0000-0000-0000-0000000000a2';
reset role;
select verification_status from public.rh_profiles where user_id='00000000-0000-0000-0000-0000000000a2';
\echo '--- anon: ligas sí (34), rondas no'
set role anon; select count(*) from public.rh_leagues; select count(*) from public.rh_rounds; reset role;
\echo '--- mismo colegiado verificado en dos cuentas: rechazado'
insert into auth.users values ('00000000-0000-0000-0000-0000000000a3');
insert into public.rh_profiles(user_id, first_name, last_name, license_number, professional_email, specialty, hospital, career_stage, verification_status)
values ('00000000-0000-0000-0000-0000000000a3','X','Y','282812345','x@h.es','Oftalmología','H','attending','verified');
\echo '--- regla jugable sobre el banco demo (esperado 0 jugables)'
select count(*) filter (where public.rh_question_playable(q)) jugables, count(*) total from public.rh_questions q;
