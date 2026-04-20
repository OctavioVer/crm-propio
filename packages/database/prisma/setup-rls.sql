-- Row Level Security setup
-- This file runs once during Postgres initialization.
-- After Prisma migrations run, execute this to enable RLS on all tenant tables.

-- Enable RLS on all multi-tenant tables
-- Run this AFTER prisma migrate deploy

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'contacts', 'companies', 'pipelines', 'deals', 'products',
    'activities', 'conversations', 'workflows', 'audit_logs',
    'feature_flags', 'custom_fields', 'ai_decisions', 'users',
    'teams', 'workflow_executions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_setting(''app.tenant_id'', true)::text)
        WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::text)
    ', tbl);
    -- Bypass RLS for the application superuser role
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END;
$$;
