--
-- PostgreSQL database dump
--

\restrict g0d952eJVDfIaTegSSTzvzIpd1C4yz0dNYhLsmqnhJCwFz6zuBzcrflSKPkOX8Y

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.17 (Ubuntu 15.17-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    gender text DEFAULT 'masculino'::text NOT NULL,
    birthdate date,
    assigned_class text,
    department text,
    department_id uuid,
    document_number text,
    last_name text,
    deleted_at timestamp with time zone,
    nuevo boolean DEFAULT false,
    profile_id uuid,
    company_id bigint DEFAULT 1,
    photo_url text,
    CONSTRAINT students_gender_check CHECK ((gender = ANY (ARRAY['masculino'::text, 'femenino'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text,
    last_name text,
    role public.app_role DEFAULT 'maestro'::public.app_role NOT NULL,
    assigned_class text,
    departments text[],
    department_id uuid,
    email text,
    phone text,
    last_active_at timestamp with time zone DEFAULT now(),
    birthdate date,
    gender text,
    address text,
    document_number text,
    is_member boolean DEFAULT false,
    roles text[] DEFAULT ARRAY[]::text[],
    company_id bigint DEFAULT 1,
    assignments jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['masculino'::text, 'femenino'::text])))
);


--
-- Name: student_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    department_id uuid NOT NULL,
    assigned_class text,
    role_in_dept text DEFAULT 'alumno'::text NOT NULL,
    company_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, first_name, last_name, role, assigned_class, departments, department_id, email, phone, last_active_at, birthdate, gender, address, document_number, is_member, roles, company_id, assignments) FROM stdin;
3f40baf9-44a2-456c-bbaa-443e21f4ad48	lider 	jovenes	lider		{jovenes}	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	\N	2026-05-02 18:28:14.643+00	\N	\N	\N	\N	f	{lider}	1	[]
08d071b3-fff2-4731-91f6-3664aba92a05	Maira Sabrina 	Mercado	colaborador	clase A	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1161314021	2026-05-10 00:17:24.137981+00	1992-10-24	femenino	\N	37147178	f	{colaborador}	1	[]
15df3ffc-1af7-44b6-b177-3892ed0f2a9c	Mónica Emilse	Ricci 	colaborador		{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1140383836	2026-05-03 12:55:49.258142+00	1972-12-27	femenino	\N	23068530	f	{colaborador}	1	[]
a41fed2b-1f46-4299-bf70-dd000d03cee2	concerje	ccdt	conserje		{}	\N	\N	1159080306	2026-04-29 00:45:23.591+00	\N	masculino	\N	9999999	f	{conserje}	1	[]
3f7864d7-dd62-4a7c-b5cd-acfdb8d3125a	Maria Rosa 	Ortiz	colaborador	clase G	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1162549104	2026-05-10 13:30:16.644678+00	1968-12-09	femenino	\N	\N	f	{colaborador}	1	[]
4a3a9075-9222-44fc-a827-3548768eb9be	Milagros	Fernandez	ayudante	clase D	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	5491163774427	2026-05-04 01:18:25.795918+00	2008-03-10	femenino	Reynoso 2687	48585544	f	{ayudante}	1	[]
99abbbad-28ec-47e3-b3e7-9045b18c9a5b	Monica	Martinez	maestro	A2	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	amonima115@hotmail.com	01157675457	2026-05-12 22:49:25.514+00	1968-01-15	femenino	\N	20068618	f	{maestro}	1	[]
a593f367-fd37-45b0-bda5-ceb13d8d1007	Fabrizio Ezequiel	Brollo	colaborador	clase B	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491127894242	2026-05-10 13:12:24.546378+00	2009-05-25	masculino	Sucre 891	49592617	t	{colaborador}	1	[]
aa487910-0c85-4f38-8601-7a2c52bbb1b5	Fabian	Palomares	director	\N	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1166229279	2026-05-09 14:51:18.197+00	1970-04-20	masculino	\N	21470481	f	{director}	1	[]
7434cc53-62cb-47cb-b0a5-0688ead6d2e0	MELINA NAYLA	Gonzales	colaborador	Clase A	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_c5a71d9b@ccdt.internal	1171622248	2026-05-09 21:15:28.867181+00	2004-02-16	femenino	\N	45930027	f	{colaborador}	1	[]
822ef0dc-1b73-4b86-af39-e3257de7ac9e	Lucía Luisa Elena	Martincich	colaborador	Obreros	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1162696501	2026-05-09 21:35:43.954416+00	1956-02-22	femenino	\N	11864605	f	{colaborador}	1	[]
86c0b117-d0df-40d7-83b2-164f658d8264	Rocío Belén	Leiva	colaborador	Clase F	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_39ce72ab@ccdt.internal	1164221555	2026-05-09 21:15:28.90056+00	2006-08-22	femenino	\N	47481306	f	{colaborador}	1	[]
f6dff42b-1e8c-4154-aef2-7ae23213020c	Francisco Andres	Cataldi	colaborador	Clase G	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_4df0839e@ccdt.internal	1131011511	2026-05-09 21:15:28.865872+00	2011-08-15	masculino	\N	50785849	f	{colaborador}	1	[]
4b230e62-cf0c-4b78-9ea0-d728eac1808c	ANA PAULA	Cataldi	colaborador	Clase H	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_6c91ea27@ccdt.internal	1132288672	2026-05-09 21:15:29.517152+00	2007-04-28	femenino	\N	47945381	f	{colaborador}	1	[]
430aca3d-1810-4bd4-91ab-f2c3b44c4d4d	ROQUE SEBASTIAN	Serrano	colaborador	Clase H	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_7de35b4c@ccdt.internal	1126511059	2026-05-09 21:15:29.501544+00	2012-01-08	masculino	\N	52010767	f	{colaborador}	1	[]
5aa4ba5b-9d7c-4079-a0d1-3031295c308b	Giuliana	Lopez	colaborador	clase G	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491132595299	2026-05-10 13:29:23.755727+00	2004-12-26	femenino	Bélgica 587	46279134	t	{colaborador}	1	[]
9ffe3139-ee72-4556-8284-dc82d162f2b6	Micaella	Dovile Vega 	maestro	clase B	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1170443796	2026-05-04 01:15:11.712071+00	2005-03-03	femenino	\N	46563531	f	{maestro}	1	[]
65afd1ff-0a4d-4a9e-866e-3e23adb7ed18	Benjamin	Martínez 	colaborador		{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1126334932	2026-05-10 00:18:56.730977+00	2006-05-19	masculino	\N	47280181	f	{colaborador}	1	[]
3361938c-41a4-416c-8f2a-ff51b9bbd979	Admin	User	admin	\N	{}	\N	\N	11111111111	2026-05-12 22:50:12.644+00	2026-04-15	masculino	\N	25252525	f	{admin}	1	[]
260c7340-a7d7-407b-922e-6db07ef5462e	Claudio Gabriel	Ariaz	colaborador	Obreros	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1161175235	2026-05-09 21:33:03.0754+00	1974-02-18	masculino	\N	23884421	f	{colaborador}	1	[]
4a74a357-4105-4543-8c74-97b89cd67a59	Laura	Cataldi	maestro	Clase H	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1133611105	2026-05-10 15:23:01.757+00	1992-01-13	femenino	CALLE 6 Nº69, BARRIO CUYO 1, GARIN	12345678	f	{maestro}	1	[]
846b83c8-5933-4b87-a81c-32fedc63b915	Fabiana 	Gonzalez	colaborador	Obreros	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1168681512	2026-05-09 21:34:24.417038+00	1969-12-15	femenino	\N	21453509	f	{colaborador}	1	[]
a6209765-0dfc-44f7-b2a0-fd1aa7d33514	Bautista bruno	Montaño	colaborador	Clase F	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_17d4be3f@ccdt.internal	1163639201	2026-05-09 21:15:28.881782+00	2011-08-27	masculino	\N	51335599	f	{colaborador}	1	[]
6221aea9-1176-40bb-b303-6a156c16df31	Gladis	Marquessini	maestro	clase D	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1151471775	2026-05-11 01:51:24.79+00	1970-06-20	femenino	\N	21562683	f	{maestro}	1	[]
e4b7f1fe-6608-490f-9317-46584d4292f4	morena	Rosales	colaborador	clase B	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1169710416	2026-05-10 13:11:52.222754+00	2011-01-21	femenino	Perito Moreno 5425	\N	f	{colaborador}	1	[]
79004d79-c68a-4921-8cd1-9189fee987cf	Rosa	Gomez	maestro	clase G	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1130379468	2026-05-10 13:28:59.273021+00	1956-10-23	femenino	Las calas 2134	\N	f	{maestro}	1	[]
a4925a86-5813-4a2c-b7be-418172f324c4	Elias Roman	Arias	colaborador	clase G	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1141887622	2026-05-10 13:31:13.654575+00	2008-01-04	masculino	Fernando Fader	\N	f	{colaborador}	1	[]
f54697b6-4c4b-49f8-827d-a3b6f1108515	Claudia Beatriz 	Borda	colaborador		{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1170980384	2026-05-03 13:16:09.494556+00	1964-09-16	femenino	\N	16977070	f	{colaborador}	1	[]
fc92baf5-18cf-4d49-9c31-a807d7b545bf	Brisa	Cisneros	maestro	clase B	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	5491168876273	2026-05-04 01:24:54.560299+00	2007-01-26	femenino	\N	47864944	f	{maestro}	1	[]
19e4eaf9-0d7a-4ea1-9cc3-522b2a051ae2	Ambar	Cañete	maestro	clase C	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491134565194	2026-05-10 13:14:08.89833+00	2008-09-19	femenino	\N	49007294	f	{maestro}	1	[]
ca6c117e-c3ea-4fa5-8474-fad9220f0ec3	Laura Gabriela	Perez	maestro	clase C	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1157176802	2026-05-04 01:07:30.335342+00	1971-07-30	femenino	\N	22251746	f	{maestro}	1	[]
c627bcc7-f092-43d3-b205-18d966da2555	Karina	Herrera	maestro	clase D	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1162512036	2026-05-10 13:16:28.39829+00	1977-05-21	femenino	\N	\N	f	{maestro}	1	[]
7750db62-567b-4af2-8150-c85b9721c6d5	DÉBORA ELIZABETH	GIANGRANDI	maestro	Clase A	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1132913172	2026-05-09 21:52:32.648507+00	1984-09-22	femenino	AV. SAN MARTIN 2371	31146097	f	{maestro}	1	[]
5ea70a4f-ffa5-4a12-8bec-dbd5b4427c3d	Juana	Arias	colaborador	Clase A	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_b8d42e1f@ccdt.internal	1124592895	2026-05-09 21:15:28.888391+00	2010-02-27	femenino	\N	50134829	f	{colaborador}	1	[]
5b521738-b310-4133-9d1d-0a0e03bad01a	Felipe Ruben	Mercado	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1133404248	2026-05-10 13:36:29.051673+00	1969-08-20	masculino	Libertad 2964	20887715	f	{colaborador}	1	[]
de70b336-33bb-46c8-91dc-59bf6810b22b	Antonia	Espindola	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1157693954	2026-05-10 13:34:41.49138+00	1959-05-10	femenino	Sanchez de loria 5531	\N	f	{colaborador}	1	[]
11dd3f2d-2a30-4093-8c42-bb11e0946b34	Mirta Graciela	Orellana	colaborador	clase B	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1161191268	2026-05-09 15:54:58.851+00	1967-08-18	femenino	\N	18365069	f	{colaborador}	1	[]
2b2aba55-97f4-4290-b4c2-e6fb2c1aacff	Paola	Ñazzo	maestro	clase A	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1164793539	2026-05-11 13:15:04.656+00	1981-03-17	femenino	\N	28587936	f	{maestro}	1	[]
6020c6fb-3aed-4a45-b7c3-8ea7a0ac41b4	vice	director	vicedirector	\N	{"Escuelita Central",adolescentes}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	\N	2026-05-10 17:09:25.338+00	\N	masculino	\N	\N	f	{vicedirector,lider}	1	[]
fbd904cd-ba61-4319-a306-8e97525393d4	Director	Gral	director_general		{"Escuelita Central","Escuelita Alvear","Escuelita Nogues"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	\N	2026-05-10 14:27:17.377+00	\N	\N	\N	\N	f	{director_general}	1	[]
dd95aec2-3484-4432-9d65-848efb19c004	Gustavo	Cataldi	lider	central	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	1168321380	2026-05-12 22:33:36.06+00	2026-04-19	masculino	\N	28658924	f	{lider,conserje}	1	[]
c47782e0-f0f2-45fc-8a0a-24e38cac631f	Marcos	Fernandez	colaborador	clase E	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1140334481	2026-05-04 01:27:25.647694+00	2002-11-01	masculino	Reynoso 2687	44889188	f	{colaborador}	1	[]
f551ddb6-d54a-4a38-b437-6553440cb086	Valentina	Gonzalez	ayudante	clase A	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	5491165786101	2026-05-09 15:04:49.474517+00	2009-10-23	femenino	Av. San Martín 1157	49890226	f	{ayudante}	1	[]
43e8ac75-4115-4409-a2c3-d406a6dd3bce	Nancy Elena 	Medina	colaborador	clase D	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	1154604151	2026-05-04 01:11:05.417027+00	1983-02-26	femenino	\N	\N	f	{colaborador}	1	[]
9fd9850d-fbb0-4aaa-ac0c-11759817073e	Delfina 	Sarlinga	colaborador	Obreros	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	5491171208064	2026-05-09 22:48:04.509374+00	2011-12-31	femenino	Alexis carrera 3050	52010107	t	{colaborador}	1	[]
a86ffe9b-fd29-4e5d-ac0d-3df2f93d5c3a	Agustin	Clementi	colaborador	Obreros	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	5491161080100	2026-05-09 22:49:09.013885+00	2003-03-12	masculino	Molieron 984	44838590	f	{colaborador}	1	[]
e6b4c124-ba15-4a1a-96a4-5f1230c64bfd	MARÍA FERNANDA	Caamano	colaborador	Clase E	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_e9b13c4d@ccdt.internal	1161149752	2026-05-09 21:15:28.848366+00	1969-06-01	femenino	\N	20957259	f	{colaborador}	1	[]
87bb6896-b6c3-42b4-a32c-14824bd20e6d	Alcira	Moreno	colaborador	Clase H	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_5ab4d8f1@ccdt.internal	1161022508	2026-05-09 21:15:29.502916+00	1995-06-15	femenino	\N	39053293	f	{colaborador}	1	[]
63a88b8b-715e-4d90-93ec-123acd7c28bf	Sara	Villagra	maestro	clase E	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1122676929	2026-05-10 13:19:26.96619+00	1979-11-16	femenino	Morse 352	\N	f	{maestro}	1	[]
edf69f7a-c8b8-4388-ba23-9198545b0f04	Anahi silvia	Cerezo	colaborador	clase E	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	2954673097	2026-05-10 13:23:43.272817+00	1995-06-19	femenino	\N	\N	f	{colaborador}	1	[]
0d494a19-6978-4494-9ea6-2dec18d2b6bd	Elias	Rodriguez	colaborador	clase E	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491130689590	2026-05-10 13:22:32.910382+00	2007-09-21	masculino	Ozanan 3148	48364411	t	{colaborador}	1	[]
79642ba2-c7de-406a-8853-c7bc1484f458	juan manuel	Robein	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	\N	2026-05-10 13:37:37.689414+00	1988-10-31	masculino	\N	\N	f	{colaborador}	1	[]
870d37cf-27ef-4f34-b3c8-30c66905642f	Debora	Maturano	colaborador	A2	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491159343524	2026-05-10 12:21:36.968186+00	2002-06-17	femenino	\N	45203717	f	{colaborador}	1	[]
992912c8-131b-4d6c-b858-671caf6e202b	Yazmin	Cisneros	ayudante	clase C	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	5491170968346	2026-05-09 14:43:05.005806+00	2025-10-21	femenino	Darragueira 5497	46895823	t	{ayudante}	1	[]
0855203f-646b-4238-8df8-192b5e262deb	Carolina	Sarkkissian	ayudante	clase E	{"Escuelita Nogues"}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	5491125052004	2026-05-09 14:45:46.66602+00	2004-10-20	femenino	Sucre 4160	46359741	f	{ayudante}	1	[]
190092e1-d7fd-4665-9929-c22206a2347d	Isaías 	Acuña	colaborador	clase C	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	541127697340	2026-05-10 12:29:05.183159+00	2009-04-24	masculino	Las Landias 2006	49411340	f	{colaborador}	1	[]
23c20f41-91fc-4a26-bba6-f4ac6a8629a2	Leonel Mateo	Garcia	colaborador	Clase E	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_f6c92a8e@ccdt.internal	\N	2026-05-09 21:15:28.910922+00	2010-11-01	\N	general pacheco 3213	50673026	t	{colaborador}	1	[]
f7271004-bad2-4549-a688-d7b7c6bd1724	Trinidad	Martinez	colaborador	Clase G	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	541166402841	2026-05-09 22:54:33.673205+00	2009-04-16	femenino	Asuncion 4137	49511308	t	{colaborador}	1	[]
6121f14f-c43d-41e8-b621-35c55e4e9101	Juan Manuel	Gramajo	colaborador	Clase i	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_8fa6721d@ccdt.internal	1162826287	2026-05-09 21:15:29.486915+00	1993-04-30	masculino	\N	36223024	f	{colaborador}	1	[]
639e8956-7962-4f3c-a5f7-aea78480630d	Guillermo Ezequiel	Cataldi	colaborador	A2	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491127326980	2026-05-10 12:25:27.77003+00	2004-10-12	masculino	\N	46192566	f	{colaborador}	1	[]
ea6e6d55-ec88-416a-ab8a-ad6e25d9a476	Rocio	Mansilla	vicedirector	\N	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1166947174	2026-05-10 13:39:05.758979+00	1982-04-30	femenino	\N	29405380	f	{vicedirector}	1	[]
a8f5d584-e728-4091-b9db-a24737140f91	Teresa	Maldonado	maestro	clase F	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1176383248	2026-05-10 13:25:17.236504+00	1946-06-20	femenino	\N	\N	f	{maestro}	1	[]
42c7c73d-ab4e-4f9b-8e37-10849283bc99	Tamara	Rueda	colaborador	clase D	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491141493364	2026-05-10 12:24:01.273154+00	2003-03-15	femenino	Morse 352	44883658	f	{colaborador}	1	[]
a35c7a5a-d936-4a12-b1d6-e83d6935d1dd	Santino	Alonso	colaborador	clase D	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491165035454	2026-05-10 12:30:03.112064+00	2010-08-25	masculino	Godoy cruz 5724 villa mayo	\N	t	{colaborador}	1	[]
a7b5e737-fc66-45c2-9fad-044e69357056	Alexis	Oviedo	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1132370207	2026-05-10 12:30:42.882417+00	2003-02-06	masculino	perito moreno 5886	44610291	f	{colaborador}	1	[]
15bafe6d-7758-4da0-9fc5-733326508f33	Isabel	Gomez	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	\N	2026-05-10 13:42:09.881956+00	1948-12-11	femenino	Sanchez de logia 5651	5212179	f	{colaborador}	1	[]
ff27534e-8ed7-486a-81d1-e782e2ffac2a	Margarita	Ozores	colaborador	Obreros	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1134201834	2026-05-10 13:40:42.341734+00	1985-06-08	femenino	perito moreno 5856	19100732	f	{colaborador}	1	[]
d161b2c8-757d-45e2-aee1-81a970348757	Carla	Maldonado 	maestro	clase A	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1132739205	2026-05-10 12:26:52.691561+00	2006-11-19	femenino	\N	47084074	f	{maestro}	1	[]
ac58ec7c-b9cb-41af-8677-740971bdb4ba	Aylen	Cañete	colaborador	clase A	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	\N	2026-05-10 12:26:21.369012+00	2009-11-22	femenino	Sánchez de Loria 5651	49905309	f	{colaborador}	1	[]
ad9e6e89-c2f9-4756-be22-b15c20ffb8dc	Denise	Ramos	colaborador	clase A	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	541125650682	2026-05-10 12:25:56.033633+00	2010-12-03	femenino	perito moreno 5856	51333591	f	{colaborador}	1	[]
e69aec01-7f07-45db-b6b4-91029db5bb13	Marcela	Ponce	secr.-calendario		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	marcelaponceabril@gmail.com	5491161222756	2026-02-15 18:45:25.466947+00	1970-04-21	femenino	\N	21559726	f	{secr.-calendario}	1	[]
8b7fd8a2-822c-4536-ac99-2a78623cf532	MARTINA	Arias	colaborador	Clase A	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_a1f93c7e@ccdt.internal	1133389039	2026-05-09 21:15:28.826436+00	2006-04-28	femenino	\N	47261963	f	{colaborador}	1	[]
9707517f-4bdf-4a84-8a9c-9cd21a816694	Daniela	Galarza	secr.-calendario		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	daniela.s.galarza86@gmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{secr.-calendario}	1	[]
7ff8b71c-4155-40a7-9c8c-753b37a04836	Admin	Test999	admin		{}	\N	\N	\N	2026-04-24 23:20:53.251+00	\N	\N	\N	\N	f	{admin}	999	[]
5dae267a-53af-4a70-bf01-f67e2458b61c	Secretaria	Ccdt	secr.-calendario		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	comunidadcristianadontorcuato@gmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{secr.-calendario}	1	[]
9d990e7b-00b2-41ff-970f-5f97390eedcf	Diego	Gonzalez	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	Diegoelarca07@gmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{lider}	1	[]
d36f1afd-7530-4f08-aa26-35c09b72c181	Daniel	Martínez	director	\N	{"Escuelita Nogues",adolescentes}	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	dagustavomartinez@gmail.com	5491140378737	2026-05-12 19:48:16.626+00	1976-01-31	masculino	\N	25088393	f	{director,lider}	1	[]
f6e1eddd-71c1-4da4-96b5-4c393421bb28	Mariel Andrea 	Aravena	maestro	Clase F	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	marielandreaaravena2016@gmail.com	1131138818	2026-05-10 16:17:36.981+00	1990-02-08	femenino	Libertad 3273, El Talar	35799020	f	{maestro}	1	[]
8f928734-6feb-48d7-9aad-a72272b53d2b	Marcelo	Clementi	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	mmarcelocle@gmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{lider}	1	[]
9772f324-5c74-4cae-b842-a6715cf979d5	Diego	Martinez	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	dielimar22@hotmail.com	5491165045979	2026-04-17 23:59:01.334+00	1978-11-20	masculino	\N	26932318	f	{lider}	1	[]
0abbf33a-87e8-4f40-8b5c-1ccc0bf3c777	Walter	Maldonado	secr.-calendario		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	wmaldonado1987@hotmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{secr.-calendario}	1	[]
59008653-599d-4f3f-9a43-47104f029b94	Valeria	Trullet	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	Valetrullet@gmail.com	\N	2026-02-15 18:45:25.466947+00	\N	\N	\N	\N	f	{lider}	1	[]
86668762-00d3-48e3-93d0-ef82731baa04	Daniel	Quintana	director	Central	{jovenes}	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Daniel.albert.quintana@gmail.com	5491166597926	2026-05-01 23:11:06.362+00	1981-09-17	masculino	\N	28983823	f	{director}	1	[]
800ef077-5345-49ee-8276-a034e6d7ff26	Juliana	Rasgido	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	julirasgido@yahoo.com.ar	01134306603	2026-05-10 15:16:24.106+00	1971-05-10	femenino	\N	21972998	f	{lider}	1	[]
87d0d593-11a1-4a47-ac32-9b539b97e6e6	Emilse	Ricci	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	keluemii@gmail.com	5491140383836	2026-02-15 18:45:25.466947+00	1972-12-27	femenino	\N	23068530	f	{lider}	1	[]
06a03a27-c113-4d70-9cdb-16abf952a176	LILIANA ESTER	MARTINEZ	maestro	Clase E	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	lichamartinez16@gmail.com	1161221268	2026-05-10 16:00:24.442+00	1972-03-16	femenino	Av. Del Libertador General San Martín	22689132	f	{maestro}	1	[]
f30a99f7-222e-4835-87eb-474e4001f6c2	Fernanda Isabel 	Dieser 	maestro	Clase i	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	fernandaisabeldieser@gmail.com	1123896467	2026-05-12 00:38:11.475+00	1987-10-21	femenino	General Pacheco 3213, El Talar, Tigre. Bs As	33379490	f	{maestro}	1	[]
bdee2b5f-fa08-4723-bbbe-3a9a877e1b9e	pastor	cacho	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	tatacacho1953@gmail.com	1161570309	2026-05-02 22:36:40.309+00	1953-09-03	masculino	\N	11119011	f	{lider}	1	[]
03fff338-cab0-409a-a2ea-d9dfffdc707f	toto 	martinez	director		{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	5491159080306	2026-05-10 00:41:53.944+00	\N	\N	\N	\N	f	{director}	1	[]
cfeb4255-a248-4c49-8ec9-69d23c453a6c	David	Morales	lider	Central	{jovenes}	4258c92d-b4db-47d8-918d-cadc0ba2a56c	davi.morales1987@gmail.com	5491165183514	2026-05-07 21:16:32.806+00	1987-03-28	masculino	\N	33021649	f	{lider}	1	[]
2825e9f9-bb23-40de-bfa0-f6eb99b1b07c	Secretaria	Ccdt	secretaria	\N	{}	\N	\N	549112345622	2026-05-10 17:10:07.838+00	2026-04-20	masculino	\N	000000000000	f	{secretaria}	1	[]
a1155095-3c10-4f68-9876-3522f3055d62	Daniel	Maldonado	lider		{calendario}	272563a6-4c87-496c-b692-a0f71c187e5f	maldonadodanielbass05@gmail.com	5491160141265	2026-04-18 22:20:18.123+00	\N	\N	\N	\N	f	{lider}	1	[]
5d9babed-7a63-43b1-9f51-ab185cdee785	Juliana	Perez	colaborador	clase B	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1164770058	2026-05-10 13:43:12.216225+00	\N	femenino	\N	\N	f	{colaborador}	1	[]
5672d592-1835-46dd-ba03-26c8adac62f4	Ernesto 	Martinez	director_general		{"Escuelita Alvear","Escuelita Central","Escuelita Nogues"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	\N	2026-05-10 01:32:02.384+00	\N	\N	\N	\N	f	{lider}	1	[]
bed0e9ad-e533-4ef3-b8af-f17877beeb10	Vanesa	Quintana	maestro	central	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	\N	2026-05-03 15:45:12.907+00	\N	\N	\N	\N	f	{maestro}	1	[]
123fa2bf-9686-40b8-9383-1e633ad755bd	Pamela	Vega Corrales 	maestro	A2	{"Escuelita Central","Escuelita Nogues"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	papamelavegaco70@gmail.com	1140366094	2026-05-10 19:05:22.066+00	1970-12-08	femenino	\N	92463864	f	{maestro,vicedirector}	1	[]
0643cac2-fb01-475d-aeee-ea53a81b6445	Ceci	Paratore	lider	central	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	ceci200813@gmail.com	1133414526	2026-05-12 22:29:43.202+00	1987-11-13	femenino	\N	33516585	f	{lider}	1	[]
264df003-f88f-49d9-9f4f-826697dcbb3d	Natalia	Maldonado	maestro	central	{"Escuelita Central",adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nataliamaldonado@live.com.ar	5491168321383	2026-05-10 19:10:13.571+00	1980-10-16	femenino	\N	28346694	f	{maestro}	1	[]
49e0ecbb-ff93-42ea-9cd5-d6db4e858522	Carolina	Giangrandi	maestro	Clase D	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	carolinagiangrandi@gmail.com	1168143908	2026-04-11 18:45:16.765+00	1981-12-01	femenino	\N	29531360	f	{maestro}	1	[]
a75a4372-3479-4464-95f2-6d77682a2dc3	Agustina 	Rueda	colaborador	clase C	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1139356944	2026-05-10 12:38:46.343486+00	2005-02-02	femenino	Morse 352	46556140	t	{colaborador}	1	[]
66ff501b-85f3-4b19-9816-e32ab7bb94b2	Lucia	Herrera	lider	Central	{jovenes}	4258c92d-b4db-47d8-918d-cadc0ba2a56c	luciabeatrizherrera1990@gmail.com	5491165186202	2026-05-12 13:09:18.255+00	1990-09-09	femenino	\N	36475422	f	{lider}	1	[]
cffd5651-338e-46be-99a6-999726202f53	Luciana	Maldonado	colaborador	clase B	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	541133414383	2026-05-10 12:57:53.992956+00	2011-05-13	femenino	Lavalleja 3272	50146802	t	{colaborador}	1	[]
81aab4d9-d5da-4feb-8fc8-5895bb70eff5	Nahuel	Cañete	maestro	clase F	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	5491165584422	2026-05-10 13:26:30.594824+00	2004-08-25	masculino	Sanchez de logia 5651	46119470	t	{maestro}	1	[]
dfa30110-f0ed-45d7-a0fb-c935c82ee338	Paula Jimena 	Salvatierra 	maestro	Clase B	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	jimenapaula2025@gmail.com	1154698042	2026-05-10 15:18:44.317+00	1982-04-28	femenino	El Salvador 520	29489121	f	{maestro}	1	[]
a3e65813-1bf3-4a33-b328-753046241cae	sebastian	fernandez	maestro	nogues	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	5491162554795	2026-05-10 15:30:21.248+00	\N	masculino	\N	\N	f	{maestro}	1	[]
702c4f15-f7ed-46a7-838e-4330f8a62a63	Daniel	Marsili	vicedirector	\N	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	danielitomarsili@gmail.com	1133114650	2026-05-11 23:13:09.357+00	1989-09-05	masculino	\N	34533532	f	{vicedirector}	1	[]
8c544c24-d7bd-4589-bb51-63b97cc7f64d	DAVID JOEL	Leguizamon	colaborador	Clase F	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_28af61cd@ccdt.internal	\N	2026-05-09 21:15:28.9531+00	2012-05-16	\N	J MARIA GUTIERREZ 5221	52035074	t	{colaborador}	1	[]
5666b713-de6f-44e6-8a18-7891bba46dca	Carlos	Maldonado	director	\N	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	carlisx2@yahoo.com.ar	1166947171	2026-05-12 22:48:47.522+00	1977-12-01	masculino	\N	26192798	f	{director}	1	[]
7005aa20-b176-4601-abed-46a9eac0b191	Sabrina	Carrizo	maestro	nogues	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	5491130166077	2026-05-06 01:49:29.427+00	1988-01-29	femenino	\N	33305966	f	{maestro}	1	[]
ce65168d-9d75-4e46-907a-c401bf03c9b3	Juliana	Rasgido	colaborador	Clase C	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	colab_d2e84f6a@ccdt.internal	1134306603	2026-05-09 21:15:29.009375+00	1971-04-23	femenino	\N	21972998	f	{colaborador}	1	[]
d3b54f51-c798-4588-bf58-c36ec4c5232e	Monica	Villagra	maestro	clase B	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	1150576016	2026-05-10 13:06:32.235071+00	1985-01-07	femenino	\N	\N	f	{maestro}	1	[]
e267a6b3-3e2d-42bf-a13e-9fbc896b69db	Estefania	Cerezo	colaborador	clase F	{"Escuelita Alvear"}	94668d57-c8b2-455a-8aaf-369e7286847b	\N	2955595155	2026-05-10 13:27:45.287052+00	1993-09-04	femenino	Savio 827	\N	f	{colaborador}	1	[]
408cee47-527c-4525-bece-df16440d72fc	Mestro de 	Prueba	maestro	A2 central	{adolescentes}	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	\N	2026-05-10 22:53:21.634+00	2010-05-01	masculino	\N	\N	f	{maestro}	1	[]
51e8acdd-2ecb-42b8-bc98-c7dd2d25f987	Cintia Cristina 	Mansilla	maestro	Clase C	{"Escuelita Central"}	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	cintiamartinez2016@hotmail.com	1564210385	2026-05-10 15:19:16.34+00	1977-05-18	femenino	Asunción 2137 Don Torcuato	25871497	f	{maestro}	1	[]
\.


--
-- Data for Name: student_departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_departments (id, student_id, department_id, assigned_class, role_in_dept, company_id, created_at) FROM stdin;
b3d3bea8-092e-4ed4-8def-4195bafbf48a	ff246736-b674-4626-baf7-e4783444aa67	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
bef957d6-415d-423a-8554-ec7d9f671d66	59e72875-e3a8-4400-bfc9-c9e1f8fb0402	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
9fe7fb87-972a-4e6a-8b3f-ad9b0e30c2a3	48ee9a45-4bcf-4e82-8db0-943932d39f84	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
28c2241a-ff73-4085-8d03-cf51803160d8	9b47e396-2976-4301-bc87-3e535a2da218	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
9af4fa34-0101-439a-bf3e-56d26c0b3c99	3f383f5c-07b0-4041-96d7-e34f500a6b75	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
0fdab6e8-8440-4a2e-ae19-279deeb0b2ed	90f60728-3f7c-450e-962b-4f8637bf844f	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
da58758e-56af-4236-beec-f179c438c2a0	b4f8dd2a-6b6b-4156-9caa-b03085c61743	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
901bec48-63fe-479b-9671-6224b25c6dcb	9472361f-2d76-410c-9722-45280184d07d	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
8a86d10d-cfb5-4798-8a8c-d4a8534d6b0f	27dcb090-e104-4771-8777-178557ef95c1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
e3992c65-38aa-4738-a54c-75f50215245c	6d727a99-edcd-4f4e-ac7a-001431d13ccd	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
722c45fe-11ab-4182-9d04-5664d77f73f9	b042c247-1499-4749-ab86-64db140677da	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
3ca154d4-d833-4be1-8f19-1762a828b6c5	de89fdd0-0cbe-435a-bf41-6c10861d9cbd	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
b73a86d3-985a-4ad0-b222-46f8d18ee841	cdc440c4-2d75-40af-bcaa-0ae842a75254	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
7d810ab1-48fb-4c31-8fcc-cc3bc81a2138	de7245e3-56f8-4aee-8ce5-c5f02e8aeeba	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
1ae5058d-3903-4244-b97a-616bc6fc99fe	df125b1c-effa-4b6f-8de8-a88d4a11f41f	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
e237ad9e-2312-4c59-aff5-5f5250ec2687	53fdfb91-012d-4ffc-b6eb-9fe11c9c5e29	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
5e9e3a92-a351-4a10-afde-417a6bf333b0	524f1461-247d-48b4-a1a7-89bc84c717b7	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
a6585c0a-2eff-4f31-8abe-493ece59d10a	388faa01-ae67-4b10-b450-a6744784cac5	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
33e65d84-cbcd-45cd-aaf0-2aa12e5e9047	57919af3-579d-4a6d-a32b-202b0568b426	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
c6be6f1c-565e-4fd8-9a7d-83bde997eef2	5218fb31-0f6c-4231-9119-77e1e507995e	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
161b4572-4dc6-41d8-a71f-cc5d2eba3921	0524b650-80f7-4742-8ee3-1a1d55e92ee9	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
8390f77f-a400-44e4-b7ae-1959fb8c0690	00375d83-e208-4b8d-9c04-f762823785b4	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
dc992e77-56e7-42df-9405-46e44124adf4	04ecb833-29a5-4aca-9365-8f81e2b0e106	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
38d3c631-e492-4dcb-a05d-7ddfd13db623	aef25c2c-da92-44b1-86b2-e457da2cfe9a	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
09d8dd59-fb27-4eb7-9024-b541a9c48d5d	ebac8290-3421-4c44-99ed-933354ac02fe	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
bf42fcb4-52e3-46d2-8b4a-4508fff78606	aa4dfab2-b8ac-41d9-b91c-3ea85ce03fca	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
e6217198-0aed-499c-aca3-8e739ec36511	8f7ee6c5-efab-46a3-8489-306946045338	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
b8bff8b5-e584-48d2-8dca-fca0a3a12ed5	bd67ae4d-15ba-4475-bf70-c431a293d517	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
33b3e686-2c6e-4830-a6c4-8f4aff904a0a	33e4af7d-07a5-460a-9ba6-57fc0946711e	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
72f72714-af36-44cf-b38e-2e77041f9346	a21a3b27-7dc9-431c-a1e5-f8bcbb26875b	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
0d367b5d-3894-49a4-ade5-5e7897e55bd1	9b7b4404-8dd7-4000-81f3-83cc69a4516d	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
b3a9bf8c-003f-4f0d-a79e-c0e33215bc9b	c738861a-4ba3-4ac5-a6d2-e1e41f209526	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
4214ca99-5b60-4ec2-8ef0-23577208639c	11690a7d-fb69-42aa-a57c-b112e7f7c444	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
93cee5c4-46b5-4385-90ec-b75cde5fc672	e676f2ba-0792-439a-8341-8dc38c780227	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
53f2902c-7de6-4316-83c8-2afe7d5d2f32	f9e8cdbc-797d-4582-9da1-f44d0fb20313	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
16eb890a-4bcf-4ae8-a398-9a52852b4aeb	b63ca0f3-9b69-471c-bdfa-df35182c5030	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
e3421bc1-4b16-4e42-9bd6-6b2c8a32356f	f4b59f80-f1b6-4be7-a7db-1a1befdd5fa2	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
25c5b6e8-688b-4ce9-ab1a-8d6d4cf5484b	51f31edd-5cb9-43bc-aa3c-e8963b599a4f	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
0924a212-0593-49a1-9fc1-9e98b96bfdba	b5c2ea66-abb6-4ce3-9c62-18242d8b41d6	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
52479c6d-b1ee-4834-8c9f-d41ff5e4b082	9c7b8b3d-4a43-4877-a136-b684184a1c05	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
78694a64-cfae-4b4a-bd8f-0dd14939c2ed	cf364e5f-9162-483f-a049-07e7864e9059	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
4498c67e-62a6-4413-a4c2-c673fb94e1b0	d1834134-90fa-40cd-9131-909fc7e56c5f	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
2591526a-9560-4af3-a697-ddf45a8a0929	ec7c5f14-23d5-4e50-b940-ed2198263f61	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
09774f36-e9a2-4306-b50c-29fae81d1947	45d40756-770c-462e-b7e5-0b4d470e802d	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
474b43c1-9941-46b6-8ac4-17a15949a031	46faed50-e827-454b-945d-e9102afc581a	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
4ece446b-a473-4808-b00c-65f60114892e	a181428b-138a-4c64-8b93-146af99d0e1b	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
fe7d183f-cb70-4d40-a7e6-b052ffaf2aca	ad18188b-b5f9-4c91-a666-f79acc6694be	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
4d6b788f-d9aa-40d1-9145-0182b2397259	9fe2f14a-b581-48e0-8ef3-67c9548c2cca	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
56d81105-bbb7-4f4d-a66b-bee06f99ffb9	341d57a1-6d21-4f32-b07e-70cf9ae5ed97	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
9ee9d8f7-47b7-465a-9ac3-3c93ccac356d	aeda45f8-1eba-4f53-be9a-f58d25086fff	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
e2e9f498-1861-4ab3-8bfc-c928dcb780c0	1f12c8bf-f2f1-4464-befb-2b6a47a0baa9	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
a2a593ac-32d4-47c8-a3ad-2cbb8462dba6	4c9e528a-b0eb-42b4-89aa-28009f888afb	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
49455217-93d2-48b0-8751-222912467a88	045e35d2-3071-4305-afaa-21c96018ca61	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
f4afc1c4-5310-43b0-a5c2-987ab3bcbc55	101443df-e49f-4f4a-80a5-3d54d6c56f28	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
6ba3b64e-b85e-4789-b5f6-7a072908c82a	9b1e928d-fbe5-4b68-86c2-b7e5d32577f0	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
d8427f3e-de8f-4a57-ad29-18006c71e227	03d3398e-1ffa-48a6-b878-8a9bceb07142	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
438ed64a-fc0a-40a6-a52c-43a49746b537	628f814d-cdde-4c62-b14c-1395c8141726	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
4eda9f8d-0652-41eb-a09b-e0cbc2cb50d5	876fd4fb-f16a-4d57-beb7-97753c9125e2	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
e1dab919-4c8d-49ef-adf9-4cd8cf96c0f7	b8f9923a-3f0c-4665-89a2-195d713543b7	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
6132a525-8429-47c9-bb2c-0115298cd484	5b6c2ed2-faac-4aad-90db-6450987ee98a	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
b4839663-b741-4205-8622-ee280bfe1646	3155e062-2c3b-4665-a3ac-9fac5574d47a	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
e296c6c6-b6b9-47a5-a218-b308eec81114	33147e44-44ca-4b5b-9ad9-01e8e717352a	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
71d74020-67a0-402d-aa54-560a97377122	3be3dd4f-067c-4eea-a16e-2d1cdcb9bc6e	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
f1f21b41-ae54-4df5-ad50-0c87510b53c7	a4849e1f-20f7-44d0-962f-38fa342f13ba	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
82b1008e-c409-41e5-bf99-95856a0bd460	8fb7b107-283e-4916-a273-2e3f6111f049	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
a97715b0-3b19-42bd-b368-4fb852c3efca	81b5fdf6-cc38-455d-ba95-fab3c0fc8091	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
5418ef00-aab7-4039-b5b7-7df6c4bb1162	af323331-851a-474f-bd63-fddfe8f3dfab	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
d672c53b-c941-4372-875d-68c1fda804ca	8a37401f-2d32-49c7-8905-9f254c5ed9a7	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
9a343d84-6856-4a84-8a07-1f455652ccf6	e72727ec-0f6a-4d69-936a-cf08dc83c11c	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
191f9a80-f265-4e48-8ae3-34f7a83508a9	533b8624-5090-456c-9037-5180cf0789b3	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
59545b31-ebb8-4e26-9067-041cf923da90	937f7d43-a7c3-443d-8b00-7237aa13d7c3	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
ee9520f3-8531-420d-a4ea-3888c389b1fb	a21dcf11-f5f6-4204-96b4-875ea57dfa1b	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
50cbd8fe-4b32-4fdb-ac83-2aeb2095d3c7	768e7d32-51c4-42e7-8042-92cbd060c282	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
dac4063d-a116-43fd-b45a-a4f2da786d2f	2d708de5-3886-402d-ae90-a87f9169c5bb	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
d729900e-bcf3-473c-a397-dc422e1047a0	1cfa18dc-51b9-451b-8590-b5df916b4b30	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
d630bc73-3247-4185-87ba-929306dfd44f	f190804c-6524-40ae-b2de-4eee00b037ee	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
0a716618-be9a-4640-be87-8b79d736ea40	7237b10b-df5c-47d4-8c66-7b92f2625d82	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
a99dfefc-cf75-4ec2-9d90-2a009a5cf23e	f49637d8-4a6c-4808-8b5d-12d567e5c8c0	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
2cbcc9df-1621-420f-a598-af883b6776f9	08e0f438-0adc-41ee-9d04-dc39dca85838	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
df0e1a53-a180-4a56-9d83-f64e2aa6af79	abcef2df-2a92-4f15-a1a0-534cc469e582	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
ba217732-9705-4c4b-9d07-9e266c613363	cf369185-83e9-4075-a7c4-246a9103d3a4	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
30a478c7-81a4-4806-a7ad-6d9ba4e398d4	6a2bcac6-734d-4b73-93bb-86cba3a61735	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
810cf242-add5-402f-9f89-fb5551b6e100	29e647f2-112c-4212-b297-dbcde2171dfd	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
60754f1b-6784-4996-9835-3cd27c5fc4dc	d90579f6-b46b-4ff0-836a-47fee45431cf	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
de63f0f5-add8-4e15-a041-b9fa6f434f5b	d4d0924b-957f-4078-b791-461858711c0f	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
2a97e2f0-2f40-499e-aaa4-7a043de9fbd0	2bb8b131-dd43-4649-9f35-344c6492e4bc	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
cc8deab8-e7ef-4a55-a904-13a3c0f0a351	adfe4829-f79b-47ab-a818-6051523d66b6	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
5902bacd-3524-48cd-8b4e-4c67b07b33c4	1e6dc9cd-6560-4019-9ea8-eebb1c509ed2	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
cf4a604b-0908-40fe-84b7-d348ea726730	11794a83-eb22-450c-8d83-908d16e4db39	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
9f4cfb6a-3811-431b-b8c2-60b7d96879c0	41f9205d-2503-458e-8410-5138755815d8	b3884c4d-1428-4ee7-97f2-4389d8664a6d	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
36c2cddf-983d-4c71-963c-d497e7a6909f	56ccb2ae-693c-4628-ac56-9261f726b867	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
f39fd809-877b-4f0d-8285-527776c4eaaa	9309bba3-1325-4878-b3d6-7e66f264a1d4	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
060bb73e-85b6-45d1-b8cc-30e6df47b4e9	85d60eac-8bee-4ec4-9d82-b63c802eac76	b3884c4d-1428-4ee7-97f2-4389d8664a6d	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
397acede-fa98-473b-a6ea-ecb5603eb91e	0964316d-4362-4570-9122-2708793eb1ea	2abb37f8-6fd6-4ab8-9d7e-16ee8e5ee843	pre-adolescentes	alumno	999	2026-05-04 23:09:34.725279+00
f941817d-6dc7-462d-a093-9c61576f91d5	32f9126b-7932-4a17-a096-be524fbfda8d	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
a8e86575-0696-4192-b040-f7a28e56ede4	dda62718-79ab-4062-8687-606b65ee6479	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
5ad50720-fb3d-42f8-82ec-762056239cd0	4c6bbc6c-55db-436c-83be-34012ce99fb1	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
25c73900-87a1-439a-ae74-87640b41e372	7b909c09-013b-44db-8c47-d26c5802adc7	b3884c4d-1428-4ee7-97f2-4389d8664a6d	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
d31f9bf2-cc6c-4d34-a153-2d1f4fc7ed65	b9fc91ca-126d-47fc-9f6b-5e1bd6a10acc	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
977facca-d930-4460-a9e8-2cb641d4b3c5	1646d86d-a4bb-457c-ace3-2676d2f5008a	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
c88d8a71-d1af-4dda-99f4-31e0ecf0b3b8	0a346b57-54b1-48b1-83fd-dd3d7271a278	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
84f5302a-4134-4fe5-978c-b78eeb26c02b	eadd30e8-5451-4da4-8d52-1c301c190dee	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
df445cde-380e-40fc-843d-4349ef8a61d2	261e4a56-1e81-44c1-acae-1607d12da511	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
11de3b57-f360-4bcc-bcba-8fd0a81bec49	8e2e6863-60c1-40c1-bda2-d7f0daba2190	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
50a3df06-0c04-4710-955d-c1e2551ab6ca	d21b07e7-8045-4daa-a3a8-2abdac622250	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
430f304a-a1f2-4107-a972-76d216ac4608	a0037cdd-169d-43b8-ba72-afcdb6acb194	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
3db5862e-3ca9-4f0e-898f-7a551f60a7c2	b7468e1c-f5db-4537-9bcf-39af5eb2f633	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
6e3b9df0-5c2d-4be4-adf2-d367c5b8c95d	7834a4ce-6577-443f-8d78-922727bb1617	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
0e3ab8bf-57c2-4403-a383-0a103c469d40	2745d845-111e-41a2-b41e-d956af14708e	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
825e82f6-c549-436d-9754-f5bad308a653	ded569fe-bcca-4fbe-96ed-718621c902d7	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
c686ce6c-3a8e-447c-8436-603871e74c97	5f64d2a2-07c1-46c6-99ad-3f8dc0dc7e10	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
54f205e3-1440-4ff4-891f-a200d4cdc899	329450e9-23e0-4485-8950-1aadb0da668a	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
b463007c-9568-404f-b946-0addb0cc263d	a20dddff-cacb-4a65-befc-07db9dadd458	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
08f69469-c070-407e-b98d-5a340754cb8a	847bf7d7-1402-4826-8c3b-c966bd387666	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
7945ab6e-6a2f-4090-ab1c-b8b12ef6d2c1	5c54428d-0c37-482b-8cfb-9518ac5b9f5e	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
aea3986c-5335-492b-829b-2c2d537da000	fc20f8f4-f387-4e5e-919c-cfc8103cf7b9	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
91016750-2574-45ac-959d-4e2264747214	22f1f8ea-3137-42b4-891e-b4034550ad40	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
5a6de41c-3dfc-419d-8e5b-4300e7e4877e	6e2f40dd-59c2-4aec-afe3-3152a6532af3	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
2b2ccc34-99f5-4ef0-be11-fd8e1fa441ae	b799b726-f5f8-4d49-aa79-b93ad008e35e	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
2bce0135-b8d2-4cf8-a30e-3b863149f1a8	1813138d-2041-409f-a6a6-dab4e27a24d7	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
8a81ed1c-1416-42ef-bf02-2f4ed91b018a	c176bdcd-2999-467c-ace0-c6a2c1e80c3c	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
aef0f581-1d3e-4a0c-9e16-1ae841cdbd1a	b5a5299a-eb17-4d45-86f0-bf0a8bde0b32	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
c9845c46-46c3-4f77-ae9c-0c4a4639ebf8	b5b68d49-1566-414c-af85-99c00bbebc59	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
e3320dfe-4e8f-40ca-aca1-2265453e6161	5c29d5ba-1073-4114-8921-a6975fc3bfd1	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
918c4922-f1f1-41a3-ab60-95ae84d84014	e6e6b227-73b9-4e97-9955-110dc4a39dcc	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
c982e77a-0d93-470c-a79d-37edef2cba21	2df9b173-019f-4da0-928e-b274fbe23a74	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
86d42b95-3146-46ea-8df7-cce612fb1aa8	829526d9-7370-4f36-b566-fb65ed2316de	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
059e113e-af99-48a2-86ce-c19b212d862d	f9b90693-18b3-4f73-a43b-e832f22432c2	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
bdb9328f-575a-443d-a895-3f99ff116fc2	95c3560d-a06a-437f-95b8-ae5c4e07ea57	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
9be83068-f433-461e-ab15-5e10cc08b57d	d882df65-f3cf-4032-9b1b-109a80be3f7c	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-04 23:09:34.725279+00
343cf8b8-ded8-4d6b-9471-f55be078600b	ecd31140-8b2b-4394-8605-651c8b7f0ef2	b3884c4d-1428-4ee7-97f2-4389d8664a6d	central	alumno	1	2026-05-04 23:09:34.725279+00
58325fd2-8489-48c5-97de-3ac7bd193324	8e1bfffa-d760-4bd9-b059-e868422494fb	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
ca4e894e-639a-4d37-85ca-f0a20f257bd5	037d72ad-0744-426c-bd9f-9466cf862ecc	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
cb0e2ef0-425e-4e71-a6f1-fd1b3e012be9	a20a54b4-2c31-4365-a160-bbde7067648a	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	alumno	1	2026-05-04 23:09:34.725279+00
5071253f-e7b1-4b07-ab5c-0fb31c13e84a	83cc8298-7497-4b05-b417-7c6064909bc3	4258c92d-b4db-47d8-918d-cadc0ba2a56c	Central	alumno	1	2026-05-04 23:09:34.725279+00
7b65c957-3c4b-4515-a387-67211d3b3650	bd988469-044a-4c99-ac40-dce5fbad1e22	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-09 14:44:29.833434+00
5a154ec7-ae54-4933-a953-2687b8222bce	73a440c9-b5ad-4989-9d17-2dfcec4f80ff	b3884c4d-1428-4ee7-97f2-4389d8664a6d	nogues	alumno	1	2026-05-09 14:48:48.773202+00
153c03d9-e38e-4e24-9942-b8dadbe6547f	4885d048-9314-4635-82fa-7648af80c2c3	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:44:51.793212+00
9b0fffc0-6999-4ea8-996a-436b5a3e22b5	2d25a8d8-20ca-47aa-9484-ff967e04e2e4	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:46:25.781996+00
74441830-a439-4994-8d27-b828bdda2df2	a405d72e-da9b-42ff-bf3d-6e47c6828310	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:47:29.226595+00
93c0781c-bfb1-4b4c-8a14-faa192c81c11	bd5b4c72-9eba-43b8-8a9b-bfd2caf3b1bb	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:48:25.959645+00
2773a59b-ff45-4171-8e03-d0b41070e340	16b44451-cf40-4313-b579-868079f829b2	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:49:33.597719+00
90a2d1d9-2675-4e11-bc33-303ef47e09b4	ab56600c-84a6-4350-897f-f3ceb6041c63	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:50:26.948645+00
268780e6-bf15-4dc6-9bb3-c913f4ac56f1	c01000a0-e2ca-4462-aefd-6aa3a946d871	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:51:28.216113+00
a6fa5b9a-ca30-40a3-8881-a3a871aceefe	d929c5c2-416f-4db2-9e12-42ead80a1748	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:52:08.943592+00
ab810ce9-94aa-46a5-b7ea-e4837ab832c4	bb0be4e6-dcd1-4a23-8e11-f6afcc95cbf2	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:52:39.078639+00
0c3b4ee1-d27e-4a74-8f88-9d5cf0c5f63b	4008cc38-69fa-45ff-b8d0-733c5f37e501	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-09 23:53:17.061345+00
c4331817-a9ab-46e9-a220-5960caf0c9a6	1cb017c2-f63e-474f-a279-cc2fcc2ac87a	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase H	alumno	1	2026-05-10 15:21:07.089138+00
e3a540b2-ad9f-415e-b6e6-399c9a3aa0c3	82d8b294-8ddd-48a9-8eac-1b5219dd6c4f	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 15:48:00.968161+00
5ce15258-7041-4c22-a04a-e7f9522f877b	86c9d1d6-3192-468e-ae54-3fe2804059b5	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 16:14:30.571785+00
520c5ec7-b1f9-4b06-b7b7-f5a70790d5bd	244ea0d0-20b8-46c2-9fb9-3203861f7cd2	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:02:49.544491+00
2521fbc2-e55b-4532-86b5-7b304639d8a3	45097f25-253a-462a-bd51-14a8fa9ede73	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:42:19.389205+00
678b0309-18da-43b1-bc60-df9e2426252a	ce2e190b-9c94-4d21-8210-bab70f399de7	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:43:24.548643+00
6a0fb372-c23c-412f-98c8-686023e3e3c3	2f692d86-fcbe-4984-8d60-d91cafc435d3	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:44:09.697183+00
c97fb421-5c67-4c50-ad7b-16eff237002d	3e5c7064-ce08-41da-ad09-43eabc64d275	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:44:51.135886+00
323c0f29-7144-4483-be6c-cdc995a21474	35b9a40c-1aaa-4ccd-b8ff-8972789d4cbd	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:45:21.361301+00
7fc71c18-23a3-47a0-90df-012dab543981	45e92fa2-bc83-492b-9f8d-ffbae145351c	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:45:41.647206+00
300370de-cc58-4975-8396-8c4762eba356	75baa7dd-3731-4b63-ad4a-a2e797abffb9	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:46:00.726617+00
e785a542-4cd8-4ee0-97e0-1dc15acd9759	71c20e0b-88c8-4157-bb4b-a8fee57b4103	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:46:41.904292+00
d98623eb-3e57-45e6-a4a1-c70c292f9353	370483f2-e4b8-4dc1-847a-470d59f25844	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:47:05.042858+00
7c05ee0d-f731-4b0d-8a30-c4b58ba436d3	0931d49f-618e-4184-9e44-c045e61bbc60	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:47:21.861432+00
f95fd844-6814-45d6-904d-5c0c2bc46740	933ee5bf-30ec-426b-a106-a761dd259b0d	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:47:42.357181+00
9bbb8f0b-7610-4f4c-b845-41b22efe141e	543209c8-7920-437e-a5f2-053e2057f2f1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:48:00.077178+00
2531578f-65af-44af-8e80-d635eb77a622	38ba3ed3-8dab-4f40-9d9c-ee48f6a082cf	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:48:15.507356+00
14a3e94e-55c0-4cca-99a5-b7cac1602966	1ce95037-62e2-4cf8-a374-45e4a816113c	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 17:59:49.696153+00
08e772ce-3dad-4bd4-aa0d-fec06648c356	33a850f9-4633-4a45-b0af-1419a4b07a78	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:10:55.024094+00
8da55018-1a1a-4f6d-b4a4-95f4994b9c0b	ed4bf229-375d-4ac3-8405-b0f4cd4838cb	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:21:16.77776+00
c327cd57-6151-4fe6-9bc8-ee294913d100	4046726f-2850-411f-89c6-7d8c27a602e6	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:21:42.02594+00
22bbbd3f-cac9-4d29-baa2-acabc5c3f5a2	9499dfcd-6034-4650-9429-14b9da00b43c	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:22:00.866746+00
95288fc8-4f00-4d7e-b0f3-23c6b8109e3b	d76d7ddb-6f31-4183-b4f9-69a11d8d78ff	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:22:40.99482+00
ad7b6225-4ad0-4e64-8be6-3a71cbec9033	71176ee9-85d0-4802-be96-ae141a92488f	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	alumno	1	2026-05-10 18:28:08.456949+00
f1ab94cf-8836-4720-af79-74a9f23cca8d	44cf3903-3d42-4055-b616-7d6aa7072186	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:02:34.587604+00
48ac402e-8448-4f5a-b373-bb9fe214ceba	25e1802c-e43e-4657-9f5f-1c77791022b1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:04:06.913927+00
5f8d15c2-331e-4fd3-a64b-244906c5ad25	6b2675ac-1f2b-479c-9618-0b27c0313275	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:06:33.550698+00
e39d3266-f058-4dbe-a10a-6acbcc798bcf	fee91568-d412-4129-ae2d-30f6d14105aa	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:12:36.928468+00
31c41dc4-502a-458c-a000-b54720722325	af3ff990-ea0c-4cfa-94fa-4d9585cea2b6	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:14:54.485243+00
a6feb91b-d8bc-44fe-b963-61a4f8bf17ba	6304cdfc-74bf-4a15-a95a-ac82c238d7a9	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:17:15.870448+00
d9763f1f-9449-4746-9c01-e5923160dfb5	79f8d85f-f33f-4997-9821-7102dcafa4c1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:20:23.577935+00
55f15219-23d1-4d52-bb4d-147a5285f77a	a356ae52-4223-40ee-acdb-d7c68397c8f1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:22:31.043274+00
bc72523b-853f-4321-a4a8-e7312fd448b9	52ceb520-62eb-4282-9fe8-8d5aa8ca8e74	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:25:47.266713+00
3f17fdba-f6f4-428a-8586-fa66f35ec5f8	ee318c4c-6162-4b50-81a5-0972e6801c1e	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:26:35.574639+00
9ab50fcb-1325-41ac-ae45-37b4f5b800f3	65df0674-530b-4059-9de0-4702fbde2d5b	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:28:00.39865+00
104c37e0-1533-4305-a442-faf0e023a511	a30859bf-1ef1-4abd-99e9-399ff2439c8a	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:29:10.164831+00
099ed11c-ad34-4b1a-ac13-669e16688d64	4f3c7bbd-ff89-460e-bcef-76c3dd151833	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:30:18.233711+00
8235636d-201c-4e56-a3ac-2c82f7115be3	728226b7-64c6-41b9-9e8f-6ee68a7a5cc3	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:31:00.275165+00
06937017-2c6b-4c13-b064-db3d1206ddf4	e73e4bb5-d93d-4470-8f26-af175bcabce3	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:31:47.396343+00
b8108fdf-ad67-4b0d-b92b-c498bcc11633	9b729ba2-9c07-4012-82b4-eb176858ebd6	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:32:06.090606+00
fdbf33d4-792c-49dc-b412-b4f5a34b0219	102f2287-af96-4b5f-b46d-2c00b0ed39aa	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:32:38.973666+00
f15f9f50-ede8-4449-ad92-5090952e9e57	5863045a-73c1-4a57-bd15-3f88b1b6bf55	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Clase i	alumno	1	2026-05-10 20:32:57.937687+00
cee2ecad-e70f-4cce-b681-493fe67f8382	bd097fed-d6d6-42fc-a66d-6b5b56f797f6	b3884c4d-1428-4ee7-97f2-4389d8664a6d	A2 central	alumno	1	2026-05-10 21:48:19.690181+00
08c93aee-1504-4195-98ae-7b0e8686af2f	094f259c-7231-4e24-a109-3192d61db0a4	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	clase E	ayudante	1	2026-05-12 22:24:53.506155+00
7b29b547-0092-4e2c-bbd1-e6c827be5de6	03f592c2-78c0-498c-ac2e-3a156fe9c43f	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	clase C	ayudante	1	2026-05-12 22:24:53.689158+00
0d926498-8623-4a26-96d8-c6b8d31799f2	124cbe07-7a06-470a-9edc-a9bef2dd0d48	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:53.854494+00
fbdc87e8-bad6-47e4-87ad-31b7e386b263	6f53ea70-2328-4965-9394-9f9be36a12bf	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	Obreros	colaborador	1	2026-05-12 22:24:54.039044+00
4b8184eb-5401-4082-84b6-89f22fba5d7b	b9dd6abf-98a6-436e-9251-404441a68ddf	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	clase A	maestro	1	2026-05-12 22:24:54.233166+00
376ec7f8-d0e8-4393-b7d5-b8ce46c696d8	9248740d-8114-4c14-b169-73d914e986fb	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:54.479622+00
402b048b-7261-4fba-829f-141f9b1d333a	2e46b091-fae7-4adb-888c-b3139fdef97f	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:54.736439+00
ac53a13e-474e-4995-92b3-35aa6e8f7dd3	5178dfd6-47dc-407d-8143-cce447ab267b	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:24:55.107942+00
a2719b9d-ebe2-4c59-89d2-43ebe9e759cd	292aa01e-a532-4d21-82cd-221be6349cdb	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:24:55.258249+00
298ae3c9-dac9-421e-a9d8-8e16a78b713c	8fd0fb88-ea2f-4129-837d-c4a46bd8ffea	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:55.415787+00
bf84dac3-d966-4aaa-9a1d-17715f822fa0	40b41fa9-bc93-4f12-99ba-e2f0c06f8ba2	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:24:55.553915+00
8ba2ff67-9ad2-4297-8c28-5baa44caa94a	4bf6b81b-c07c-46ed-8402-dffd1b7129de	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:55.693859+00
83b86e0b-acf1-4a78-ab91-81240c7db2c6	65dc114c-26a8-4791-9550-a54359cba05c	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:55.83352+00
d75aa77f-9aea-4ac3-91bb-4b06b2b48f71	9d08fcd1-18f8-42c4-8da5-46feb9ea4efe	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:55.980265+00
cb1d0d37-71b6-482a-bf27-de9f2f5c9d1b	2805c2a5-4998-4270-93d0-8c5f9be1f1fd	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:56.126598+00
39ff0fd1-cf16-4c98-a3ea-17440c673574	c8320396-3770-4221-beaa-7ddfff073293	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:24:56.263768+00
a3db9b11-7ba5-4acb-a7e6-03bfaf05fbc9	99e192a3-d0a8-4124-b46d-0c909f3d9c02	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	clase A	ayudante	1	2026-05-12 22:24:56.397627+00
b5684ee0-777d-45f5-8b6b-621dfd0651a5	75b253ca-8452-419d-891f-005ca9c98c02	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:24:56.539757+00
1a3c2a8d-675f-4f51-8e64-19774f1be797	cedc09ba-80a9-4637-ae8a-d003b9d80349	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:56.685153+00
3a759391-d97b-44f8-87de-9f5bd6c9f9b5	6488ed55-03f4-4163-9880-8267fc4a13c4	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:24:56.834411+00
ce202895-ec1b-413a-a80d-7ae6821803a1	654f1c29-feaf-4002-bf2d-d6c32b06e1e0	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:57.042463+00
f8ab93d1-4e3f-427c-86da-7b9ca217d0fb	a89e1e0e-8054-45ce-955c-35952c2f3e6c	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:24:57.181506+00
4870b5f1-ed25-482e-bd0f-91f628bf55a8	58a68af2-184b-4775-b52a-de57c2b41ef9	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:57.32792+00
1a4dde4f-3bcb-437f-8f91-6929bf3d8627	b5cfbf27-2b80-408a-8e35-4aacd73e1b8d	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:57.461655+00
8e1d5717-b785-4229-b365-43ec1cc7633d	1962e2da-096c-4e98-942c-0b452f80a164	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:57.607461+00
39de7b2b-22c6-43ea-8940-d0ecdc58549a	ec93e385-c4aa-44a9-bf7f-cd08a8057301	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:57.743717+00
f4ae50a8-e463-4150-8db2-dc74f9227194	ae804704-efc5-468b-bf0b-40eb0563aafa	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:57.88976+00
78250864-9309-481e-b4ee-36c8ba4bbc1d	62a324d2-ea33-4d9d-b1cd-7bcade80c9be	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	colaborador	1	2026-05-12 22:24:58.029045+00
7182cabd-593f-4f15-a190-0305ff0f7209	35403de0-efb0-4c6a-875e-208c4da9b922	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:24:58.164973+00
a3697c00-6505-44f8-a674-f72e5da2644a	701c3a56-176a-4216-b7a1-6d83f19f2280	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:24:58.32795+00
475f6097-f185-4122-892b-5f55f8722b37	cbe1a3ad-b826-4b87-9d34-824a901fd8bb	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	colaborador	1	2026-05-12 22:24:58.639595+00
d9c3aad4-cc30-4e1f-8d61-f87d5df16cd1	1bcad167-2d42-457f-86fe-1dbd01db0dab	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:58.820671+00
b818b5ca-7495-4da7-86ce-9909dcaa3662	8e7fb1a8-20fe-425f-a33f-d9b1c89438b2	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	colaborador	1	2026-05-12 22:24:59.00651+00
ea286c7e-753e-489a-b344-2920cad8cd9d	8826d503-c7d8-46de-a8d0-28779045e525	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:24:59.158223+00
2f5045f0-5c6d-45fb-8101-dccb538a6749	2b38e616-366b-43a6-995f-a176be8b737a	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	colaborador	1	2026-05-12 22:24:59.308896+00
8c312bb5-f1ac-4c2c-aa1d-718fae32472e	d713bf62-9010-44b5-84ab-5ac9ce8a12eb	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:59.474333+00
76b763bd-7f88-4a1a-9663-f1017bb9edc6	b3b10838-1532-4f3b-8880-42ed5a144690	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	Obreros	colaborador	1	2026-05-12 22:24:59.620387+00
47a82029-b42c-4bbf-80f0-27c51b9a3d81	a705314d-eec3-4971-b33c-62420cf240f4	94668d57-c8b2-455a-8aaf-369e7286847b	Obreros	colaborador	1	2026-05-12 22:24:58.483716+00
a3e2212e-66be-4f3e-a0e9-810fb9ce159e	a754518c-02a5-4f5a-b3c1-8bea76132995	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	A2	maestro	1	2026-05-12 22:24:59.756442+00
f8ca512f-c014-4aec-98a6-00f15082a656	a754518c-02a5-4f5a-b3c1-8bea76132995	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	vicedirector	1	2026-05-12 22:24:59.756442+00
8f99f0b6-592c-400e-8a15-b3612ad991ad	d7630fa4-9585-4f5c-941b-26a53277e3bf	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:00.19605+00
e7e2b606-38f2-4462-85b0-9c22495dd8bd	0ab19894-da53-4c8c-ae2f-72ce8dd9919e	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	clase A	colaborador	1	2026-05-12 22:25:00.643831+00
5055c99f-4bfa-43e6-aa2b-5971ee0118ee	5d88c985-a403-4ca1-a6b8-d9fef681b27e	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:01.086626+00
6f55aeeb-47e5-4a3d-b4ca-486c88f94d43	4d9d3b0e-0a26-485d-a2f5-68178e871154	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:01.540988+00
2d07f8e0-9ee4-45cb-b9f1-8303a7cfcbc2	133b644f-865e-4360-97d9-751cd7590bf9	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:25:02.035906+00
33431566-325c-4516-876f-4471cc830668	3ef88a83-dbc7-4a4b-b1ff-777252834934	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:02.461047+00
7e21cd18-6eb7-4858-8c6b-882ebd4cb996	29fed58d-9893-49af-8524-911c44d50ad3	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:25:02.951226+00
2f1e4a8b-3973-4b86-b4a8-7c04dedbc6a7	259336f8-6599-47ab-b6a1-f5bc2b39c7d9	b3884c4d-1428-4ee7-97f2-4389d8664a6d	A2 central	maestro	1	2026-05-12 22:25:03.543028+00
42af88c2-d292-48cb-ba07-0b32a3953708	f370cec5-5f06-456f-8f4d-477588c8e4a0	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:24:59.897132+00
bed404e5-e7d3-4392-9892-5c90ae8e0645	f86371b3-d7a4-4930-b884-2af435dc310a	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:00.339974+00
14c053fc-c04d-4b13-9a2a-1181c236dcf7	643704f7-5351-4005-8c24-2d6a1eae516e	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:25:00.785071+00
dd83eeef-a9f6-466a-be7f-f48ea53139eb	86943928-5fbf-49d8-94e0-9cd9ef9e500b	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:01.232721+00
31e7f6f5-3604-4087-ad50-a9d136b9cdd4	37feeb71-c32f-4c3d-8267-1458f4b98483	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:01.704717+00
67261314-433d-4675-b83e-254c2c70bb30	c4911182-b579-44ac-87b6-9b39271923e1	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:25:02.182208+00
da393174-48b1-499a-90fd-b126f9c8291a	42b8db12-180f-4eac-ae52-a915cd958383	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:02.623956+00
769a4235-54ab-4f95-aed8-60f01781ee08	5bd1229d-a674-4de9-8497-f796c535fe1c	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:03.141375+00
278f84dc-07be-45b6-ba10-3acfeeebbea3	6e401265-11b4-46fa-9a49-fda44c330ab6	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:03.688421+00
105fbe89-96e4-4d18-bd9f-5c0bf6a5ec82	b0d75f52-551d-497c-95dc-122e9b935e3b	94668d57-c8b2-455a-8aaf-369e7286847b	\N	maestro	1	2026-05-12 22:25:00.047184+00
e52484ee-e7fe-4809-846b-e5b8c8181967	7e876992-c83a-4bee-b1a3-21a31363ab2e	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:00.506651+00
77f25900-b052-4c8b-b667-c52c37e34c96	7333b0c5-3bc5-4d4d-95f2-718b45796855	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	maestro	1	2026-05-12 22:25:00.923431+00
b74516c3-b4b0-402d-8126-1b58f2fa92ee	96e0cabf-63b2-439d-a970-f23889242ea6	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:01.385613+00
4960a772-95e1-48eb-b550-568a054d7c88	113dbced-ad65-4c55-8db9-790a7b256e5d	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:01.860907+00
5c9f4303-f621-41d0-be75-49175884e69f	ea5bdd7a-d3f7-49c2-a09e-455df656c86f	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:02.326225+00
9f9a857f-d69d-466c-87d1-003f3a2c2364	7814a8e9-cc94-4c3b-b8c4-6e74bed8e109	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colaborador	1	2026-05-12 22:25:02.783123+00
1c45baac-5746-4b06-bbb8-efe0b2a84620	7aadaa71-cb29-4d76-ab34-3707f7afd7e0	94668d57-c8b2-455a-8aaf-369e7286847b	\N	colaborador	1	2026-05-12 22:25:03.822685+00
8c70a5c6-a596-4b9c-98bd-ca4edf8b2908	a93f3f77-ae1a-431a-b10d-09ca0a20c4ff	94668d57-c8b2-455a-8aaf-369e7286847b	Obreros	maestro	1	2026-05-12 22:24:54.931169+00
8300ccf0-4abb-47c9-95d5-fb38753116bf	f7683d40-b846-4dae-8c08-095ec262f213	94668d57-c8b2-455a-8aaf-369e7286847b	Obreros	colaborador	1	2026-05-12 22:25:03.299023+00
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, first_name, phone, address, created_at, updated_at, gender, birthdate, assigned_class, department, department_id, document_number, last_name, deleted_at, nuevo, profile_id, company_id, photo_url) FROM stdin;
48ee9a45-4bcf-4e82-8db0-943932d39f84	Valentina	5491165786101	Av. San Martín 1157	2025-04-12 17:42:47.199699+00	2026-03-31 13:48:14.066654+00	femenino	2009-10-23	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49890226	Gonzalez	\N	f	\N	1	\N
9b47e396-2976-4301-bc87-3e535a2da218	Ambar	5491134565194	San Luis 475	2025-04-12 17:42:42.455176+00	2025-04-12 22:54:59.82624+00	femenino	2008-09-19	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49007294	Cañete	\N	f	\N	1	\N
c23fd33b-7fe5-462c-9e15-236744665f27	Ambar	\N	\N	2026-04-29 23:50:03.231044+00	2026-05-01 01:53:55.461753+00	femenino	2026-04-29	\N	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Cañete	2026-05-01 01:53:55.392+00	t	\N	1	\N
3f383f5c-07b0-4041-96d7-e34f500a6b75	Carolina	\N		2025-04-12 17:42:43.441114+00	2025-04-22 01:19:04.565558+00	femenino	2011-02-15	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50736766	Clementi	\N	f	\N	1	\N
ff246736-b674-4626-baf7-e4783444aa67	Lionel	\N	Perito moreno 5425	2025-04-12 17:42:48.383412+00	2026-05-05 18:21:17.088575+00	masculino	2012-09-19	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paradici 	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/ff246736-b674-4626-baf7-e4783444aa67_1778005276636.jpg
f9dbce96-8da9-4dc0-9f77-9e26edc43487	prueba	\N	\N	2026-03-31 03:06:37.920284+00	2026-03-31 11:49:54.929124+00	masculino	2025-03-31	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	cumpleaños	2026-03-31 11:49:54.791+00	t	\N	1	\N
b4f8dd2a-6b6b-4156-9caa-b03085c61743	Ludmila	541158854436	Gelly y Obes 2709	2025-04-12 16:58:41.783411+00	2025-06-29 19:43:49.123124+00	femenino	2009-09-10	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49604422	Maldonado	\N	f	\N	1	\N
5ec78323-7998-4c0e-a4ea-32007adcc042	alumn	\N	\N	2026-04-29 01:25:13.97065+00	2026-05-01 01:11:34.218999+00	femenino	2017-05-01	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	2	2026-05-01 01:11:34.171+00	f	\N	1	\N
bf505824-94a0-414d-81dd-2a7467687d9b	Felipe	\N	\N	2026-04-01 20:55:34.027145+00	2026-05-01 01:11:41.417939+00	masculino	2023-12-01	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Pérez	2026-05-01 01:11:41.376+00	f	\N	1	\N
90f60728-3f7c-450e-962b-4f8637bf844f	Laura Gabriela	\N	\N	2026-05-04 01:07:30.335342+00	2026-05-09 14:38:46.379191+00	femenino	1971-07-30	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	22251746	Perez	\N	f	ca6c117e-c3ea-4fa5-8474-fad9220f0ec3	1	\N
6d727a99-edcd-4f4e-ac7a-001431d13ccd	Maria	541127346374	Dardo Rocha s/n	2025-04-12 16:58:43.249611+00	2026-04-26 00:22:37.372012+00	femenino	2006-10-08	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	46631981	Gamarra	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/6d727a99-edcd-4f4e-ac7a-001431d13ccd_1777162956685.jpg
7b909c09-013b-44db-8c47-d26c5802adc7	sebastian	\N	\N	2026-04-15 22:46:55.073413+00	2026-05-10 15:30:21.373573+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	fernandez	\N	f	a3e65813-1bf3-4a33-b328-753046241cae	1	\N
b042c247-1499-4749-ab86-64db140677da	Santiago			2025-04-12 17:42:46.81641+00	2025-07-12 22:02:05.043908+00	masculino	2010-06-10	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d		Caballero	\N	f	\N	1	\N
de89fdd0-0cbe-435a-bf41-6c10861d9cbd	Lazaro	5491166311494	Cepeda 3172	2025-04-12 17:42:47.490396+00	2025-04-21 17:34:01.323074+00	masculino	2010-10-01	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50494827	Villada	\N	f	\N	1	\N
cdc440c4-2d75-40af-bcaa-0ae842a75254	Micaela 	5491122458842	Colon y Urquiza el talar 	2025-04-30 18:27:40.306744+00	2025-05-01 01:31:27.820358+00	femenino	2010-11-05	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50764417	Meyer 	\N	f	\N	1	\N
de7245e3-56f8-4aee-8ce5-c5f02e8aeeba	Sabrina	\N	\N	2026-04-24 15:36:03.588362+00	2026-04-24 15:36:03.588362+00	femenino	2026-04-24	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N		\N	t	\N	1	\N
b58c5b4f-19f5-4e5b-b125-c8002d87622e	Brenda	541150267078	Tres Arroyos 2634	2025-04-12 16:58:46.111368+00	2025-11-26 22:52:39.620297+00	femenino	2011-02-17	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50766273	Zizuela	2025-11-26 22:52:39.494+00	f	\N	1	\N
01497ee7-7236-4da6-895a-25710978fd12	Tiziana	541128803335	Congresales 5159	2025-04-12 16:58:45.597626+00	2025-11-26 22:54:02.097699+00	femenino	2013-01-14	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	59929454	Soria Gomez	2025-11-26 22:54:01.97+00	f	\N	1	\N
df125b1c-effa-4b6f-8de8-a88d4a11f41f	Elias	5491130689590	Ozanan 3148	2025-04-12 17:42:44.933361+00	2026-01-30 02:22:11.136236+00	masculino	2007-09-21	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48364411	Rodriguez	\N	f	\N	1	\N
53fdfb91-012d-4ffc-b6eb-9fe11c9c5e29	Lucas 	541157558950	Estomba 3153	2025-04-12 16:58:38.508022+00	2026-01-30 02:22:11.136236+00	masculino	2007-08-06	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48286708	Silva	\N	f	\N	1	\N
524f1461-247d-48b4-a1a7-89bc84c717b7	Melina	541134173725	Gorriti 1420	2025-04-12 16:58:37.008025+00	2026-01-30 02:22:11.136236+00	femenino	2007-12-08	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48424547	Sanchez	\N	f	\N	1	\N
332b7870-75c5-4cf0-bcd9-427b72c778fc	Facundo	541125648216	Belgica 286	2025-04-12 16:58:44.167491+00	2026-02-17 19:37:42.105164+00	masculino	2008-04-20	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	48705533	Cornejo	2026-02-17 19:37:41.986+00	f	\N	1	\N
3ed5c335-898d-46ee-aa1e-3bfc7ecfff15	Catalina	541164126308	Dardo Rocha 5641	2025-04-12 16:58:35.761231+00	2026-03-11 02:40:40.614463+00	femenino	2008-05-11	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	48805521	Arteaga	2026-03-11 02:40:40.492+00	f	\N	1	\N
388faa01-ae67-4b10-b450-a6744784cac5	Juana	5491124592895	El salvador 520	2025-04-12 17:42:44.168325+00	2026-02-20 21:27:07.274451+00	femenino	2010-02-27	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50139821	Arias	\N	f	\N	1	\N
374e58db-f443-4257-b091-e554bfff2d68	Carolina	\N	Dardo Rocha 5641	2025-04-12 16:58:36.379947+00	2026-03-11 02:40:32.485042+00	femenino	2010-07-28	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50530330	Arteaga	2026-03-11 02:40:32.376+00	f	\N	1	\N
57919af3-579d-4a6d-a32b-202b0568b426	Aylen	\N	Sánchez de Loria 5651	2025-04-12 17:42:43.048923+00	2026-04-26 00:17:46.92464+00	femenino	2009-11-22	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49905309	Cañete	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/57919af3-579d-4a6d-a32b-202b0568b426_1777162665792.jpg
5218fb31-0f6c-4231-9119-77e1e507995e	David	5491151378467	Velez Sarfield 2645	2025-04-12 17:42:43.810985+00	2026-04-26 00:18:39.113581+00	masculino	2008-09-23	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	48997376	Artaza 	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/5218fb31-0f6c-4231-9119-77e1e507995e_1777162718688.jpg
0524b650-80f7-4742-8ee3-1a1d55e92ee9	Santiago	5491161021455	Av. San Martín 1157	2025-04-12 17:42:46.46264+00	2026-04-08 23:57:54.717465+00	masculino	2008-04-03	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48644559	Gonzalez	\N	f	\N	1	\N
00375d83-e208-4b8d-9c04-f762823785b4	Denise	541125650682	perito moreno 5856	2025-04-12 16:58:35.167909+00	2026-04-26 00:19:36.114145+00	femenino	2010-12-03	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	51333591	Ramos	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/00375d83-e208-4b8d-9c04-f762823785b4_1777162775090.jpg
04ecb833-29a5-4aca-9365-8f81e2b0e106	Delfina		Libertad 3085	2025-04-12 17:42:44.60269+00	2026-04-26 00:19:09.970351+00	femenino	2010-03-04	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50133235	Alvarez 	\N	f	\N	1	\N
aef25c2c-da92-44b1-86b2-e457da2cfe9a	Eluney	541136008435	Laprida 2814	2025-04-12 16:58:45.072236+00	2026-04-26 00:19:46.566016+00	femenino	2012-04-03	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50961888	Flores	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/aef25c2c-da92-44b1-86b2-e457da2cfe9a_1777162785883.jpg
ebac8290-3421-4c44-99ed-933354ac02fe	Ignacio	5491127564903	Gelly obbes 2709	2025-04-12 17:42:45.634918+00	2026-04-26 00:20:29.129155+00	masculino	2011-11-14	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Maldonado	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/ebac8290-3421-4c44-99ed-933354ac02fe_1777162828484.jpg
aa4dfab2-b8ac-41d9-b91c-3ea85ce03fca	Leonel	5491123504350	General Pacheco 3213	2025-04-12 17:42:45.325126+00	2026-04-26 00:21:36.923485+00	masculino	2010-11-01	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50673026	Garcia	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/aa4dfab2-b8ac-41d9-b91c-3ea85ce03fca_1777162895894.jpg
8f7ee6c5-efab-46a3-8489-306946045338	Morena	5491158895160	Perito moreno 5425	2025-04-12 17:42:47.867838+00	2026-04-26 00:23:15.248806+00	femenino	2011-01-21	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paradici 	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/8f7ee6c5-efab-46a3-8489-306946045338_1777162994182.jpg
bd67ae4d-15ba-4475-bf70-c431a293d517	Zaira	5491168379033	Las Landias 2006	2025-04-12 16:58:40.826566+00	2026-04-26 00:25:19.448374+00	femenino	2012-01-04	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52000408	Acuña	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/bd67ae4d-15ba-4475-bf70-c431a293d517_1777163118389.jpg
602f6d8d-482e-4216-8382-7a06a94c0643	Emiliano	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:36:30.636275+00	femenino	2012-09-20	Clase C	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Martínez	2026-04-20 00:36:30.519+00	f	\N	1	\N
bd988469-044a-4c99-ac40-dce5fbad1e22	Ailen	\N	\N	2026-05-09 14:44:29.621425+00	2026-05-09 14:44:29.621425+00	femenino	2012-02-09	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Servin	\N	t	\N	1	\N
64b70548-3964-4e8d-9097-d3c0e3e7b702	Brisa 	5491165965171	Libertad 3121	2025-10-21 18:48:21.131454+00	2026-04-07 18:30:05.029449+00	femenino	2000-06-06	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	42623850	Gonzalez	2026-04-07 18:30:04.927+00	f	\N	1	\N
3222b8c4-1733-4298-b771-b5b25ad6b535	nuevo	\N	\N	2026-04-29 23:00:53.55217+00	2026-05-01 01:17:39.014799+00	femenino	2026-04-29	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	alumno	2026-05-01 01:17:38.921+00	f	\N	1	\N
33e4af7d-07a5-460a-9ba6-57fc0946711e	Bruno	\N	\N	2025-10-11 21:14:13.946364+00	2026-04-26 00:18:09.567193+00	masculino	2011-08-27	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Montaño	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/33e4af7d-07a5-460a-9ba6-57fc0946711e_1777162689007.jpg
a21a3b27-7dc9-431c-a1e5-f8bcbb26875b	Owen	\N	\N	2025-10-11 21:14:46.818904+00	2026-04-26 00:23:25.459405+00	masculino	2014-01-23	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Montaño	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/a21a3b27-7dc9-431c-a1e5-f8bcbb26875b_1777163004781.jpg
9b7b4404-8dd7-4000-81f3-83cc69a4516d	Sofia	\N	\N	2025-09-20 19:03:22.746632+00	2026-04-26 00:24:54.685742+00	femenino	2011-11-29	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Leiva	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/9b7b4404-8dd7-4000-81f3-83cc69a4516d_1777163093985.jpg
c738861a-4ba3-4ac5-a6d2-e1e41f209526	Mateo	1154690086	Hernán Cortez 284	2025-09-01 14:48:38.490634+00	2026-04-26 00:25:46.377636+00	masculino	2009-07-03	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49534372	Avila	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/c738861a-4ba3-4ac5-a6d2-e1e41f209526_1777163145887.jpg
11690a7d-fb69-42aa-a57c-b112e7f7c444	Luz  	\N	\N	2025-07-12 20:58:25.681123+00	2026-04-26 00:26:47.562293+00	femenino	2012-12-30	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Sobotta	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/11690a7d-fb69-42aa-a57c-b112e7f7c444_1777163206487.jpg
34f95793-e034-4303-9d42-6de671b31a9c	Elias	5491153123843	Carlos Pellegrini 4965 villa mayo	2025-05-03 21:40:58.790726+00	2026-03-11 02:41:02.861935+00	masculino	2013-01-04	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Gonzalez	2026-03-11 02:41:02.745+00	f	\N	1	\N
c902bf49-8462-442b-8e8d-1cb3e9cb74f5	prueba	\N	\N	2026-04-21 23:25:39.385984+00	2026-04-29 01:13:16.375485+00	masculino	2001-11-11	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	124578	maestro	2026-04-26 19:08:58.179361+00	f	dbbd0ee1-31a5-46d6-84b7-5805c96227ef	1	\N
e676f2ba-0792-439a-8341-8dc38c780227	Ivan	5491128520711	Nicaragua  125	2025-10-20 22:39:22.49888+00	2025-10-20 22:39:22.49888+00	masculino	2003-12-12	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45347684	Altamirano	\N	f	\N	1	\N
f9e8cdbc-797d-4582-9da1-f44d0fb20313	Agustina 	1139356944	Morse 352	2025-10-19 18:56:10.757274+00	2025-10-20 22:45:05.985105+00	femenino	2005-02-02	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46556140	Rueda	\N	f	\N	1	\N
b63ca0f3-9b69-471c-bdfa-df35182c5030	Azul	1135572343	Gorriti 1420	2025-10-19 18:50:53.693966+00	2025-10-20 22:59:32.905328+00	femenino	2006-01-19	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47084155	Sánchez 	\N	f	\N	1	\N
f4b59f80-f1b6-4be7-a7db-1a1befdd5fa2	Carla	1132739205	Lavalleja	2025-10-19 18:51:15.13408+00	2025-10-20 23:12:04.840904+00	femenino	2006-11-19	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47084074	Maldonado 	\N	f	\N	1	\N
51f31edd-5cb9-43bc-aa3c-e8963b599a4f	Marcos 	1140334481	Reynoso 2687	2025-10-19 18:53:39.665889+00	2025-10-20 23:15:27.998901+00	masculino	2002-11-01	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44889188	Fernández 	\N	f	\N	1	\N
b5c2ea66-abb6-4ce3-9c62-18242d8b41d6	Nahuel	5491165584422	Sanchez de logia 5651	2025-10-21 14:23:28.036594+00	2025-10-21 14:23:28.036594+00	masculino	2004-08-25	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46119470	Cañete	\N	f	\N	1	\N
9c7b8b3d-4a43-4877-a136-b684184a1c05	Micaella Esther	1170443796	Valparaíso 898 - Pablo Nogués 	2025-10-19 18:50:16.665856+00	2025-10-20 23:16:39.947488+00	femenino	2005-03-03	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46563531	Dovile Vega	\N	f	\N	1	\N
cf364e5f-9162-483f-a049-07e7864e9059	Martina 	5491133389039	El salvador 520	2025-10-20 23:20:39.424209+00	2025-10-20 23:20:39.424209+00	femenino	2006-04-28	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47261963	Arias	\N	f	\N	1	\N
d1834134-90fa-40cd-9131-909fc7e56c5f	Ana paula	5491132288672	Libertad 	2025-10-21 14:50:56.78633+00	2025-10-21 14:50:56.78633+00	femenino	2007-04-28	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47945381	Cataldi	\N	f	\N	1	\N
ec7c5f14-23d5-4e50-b940-ed2198263f61	Brisa	5491168876273	Darragueira 5497	2025-10-21 18:33:04.445853+00	2025-10-21 18:33:04.445853+00	femenino	2007-01-26	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47864944	Cisneros	\N	f	\N	1	\N
45d40756-770c-462e-b7e5-0b4d470e802d	Agustin	5491161080100	Molieron 984	2025-10-21 18:41:46.228028+00	2025-10-21 18:41:46.228028+00	masculino	2003-03-12	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44838590	Clementi	\N	f	\N	1	\N
46faed50-e827-454b-945d-e9102afc581a	Milagros 	5491163774427	Reynoso 2687	2025-10-21 18:45:05.329439+00	2025-10-21 18:45:05.329439+00	femenino	2008-03-10	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48585544	Fernández 	\N	f	\N	1	\N
a181428b-138a-4c64-8b93-146af99d0e1b	Melina	5491171622248	Av.san martín 1157	2025-10-21 18:51:36.719182+00	2025-10-21 18:51:36.719182+00	femenino	2004-02-16	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45430027	Gonzalez	\N	f	\N	1	\N
ad18188b-b5f9-4c91-a666-f79acc6694be	Tamara	5491135003276	Av.san martín 1157	2025-10-21 18:55:30.08854+00	2025-10-21 18:55:30.08854+00	femenino	2003-07-16	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44999794	Gonzalez	\N	f	\N	1	\N
9fe2f14a-b581-48e0-8ef3-67c9548c2cca	Giuliana	5491132595299	Bélgica 587	2025-10-21 18:58:31.982716+00	2025-10-21 18:58:31.982716+00	femenino	2004-12-26	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46279134	Lopez	\N	f	\N	1	\N
341d57a1-6d21-4f32-b07e-70cf9ae5ed97	Alex	5491134201609	Marco sastre 416	2025-10-21 19:02:19.486722+00	2025-10-21 19:02:19.486722+00	masculino	2000-11-19	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	43057929	Leguizamon	\N	f	\N	1	\N
aeda45f8-1eba-4f53-be9a-f58d25086fff	Benjamin	5491126334932	Asuncion 2371	2025-10-21 19:04:55.968686+00	2025-10-21 19:04:55.968686+00	masculino	2006-05-19	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47280181	Martinez	\N	f	\N	1	\N
1f12c8bf-f2f1-4464-befb-2b6a47a0baa9	Debora	5491159343524	J.ramon estomba 	2025-10-21 19:08:19.943556+00	2025-10-21 19:08:19.943556+00	femenino	2002-06-17	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45203717	Maturano	\N	f	\N	1	\N
4c9e528a-b0eb-42b4-89aa-28009f888afb	Micaela	5491134216381	Segurola 1157	2025-10-21 19:11:12.38415+00	2025-10-21 19:11:12.38415+00	femenino	2004-01-12	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45528355	Mendez	\N	t	\N	1	\N
045e35d2-3071-4305-afaa-21c96018ca61	Ricardo	5491151817425	Estomba 3067	2025-10-21 19:23:11.559431+00	2025-10-21 19:23:11.559431+00	masculino	2005-06-17	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46748274	Norri	\N	f	\N	1	\N
101443df-e49f-4f4a-80a5-3d54d6c56f28	Angel	5491266272884	Fragata heroínas 1319	2025-10-21 19:27:28.967734+00	2025-10-21 19:27:28.967734+00	masculino	1999-06-11	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44883511	Nuñez	\N	f	\N	1	\N
7102a8cb-f87f-4a8f-8c37-1247aed0f331	Morena	5491150178838	Renacimiento 80 	2025-07-12 21:03:54.035023+00	2025-11-06 03:26:56.513178+00	femenino	2025-07-12	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	53058161	Nonino	2025-11-06 03:26:56.4+00	t	\N	1	\N
9b1e928d-fbe5-4b68-86c2-b7e5d32577f0	Camila	5491150415046	Diego 364	2025-10-21 14:46:48.810324+00	2025-10-26 23:49:00.108721+00	femenino	2004-06-02	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45986152	Casco	\N	f	\N	1	\N
03d3398e-1ffa-48a6-b878-8a9bceb07142	Yazmin	5491170968346	Darragueira 5497	2025-10-21 18:34:50.919585+00	2025-10-26 23:49:43.399603+00	femenino	2025-10-21	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Cisneros	\N	f	\N	1	\N
abcfea6d-f945-4394-b8fc-7889c94d0c68	Lluvhia	5491133606676	\N	2025-06-29 19:49:04.186365+00	2025-11-26 22:54:29.006792+00	femenino	2025-06-29	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N		2025-11-26 22:54:28.886+00	t	\N	1	\N
7834a510-c01a-459e-a5fe-b13140dacd46	Giuliana	\N	Laprida 2161 el talar	2025-08-02 21:56:20.629976+00	2025-11-06 03:29:31.054959+00	femenino	2010-09-26	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Aybar	2025-11-06 03:29:30.943+00	t	\N	1	\N
57c28a60-31d7-4d3d-a74b-5adb6cc4fdc0	Agustín (amigo Denis)	\N	\N	2025-10-08 01:35:40.860765+00	2026-03-11 02:41:52.70048+00	masculino	2025-10-07	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N		2026-03-11 02:41:52.577+00	t	\N	1	\N
628f814d-cdde-4c62-b14c-1395c8141726	Yesica 			2025-10-08 01:38:41.008123+00	2026-03-11 02:42:36.001631+00	femenino	2012-07-05	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	2	Barros	\N	f	\N	1	\N
876fd4fb-f16a-4d57-beb7-97753c9125e2	Fabrizio Ezequiel	5491127894242	Sucre 891	2025-09-06 21:31:02.109109+00	2026-03-24 17:22:10.473637+00	masculino	2009-05-25	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49592617	Brollo	\N	f	\N	1	\N
37d3a2b9-7c2b-46e4-8fd1-8bd524dcab25	Dulce	\N	1164667853	2025-05-03 21:39:36.757519+00	2026-03-28 17:47:39.992016+00	femenino	2010-08-30	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Gonzalez	2026-03-28 17:47:39.853+00	f	\N	1	\N
15b940ed-5f00-4ee4-a3bd-93f23c2709b4	Cristian	5491122783272	Libertad 3121	2025-10-22 21:00:14.859551+00	2026-04-07 18:30:14.277743+00	masculino	1994-05-26	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	38391265	Trujillo	2026-04-07 18:30:14.173+00	f	\N	1	\N
b8f9923a-3f0c-4665-89a2-195d713543b7	Brainlin	5491159467912	Av.san martín 2785	2025-10-22 20:07:43.082019+00	2025-10-22 20:07:43.082019+00	masculino	2000-08-12	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	96008143	Pineda	\N	f	\N	1	\N
5b6c2ed2-faac-4aad-90db-6450987ee98a	Lourdes	5491167039149	Perito moreno 5886	2025-10-22 20:13:35.239814+00	2025-10-22 20:13:35.239814+00	femenino	2004-03-24	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45494643	Oviedo	\N	f	\N	1	\N
3155e062-2c3b-4665-a3ac-9fac5574d47a	Tiago	5491153399224	Ozanan 3148	2025-10-22 20:39:04.726014+00	2025-10-22 20:39:04.726014+00	masculino	2005-06-21	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46564271	Rodriguez	\N	f	\N	1	\N
33147e44-44ca-4b5b-9ad9-01e8e717352a	Axel	5491127206541	Perito moreno	2025-10-22 20:43:01.047467+00	2025-10-22 20:43:01.047467+00	masculino	2004-06-23	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46185379	Ramos	\N	f	\N	1	\N
3be3dd4f-067c-4eea-a16e-2d1cdcb9bc6e	Tamara	5491141493364	Morse 352	2025-10-22 20:47:01.921436+00	2025-10-22 20:47:01.921436+00	femenino	2003-03-15	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44883658	Rueda	\N	f	\N	1	\N
c042577c-ed34-470f-846c-6cf0c4c0f682	alejo	011590806	Ampere 150	2026-03-23 22:11:19.062858+00	2026-04-20 00:35:53.254968+00	masculino	2020-03-23	clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	345382	esprueba	2026-04-20 00:35:53.136+00	f	\N	1	\N
a4849e1f-20f7-44d0-962f-38fa342f13ba	Carolina	5491125052004	Sucre 4160	2025-10-22 21:03:01.757581+00	2025-10-22 21:03:01.757581+00	femenino	2004-10-20	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46359741	Sarkkissian	\N	f	\N	1	\N
8fb7b107-283e-4916-a273-2e3f6111f049	Jonathan	5491169810977	Sucre 4160	2025-10-22 21:06:32.593157+00	2025-10-22 21:06:32.593157+00	masculino	2001-11-10	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	43725006	Sarkkissian	\N	t	\N	1	\N
81b5fdf6-cc38-455d-ba95-fab3c0fc8091	Marisol	5491159432728	Valparaíso 898 - Pablo Nogués	2025-10-22 21:18:28.950123+00	2025-10-22 21:18:28.950123+00	femenino	2006-06-20	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47295887	Dovile vega	\N	f	\N	1	\N
d0126b2a-b493-40bb-91f0-bba92cdcb09d	Marcelo 	5491139415258	Velez sarfield  2536	2025-10-21 19:29:25.721782+00	2025-10-22 21:19:22.751559+00	masculino	2002-12-15	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	44584080	Pereyra	2025-10-22 21:19:22.627+00	f	\N	1	\N
d78da21d-c7b2-47a5-a6d0-c5fdff65895f	Alexis	1132370206	Perito moreno 5886	2026-03-30 01:51:11.495744+00	2026-03-30 02:15:27.287607+00	masculino	2003-02-06	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	44610291	Oviedo	2026-03-30 02:15:27.231+00	t	dc8bb751-60e3-45cd-8aaa-76e80b779f27	1	\N
d9c0ceee-76e9-4ebf-8e8f-8682e0f4a7fa	Ceci	5491133414526	\N	2026-03-30 01:08:39.629305+00	2026-03-30 02:22:53.784824+00	femenino	1987-11-13	alvear	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	33516585	Paratore	2026-03-30 02:22:53.707+00	t	\N	1	\N
af323331-851a-474f-bd63-fddfe8f3dfab	Analía Belén	5491133262486	Ozanam 3260	2025-10-26 23:48:02.239247+00	2025-10-26 23:48:02.239247+00	femenino	2025-10-26	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	41480489	Peña	\N	f	\N	1	\N
8a37401f-2d32-49c7-8905-9f254c5ed9a7	Nahuel	5491140846462	Perito moreno 5378	2025-10-22 20:17:05.764097+00	2025-10-26 23:48:46.549399+00	masculino	2007-07-01	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	48095892	Rivero	\N	f	\N	1	\N
e72727ec-0f6a-4d69-936a-cf08dc83c11c	Julian	\N	\N	2025-10-22 21:46:12.485095+00	2025-10-26 23:48:52.568984+00	masculino	2025-10-22	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Gonzalez	\N	f	\N	1	\N
533b8624-5090-456c-9037-5180cf0789b3	Guillermo Ezequiel	5491127326980	Libertad 3263- El talar	2025-10-26 23:40:58.007865+00	2025-10-26 23:48:56.235644+00	masculino	2004-10-12	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	46192566	Cataldi	\N	f	\N	1	\N
937f7d43-a7c3-443d-8b00-7237aa13d7c3	Demián Uriel	5491130593491	Acevedo 5705	2025-10-26 23:43:57.815627+00	2025-10-26 23:49:04.005175+00	masculino	2005-07-11	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47749957	Fernández	\N	f	\N	1	\N
2ba27ec0-5455-4825-b5cd-0ff48ec20fba	Benjamin Tomás	5491168756357	Artigas	2025-09-06 21:27:07.439261+00	2025-11-06 03:26:27.194587+00	masculino	2007-10-02	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50776067	Costanzo	2025-11-06 03:26:26.672+00	t	\N	1	\N
094f259c-7231-4e24-a109-3192d61db0a4	Carolina	5491125052004	\N	2026-05-09 14:45:47.295191+00	2026-05-09 14:45:47.295191+00	femenino	2004-10-20	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	46359741	Sarkkissian	\N	f	0855203f-646b-4238-8df8-192b5e262deb	1	\N
a21dcf11-f5f6-4204-96b4-875ea57dfa1b	Ariel Antonio	5491136940147	Perito moreno 5808	2025-11-30 03:30:16.314391+00	2025-11-30 03:31:30.062156+00	masculino	2001-09-30	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	43728902	Ferreyra	\N	f	\N	1	\N
768e7d32-51c4-42e7-8042-92cbd060c282	Kiara Nicol	549117600911	\N	2026-01-31 22:52:53.110114+00	2026-01-31 22:52:53.110114+00	femenino	2013-02-11	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Nores	\N	t	\N	1	\N
2d708de5-3886-402d-ae90-a87f9169c5bb	Nicole	5491132601101	Libertad 2852	2026-01-31 22:57:18.998039+00	2026-03-11 02:42:25.295449+00	femenino	2011-05-27	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Sirake	\N	f	\N	1	\N
003abec9-a59c-4645-96d5-e1e99ef5c07f	Felipe	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:37:55.00562+00	femenino	2020-02-29	Clase C	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Martínez	2026-04-20 00:37:54.892+00	f	\N	1	\N
1cfa18dc-51b9-451b-8590-b5df916b4b30	Maria Alejandra	\N	Libertad y Belgica	2026-01-31 22:55:17.223152+00	2026-03-31 13:56:48.112889+00	femenino	2008-03-31	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Barros	\N	f	\N	1	\N
f190804c-6524-40ae-b2de-4eee00b037ee	Nicolas	5491133651411	Sanchez de loria 5631	2025-10-22 21:13:42.278434+00	2026-02-06 16:16:53.418788+00	masculino	2003-03-13	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	45263267	Tapia	\N	f	\N	1	\N
66422f5f-1ed8-4066-b7ec-aa189016de19	Prueba	\N	\N	2026-02-20 21:59:36.114747+00	2026-02-20 23:36:41.552126+00	masculino	2010-02-20	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Cumple	2026-02-20 23:36:41.436+00	t	\N	1	\N
7237b10b-df5c-47d4-8c66-7b92f2625d82	Lucas	54991158298192	\N	2025-11-22 23:45:36.861255+00	2026-03-08 01:39:51.509674+00	masculino	2025-11-22	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Osorio	\N	f	\N	1	\N
f49637d8-4a6c-4808-8b5d-12d567e5c8c0	Belen	1171554414	\N	2026-03-11 02:37:46.244518+00	2026-03-14 21:49:36.693769+00	femenino	2010-08-03	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50356115	Barros	\N	f	\N	1	\N
3bbad002-969e-4ab6-9ef5-193e137fa018	Jazmin	5491141804147	\N	2026-03-14 22:10:22.503216+00	2026-03-14 22:12:02.1658+00	masculino	2009-11-27	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Lasca	2026-03-14 22:12:02.018+00	t	\N	1	\N
08e0f438-0adc-41ee-9d04-dc39dca85838	Jazmin	\N	\N	2026-03-14 22:05:07.845788+00	2026-03-14 22:13:05.135951+00	femenino	2009-11-27	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Lasca	\N	t	\N	1	\N
abcef2df-2a92-4f15-a1a0-534cc469e582	Uma	5491176009352	Avellaneda 2485 Ricardo Roja	2026-03-21 21:37:10.331118+00	2026-03-21 21:37:10.331118+00	femenino	2012-11-21	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Benitez	\N	t	\N	1	\N
e36aacfc-91a4-4ad8-89a3-b47f6c456872	Bautista	\N	\N	2026-04-01 20:55:34.027145+00	2026-05-01 01:11:38.295196+00	femenino	2013-09-23	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Romero	2026-05-01 01:11:38.253+00	f	\N	1	\N
0ff9e410-eab5-43ad-af9f-2e12069443d4	Ceci	5495491133414526	\N	2026-04-20 01:28:17.088807+00	2026-04-22 23:25:37.174226+00	femenino	1987-11-13	clase A	Escuelita Nogues	b3884c4d-1428-4ee7-97f2-4389d8664a6d	33516585	Paratore	2026-04-20 01:29:48.438+00	t	0643cac2-fb01-475d-aeee-ea53a81b6445	1	\N
15c47f21-8098-4c3e-8b8d-50d67aec53d7	colab	\N	\N	2026-04-21 23:26:28.879114+00	2026-05-01 01:18:04.185441+00	masculino	1989-05-04	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	987654	1	2026-05-01 01:18:04.082+00	f	fbe3cb35-8cb4-4f61-a286-f35c291ce5a8	1	\N
cf369185-83e9-4075-a7c4-246a9103d3a4	Benjamín	\N	\N	2026-04-25 15:42:14.190628+00	2026-04-25 15:53:55.090809+00	masculino	2010-03-29	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Cabrera	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/cf369185-83e9-4075-a7c4-246a9103d3a4_1777132434385.jpg
6a2bcac6-734d-4b73-93bb-86cba3a61735	Alma	\N	\N	2026-04-25 17:16:09.651656+00	2026-05-03 14:11:11.56596+00	femenino	2009-07-27	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Cabello	\N	t	\N	1	\N
e1038e46-0045-4130-9227-7670ce8d3bf9	Ceci	5495491133414526	\N	2026-03-30 01:06:32.25469+00	2026-03-30 01:07:55.146455+00	femenino	2026-03-29	\N	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paratore	2026-03-30 01:07:55.011+00	t	\N	1	\N
29e647f2-112c-4212-b297-dbcde2171dfd	Federico	\N	\N	2026-03-14 21:23:55.375724+00	2026-04-26 00:20:20.91175+00	masculino	2013-10-19	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	53514456	Garcia	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/29e647f2-112c-4212-b297-dbcde2171dfd_1777162820399.jpg
d90579f6-b46b-4ff0-836a-47fee45431cf	Francisco	541131011511	Libertad 3263	2025-04-12 16:58:40.238705+00	2026-04-26 00:10:51.432001+00	masculino	2011-08-15	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50785849	Cataldi	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/d90579f6-b46b-4ff0-836a-47fee45431cf_1777162250590.jpg
d4d0924b-957f-4078-b791-461858711c0f	Facu	\N	\N	2026-04-26 01:38:14.850008+00	2026-04-26 01:38:14.850008+00	masculino	2026-04-25	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Gorosito	\N	t	\N	1	\N
a5db4cf9-87d1-4c0b-8bc4-0e13c5a648c8	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	seis	2026-04-26 19:08:58.179361+00	f	5ecd7218-4402-486f-894f-5b7ff3333a56	1	\N
26c8be7d-bcb1-47c9-a76f-3c0cf5ddcba3	maestro	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	5	2026-04-20 00:38:34.839+00	f	faca6240-e75d-485a-8fd3-202c0b559eed	1	\N
73a440c9-b5ad-4989-9d17-2dfcec4f80ff	Sofía	\N	\N	2026-05-09 14:48:48.564398+00	2026-05-09 14:48:48.564398+00	femenino	2011-03-15	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Garcia	\N	t	\N	1	\N
0ef14631-c273-481c-bf61-22e97256468d	Agustín	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:35:43.328747+00	masculino	2023-04-02	Clase D	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	García	2026-04-20 00:35:43.199+00	f	\N	1	\N
54511bee-60c0-429b-a3f0-302ac43a9da5	Lucas	\N	\N	2026-04-01 20:55:34.027145+00	2026-05-01 01:11:44.258969+00	masculino	2021-01-18	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Martínez	2026-05-01 01:11:44.221+00	f	\N	1	\N
adfe4829-f79b-47ab-a818-6051523d66b6	Micaella	1170443796	\N	2026-05-04 01:15:12.522945+00	2026-05-09 14:37:20.019844+00	femenino	2005-03-03	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	46563531	Dovile Vega 	\N	f	9ffe3139-ee72-4556-8284-dc82d162f2b6	1	\N
41f9205d-2503-458e-8410-5138755815d8	Sabrina	\N	\N	2026-04-15 22:46:55.073413+00	2026-05-06 01:49:29.558682+00	femenino	1988-01-29	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	33305966	Carrizo	\N	f	7005aa20-b176-4601-abed-46a9eac0b191	1	\N
2bb8b131-dd43-4649-9f35-344c6492e4bc	Nancy Elena 	\N	\N	2026-05-04 01:11:05.417027+00	2026-05-09 14:43:57.540804+00	femenino	1983-02-26	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	\N	Medina	\N	f	43e8ac75-4115-4409-a2c3-d406a6dd3bce	1	\N
aa193bdd-09c2-4f59-837e-47d18f5036f4	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:03:39.065089+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	cinco	2026-04-26 19:03:39.013+00	f	668f2e46-99d6-406c-a329-2b610d6dc63f	1	\N
99d24ce0-2c3e-4fd7-87c6-c5416d36e2f9	99999	\N	\N	2026-04-06 23:50:46.668743+00	2026-04-06 23:51:00.775875+00	masculino	2026-04-06	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N		2026-04-06 23:51:00.68+00	t	\N	1	\N
1e6dc9cd-6560-4019-9ea8-eebb1c509ed2	Rocío Belén	5491164221555	Rodríguez Peña 2009,El Talar	2026-04-07 19:58:28.971218+00	2026-04-07 19:58:28.971218+00	femenino	2006-08-22	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	47481306	Leiva	\N	f	\N	1	\N
aa4c3c87-0449-4ab4-ab09-de5d7ddb1995	prueba	\N	\N	2026-04-06 23:36:31.184809+00	2026-04-08 01:53:09.763959+00	masculino	1943-04-06	\N	\N	\N	\N	999	\N	t	\N	999	\N
840b4e65-02d8-4a05-9005-23cfcb819a2c	Test	\N	\N	2026-04-05 19:08:31.055524+00	2026-04-08 01:57:22.258172+00	femenino	2010-04-03	\N	\N	\N	\N	SaaS 999	\N	f	\N	999	\N
06bf1950-3154-4b67-806c-9fcc0490f237	Felipe	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:36:42.711053+00	femenino	2015-03-02	Clase C	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Rodríguez	2026-04-20 00:36:42.599+00	f	\N	1	\N
4d765381-2756-46eb-8e02-dcafdc12be80	Felipe	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:36:46.028568+00	femenino	2009-06-19	clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Torres	2026-04-20 00:36:45.907+00	f	\N	1	\N
dace98d5-f4ea-406a-9c69-d317bbcfeee4	Emma	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:36:50.739268+00	femenino	2017-09-01	Clase D	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Pérez	2026-04-20 00:36:50.622+00	f	\N	1	\N
c2bc434f-0df3-4dc1-baf6-ccfed6a497ce	Joaquín	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:36:57.714157+00	femenino	2012-10-05	Clase B	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Álvarez	2026-04-20 00:36:57.595+00	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/c2bc434f-0df3-4dc1-baf6-ccfed6a497ce_1776381731859.jpg
b004620a-fe42-4b99-b7d1-d7ddbe495be6	Isabella	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:37:00.443074+00	masculino	2022-09-21	Clase D	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Álvarez	2026-04-20 00:37:00.316+00	f	\N	1	\N
aa51d3a3-427e-41c7-9a4d-8d2a63a12873	Lucas	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:37:11.920905+00	femenino	2011-05-09	Clase D	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	López	2026-04-20 00:37:11.815+00	f	\N	1	\N
161f3f0b-a4f1-40b0-bb7c-53a32cd869de	Julieta	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:37:16.108718+00	femenino	2009-11-21	Clase B	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Romero	2026-04-20 00:37:16.002+00	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/161f3f0b-a4f1-40b0-bb7c-53a32cd869de_1776381707534.jpg
11794a83-eb22-450c-8d83-908d16e4db39	Alejo	\N	\N	2026-04-12 18:23:16.057877+00	2026-04-12 18:23:16.057877+00	masculino	2026-09-05	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Alonzo	\N	f	\N	1	\N
c3cf8e29-3703-412e-a15b-6cd7256bb9cc	Martina	\N	\N	2026-04-01 20:55:34.027145+00	2026-05-01 01:11:46.96743+00	femenino	2011-12-24	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	González	2026-05-01 01:11:46.917+00	f	\N	1	\N
7f78487d-7953-44b3-9e99-3b2a13e5e139	maestro	\N	\N	2026-04-29 23:03:48.37751+00	2026-05-01 01:21:29.069239+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	miercoles	2026-05-01 01:18:09.955+00	f	408b5dd7-dd14-451b-acd9-fb59dd31b70a	1	\N
25fab843-eb18-4fda-bece-763f7a5e56db	niño	\N	\N	2026-04-14 22:02:22.944331+00	2026-05-01 01:17:45.701134+00	masculino	2026-04-14	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	3	2026-05-01 01:17:45.582+00	t	\N	1	\N
fa08c30f-7611-42a8-9563-91bc4f418b7d	niño	\N	\N	2026-03-23 22:20:36.49729+00	2026-05-01 01:17:34.995931+00	femenino	2021-04-16	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	2	2026-05-01 01:17:34.895+00	f	\N	1	\N
406dfecc-5630-46ff-8fac-6f7d3aa6b445	Isabella	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:37:20.91851+00	masculino	2017-04-04	clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	López	2026-04-20 00:37:20.799+00	f	\N	1	\N
83563422-9902-4209-9947-3a37925dd2c6	Victoria	\N	\N	2026-04-01 20:55:34.027145+00	2026-05-01 01:17:41.800111+00	masculino	2011-03-05	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	López	2026-05-01 01:17:41.708+00	f	\N	1	\N
8a1c6abb-7025-44a2-8c20-f336d65f2f81	pepe	\N	\N	2026-04-14 23:45:24.733783+00	2026-05-01 01:51:54.534601+00	masculino	2026-04-14	clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N		2026-05-01 01:51:54.477+00	t	\N	1	\N
7a9e6e85-d852-4533-9162-4d5271411cae	sdfsdf	\N	\N	2026-04-29 23:56:45.106758+00	2026-05-01 01:53:45.023751+00	masculino	\N	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	dfsdfsdf	2026-05-01 01:53:44.964+00	f	4533103d-c5f9-4e94-9cf7-216960a91c99	1	\N
56ccb2ae-693c-4628-ac56-9261f726b867	Mateo	\N	\N	2026-05-02 15:02:15.58074+00	2026-05-02 15:24:38.787468+00	masculino	2026-05-02	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Lotto	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/56ccb2ae-693c-4628-ac56-9261f726b867_1777735477896.jpg
9309bba3-1325-4878-b3d6-7e66f264a1d4	Mónica Emilse	1140383836	Mariotte 2857	2026-05-03 12:55:49.258142+00	2026-05-03 13:01:54.916941+00	femenino	1972-12-27	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	23068530	Ricci	\N	f	15df3ffc-1af7-44b6-b177-3892ed0f2a9c	1	\N
ade8c31d-8fa9-42f3-8f00-e181f1d4786d	Ejemplo Nombre	\N	\N	2026-05-03 20:04:38.701004+00	2026-05-03 20:06:24.30747+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ejemplo Apellido	2026-05-03 20:06:24.288+00	f	b5d51408-c4bd-4d02-833c-41e5f98a2bd3	1	\N
85d60eac-8bee-4ec4-9d82-b63c802eac76	Vanesa	\N	\N	2026-04-15 22:46:55.073413+00	2026-05-03 15:45:13.449776+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Quintana	\N	f	bed0e9ad-e533-4ef3-b8af-f17877beeb10	1	\N
ce8ac63c-1eac-45fc-b6fd-55626d6fc6b2	Renata	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:38:07.006864+00	masculino	2021-09-25	Clase C	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Rodríguez	2026-04-20 00:38:06.893+00	f	\N	1	\N
d2bbcdd2-7661-48d6-93ca-b0db10b5c1e4	Victoria	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:38:04.427012+00	masculino	2010-02-11	Clase D	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Sánchez	2026-04-20 00:38:04.319+00	f	\N	1	\N
8f593e9d-7f43-4186-8dd6-09cf3c79c573	Lucas	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:39:14.351175+00	femenino	2022-10-07	Clase B	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Romero	2026-04-20 00:39:14.223+00	f	\N	1	\N
bc616425-349c-497f-afd3-bdc6efdff9bc	Mateo	\N	\N	2026-04-01 20:55:34.027145+00	2026-04-20 00:38:14.042021+00	masculino	2012-10-05	Clase B	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Pérez	2026-04-20 00:38:13.928+00	f	\N	1	\N
0964316d-4362-4570-9122-2708793eb1ea	prueba	\N	\N	2026-04-24 00:52:22.221174+00	2026-04-24 01:08:09.21903+00	femenino	2005-04-24	pre-adolescentes	\N	2abb37f8-6fd6-4ab8-9d7e-16ee8e5ee843	123546	en vivo	\N	f	\N	999	\N
fc1cbdc1-2b37-4f51-861a-ff3084a32e8f	prueba	\N	\N	2026-04-20 02:05:16.287804+00	2026-04-26 19:03:50.828124+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	sisiis	2026-04-26 19:03:50.781+00	f	851a7724-2e08-4764-a7a6-c0ee547f3cd8	1	\N
1cb239a8-7361-4620-af27-d1bff83a1191	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:03:32.17629+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	diez	2026-04-26 19:03:32.122+00	f	e8c97813-c651-4da2-8128-84a0a111f57e	1	\N
ec739080-81b4-41f8-9617-48094b218733	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:11.94898+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	uno	2026-04-26 19:08:11.94898+00	f	24f2b6be-e503-49bc-b208-625980a6f527	1	\N
b8d00f31-2e89-4483-9c1e-740b0b592450	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	tres	2026-04-26 19:08:58.179361+00	f	a08d357b-dd56-4253-9668-e0dc9af6c0c2	1	\N
2260e662-fb62-4d96-8d34-560a6e9bceb3	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	dos	2026-04-26 19:08:58.179361+00	f	5fa41de8-c930-4e33-9666-6d13ccc4d9fe	1	\N
022636c0-5d88-4e9b-8302-b0ec7e3fb431	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	ocho	2026-04-26 19:08:58.179361+00	f	7463c9eb-5854-433d-9d3f-ccc78df43e9c	1	\N
073f3cd6-f63d-4c1a-84bd-c00b9b0afd09	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	siete	2026-04-26 19:08:58.179361+00	f	b777c534-3b8f-4ca1-81a0-7da8d055e956	1	\N
697d4c4c-65d4-424a-9195-8159d02ecc5b	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:08:58.179361+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	nueve	2026-04-26 19:08:58.179361+00	f	85245459-ceaf-4db3-a291-b46833e2cce9	1	\N
dda62718-79ab-4062-8687-606b65ee6479	Milagros	5491163774427	\N	2026-05-04 01:18:26.502784+00	2026-05-04 01:18:26.502784+00	femenino	2008-03-10	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	48585544	Fernandez	\N	f	4a3a9075-9222-44fc-a827-3548768eb9be	1	\N
4c6bbc6c-55db-436c-83be-34012ce99fb1	Santino	\N	\N	2026-04-18 18:58:50.732284+00	2026-04-19 23:17:02.22976+00	masculino	2013-02-27	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paz	\N	t	\N	1	\N
03f592c2-78c0-498c-ac2e-3a156fe9c43f	Yazmin	5491170968346	\N	2026-05-09 14:43:05.44651+00	2026-05-09 14:57:24.126248+00	femenino	2005-10-30	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	46895823	Cisneros	\N	f	992912c8-131b-4d6c-b858-671caf6e202b	1	\N
9aa2e195-4887-4689-9910-473f505bb01d	maestro	\N	\N	2026-04-15 23:27:18.455619+00	2026-04-20 01:28:42.924289+00	masculino	2009-04-16	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	15975345	alvear	2026-04-20 01:28:42.806+00	f	27abb99a-9147-42fe-b96b-25b475b736ac	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/9aa2e195-4887-4689-9910-473f505bb01d_1776383842924.jpg
b8ecd743-51a8-4a63-aba0-4af35af74343	master	\N	\N	2026-04-15 22:58:49.212965+00	2026-04-20 01:28:48.980056+00	masculino	1987-05-16	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	8888888	good	2026-04-20 01:28:48.881+00	f	359ffd42-bb00-493e-b312-7cc6aec4e434	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/b8ecd743-51a8-4a63-aba0-4af35af74343_1776383857322.jpg
b9fc91ca-126d-47fc-9f6b-5e1bd6a10acc	Agustina	\N	\N	2026-04-25 17:15:45.587496+00	2026-05-03 14:08:07.766738+00	femenino	2011-05-26	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paz	\N	t	\N	1	\N
213aaa16-77c8-478c-aede-aa3ddac8d1ac	prueba	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	mas	2026-04-20 00:39:00.177+00	f	eb6c9de5-e026-430c-bdc7-4e5bd1f9f0ef	1	\N
8f458802-2d13-429f-998e-c736ebfa8a4d	clase	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	D	2026-04-20 00:36:21.531+00	f	ec50b318-c559-4d65-9d2e-92af4f1a3cf0	1	\N
0f257d52-c627-4588-b660-3a50dac7e72d	Clase	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	b	2026-04-20 00:36:39.242+00	f	ff4ca1d9-5216-41f2-bc5a-195ee6c52b8a	1	\N
c352a289-49a4-40bd-9851-f4659aaef3a7	colaborador	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1	2026-04-20 00:36:34.293+00	f	f0285937-ef2b-4354-b31e-baceed00ac5c	1	\N
6c3c9cb2-e325-4d5e-995e-a93063ad5040	colaborados 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	2 	2026-04-20 00:37:23.797+00	f	c339aa16-49ff-4246-8e44-ce5a1cf9e27a	1	\N
b1392f76-9315-4b6d-a006-f3221590281a	maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1	2026-04-20 00:39:06.699+00	f	aae1d18f-f618-4b51-b137-06cb7643a993	1	\N
53dc14ea-f4d0-403a-ab52-aba8672ce4f8	maestro	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	2	2026-04-20 00:38:53.688+00	f	29ade132-ec7c-4338-9c89-edfe751de800	1	\N
df84b675-79cc-4a6e-b6e9-3df040f1d054	maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-21 23:37:24.517699+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	3	2026-04-20 00:38:26.208+00	f	a796cc20-3bb9-460a-8573-882e95268d6b	1	\N
1646d86d-a4bb-457c-ace3-2676d2f5008a	Sharon	\N	\N	2026-04-24 12:53:30.539789+00	2026-04-24 12:53:30.539789+00	femenino	2026-04-24	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	Ramos	\N	t	\N	1	\N
0a346b57-54b1-48b1-83fd-dd3d7271a278	Isaías 	541127697340	Las Landias 2006	2025-04-12 16:58:39.66291+00	2026-04-26 00:20:38.459875+00	masculino	2009-04-24	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49411340	Acuña	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/0a346b57-54b1-48b1-83fd-dd3d7271a278_1777162837992.jpg
eadd30e8-5451-4da4-8d52-1c301c190dee	Juan Sebastian 	\N	AV. San Martín 2371	2025-10-20 00:44:20.282538+00	2026-04-26 00:20:54.76104+00	masculino	2011-12-07	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Martinez	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/eadd30e8-5451-4da4-8d52-1c301c190dee_1777162854093.jpg
261e4a56-1e81-44c1-acae-1607d12da511	Luciana	541133414383	Lavalleja 3272	2025-04-12 16:58:42.221792+00	2026-04-26 00:21:54.04182+00	femenino	2011-05-13	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50146802	Maldonado	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/261e4a56-1e81-44c1-acae-1607d12da511_1777162913390.jpg
8e2e6863-60c1-40c1-bda2-d7f0daba2190	Luz	\N	\N	2026-04-18 18:47:52.564265+00	2026-04-18 18:47:52.564265+00	femenino	2013-05-02	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Paz	\N	t	\N	1	\N
d21b07e7-8045-4daa-a3a8-2abdac622250	Alma 	541171877299	perito moreno 5856	2025-04-12 16:58:34.564908+00	2026-04-26 00:17:22.186937+00	femenino	2012-12-16	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52979373	Ramos	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/d21b07e7-8045-4daa-a3a8-2abdac622250_1777162641091.jpg
a0037cdd-169d-43b8-ba72-afcdb6acb194	Agustina	\N	\N	2026-04-18 18:54:21.482947+00	2026-04-18 18:54:21.482947+00	femenino	2012-10-03	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Pereyra	\N	t	\N	1	\N
b7468e1c-f5db-4537-9bcf-39af5eb2f633	David		J.M.Gutierres 5221	2025-04-12 16:58:39.090087+00	2026-04-26 00:18:27.660374+00	masculino	2012-05-16	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52035074	Leguizamon	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/b7468e1c-f5db-4537-9bcf-39af5eb2f633_1777162707180.jpg
7834a4ce-6577-443f-8d78-922727bb1617	Melody	5491125345537	\N	2026-04-18 18:53:07.868091+00	2026-04-18 19:02:22.464032+00	femenino	2011-07-05	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Ponce	\N	t	\N	1	\N
2745d845-111e-41a2-b41e-d956af14708e	Nico	\N	\N	2026-04-18 19:03:29.380775+00	2026-04-25 15:55:16.139673+00	masculino	\N	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	\N	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/2745d845-111e-41a2-b41e-d956af14708e_1777132515480.jpg
ded569fe-bcca-4fbe-96ed-718621c902d7	Luisana	\N	\N	2026-04-18 18:57:43.378756+00	2026-04-25 15:59:30.023328+00	femenino	2026-07-15	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N		\N	t	\N	1	\N
5f64d2a2-07c1-46c6-99ad-3f8dc0dc7e10	Delfina 	5491171208064	Alexis carrera 3050	2025-04-12 21:38:27.609787+00	2026-04-26 00:19:24.158505+00	femenino	2011-12-31	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52.010.107	Sarlinga	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/5f64d2a2-07c1-46c6-99ad-3f8dc0dc7e10_1777162763686.jpg
a20dddff-cacb-4a65-befc-07db9dadd458	Nahiara	\N	\N	2026-04-18 19:00:49.620413+00	2026-04-25 16:00:22.253285+00	femenino	2012-04-04	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Cordoba	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/a20dddff-cacb-4a65-befc-07db9dadd458_1777132821191.jpg
847bf7d7-1402-4826-8c3b-c966bd387666	Marisol	541127346374	Dardo Rocha s/n	2025-04-12 16:58:42.764648+00	2026-04-26 00:22:49.042286+00	femenino	2008-06-23	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	48833991	Gamarra	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/847bf7d7-1402-4826-8c3b-c966bd387666_1777162968380.jpg
64da6313-74b7-461b-852c-69d4f01c2377	Maite	5491160444305	\N	2026-04-18 18:46:53.00774+00	2026-04-25 17:12:02.086573+00	femenino	2013-05-12	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Ramirez	2026-04-25 17:12:01.949+00	t	\N	1	\N
5c54428d-0c37-482b-8cfb-9518ac5b9f5e	Paulo	1122611077	Petcovic 4974	2025-04-21 17:19:44.777258+00	2026-04-26 00:23:41.317411+00	masculino	2012-02-18	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52438780	aly valdez	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/5c54428d-0c37-482b-8cfb-9518ac5b9f5e_1777163020297.jpg
fc20f8f4-f387-4e5e-919c-cfc8103cf7b9	Brenda	\N	\N	2026-04-18 18:55:34.094961+00	2026-04-25 15:58:52.75251+00	femenino	2012-09-28	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N		\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/fc20f8f4-f387-4e5e-919c-cfc8103cf7b9_1777132731994.jpg
ff65c65f-b081-4ebd-a9c0-f4af7625eaab	Maestro 	\N	\N	2026-04-15 22:46:55.073413+00	2026-04-26 19:03:27.244638+00	masculino	\N	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	cuatro	2026-04-26 19:03:27.185+00	f	ab4843d6-5a32-4d32-89bf-edac775c3488	1	\N
3403840f-0771-4541-bcdf-b235dba661fd	maestro	\N	\N	2026-04-15 23:31:04.354212+00	2026-04-26 19:08:58.179361+00	femenino	2005-04-17	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	88552233	nogues	2026-04-26 19:08:58.179361+00	f	f791158e-0357-48ed-bc7f-cb8ed62dd40a	1	\N
22f1f8ea-3137-42b4-891e-b4034550ad40	Nadir	\N	\N	2026-04-18 18:44:13.370956+00	2026-04-25 15:54:30.642332+00	masculino	2012-07-05	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Medina	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/22f1f8ea-3137-42b4-891e-b4034550ad40_1777132469584.jpg
6e2f40dd-59c2-4aec-afe3-3152a6532af3	Santino	5491165035454	Godoy cruz 5724 villa mayo	2026-03-21 21:43:52.038229+00	2026-04-26 00:23:55.78309+00	masculino	2010-08-25	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Alonso	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/6e2f40dd-59c2-4aec-afe3-3152a6532af3_1777163035283.jpg
b799b726-f5f8-4d49-aa79-b93ad008e35e	Julieta	5491124764614	Godoy cruz 5724 villa mayo	2026-03-21 21:42:49.67678+00	2026-04-26 00:24:23.194964+00	femenino	2013-07-01	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	53723353	Alonso	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/b799b726-f5f8-4d49-aa79-b93ad008e35e_1777163062186.jpg
1813138d-2041-409f-a6a6-dab4e27a24d7	Trinidad	541166402841	Asuncion 4137	2025-04-12 16:58:41.249567+00	2026-04-26 00:25:05.037055+00	femenino	2009-04-16	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49511308	Martinez	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/1813138d-2041-409f-a6a6-dab4e27a24d7_1777163103986.jpg
124cbe07-7a06-470a-9edc-a9bef2dd0d48	Juliana	1164770058	\N	2026-05-10 13:43:12.216225+00	2026-05-10 13:55:58.334583+00	femenino	\N	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Perez	\N	f	5d9babed-7a63-43b1-9f51-ab185cdee785	1	\N
6f53ea70-2328-4965-9394-9f9be36a12bf	Benjamin	1126334932	\N	2026-05-10 00:18:56.730977+00	2026-05-10 00:29:05.987961+00	masculino	2006-05-19	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	47280181	Martínez 	\N	f	65afd1ff-0a4d-4a9e-866e-3e23adb7ed18	1	\N
b9dd6abf-98a6-436e-9251-404441a68ddf	Paola	\N	\N	2026-05-09 15:02:01.31721+00	2026-05-11 13:15:04.794403+00	femenino	1981-03-17	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	28587936	Ñazzo	\N	f	2b2aba55-97f4-4290-b4c2-e6fb2c1aacff	1	\N
9248740d-8114-4c14-b169-73d914e986fb	Juliana	\N	\N	2026-05-09 21:15:29.009375+00	2026-05-09 23:18:36.606267+00	femenino	1971-04-23	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	21972998	Rasgido	\N	f	ce65168d-9d75-4e46-907a-c401bf03c9b3	1	\N
e6e6b227-73b9-4e97-9955-110dc4a39dcc	Mirta Graciela	\N	\N	2026-05-04 01:22:06.157221+00	2026-05-09 15:54:58.846698+00	femenino	1967-08-18	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	18365069	Orellana	\N	f	11dd3f2d-2a30-4093-8c42-bb11e0946b34	1	\N
c176bdcd-2999-467c-ace0-c6a2c1e80c3c	Marcos	\N	\N	2026-05-04 01:27:25.647694+00	2026-05-04 01:27:27.773161+00	masculino	2002-11-01	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	44889188	Fernandez	\N	f	c47782e0-f0f2-45fc-8a0a-24e38cac631f	1	\N
49d03af0-ca97-49c1-a020-c26787591b07	aasasd	\N	\N	2026-05-01 01:35:02.702126+00	2026-05-01 01:51:33.513014+00	femenino	1987-11-13	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	33516585	asdasd	2026-05-01 01:51:33.462+00	f	6454bed2-43d4-4c06-a77b-808accc8639d	1	\N
46a69d8f-4eb8-4b2c-b6f8-f7ec1b55d2aa	aasasd	\N	\N	2026-05-01 01:35:04.010916+00	2026-05-01 01:51:37.472796+00	femenino	1987-11-13	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	33516585	asdasd	2026-05-01 01:51:37.389+00	f	bab035af-9933-4a54-8f2c-4c9366011841	1	\N
2711f19b-4ba3-4b8f-9c2b-d68dd2efb038	asdasd	\N	\N	2026-05-01 01:39:35.824811+00	2026-05-01 01:51:41.080334+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	25858	asdad	2026-05-01 01:51:41.02+00	f	d37a3757-ad75-4e56-b084-2b564fded25c	1	\N
a1ac9ad8-9bc9-45df-a887-45560d1ee42e	Walter Alejandro	\N	\N	2026-05-01 01:37:32.479043+00	2026-05-01 01:51:51.212394+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	33516585	Morales	2026-05-01 01:51:51.157+00	f	817a7856-cd3b-4e15-ae07-9b2155e25118	1	\N
6325ab2c-a253-4cd3-8182-5305b308980d	Aylen	\N	\N	2026-04-29 23:45:11.244193+00	2026-05-01 01:53:08.562734+00	femenino	2026-04-29	clase A	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Cañete	2026-05-01 01:53:08.467+00	t	\N	1	\N
b5a5299a-eb17-4d45-86f0-bf0a8bde0b32	Brisa	\N	\N	2026-05-04 01:24:54.560299+00	2026-05-04 01:34:23.287388+00	femenino	2007-01-26	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	47864944	Cisneros	\N	f	fc92baf5-18cf-4d49-9c31-a807d7b545bf	1	\N
b5b68d49-1566-414c-af85-99c00bbebc59	Claudia Beatriz 	\N	\N	2026-05-03 13:16:09.494556+00	2026-05-03 13:16:09.99779+00	femenino	1964-09-16	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	16977070	Borda	\N	f	f54697b6-4c4b-49f8-827d-a3b6f1108515	1	\N
5c29d5ba-1073-4114-8921-a6975fc3bfd1	Valentino	\N	\N	2026-05-02 14:53:44.89932+00	2026-05-03 14:06:19.852041+00	masculino	2011-03-15	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Servin	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/5c29d5ba-1073-4114-8921-a6975fc3bfd1_1777735562498.jpg
4885d048-9314-4635-82fa-7648af80c2c3	BIANCA	5491132562327	PASAJE SAN FELIPE 2771, EL TALAR	2026-05-09 23:44:51.530008+00	2026-05-09 23:44:51.530008+00	femenino	2014-10-11	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	54302490	REINOZO	\N	f	\N	1	\N
c01000a0-e2ca-4462-aefd-6aa3a946d871	JOEL	\N	ALEXIS CARREL 3023, EL TALAR	2026-05-09 23:51:27.983197+00	2026-05-09 23:51:27.983197+00	masculino	2014-06-07	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	CISTERNA	\N	f	\N	1	\N
d90532f5-8ae4-4917-8f32-8cca738f503d	Ejemplo Nombre	\N	\N	2026-05-03 20:06:59.537097+00	2026-05-03 20:12:06.162+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ejemplo Apellido	2026-05-03 20:12:06.143+00	f	5e4adceb-5a33-4237-8147-80b01d8f0fca	1	\N
2e46b091-fae7-4adb-888c-b3139fdef97f	MELINA NAYLA	\N	\N	2026-05-09 21:15:28.867181+00	2026-05-10 00:42:47.482457+00	femenino	2004-02-16	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	45930027	Gonzales	\N	f	7434cc53-62cb-47cb-b0a5-0688ead6d2e0	1	\N
a93f3f77-ae1a-431a-b10d-09ca0a20c4ff	Monica	01157675457	\N	2026-05-10 13:32:30.061423+00	2026-05-12 22:49:25.538099+00	femenino	1968-01-15	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	20068618	Martinez	\N	f	99abbbad-28ec-47e3-b3e7-9045b18c9a5b	1	\N
45e92fa2-bc83-492b-9f8d-ffbae145351c	ELIEL	\N	\N	2026-05-10 17:45:41.416752+00	2026-05-11 23:04:02.440042+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	MOREIRA	\N	f	\N	1	\N
5178dfd6-47dc-407d-8143-cce447ab267b	Mariel Andrea 	1131138818	Libertad 3273, El Talar	2026-05-09 20:36:29.380219+00	2026-05-10 16:17:37.11052+00	femenino	1990-02-08	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	35799020	Aravena	\N	f	f6e1eddd-71c1-4da4-96b5-4c393421bb28	1	\N
292aa01e-a532-4d21-82cd-221be6349cdb	LILIANA ESTER	1161221268	Av. Del Libertador General San Martín	2026-05-09 20:36:29.413368+00	2026-05-10 16:00:24.571246+00	femenino	1972-03-16	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	22689132	MARTINEZ	\N	f	06a03a27-c113-4d70-9cdb-16abf952a176	1	\N
8fd0fb88-ea2f-4129-837d-c4a46bd8ffea	Santino	5491165035454	Godoy cruz 5724 villa mayo	2026-05-10 12:30:03.112064+00	2026-05-10 13:58:11.302032+00	masculino	2010-08-25	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Alonso	\N	f	a35c7a5a-d936-4a12-b1d6-e83d6935d1dd	1	\N
40b41fa9-bc93-4f12-99ba-e2f0c06f8ba2	Nahuel	5491165584422	Sanchez de logia 5651	2026-05-10 13:26:30.594824+00	2026-05-10 13:59:37.355801+00	masculino	2004-08-25	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	46119470	Cañete	\N	f	81aab4d9-d5da-4feb-8fc8-5895bb70eff5	1	\N
4bf6b81b-c07c-46ed-8402-dffd1b7129de	Alexis	1132370207	perito moreno 5886	2026-05-10 12:30:42.882417+00	2026-05-10 14:02:55.507479+00	masculino	2003-02-06	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	44610291	Oviedo	\N	f	a7b5e737-fc66-45c2-9fad-044e69357056	1	\N
65dc114c-26a8-4791-9550-a54359cba05c	morena	1169710416	Perito Moreno 5425	2026-05-10 13:11:52.222754+00	2026-05-10 13:55:58.331665+00	femenino	2011-01-21	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Rosales	\N	f	e4b7f1fe-6608-490f-9317-46584d4292f4	1	\N
9d08fcd1-18f8-42c4-8da5-46feb9ea4efe	Fabrizio Ezequiel	5491127894242	Sucre 891	2026-05-10 13:12:24.546378+00	2026-05-10 13:55:58.347228+00	masculino	2009-05-25	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	49592617	Brollo	\N	f	a593f367-fd37-45b0-bda5-ceb13d8d1007	1	\N
75baa7dd-3731-4b63-ad4a-a2e797abffb9	ABEL	\N	\N	2026-05-10 17:46:00.503197+00	2026-05-10 17:58:36.017259+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ALVAREZ	2026-05-10 17:58:35.901+00	t	\N	1	\N
2805c2a5-4998-4270-93d0-8c5f9be1f1fd	Isaías 	541127697340	Las Landias 2006	2026-05-10 12:29:05.183159+00	2026-05-10 18:49:32.229753+00	masculino	2009-04-24	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	49411340	Acuña	\N	f	190092e1-d7fd-4665-9929-c22206a2347d	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/0a346b57-54b1-48b1-83fd-dd3d7271a278_1777162837992.jpg
244ea0d0-20b8-46c2-9fb9-3203861f7cd2	Yesica	5491160993586	Libertad 2848	2026-05-10 17:02:49.304667+00	2026-05-11 23:07:16.067988+00	femenino	2013-02-19	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	52996677	Barros	\N	f	\N	1	\N
933ee5bf-30ec-426b-a106-a761dd259b0d	NEHUEN	\N	\N	2026-05-10 17:47:42.12811+00	2026-05-11 23:07:22.697394+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	RAMIREZ	\N	f	\N	1	\N
71176ee9-85d0-4802-be96-ae141a92488f	MICAELA	5491122458842	Libertad 2848 (PASILLO AL FONDO)	2026-05-10 18:28:08.205976+00	2026-05-11 23:07:25.90875+00	femenino	2010-11-05	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	MEYER	\N	f	\N	1	\N
3e5c7064-ce08-41da-ad09-43eabc64d275	JUAN JOSE	\N	\N	2026-05-10 17:44:50.889339+00	2026-05-11 23:07:38.050552+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	MARTINEZ	\N	f	\N	1	\N
370483f2-e4b8-4dc1-847a-470d59f25844	IAN	\N	\N	2026-05-10 17:47:04.811122+00	2026-05-11 23:07:43.600123+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	MANTARAS	\N	f	\N	1	\N
ed4bf229-375d-4ac3-8405-b0f4cd4838cb	BLANCA	\N	\N	2026-05-10 18:21:16.478524+00	2026-05-11 23:07:44.874205+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	VALLEJOS	\N	f	\N	1	\N
c8320396-3770-4221-beaa-7ddfff073293	Fernanda Isabel 	1123896467	General Pacheco 3213, El Talar, Tigre. Bs As	2026-05-09 20:36:29.381322+00	2026-05-12 00:38:11.599991+00	femenino	1987-10-21	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	33379490	Dieser 	\N	f	f30a99f7-222e-4835-87eb-474e4001f6c2	1	\N
2df9b173-019f-4da0-928e-b274fbe23a74	Sebastian	541126511059	Lavalleja 3252	2025-04-12 16:58:43.699354+00	2026-04-26 00:24:41.489828+00	masculino	2012-01-08	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52010767	Serrano	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/2df9b173-019f-4da0-928e-b274fbe23a74_1777163081006.jpg
829526d9-7370-4f36-b566-fb65ed2316de	Santiago Emanuel	5491126066518	Hernan Cortez 284	2025-09-06 21:34:58.478479+00	2026-04-26 00:25:56.483919+00	masculino	2012-03-30	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52402650	Avila	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/829526d9-7370-4f36-b566-fb65ed2316de_1777163155981.jpg
f9b90693-18b3-4f73-a43b-e832f22432c2	Agustina Luz	5491123984494	Las Violetas 2039	2026-04-20 22:23:24.471502+00	2026-05-05 16:51:23.689584+00	femenino	2011-11-29	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50846091	Lazarte	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/f9b90693-18b3-4f73-a43b-e832f22432c2_1777163241282.jpg
e8890894-3eac-438b-912b-f097e99fc196	asdasd	\N	\N	2026-05-01 01:41:18.458908+00	2026-05-01 01:51:45.398596+00	masculino	\N	Obreros	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	34538216	ddddddd	2026-05-01 01:51:45.346+00	f	95bc3a6d-13ac-463b-9773-5e672aebd75a	1	\N
b7e44f73-1f36-483d-ad29-d1479369169a	Denisse	\N	\N	2026-04-29 23:45:47.612753+00	2026-05-01 01:53:12.254388+00	femenino	2026-04-29	clase A	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Ramos	2026-05-01 01:53:12.165+00	t	\N	1	\N
95c3560d-a06a-437f-95b8-ae5c4e07ea57	Yoel	\N	\N	2026-05-02 14:53:20.195668+00	2026-05-03 14:05:10.572625+00	masculino	2010-03-09	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Servin	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/95c3560d-a06a-437f-95b8-ae5c4e07ea57_1777735578507.jpg
d882df65-f3cf-4032-9b1b-109a80be3f7c	Samuel	\N	\N	2026-04-18 19:05:12.154633+00	2026-05-03 14:20:50.909745+00	masculino	2002-01-30	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Benitez	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/d882df65-f3cf-4032-9b1b-109a80be3f7c_1777734321605.jpg
32f9126b-7932-4a17-a096-be524fbfda8d	Alejandro	\N	\N	2025-08-17 02:54:46.869086+00	2026-05-05 17:02:02.844806+00	masculino	2012-10-15	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	52781746	Nuñez	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/32f9126b-7932-4a17-a096-be524fbfda8d_1778000522329.jpg
99e192a3-d0a8-4124-b46d-0c909f3d9c02	Valentina	5491165786101	\N	2026-05-09 15:04:50.403409+00	2026-05-09 15:04:50.403409+00	femenino	2009-10-23	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	49890226	Gonzalez	\N	f	f551ddb6-d54a-4a38-b437-6553440cb086	1	\N
27dcb090-e104-4771-8777-178557ef95c1	Laura	1133611105	CALLE 6 Nº69, BARRIO CUYO 1, GARIN	2026-04-20 00:26:16.971575+00	2026-05-10 15:23:01.873081+00	femenino	1992-01-13	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	12345678	Cataldi	\N	f	4a74a357-4105-4543-8c74-97b89cd67a59	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/27dcb090-e104-4771-8777-178557ef95c1_1778359480512.jpg
75b253ca-8452-419d-891f-005ca9c98c02	Paula Jimena 	1154698042	El Salvador 520	2026-05-09 20:36:29.403324+00	2026-05-10 15:18:44.439794+00	femenino	1982-04-28	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	29489121	Salvatierra 	\N	f	dfa30110-f0ed-45d7-a0fb-c935c82ee338	1	\N
cedc09ba-80a9-4637-ae8a-d003b9d80349	Agustina 	1139356944	Morse 352	2026-05-10 12:38:46.343486+00	2026-05-10 13:57:09.282609+00	femenino	2005-02-02	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	46556140	Rueda	\N	f	a75a4372-3479-4464-95f2-6d77682a2dc3	1	\N
2d25a8d8-20ca-47aa-9484-ff967e04e2e4	OLIVIA	\N	EL SALVADOR 520, EL TALAR	2026-05-09 23:46:25.518015+00	2026-05-09 23:46:25.518015+00	femenino	2014-10-15	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ARIAZ	\N	f	\N	1	\N
6488ed55-03f4-4163-9880-8267fc4a13c4	Ambar	5491134565194	\N	2026-05-10 13:14:08.89833+00	2026-05-10 13:57:09.304932+00	femenino	2008-09-19	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	49007294	Cañete	\N	f	19e4eaf9-0d7a-4ea1-9cc3-522b2a051ae2	1	\N
ab56600c-84a6-4350-897f-f3ceb6041c63	ADRIAN	\N	NICARAGUA 125, EL TALAR	2026-05-09 23:50:26.710198+00	2026-05-09 23:50:26.710198+00	masculino	2014-11-26	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ALTAMIRANO	\N	f	\N	1	\N
788bd782-b409-45bd-937f-8b238c1926c7	Ejemplo Nombre	\N	\N	2026-05-03 20:12:15.396035+00	2026-05-10 18:49:32.229753+00	masculino	2000-01-01	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	12345678	Ejemplo Apellido	2026-05-03 20:37:48.833+00	f	63ba16d4-ef59-46e6-974a-c21d8fa810a1	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/27dcb090-e104-4771-8777-178557ef95c1_1778359480512.jpg
d929c5c2-416f-4db2-9e12-42ead80a1748	DAVID	\N	\N	2026-05-09 23:52:08.675522+00	2026-05-09 23:52:08.675522+00	masculino	2014-07-18	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	BENITEZ	\N	f	\N	1	\N
ff958198-94a4-493d-b8e6-675e6572286f	Natalia	5491168321383	\N	2026-04-15 22:35:00.643675+00	2026-05-10 19:10:13.668623+00	femenino	1980-10-16	\N	Escuelita Central	b3884c4d-1428-4ee7-97f2-4389d8664a6d	28346694	Maldonado	2026-04-20 00:38:47.377+00	f	264df003-f88f-49d9-9f4f-826697dcbb3d	1	\N
1cb017c2-f63e-474f-a279-cc2fcc2ac87a	Bautista	\N	\N	2026-05-10 15:21:06.770836+00	2026-05-10 15:21:06.770836+00	masculino	2026-05-10	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N		\N	t	\N	1	\N
45cda1e9-a109-42fe-9a28-aa2ba342bf17	DAVID JOEL	\N	\N	2026-05-09 21:15:28.9531+00	2026-05-10 18:49:32.229753+00	masculino	2012-05-16	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	52035074	Leguizamon	\N	f	8c544c24-d7bd-4589-bb51-63b97cc7f64d	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/b7468e1c-f5db-4537-9bcf-39af5eb2f633_1777162707180.jpg
654f1c29-feaf-4002-bf2d-d6c32b06e1e0	Juana	\N	\N	2026-05-09 21:15:28.888391+00	2026-05-10 00:42:47.55521+00	femenino	2010-02-27	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	50134829	Arias	\N	f	5ea70a4f-ffa5-4a12-8bec-dbd5b4427c3d	1	\N
ee318c4c-6162-4b50-81a5-0972e6801c1e	Ciro	\N	\N	2026-05-10 20:26:35.347205+00	2026-05-10 20:26:35.347205+00	masculino	2014-01-04	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Medina	\N	f	\N	1	\N
01e272b6-e7ba-45fe-9abd-6ec848fd1718	Benjamin	1126334932	\N	2026-05-10 00:31:32.186393+00	2026-05-10 01:29:59.465533+00	masculino	2006-05-19	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	47280181	Martínez 	2026-05-10 01:29:59.452+00	f	1d5f965a-a937-4fb3-a728-eb9e832bca35	1	\N
329450e9-23e0-4485-8950-1aadb0da668a	Aaron	\N	\N	2026-04-18 19:04:14.372137+00	2026-05-10 02:04:10.129857+00	masculino	2011-08-13	nogues	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Diaz	\N	t	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/329450e9-23e0-4485-8950-1aadb0da668a_1778378648907.jpg
a89e1e0e-8054-45ce-955c-35952c2f3e6c	Karina	1162512036	\N	2026-05-10 13:16:28.39829+00	2026-05-10 13:58:11.29948+00	femenino	1977-05-21	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Herrera	\N	f	c627bcc7-f092-43d3-b205-18d966da2555	1	\N
58a68af2-184b-4775-b52a-de57c2b41ef9	Estefania	2955595155	Savio 827	2026-05-10 13:27:45.287052+00	2026-05-10 13:59:37.324493+00	femenino	1993-09-04	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Cerezo	\N	f	e267a6b3-3e2d-42bf-a13e-9fbc896b69db	1	\N
b5cfbf27-2b80-408a-8e35-4aacd73e1b8d	Felipe Ruben	1133404248	Libertad 2964	2026-05-10 13:36:29.051673+00	2026-05-10 14:02:55.466334+00	masculino	1969-08-20	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	20887715	Mercado	\N	f	5b521738-b310-4133-9d1d-0a0e03bad01a	1	\N
1962e2da-096c-4e98-942c-0b452f80a164	Antonia	1157693954	Sanchez de loria 5531	2026-05-10 13:34:41.49138+00	2026-05-10 14:02:55.507766+00	femenino	1959-05-10	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Espindola	\N	f	de70b336-33bb-46c8-91dc-59bf6810b22b	1	\N
ec93e385-c4aa-44a9-bf7f-cd08a8057301	Francisco Andres	\N	\N	2026-05-09 21:15:28.865872+00	2026-05-10 18:49:32.229753+00	masculino	2011-08-15	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	50785849	Cataldi	\N	f	f6dff42b-1e8c-4154-aef2-7ae23213020c	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/d90579f6-b46b-4ff0-836a-47fee45431cf_1777162250590.jpg
ae804704-efc5-468b-bf0b-40eb0563aafa	Trinidad	541166402841	Asuncion 4137	2026-05-09 22:54:33.673205+00	2026-05-10 18:49:32.229753+00	femenino	2009-04-16	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	49511308	Martinez	\N	f	f7271004-bad2-4549-a688-d7b7c6bd1724	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/1813138d-2041-409f-a6a6-dab4e27a24d7_1777163103986.jpg
4f3c7bbd-ff89-460e-bcef-76c3dd151833	Xiomara	\N	\N	2026-05-10 20:30:17.984538+00	2026-05-10 20:30:17.984538+00	femenino	2014-07-06	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Sanchez	\N	f	\N	1	\N
102f2287-af96-4b5f-b46d-2c00b0ed39aa	Demian	\N	\N	2026-05-10 20:32:38.729323+00	2026-05-10 20:35:53.147124+00	masculino	2026-05-10	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Lopez	\N	t	\N	1	\N
71c20e0b-88c8-4157-bb4b-a8fee57b4103	BAUTISTA	5491130194790	\N	2026-05-10 17:46:41.655595+00	2026-05-11 23:03:45.621729+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	LOPEZ	\N	f	\N	1	\N
4046726f-2850-411f-89c6-7d8c27a602e6	THIAGO	\N	\N	2026-05-10 18:21:41.769716+00	2026-05-11 23:07:17.76677+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	RODRIGUEZ	\N	f	\N	1	\N
45097f25-253a-462a-bd51-14a8fa9ede73	Mar	\N	\N	2026-05-10 17:42:19.079121+00	2026-05-11 23:07:30.155187+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Agguirre	\N	f	\N	1	\N
ecd31140-8b2b-4394-8605-651c8b7f0ef2	Facundo	541131245531	Pelagio Luna 2962	2025-04-12 16:58:46.618285+00	2026-04-26 00:28:06.611458+00	masculino	2010-06-14	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	30356165	Nuñez	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/ecd31140-8b2b-4394-8605-651c8b7f0ef2_1777163285482.jpg
9472361f-2d76-410c-9722-45280184d07d	Mateo	541122343116	Colpayo 2531	2025-04-12 16:58:37.984182+00	2026-05-05 18:19:11.10213+00	masculino	2010-04-12	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	50229778	Landriel	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/9472361f-2d76-410c-9722-45280184d07d_1778005150432.jpg
96c844c4-a555-4cdf-9dc8-5a605d69669e	Carla	5491132739205	Lavalleja	2026-04-29 23:44:30.786855+00	2026-05-01 01:54:00.428531+00	femenino	2005-11-19	\N	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	47084074	Maldonado	2026-05-01 01:54:00.37+00	t	\N	1	\N
8c119619-c9de-4ae7-8c0b-953a670ea9f6	Monica	\N	\N	2026-04-29 23:46:32.646011+00	2026-05-01 01:54:08.931995+00	femenino	2026-04-29	clase B	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Villagra	2026-05-01 01:54:08.863+00	t	\N	1	\N
8e1bfffa-d760-4bd9-b059-e868422494fb	Daniel	\N	\N	2026-05-03 02:54:33.413674+00	2026-05-03 02:54:33.413674+00	masculino	2026-05-02	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N		\N	t	\N	1	\N
62a324d2-ea33-4d9d-b1cd-7bcade80c9be	Agustin	5491161080100	Molieron 984	2026-05-09 22:49:09.013885+00	2026-05-09 22:49:09.399997+00	masculino	2003-03-12	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	44838590	Clementi	\N	f	a86ffe9b-fd29-4e5d-ac0d-3df2f93d5c3a	1	\N
35403de0-efb0-4c6a-875e-208c4da9b922	Carolina	\N	\N	2026-05-09 20:44:39.327317+00	2026-05-09 23:19:53.884885+00	femenino	1981-12-01	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	29531360	Giangrandi	\N	f	49e0ecbb-ff93-42ea-9cd5-d6db4e858522	1	\N
ce2e190b-9c94-4d21-8210-bab70f399de7	Lola	\N	\N	2026-05-10 17:43:24.316765+00	2026-05-11 23:07:32.780879+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Araujo	\N	f	\N	1	\N
8ae2748a-23b3-48f9-93d8-425ce9cfaba5	probar 	\N	\N	2026-05-09 15:20:51.64437+00	2026-05-09 15:21:59.564102+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	colab	2026-05-09 15:21:59.553+00	f	a46526e3-2815-4aa0-872a-848fcf2c554f	1	\N
701c3a56-176a-4216-b7a1-6d83f19f2280	Rocío Belén	\N	\N	2026-05-09 21:15:28.90056+00	2026-05-09 23:23:26.174667+00	femenino	2006-08-22	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	47481306	Leiva	\N	f	86c0b117-d0df-40d7-83b2-164f658d8264	1	\N
a705314d-eec3-4971-b33c-62420cf240f4	Debora	5491159343524	\N	2026-05-10 12:21:36.968186+00	2026-05-10 18:00:59.066077+00	femenino	2002-06-17	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	45203717	Maturano	\N	f	870d37cf-27ef-4f34-b3c8-30c66905642f	1	\N
6b2675ac-1f2b-479c-9618-0b27c0313275	Delfina Ailen	5491126143978	Bélgica 261, El Talar, Tigre	2026-05-10 20:06:33.300771+00	2026-05-10 20:06:33.300771+00	femenino	2013-08-17	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53456356	Alfonso Barros	\N	f	\N	1	\N
c7a4fbb6-15d2-4e58-a534-0e995e501328	prueba	\N	\N	2026-05-03 19:31:24.831111+00	2026-05-03 20:37:55.978015+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	11122422	nuevo	2026-05-03 20:37:55.956+00	f	7b62c023-562e-412c-a72f-91245373d17f	1	\N
fee91568-d412-4129-ae2d-30f6d14105aa	Valentina	5491125420005	Pasaje San Javier 522, El Talar, Tigre	2026-05-10 20:12:36.688551+00	2026-05-10 20:12:36.688551+00	femenino	2014-03-04	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53818979	Dolce Reyna	\N	f	\N	1	\N
cbe1a3ad-b826-4b87-9d34-824a901fd8bb	Claudio Gabriel	\N	\N	2026-05-09 21:33:03.0754+00	2026-05-09 21:33:03.541821+00	masculino	1974-02-18	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	23884421	Ariaz	\N	f	260c7340-a7d7-407b-922e-6db07ef5462e	1	\N
1bcad167-2d42-457f-86fe-1dbd01db0dab	Giuliana	5491132595299	Bélgica 587	2026-05-10 13:29:23.755727+00	2026-05-10 14:01:22.901652+00	femenino	2004-12-26	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	46279134	Lopez	\N	f	5aa4ba5b-9d7c-4079-a0d1-3031295c308b	1	\N
8e7fb1a8-20fe-425f-a33f-d9b1c89438b2	Fabiana 	\N	\N	2026-05-09 21:34:24.417038+00	2026-05-09 21:34:25.190918+00	femenino	1969-12-15	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	21453509	Gonzalez	\N	f	846b83c8-5933-4b87-a81c-32fedc63b915	1	\N
8826d503-c7d8-46de-a8d0-28779045e525	Rosa	1130379468	Las calas 2134	2026-05-10 13:28:59.273021+00	2026-05-10 14:01:22.908448+00	femenino	1956-10-23	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Gomez	\N	f	79004d79-c68a-4921-8cd1-9189fee987cf	1	\N
a405d72e-da9b-42ff-bf3d-6e47c6828310	FELIPE	\N	SAN MARTIN 2371, EL TALAR	2026-05-09 23:47:28.988221+00	2026-05-09 23:47:28.988221+00	masculino	2014-10-22	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	54362127	MARTINEZ	\N	f	\N	1	\N
2b38e616-366b-43a6-995f-a176be8b737a	Lucía Luisa Elena	\N	\N	2026-05-09 21:35:43.954416+00	2026-05-09 21:35:44.417122+00	femenino	1956-02-22	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	11864605	Martincich	\N	f	822ef0dc-1b73-4b86-af39-e3257de7ac9e	1	\N
16b44451-cf40-4313-b579-868079f829b2	ROMAN	5491137900404	MANUEL DE FALLA 3197, EL TALAR	2026-05-09 23:49:33.360866+00	2026-05-09 23:49:33.360866+00	masculino	2014-09-20	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	54270343	CAÑETE	\N	f	\N	1	\N
d713bf62-9010-44b5-84ab-5ac9ce8a12eb	juan manuel	\N	\N	2026-05-10 13:37:37.689414+00	2026-05-10 14:02:55.71043+00	masculino	1988-10-31	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Robein	\N	f	79642ba2-c7de-406a-8853-c7bc1484f458	1	\N
af3ff990-ea0c-4cfa-94fa-4d9585cea2b6	Jonathan	5491136699532	Nicaragua 194, El Talar, Tigre	2026-05-10 20:14:54.240704+00	2026-05-10 20:14:54.240704+00	masculino	2013-10-21	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53516333	Gonzalez	\N	f	\N	1	\N
bb0be4e6-dcd1-4a23-8e11-f6afcc95cbf2	MIQUEAS	\N	\N	2026-05-09 23:52:38.82901+00	2026-05-09 23:52:38.82901+00	masculino	2026-05-09	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	GOMEZ	\N	t	\N	1	\N
b3b10838-1532-4f3b-8880-42ed5a144690	Delfina 	5491171208064	Alexis carrera 3050	2026-05-09 22:48:04.509374+00	2026-05-09 22:48:05.009115+00	femenino	2011-12-31	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	52010107	Sarlinga	\N	f	9fd9850d-fbb0-4aaa-ac0c-11759817073e	1	\N
4008cc38-69fa-45ff-b8d0-733c5f37e501	MATEO JOEL	\N	\N	2026-05-09 23:53:16.828767+00	2026-05-09 23:53:16.828767+00	masculino	2026-05-09	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	RAGIDO	\N	t	\N	1	\N
a754518c-02a5-4f5a-b3c1-8bea76132995	Pamela	1140366094	\N	2026-05-09 20:36:29.421152+00	2026-05-10 19:05:22.18672+00	femenino	1970-12-08	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	92463864	Vega Corrales 	\N	f	123fa2bf-9686-40b8-9383-1e633ad755bd	1	\N
82d8b294-8ddd-48a9-8eac-1b5219dd6c4f	Federico	\N	\N	2026-05-10 15:48:00.722647+00	2026-05-10 15:48:00.722647+00	masculino	2013-10-19	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53514456	Garcia	\N	f	\N	1	\N
6304cdfc-74bf-4a15-a95a-ac82c238d7a9	Milagros Abigail	5491169810036	Lavalleja 3252, El Talar, Tigre	2026-05-10 20:17:15.640264+00	2026-05-10 20:18:18.758802+00	femenino	2013-06-30	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53285916	Serrano	\N	f	\N	1	\N
a356ae52-4223-40ee-acdb-d7c68397c8f1	Owen	5491157076368	Hernan Cortés 344, El Talar, Tigre	2026-05-10 20:22:30.811445+00	2026-05-10 20:22:30.811445+00	masculino	2014-01-23	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53747768	Montaño	\N	f	\N	1	\N
f370cec5-5f06-456f-8f4d-477588c8e4a0	Elias	5491130689590	Ozanan 3148	2026-05-10 13:22:32.910382+00	2026-05-10 13:58:41.382188+00	masculino	2007-09-21	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	48364411	Rodriguez	\N	f	0d494a19-6978-4494-9ea6-2dec18d2b6bd	1	\N
b0d75f52-551d-497c-95dc-122e9b935e3b	Sara	1122676929	Morse 352	2026-05-10 13:19:26.96619+00	2026-05-10 13:58:41.360717+00	femenino	1979-11-16	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Villagra	\N	f	63a88b8b-715e-4d90-93ec-123acd7c28bf	1	\N
d7630fa4-9585-4f5c-941b-26a53277e3bf	Anahi silvia	2954673097	\N	2026-05-10 13:23:43.272817+00	2026-05-10 13:58:41.365905+00	femenino	1995-06-19	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Cerezo	\N	f	edf69f7a-c8b8-4388-ba23-9198545b0f04	1	\N
728226b7-64c6-41b9-9e8f-6ee68a7a5cc3	Yago	\N	\N	2026-05-10 20:31:00.042749+00	2026-05-10 20:31:00.042749+00	masculino	2014-05-14	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Sanchez	\N	f	\N	1	\N
f86371b3-d7a4-4930-b884-2af435dc310a	Luciana	541133414383	Lavalleja 3272	2026-05-10 12:57:53.992956+00	2026-05-10 18:49:32.229753+00	femenino	2011-05-13	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	50146802	Maldonado	\N	f	cffd5651-338e-46be-99a6-999726202f53	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/261e4a56-1e81-44c1-acae-1607d12da511_1777162913390.jpg
7e876992-c83a-4bee-b1a3-21a31363ab2e	ROQUE SEBASTIAN	\N	\N	2026-05-09 21:15:29.501544+00	2026-05-10 18:49:32.229753+00	masculino	2012-01-08	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	52010767	Serrano	\N	f	430aca3d-1810-4bd4-91ab-f2c3b44c4d4d	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/2df9b173-019f-4da0-928e-b274fbe23a74_1777163081006.jpg
65df0674-530b-4059-9de0-4702fbde2d5b	Nancy	\N	\N	2026-05-10 20:28:00.111024+00	2026-05-10 20:28:00.111024+00	femenino	2004-02-19	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ramirez	\N	f	\N	1	\N
79f8d85f-f33f-4997-9821-7102dcafa4c1	Enzo Gael	5491166022341	Ozanam 3148, El Talar, Tigre	2026-05-10 20:20:23.339979+00	2026-05-10 20:29:25.692961+00	masculino	2013-11-11	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53604485	Rodríguez	\N	f	\N	1	\N
1ce95037-62e2-4cf8-a374-45e4a816113c	ABEL	\N	\N	2026-05-10 17:59:49.453832+00	2026-05-11 23:03:25.46016+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ALVAREZ	\N	f	\N	1	\N
9499dfcd-6034-4650-9429-14b9da00b43c	IGNACIO	\N	\N	2026-05-10 18:22:00.642208+00	2026-05-11 23:07:39.547247+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ARANDA	\N	f	\N	1	\N
59e72875-e3a8-4400-bfc9-c9e1f8fb0402	Leandro	5491123921908	Maure 4907	2025-04-12 17:42:46.081937+00	2026-05-05 18:22:46.704033+00	masculino	2008-12-23	central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	49006316	Ortiz	\N	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/59e72875-e3a8-4400-bfc9-c9e1f8fb0402_1778005366036.jpg
cfae2129-0524-4c1d-a0c4-6ba2317fac90	prob	\N	\N	2026-05-09 15:21:25.869142+00	2026-05-09 15:22:08.311016+00	masculino	\N	Obreros	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	ayudante	2026-05-09 15:22:08.291+00	f	a546da48-897d-4859-8f50-e2524bd209fe	1	\N
bd5b4c72-9eba-43b8-8a9b-bfd2caf3b1bb	GONZALO	5491123755920	SAN MARTIN 1075, EL TALAR	2026-05-09 23:48:25.680911+00	2026-05-09 23:48:25.680911+00	masculino	2014-07-07	Clase H	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	54146665	BELLI	\N	f	\N	1	\N
1ab27d51-1cf9-4782-8d30-6772638a0d04	niño	\N	\N	2026-04-29 01:22:04.902749+00	2026-05-01 01:17:31.52943+00	masculino	1989-04-28	Clase A	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	1	2026-05-01 01:17:31.431+00	f	\N	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/1ab27d51-1cf9-4782-8d30-6772638a0d04_1777426291335.jpg
733c7216-ee99-4eb1-99da-cdf50cda3566	prueba	\N	\N	2026-04-29 01:17:28.345574+00	2026-05-01 01:18:13.585924+00	masculino	2001-11-11	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	124578	maestro	2026-05-01 01:18:13.482+00	f	f0fb63d5-ba0e-47b1-9767-60aa0c0f180c	1	\N
107caa98-3726-4b4d-8bbd-f430b6420be7	Luciana Magali	\N	\N	2026-04-29 23:47:48.212686+00	2026-05-01 01:54:05.914103+00	femenino	2026-04-29	clase B	Escuelita Alvear	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Maldonado	2026-05-01 01:54:05.849+00	t	\N	1	\N
a20a54b4-2c31-4365-a160-bbde7067648a	Daniel	5491140378737	\N	2026-05-01 01:56:57.555747+00	2026-05-01 03:02:25.395692+00	masculino	1976-01-31	Obreros	Escuelita Nogues	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	25088393	Martínez	\N	f	d36f1afd-7530-4f08-aa26-35c09b72c181	1	\N
83cc8298-7497-4b05-b417-7c6064909bc3	Elias	\N	\N	2026-05-03 02:55:33.334876+00	2026-05-03 02:55:33.334876+00	masculino	2026-05-02	Central	jovenes	4258c92d-b4db-47d8-918d-cadc0ba2a56c	\N	( novio de sabri)	\N	t	\N	1	\N
0ab19894-da53-4c8c-ae2f-72ce8dd9919e	Maira Sabrina 	1161314021	\N	2026-05-10 00:17:24.137981+00	2026-05-10 00:17:24.738657+00	femenino	1992-10-24	Obreros	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	37147178	Mercado	\N	f	08d071b3-fff2-4731-91f6-3664aba92a05	1	\N
410158b4-72e9-4d9d-a107-051805746d7f	Ejemplo Nombre	\N	\N	2026-05-03 19:59:13.255387+00	2026-05-03 20:04:18.306279+00	masculino	\N	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ejemplo Apellido	2026-05-03 20:04:18.292+00	f	867994b3-4b0c-4d7c-ae43-36cae792037b	1	\N
643704f7-5351-4005-8c24-2d6a1eae516e	Monica	1150576016	\N	2026-05-10 13:06:32.235071+00	2026-05-10 13:55:58.319544+00	femenino	1985-01-07	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Villagra	\N	f	d3b54f51-c798-4588-bf58-c36ec4c5232e	1	\N
7333b0c5-3bc5-4d4d-95f2-718b45796855	DÉBORA ELIZABETH	1132913172	AV. SAN MARTIN 2371	2026-05-09 21:52:32.648507+00	2026-05-10 00:42:47.490347+00	femenino	1984-09-22	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	31146097	GIANGRANDI	\N	f	7750db62-567b-4af2-8150-c85b9721c6d5	1	\N
5d88c985-a403-4ca1-a6b8-d9fef681b27e	MARTINA	\N	\N	2026-05-09 21:15:28.826436+00	2026-05-10 00:42:47.558296+00	femenino	2006-04-28	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	47261963	Arias	\N	f	8b7fd8a2-822c-4536-ac99-2a78623cf532	1	\N
86943928-5fbf-49d8-94e0-9cd9ef9e500b	Bautista bruno	\N	\N	2026-05-09 21:15:28.881782+00	2026-05-10 00:50:35.914734+00	masculino	2011-08-27	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	51335599	Montaño	\N	f	a6209765-0dfc-44f7-b2a0-fd1aa7d33514	1	\N
96e0cabf-63b2-439d-a970-f23889242ea6	Maria Rosa 	1162549104	\N	2026-05-10 13:30:16.644678+00	2026-05-10 14:01:23.533627+00	femenino	1968-12-09	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Ortiz	\N	f	3f7864d7-dd62-4a7c-b5cd-acfdb8d3125a	1	\N
4d9d3b0e-0a26-485d-a2f5-68178e871154	Isabel	\N	Sanchez de logia 5651	2026-05-10 13:42:09.881956+00	2026-05-10 14:02:55.542278+00	femenino	1948-12-11	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	5212179	Gomez	\N	f	15bafe6d-7758-4da0-9fc5-733326508f33	1	\N
37feeb71-c32f-4c3d-8267-1458f4b98483	Tamara	5491141493364	Morse 352	2026-05-10 12:24:01.273154+00	2026-05-10 13:58:11.294531+00	femenino	2003-03-15	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	44883658	Rueda	\N	f	42c7c73d-ab4e-4f9b-8e37-10849283bc99	1	\N
113dbced-ad65-4c55-8db9-790a7b256e5d	Margarita	1134201834	perito moreno 5856	2026-05-10 13:40:42.341734+00	2026-05-10 14:02:55.712063+00	femenino	1985-06-08	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	19100732	Ozores	\N	f	ff27534e-8ed7-486a-81d1-e782e2ffac2a	1	\N
133b644f-865e-4360-97d9-751cd7590bf9	Teresa	1176383248	Belgica 587	2026-05-10 13:25:17.236504+00	2026-05-10 18:52:24.473536+00	femenino	1946-06-20	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Maldonado	\N	f	a8f5d584-e728-4091-b9db-a24737140f91	1	\N
c4911182-b579-44ac-87b6-9b39271923e1	Cintia Cristina 	1564210385	Asunción 2137 Don Torcuato	2026-05-09 20:36:29.407244+00	2026-05-10 15:19:16.444436+00	femenino	1977-05-18	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	25871497	Mansilla	\N	f	51e8acdd-2ecb-42b8-bc98-c7dd2d25f987	1	\N
ea5bdd7a-d3f7-49c2-a09e-455df656c86f	MARÍA FERNANDA	\N	\N	2026-05-09 21:15:28.848366+00	2026-05-09 23:22:56.441832+00	femenino	1969-06-01	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	20957259	Caamano	\N	f	e6b4c124-ba15-4a1a-96a4-5f1230c64bfd	1	\N
52ceb520-62eb-4282-9fe8-8d5aa8ca8e74	Xiomara	\N	\N	2026-05-10 20:25:47.031663+00	2026-05-10 20:25:47.031663+00	femenino	2013-07-04	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ledesma	\N	f	\N	1	\N
a30859bf-1ef1-4abd-99e9-399ff2439c8a	Santiago	\N	\N	2026-05-10 20:29:09.909644+00	2026-05-10 20:29:09.909644+00	masculino	2013-08-06	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Romero	\N	f	\N	1	\N
e73e4bb5-d93d-4470-8f26-af175bcabce3	Francesca	\N	\N	2026-05-10 20:31:47.147621+00	2026-05-10 20:31:47.147621+00	femenino	2026-05-10	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Melgar	\N	f	\N	1	\N
3ef88a83-dbc7-4a4b-b1ff-777252834934	ANA PAULA	\N	\N	2026-05-09 21:15:29.517152+00	2026-05-09 23:27:28.403378+00	femenino	2007-04-28	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	47945381	Cataldi	\N	f	4b230e62-cf0c-4b78-9ea0-d728eac1808c	1	\N
9b729ba2-9c07-4012-82b4-eb176858ebd6	Santino	\N	\N	2026-05-10 20:32:05.871281+00	2026-05-10 20:32:05.871281+00	masculino	2026-05-10	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Ramos	\N	t	\N	1	\N
42b8db12-180f-4eac-ae52-a915cd958383	Alcira	\N	\N	2026-05-09 21:15:29.502916+00	2026-05-09 23:27:28.41134+00	femenino	1995-06-15	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	39053293	Moreno	\N	f	87bb6896-b6c3-42b4-a32c-14824bd20e6d	1	\N
7814a8e9-cc94-4c3b-b8c4-6e74bed8e109	Juan Manuel	\N	\N	2026-05-09 21:15:29.486915+00	2026-05-09 23:27:40.255641+00	masculino	1993-04-30	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	36223024	Gramajo	\N	f	6121f14f-c43d-41e8-b621-35c55e4e9101	1	\N
29fed58d-9893-49af-8524-911c44d50ad3	Carla	1132739205	\N	2026-05-10 12:26:52.691561+00	2026-05-10 13:54:52.636184+00	femenino	2006-11-19	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	47084074	Maldonado 	\N	f	d161b2c8-757d-45e2-aee1-81a970348757	1	\N
5863045a-73c1-4a57-bd15-3f88b1b6bf55	Kim	\N	\N	2026-05-10 20:32:57.702845+00	2026-05-10 20:32:57.702845+00	masculino	2026-05-10	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	Aranda	\N	t	\N	1	\N
5bd1229d-a674-4de9-8497-f796c535fe1c	Elias Roman	1141887622	Fernando Fader	2026-05-10 13:31:13.654575+00	2026-05-10 14:01:22.906168+00	masculino	2008-01-04	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	\N	Arias	\N	f	a4925a86-5813-4a2c-b7be-418172f324c4	1	\N
35b9a40c-1aaa-4ccd-b8ff-8972789d4cbd	AMBAR	\N	\N	2026-05-10 17:45:21.146041+00	2026-05-10 17:59:03.961681+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	FARIA	2026-05-10 17:59:03.866+00	t	\N	1	\N
f7683d40-b846-4dae-8c08-095ec262f213	Guillermo Ezequiel	5491127326980	\N	2026-05-10 12:25:27.77003+00	2026-05-10 18:01:40.567372+00	masculino	2004-10-12	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	46192566	Cataldi	\N	f	639e8956-7962-4f3c-a5f7-aea78480630d	1	\N
2f692d86-fcbe-4984-8d60-d91cafc435d3	BAUTISTA	\N	\N	2026-05-10 17:44:09.385006+00	2026-05-11 23:03:50.784636+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	GALLETELI	\N	f	\N	1	\N
0931d49f-618e-4184-9e44-c045e61bbc60	OWEN	\N	\N	2026-05-10 17:47:21.655138+00	2026-05-11 23:07:19.126987+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	LEDEZMA	\N	f	\N	1	\N
38ba3ed3-8dab-4f40-9d9c-ee48f6a082cf	IAN	\N	\N	2026-05-10 17:48:15.278928+00	2026-05-11 23:07:42.03843+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	OREGON	\N	f	\N	1	\N
8ec59e25-d709-4265-879e-c8ce29ab3d7f	Leonel Mateo	\N	\N	2026-05-09 21:15:28.910922+00	2026-05-10 18:49:32.229753+00	masculino	2010-11-01	Obreros	\N	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	50673026	Garcia	\N	f	23c20f41-91fc-4a26-bba6-f4ac6a8629a2	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/aa4dfab2-b8ac-41d9-b91c-3ea85ce03fca_1777162895894.jpg
259336f8-6599-47ab-b6a1-f5bc2b39c7d9	Mestro de 	\N	\N	2026-05-10 21:46:25.906129+00	2026-05-10 22:53:21.757671+00	masculino	2010-05-01	Obreros	\N	b3884c4d-1428-4ee7-97f2-4389d8664a6d	\N	Prueba	\N	f	408cee47-527c-4525-bece-df16440d72fc	1	\N
33a850f9-4633-4a45-b0af-1419a4b07a78	AMBAR	5491134353078	\N	2026-05-10 18:10:54.763308+00	2026-05-11 23:03:35.277841+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	FARIA	\N	f	\N	1	\N
86c9d1d6-3192-468e-ae54-3fe2804059b5	Belen	5491171554414	Libertad 2848	2026-05-10 16:14:30.298019+00	2026-05-11 23:03:54.041963+00	femenino	2010-08-03	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	50356115	Barros	\N	f	\N	1	\N
543209c8-7920-437e-a5f2-053e2057f2f1	OWEN	\N	\N	2026-05-10 17:47:59.852608+00	2026-05-11 23:07:20.991696+00	masculino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	GUZMAN	\N	f	\N	1	\N
d76d7ddb-6f31-4183-b4f9-69a11d8d78ff	MARIA ALEJANDRA	1161009482	Libertad 2848	2026-05-10 18:22:40.757948+00	2026-05-11 23:07:27.405797+00	femenino	2026-05-10	A2	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	\N	BARROS	\N	f	\N	1	\N
6e401265-11b4-46fa-9a49-fda44c330ab6	Aylen	\N	Sánchez de Loria 5651	2026-05-10 12:26:21.369012+00	2026-05-10 18:49:32.229753+00	femenino	2009-11-22	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	49905309	Cañete	\N	f	ac58ec7c-b9cb-41af-8677-740971bdb4ba	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/57919af3-579d-4a6d-a32b-202b0568b426_1777162665792.jpg
7aadaa71-cb29-4d76-ab34-3707f7afd7e0	Denise	541125650682	perito moreno 5856	2026-05-10 12:25:56.033633+00	2026-05-10 18:49:32.229753+00	femenino	2010-12-03	Obreros	\N	94668d57-c8b2-455a-8aaf-369e7286847b	51333591	Ramos	\N	f	ad9e6e89-c2f9-4756-be22-b15c20ffb8dc	1	https://wnmxgjrjrckwtyttidkw.supabase.co/storage/v1/object/public/member-photos/1/00375d83-e208-4b8d-9c04-f762823785b4_1777162775090.jpg
44cf3903-3d42-4055-b616-7d6aa7072186	Dominique	5491166597926	Villa de Mayo 5660, Adolfo Sourdeaux, Malvinas Argentinas	2026-05-10 20:02:34.32468+00	2026-05-10 20:02:34.32468+00	femenino	2014-03-13	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53757868	Quintana	\N	f	\N	1	\N
25e1802c-e43e-4657-9f5f-1c77791022b1	Keila	5491136722727	Pedro Monti 731, Adolfo Sourdeaux, Malvinas Argentinas	2026-05-10 20:04:06.692046+00	2026-05-10 20:10:02.543977+00	femenino	2014-03-29	Clase i	Escuelita Central	6567a8cc-bb6f-48a0-b70a-2b393bfe4c75	53879732	Suarez	\N	f	\N	1	\N
bd097fed-d6d6-42fc-a66d-6b5b56f797f6	Lalala	\N	\N	2026-05-10 21:48:19.448255+00	2026-05-10 21:49:30.371775+00	masculino	2014-05-17	A2 central	adolescentes	b3884c4d-1428-4ee7-97f2-4389d8664a6d	0000000	Lalalala	\N	f	\N	1	\N
037d72ad-0744-426c-bd9f-9466cf862ecc	Gladis	1151471775	Darragueira 5497. Villa de Mayo	2026-05-04 00:59:30.012899+00	2026-05-11 01:51:24.894527+00	femenino	1970-06-20	clase D	\N	e117b37a-2dc5-4cc0-b590-cd6e8594bf9c	21562683	Marquessini	\N	f	6221aea9-1176-40bb-b303-6a156c16df31	1	\N
\.


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: student_departments student_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_departments
    ADD CONSTRAINT student_departments_pkey PRIMARY KEY (id);


--
-- Name: student_departments student_departments_student_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_departments
    ADD CONSTRAINT student_departments_student_id_department_id_key UNIQUE (student_id, department_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id);


--
-- Name: idx_student_departments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_departments_student ON public.student_departments USING btree (student_id, department_id);


--
-- Name: idx_students_company_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_company_dept ON public.students USING btree (company_id, department_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_students_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_deleted_at ON public.students USING btree (deleted_at);


--
-- Name: idx_students_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_profile_id ON public.students USING btree (profile_id);


--
-- Name: students_document_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_document_number_idx ON public.students USING btree (document_number);


--
-- Name: profiles on_profile_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_updated AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_student();


--
-- Name: profiles saludo_bienvenida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER saludo_bienvenida AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://ccdt-back.onrender.com/api/webhooks/supabase/profiles', 'POST', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles profiles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: student_departments student_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_departments
    ADD CONSTRAINT student_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: student_departments student_departments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_departments
    ADD CONSTRAINT student_departments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: students students_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::public.app_role)))));


--
-- Name: profiles Allow user registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user registration" ON public.profiles FOR INSERT TO anon WITH CHECK (true);


--
-- Name: students Enable delete access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete access for all users" ON public.students FOR DELETE TO anon USING (true);


--
-- Name: students Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.students FOR INSERT TO anon WITH CHECK (true);


--
-- Name: students Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.students FOR SELECT TO anon USING (true);


--
-- Name: students Enable update access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for all users" ON public.students FOR UPDATE TO anon USING (true);


--
-- Name: profiles Profiles are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: students Users can soft delete students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can soft delete students" ON public.students FOR UPDATE USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: student_departments auth_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_access ON public.student_departments TO authenticated USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

\unrestrict g0d952eJVDfIaTegSSTzvzIpd1C4yz0dNYhLsmqnhJCwFz6zuBzcrflSKPkOX8Y

