-- RADAR HUNT — pruebas de RLS del modo congreso (Postgres 16, tras las dos migraciones).
-- Uso: psql -f radar_hunt_congress_rls.sql. Los ERROR marcados con \echo son esperados.
\set ON_ERROR_STOP off
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000c3'), ('00000000-0000-0000-0000-0000000000d4') on conflict do nothing;
insert into public.or_ai_user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000c3', 'admin') on conflict do nothing;

insert into public.rh_events (id, slug, name, starts_at, ends_at, game_opens_at, game_closes_at, status)
values ('ev-pub', 'congreso-publico', 'Publicado', now(), now() + interval '2 day', now(), now() + interval '2 day', 'published'),
       ('ev-draft', 'congreso-borrador', 'Borrador', now(), now() + interval '2 day', now(), now() + interval '2 day', 'draft')
on conflict do nothing;
insert into public.rh_event_staff values ('ev-draft', '00000000-0000-0000-0000-0000000000d4', 'moderator', now()) on conflict do nothing;
insert into public.rh_event_stations (id, event_id, label, title, floor_id, x, y, subspecialty)
values ('st-pub', 'ev-pub', 'E1', 'Glaucoma', 'pb', 10, 10, 'glaucoma'),
       ('st-draft', 'ev-draft', 'E1', 'Retina', 'pb', 10, 10, 'retina') on conflict do nothing;
insert into public.rh_station_tokens (station_id, token) values ('st-pub', 'ABCDEFGHJK0123456789') on conflict do nothing;
insert into public.rh_event_participants (event_id, user_id, display_name, consent_participation)
values ('ev-pub', '00000000-0000-0000-0000-0000000000a1', 'Ana', true),
       ('ev-pub', '00000000-0000-0000-0000-0000000000b2', 'Luis', true) on conflict do nothing;
insert into public.rh_event_sessions (id, event_id, title) values ('ses-1', 'ev-pub', 'Sesión') on conflict do nothing;
insert into public.rh_live_state (session_id, phase) values ('ses-1', 'open') on conflict do nothing;
insert into public.rh_live_answers (session_id, item_id, user_id, selected, response_ms)
values ('ses-1', 'i1', '00000000-0000-0000-0000-0000000000a1', '{a}', 1200),
       ('ses-1', 'i1', '00000000-0000-0000-0000-0000000000b2', '{b}', 1500) on conflict do nothing;

\echo '--- restricciones (ERROR esperados)'
insert into public.rh_event_participants (event_id, user_id, display_name, consent_participation)
values ('ev-pub', '00000000-0000-0000-0000-0000000000c3', 'Sin consentimiento', false);
insert into public.rh_live_answers (session_id, item_id, user_id, selected, response_ms)
values ('ses-1', 'i1', '00000000-0000-0000-0000-0000000000a1', '{c}', 900);
insert into public.rh_station_tokens (station_id, token) values ('st-draft', 'token-adivinable');
insert into public.rh_event_feedback (event_id, user_id, overall, stations, live, recommend)
values ('ev-pub', '00000000-0000-0000-0000-0000000000a1', 6, 3, 3, 3);
select code8 = 'ABCDEFGH' as code8_ok from public.rh_station_tokens where station_id = 'st-pub';

set role anon;
\echo '--- anónimo: ve el evento publicado (1) y su estación (1); no ve tokens (ERROR)'
select count(*) as eventos_visibles from public.rh_events;
select count(*) as estaciones_visibles from public.rh_event_stations;
select count(*) from public.rh_station_tokens;
reset role;

set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', false);
\echo '--- jugador Ana: 1 evento, solo su inscripción (1) y solo su respuesta (1); sin tokens ni auditoría (ERROR); no puede escribir (ERROR)'
select count(*) as eventos from public.rh_events;
select count(*) as inscripciones_visibles from public.rh_event_participants;
select count(*) as respuestas_visibles from public.rh_live_answers;
select count(*) from public.rh_station_tokens;
select count(*) from public.rh_audit_log;
insert into public.rh_live_answers (session_id, item_id, user_id, selected, response_ms)
values ('ses-1', 'i2', '00000000-0000-0000-0000-0000000000a1', '{a}', 10);
update public.rh_live_state set phase = 'reveal';

select set_config('test.uid', '00000000-0000-0000-0000-0000000000d4', false);
\echo '--- moderador del borrador: ve 2 eventos y la estación del borrador (2 estaciones)'
select count(*) as eventos from public.rh_events;
select count(*) as estaciones from public.rh_event_stations;

select set_config('test.uid', '00000000-0000-0000-0000-0000000000c3', false);
\echo '--- admin: ve 2 eventos y las 2 inscripciones; respuestas ajenas no (0)'
select count(*) as eventos from public.rh_events;
select count(*) as inscripciones from public.rh_event_participants;
select count(*) as respuestas from public.rh_live_answers;
reset role;
