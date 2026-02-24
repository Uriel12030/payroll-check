Create a new Supabase SQL migration file for this project.

Steps:
1. List the files in `supabase/migrations/` to find the highest existing number (e.g. `011_...sql` → next is `012`)
2. Ask the user what the migration should do if not already specified in $ARGUMENTS
3. Create the file `supabase/migrations/NNN_<slug>.sql` with:
   - A comment header: `-- Migration NNN: <description>`
   - Proper `IF NOT EXISTS` guards on all CREATE statements
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns
   - RLS enabled + policies if creating a new table
   - Relevant indexes
4. Also add a checklist item to TASKS.md under "Pending Infrastructure":
   `- [ ] Run migration NNN (<description>) in Supabase Dashboard`

Convention: always use `IF NOT EXISTS` / `DO $$ BEGIN ... END $$` guards so migrations are idempotent.
