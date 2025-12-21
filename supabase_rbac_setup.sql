-- Run this in your Supabase SQL Editor

-- 1. Create Profiles Table (extends Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  phone text,
  role text check (role in ('admin', 'agent')) default 'agent',
  is_approved boolean default false
);

-- 2. Create User Products Table (Associates Users with Products)
create table if not exists public.user_products (
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.produtos(id) on delete cascade,
  primary key (user_id, product_id)
);

-- 3. Enable RLS
alter table public.profiles enable row level security;
alter table public.user_products enable row level security;

-- 4. Policies for Profiles

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (
    auth.uid() = id
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (
    auth.uid() = id
  );

-- Admins can update any profile (to approve users)
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Allow inserting own profile during registration
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
  );
  
-- 5. Policies for User Products

-- Admins view all
create policy "Admins can view all user_products"
  on public.user_products for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Users view own
create policy "Users can view own user_products"
  on public.user_products for select
  using (
    auth.uid() = user_id
  );

-- Admins can manage user_products
create policy "Admins can manage user_products"
  on public.user_products for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
  
-- Allow users to insert their selected products during registration
create policy "Users can insert own products"
  on public.user_products for insert
  with check (
    auth.uid() = user_id
  );

-- 6. Grant permissions (Optional, usually default public is enough for authenticated)
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_products to authenticated;

-- 7. Create Admin Trigger (Optional: Manually update your first user to admin)
-- You will need to manually update your admin user's role to 'admin' and is_approved to true after signing up.
-- Example: update public.profiles set role = 'admin', is_approved = true where id = 'YOUR_USER_ID';
