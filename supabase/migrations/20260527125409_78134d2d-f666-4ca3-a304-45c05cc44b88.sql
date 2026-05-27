insert into storage.buckets (id, name, public)
values ('blog-exports', 'blog-exports', true)
on conflict (id) do update set public = true;