-- Manual schema refactor to align DB with current EF model (Alerts, Advice, Tasks)
-- Safe-ish idempotent adds/drops (production: replace with formal EF migration)
-- Run in dev only: psql "postgresql://pfmp_user:PASSWORD@192.168.1.108:5433/pfmp_dev" -f ./scripts/queries/manual_schema_refactor.sql

DO $$
BEGIN
    -- ALERTS modifications
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Alerts' AND column_name='GeneratedTaskId'
    ) THEN
        EXECUTE 'ALTER TABLE "Alerts" DROP COLUMN "GeneratedTaskId"';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Alerts' AND column_name='TaskGenerated'
    ) THEN
        EXECUTE 'ALTER TABLE "Alerts" DROP COLUMN "TaskGenerated"';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Alerts' AND column_name='PortfolioImpactScore'
    ) THEN
        EXECUTE 'ALTER TABLE "Alerts" ADD COLUMN "PortfolioImpactScore" integer NOT NULL DEFAULT 0';
    END IF;

    -- ADVICE additions
    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='AcceptedAt';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "AcceptedAt" timestamp with time zone NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='DismissedAt';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "DismissedAt" timestamp with time zone NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='PreviousStatus';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "PreviousStatus" character varying(40) NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='SourceAlertId';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "SourceAlertId" integer NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='GenerationMethod';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "GenerationMethod" character varying(40) NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Advice' AND column_name='SourceAlertSnapshot';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Advice" ADD COLUMN "SourceAlertSnapshot" text NULL';
    END IF;

    -- TASKS provenance additions (table: Tasks)
    PERFORM 1 FROM information_schema.columns WHERE table_name='Tasks' AND column_name='SourceAdviceId';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Tasks" ADD COLUMN "SourceAdviceId" integer NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns WHERE table_name='Tasks' AND column_name='SourceType';
    IF NOT FOUND THEN
        EXECUTE 'ALTER TABLE "Tasks" ADD COLUMN "SourceType" character varying(30) NULL';
    END IF;
END $$;

-- Verification queries
SELECT 'Alerts columns' AS section;
SELECT column_name FROM information_schema.columns WHERE table_name='Alerts' ORDER BY ordinal_position;
SELECT 'Advice columns' AS section;
SELECT column_name FROM information_schema.columns WHERE table_name='Advice' ORDER BY ordinal_position;
SELECT 'Tasks columns' AS section;
SELECT column_name FROM information_schema.columns WHERE table_name='Tasks' ORDER BY ordinal_position;
