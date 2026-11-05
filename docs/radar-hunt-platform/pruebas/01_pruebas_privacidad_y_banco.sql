create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
insert into public.rh_organizations(id,type,name) values ('10000000-0000-0000-0000-000000000001','sponsor','Pharma X');
insert into public.rh_org_members values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','analyst');
insert into rh_insights.studies(id,sponsor_org_id,title,objective,consent_text_es,min_cell_size) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Barreras','Barreras de adopción','Consiento...',20);
insert into rh_insights.study_items(id,study_id,position,type,text_es) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,'single','¿Usa X?');
-- 25 residentes (22 sí, 3 no) y 5 adjuntos (todos sí)
insert into rh_insights.respondents(study_id,respondent_key,career_stage)
  select '20000000-0000-0000-0000-000000000001', decode(md5('r'||g),'hex'), case when g<=25 then 'resident' else 'attending' end::public.rh_career_stage from generate_series(1,30) g;
insert into rh_insights.responses(study_id,respondent_key,item_id,value)
  select '20000000-0000-0000-0000-000000000001', decode(md5('r'||g),'hex'), '30000000-0000-0000-0000-000000000001', to_jsonb(case when g between 23 and 25 then 'no' else 'si' end) from generate_series(1,30) g;
\echo '--- analista del patrocinador, por etapa (esperado: solo resident/si n=22)'
set test.uid = '00000000-0000-0000-0000-00000000000a';
select * from public.rh_insights_aggregate('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','career_stage');
\echo '--- analista, sin segmentar (esperado: all/si n=27; all/no n=3 suprimida)'
select * from public.rh_insights_aggregate('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null);
\echo '--- usuario ajeno (esperado: not authorized)'
set test.uid = '00000000-0000-0000-0000-00000000000b';
\set ON_ERROR_STOP 0
select * from public.rh_insights_aggregate('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null);
\echo '--- inyección en group_by (esperado: invalid group_by)'
set test.uid = '00000000-0000-0000-0000-00000000000a';
select * from public.rh_insights_aggregate('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','career_stage; drop table x');
\echo '--- rol authenticated no puede leer el esquema privado (esperado: permission denied)'
set role authenticated;
select count(*) from rh_insights.responses;
reset role;
\echo '--- pregunta jugable: approved+or_reviewed sin referencia (f) y con referencia (t)'
insert into public.rh_questions(id,stem_es,explanation_es,subspecialty,difficulty_declared,cognitive_level,status,validation_level)
  values ('40000000-0000-0000-0000-000000000001','Enunciado','Explicación','retina',3,'application','approved','or_reviewed');
select public.rh_question_is_playable(q) from public.rh_questions q;
insert into public.oph_references(id,title) values ('50000000-0000-0000-0000-000000000001','EURETINA guideline');
insert into public.rh_question_references values ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001');
select public.rh_question_is_playable(q) from public.rh_questions q;
insert into rh_insights.released_tables(study_id,title,data,sample_note,approved_by) values ('20000000-0000-0000-0000-000000000001','Uso de X','{"rows":[{"segment":"all","answer":"si","pct":"≥85%"}]}','n=30 voluntarios; no representativo','00000000-0000-0000-0000-00000000000b');
\echo '--- patrocinador lee su tabla publicada (esperado: 1 fila)'
set test.uid = '00000000-0000-0000-0000-00000000000a';
select title, sample_note from public.rh_insights_released('20000000-0000-0000-0000-000000000001');
\echo '--- usuario ajeno (esperado: 0 filas)'
set test.uid = '00000000-0000-0000-0000-00000000000b';
select count(*) from public.rh_insights_released('20000000-0000-0000-0000-000000000001');
