-- =========================================================
-- SKRIP SKEMA & MIGRASI DATA LENGKAP: PENJANA KOD QR DINAMIK
-- Dari Google Firebase (Cloud Firestore) ke Supabase (PostgreSQL)
-- =========================================================
-- Sila salin dan jalankan (RUN) skrip ini di Supabase Dashboard -> SQL Editor

-- 1. JADUAL: allowed_emails (Senarai Putih E-mel)
create table if not exists public.allowed_emails (
    email text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dayakan Row Level Security (RLS)
alter table public.allowed_emails enable row level security;

-- Polisi RLS untuk allowed_emails
drop policy if exists "Allow public read for allowed_emails" on public.allowed_emails;
create policy "Allow public read for allowed_emails"
on public.allowed_emails for select
using (true);

drop policy if exists "Allow admin manage allowed_emails" on public.allowed_emails;
create policy "Allow admin manage allowed_emails"
on public.allowed_emails for all
using (auth.jwt() ->> 'email' = 'm.nizar@umt.edu.my')
with check (auth.jwt() ->> 'email' = 'm.nizar@umt.edu.my');


-- 2. JADUAL: qrs (Rekod Kod QR Dinamik)
drop policy if exists "Allow public read for QR redirection" on public.qrs;
drop policy if exists "Allow authenticated insert own QRs" on public.qrs;
drop policy if exists "Allow authenticated update own QRs" on public.qrs;
drop policy if exists "Allow authenticated delete own QRs" on public.qrs;

create table if not exists public.qrs (
    id text default gen_random_uuid()::text primary key,
    name text not null,
    target_url text not null,
    owner_id text not null,
    owner_email text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tambah lajur owner_email jika jadual sudah sedia wujud
alter table public.qrs add column if not exists owner_email text;

-- Indeks carian untuk prestasi pantas
create index if not exists idx_qrs_owner_id on public.qrs(owner_id);
create index if not exists idx_qrs_owner_email on public.qrs(owner_email);
create index if not exists idx_qrs_created_at on public.qrs(created_at desc);

-- Dayakan Row Level Security (RLS)
alter table public.qrs enable row level security;

-- Polisi RLS: Bacaan awam bagi tujuan imbasan & lencongan dinamik (#qrId=...)
create policy "Allow public read for QR redirection"
on public.qrs for select
using (true);

-- Polisi RLS: Pengguna boleh cipta Kod QR milik mereka sendiri
create policy "Allow authenticated insert own QRs"
on public.qrs for insert
with check (auth.uid()::text = owner_id or auth.role() = 'authenticated');

-- Polisi RLS: Pengguna boleh kemaskini Kod QR milik mereka sendiri
create policy "Allow authenticated update own QRs"
on public.qrs for update
using (auth.uid()::text = owner_id or auth.jwt() ->> 'email' = owner_email);

-- Polisi RLS: Pengguna boleh memadam Kod QR milik mereka sendiri
create policy "Allow authenticated delete own QRs"
on public.qrs for delete
using (auth.uid()::text = owner_id or auth.jwt() ->> 'email' = owner_email);


-- =========================================================
-- 3. MIGRASI DATA: 35 E-MEL YANG DIBENARKAN (DARI FIREBASE)
-- =========================================================
insert into public.allowed_emails (email) values
('m.nizar@umt.edu.my'),
('adli@umt.edu.my'),
('aidalela@umt.edu.my'),
('ainizahida@umt.edu.my'),
('amirulsalam@umt.edu.my'),
('azlin.abdullah@umt.edu.my'),
('azuar.m@umt.edu.my'),
('bahar@umt.edu.my'),
('danish@umt.edu.my'),
('fahmie@umt.edu.my'),
('hafiza.ellias@umt.edu.my'),
('hardi@umt.edu.my'),
('hasrul@umt.edu.my'),
('ikhwan.hadi@umt.edu.my'),
('m.arham@umt.edu.my'),
('m.faiz@umt.edu.my'),
('m.sharwan@umt.edu.my'),
('n.farhana@umt.edu.my'),
('n_asmawiah@umt.edu.my'),
('nabila.hasnor@umt.edu.my'),
('nieyzar@gmail.com'),
('nuraida@umt.edu.my'),
('nuraliza@umt.edu.my'),
('nuratiqahapandi@gmail.com'),
('nursyifa.razali@umt.edu.my'),
('pengarah.pkk@umt.edu.my'),
('pro@umt.edu.my'),
('rahafiz@umt.edu.my'),
('rohida@umt.edu.my'),
('rosmawati.d@umt.edu.my'),
('rozita.alias@umt.edu.my'),
('s.hafizi@umt.edu.my'),
('shafiqkadri@umt.edu.my'),
('shukry@umt.edu.my'),
('zukiferee@umt.edu.my')
on conflict (email) do nothing;


-- =========================================================
-- 4. MIGRASI DATA: SEMUA KOD QR BERSAMA PEMETAAN E-MEL
-- =========================================================
insert into public.qrs (id, name, target_url, owner_id, owner_email, created_at) values
(
    'GdUGKMq3btoXNBTWsK54',
    'DAFTAR PETUGAS MEDIA BAGI PROGRAM PEMBANGUNAN KOMUNITI MADANI PANGKOR',
    'https://forms.gle/WjcMn2a1Yq8PRAgw9',
    'd05fZ5N4wVf1fD10qhlh4xiaVKg1',
    'amirulsalam@umt.edu.my',
    '2026-01-28 02:13:45.297+00'
),
(
    'I1Vh6xgW8e93HW2GzBY4',
    'umt wise',
    'https://www.umt.edu.my/umt-wise/',
    'qU17sFmiuXTL2i5SfJb8WDbgOrF3',
    'm.nizar@umt.edu.my',
    '2025-12-07 03:26:26.939+00'
),
(
    'YEGT1DFa3nAunz5FIdZS',
    'UMT WISE',
    'https://www.umt.edu.my/umt-wise/',
    'nWazaXdszOV2yOFZdwf6XE8crUd2',
    'm.nizar@umt.edu.my',
    '2025-12-07 03:45:32.229+00'
),
(
    'oZ9MKLmvUh2Vy8GCSbRd',
    'Lagu celtic',
    'https://www.youtube.com/watch?v=mAEoCr6XFXI&list=PLwvZOLQBSMdJEcS0ThVHCqNL7dOZAEDv3&index=51',
    'nWazaXdszOV2yOFZdwf6XE8crUd2',
    'm.nizar@umt.edu.my',
    '2025-09-03 11:31:47.803+00'
),
(
    'wMSIBpxfkfNaNV4xTGGQ',
    'fesbukk aku',
    'https://www.facebook.com/lembayungcahyarabbani',
    'nWazaXdszOV2yOFZdwf6XE8crUd2',
    'm.nizar@umt.edu.my',
    '2025-09-03 11:32:32.821+00'
),
(
    'wmErZwXf76NpNSV2kIJv',
    'UMT WISE',
    'https://www.umt.edu.my/umt-wise/',
    'd05fZ5N4wVf1fD10qhlh4xiaVKg1',
    'amirulsalam@umt.edu.my',
    '2025-12-07 03:48:11.330+00'
)
on conflict (id) do update set
    name = excluded.name,
    target_url = excluded.target_url,
    owner_email = excluded.owner_email,
    created_at = excluded.created_at;
