create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  ingredients text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
