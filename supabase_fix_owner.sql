-- =========================================================
-- SKRIP PEMBETULAN: TAMBAH LAJUR owner_email & KEMASKINI DATA
-- Jalankan ini di Supabase Dashboard -> SQL Editor
-- =========================================================

-- 1. Tambah lajur owner_email ke dalam jadual qrs
alter table public.qrs add column if not exists owner_email text;

-- 2. Kemaskini owner_email berdasarkan pemetaan Firebase UID -> E-mel
-- UID d05fZ5N4wVf1fD10qhlh4xiaVKg1 = amirulsalam@umt.edu.my
update public.qrs set owner_email = 'amirulsalam@umt.edu.my'
where owner_id = 'd05fZ5N4wVf1fD10qhlh4xiaVKg1';

-- UID nWazaXdszOV2yOFZdwf6XE8crUd2 = m.nizar@umt.edu.my
update public.qrs set owner_email = 'm.nizar@umt.edu.my'
where owner_id = 'nWazaXdszOV2yOFZdwf6XE8crUd2';

-- UID qU17sFmiuXTL2i5SfJb8WDbgOrF3 = m.nizar@umt.edu.my
update public.qrs set owner_email = 'm.nizar@umt.edu.my'
where owner_id = 'qU17sFmiuXTL2i5SfJb8WDbgOrF3';

-- 3. Kemaskini polisi RLS supaya turut membenarkan akses berdasarkan e-mel
-- Gugurkan polisi lama
drop policy if exists "Allow authenticated insert own QRs" on public.qrs;
drop policy if exists "Allow authenticated update own QRs" on public.qrs;
drop policy if exists "Allow authenticated delete own QRs" on public.qrs;

-- Polisi baharu: Insert - owner_id mestilah UID pengguna semasa
create policy "Allow authenticated insert own QRs"
on public.qrs for insert
with check (auth.uid()::text = owner_id);

-- Polisi baharu: Update - padankan owner_id ATAU owner_email
create policy "Allow authenticated update own QRs"
on public.qrs for update
using (auth.uid()::text = owner_id or auth.jwt() ->> 'email' = owner_email);

-- Polisi baharu: Delete - padankan owner_id ATAU owner_email
create policy "Allow authenticated delete own QRs"
on public.qrs for delete
using (auth.uid()::text = owner_id or auth.jwt() ->> 'email' = owner_email);

-- Polisi baharu: Select - kekalkan bacaan awam + pengguna boleh lihat QR milik mereka
drop policy if exists "Allow public read for QR redirection" on public.qrs;
create policy "Allow public read for QR redirection"
on public.qrs for select
using (true);

-- 4. Sahkan data telah dikemaskini
select id, name, owner_id, owner_email, created_at from public.qrs order by created_at desc;
