# Supabase Cloud Setup

Use this guide to recreate the storage bucket, schema, and RPC function in the new Supabase cloud project (`ugxjiapxufjtcqxanrju`).

## 1. Environment variables
1. In the Supabase dashboard, go to **Project Settings → API**.
2. Copy `Project URL` (without a trailing slash) and the `anon public` key.
3. Update `.env.local` so it looks like:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
4. Re-start the Next.js dev server after changing env vars.

## 2. Storage bucket + policy
1. In **Storage → Buckets**, create a new bucket with the ID `csv-files` and mark it **public**.
2. Enable RLS on the bucket if it is not already enabled.
3. Run the following SQL (SQL Editor) to ensure the bucket exists and to add an insert/select policy for anonymous users:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('csv-files', 'csv-files', true)
   on conflict (id) do update set public = true;

   drop policy if exists "Allow public uploads" on storage.objects;
   create policy "Allow public uploads" on storage.objects
     for insert to public, authenticated
     with check (bucket_id = 'csv-files');

   drop policy if exists "Allow public reads" on storage.objects;
   create policy "Allow public reads" on storage.objects
     for select using (bucket_id = 'csv-files');
   ```

## 3. Database schema, RPC, and grants
Run this SQL in the SQL Editor to recreate the `csv_to_table` schema and the helper RPC function:

```sql
-- Schema + permissions
create schema if not exists csv_to_table;
grant usage on schema csv_to_table to anon, authenticated;
grant all on all tables in schema csv_to_table to anon, authenticated;
grant all on all sequences in schema csv_to_table to anon, authenticated;
alter default privileges in schema csv_to_table
  grant all on tables to anon, authenticated;
alter default privileges in schema csv_to_table
  grant all on sequences to anon, authenticated;

-- RPC that executes the CREATE TABLE statements
create or replace function public.create_csv_table(table_sql text)
returns void
language plpgsql
security definer
set search_path = public, csv_to_table
as $$
begin
  execute table_sql;
  perform pg_notify('pgrst', 'reload schema'); -- refresh PostgREST so inserts can see the new table immediately
end;
$$;

grant execute on function public.create_csv_table(text) to anon, authenticated;
```

## 4. Expose the schema to the API
1. Go to **Project Settings → API**.
2. Under **Expose schemas in the API**, append `csv_to_table` to the list (`public, storage, graphql_public, csv_to_table`).
3. Save the settings. This lets the anon key issue REST calls against the `csv_to_table` schema.

## 5. Verification checklist
1. `app/page.tsx` uploads a CSV and stores references in `sessionStorage`.
2. `app/dashboard/page.tsx` automatically calls `/api/csv-to-table` when it sees `dashboardData`.
3. `/api/csv-to-table/route.ts` now creates tables inside `csv_to_table` using the RPC and inserts rows with the `anon` key.
4. Run `npm run dev`, upload a CSV, submit a prompt, and confirm the dashboard reports `csv_to_table.<bucket-file-name>` along with a success toast.

If any step fails:
- Check the Supabase **Logs → API** tab for authorization errors (missing policy or exposed schema).
- Re-run the SQL snippets above; they are idempotent.
- Ensure `.env.local` values match the new project credentials exactly.
