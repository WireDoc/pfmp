-- DEV ONLY: Destructive truncate + seed script for PFMP domain tables
-- Safeguard: ensure we're on a _dev database (adjust pattern if needed)
DO $$
BEGIN
    IF current_database() NOT LIKE '%_dev' THEN
        RAISE EXCEPTION 'Refusing to run truncate_and_seed on non-dev database: %', current_database();
    END IF;
END $$;

BEGIN;

-- Truncate in dependency-safe order (Advice references Alerts, Tasks may reference Alerts)
TRUNCATE TABLE "Advice" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Tasks" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Alerts" RESTART IDENTITY CASCADE;

-- Seed Alerts
INSERT INTO "Alerts"
("UserId","Title","Message","Severity","Category","IsRead","IsDismissed","IsActionable","CreatedAt","PortfolioImpactScore") VALUES
(1,'Gold price spike','Gold is up 7% against 30-day average volatility.',3,1,false,false,true,NOW(),75),
(1,'Fed rate cut','Federal Reserve cut benchmark rate by 25 bps.',3,6,false,false,true,NOW(),65),
(1,'Minor crypto fluctuation','BTC moved 1.2% intraday.',1,3,false,false,false,NOW(),15),
(2,'Rebalance Drift','Equity allocation drifted 6% from target.',2,7,false,false,true,NOW(),55);

-- Advice from specific alert (gold spike)
INSERT INTO "Advice"
("UserId","Theme","Status","ConsensusText","ConfidenceScore","PrimaryJson","ValidatorJson","ViolationsJson",
 "LinkedTaskId","AcceptedAt","DismissedAt","PreviousStatus","SourceAlertId","GenerationMethod","SourceAlertSnapshot",
 "CreatedAt","UpdatedAt")
SELECT a."UserId", a."Category"::text AS Theme, 'Proposed',
       ('Alert: '||a."Title"||E'\n'||a."Message") AS ConsensusText,
       55,NULL,NULL,NULL,NULL,NULL,NULL,NULL,a."AlertId",'FromAlert',
       json_build_object('alertId',a."AlertId",'title',a."Title",'category',a."Category",'severity',a."Severity",'createdAt',a."CreatedAt")::text,
       NOW(),NOW()
FROM "Alerts" a
WHERE a."Title"='Gold price spike';

-- Standalone Proposed Advice
INSERT INTO "Advice" ("UserId","Theme","Status","ConsensusText","ConfidenceScore","CreatedAt","UpdatedAt") VALUES
(1,'General','Proposed','Increase emergency fund contributions over next quarter.',60,NOW(),NOW());

-- Dismissed Advice
INSERT INTO "Advice" ("UserId","Theme","Status","ConsensusText","ConfidenceScore","DismissedAt","PreviousStatus","CreatedAt","UpdatedAt") VALUES
(1,'General','Dismissed','Short-term crypto speculation suggestion dismissed.',50,NOW(),'Proposed',NOW(),NOW());

-- Accepted Advice (create task after seeding)
INSERT INTO "Advice" ("UserId","Theme","Status","ConsensusText","ConfidenceScore","CreatedAt","UpdatedAt","AcceptedAt") VALUES
(1,'Allocation','Accepted','Rebalance equities vs bonds to restore 70/30 target.',65,NOW(),NOW(),NOW());

-- Create linked task for accepted advice
WITH a AS (
  SELECT "AdviceId" FROM "Advice" WHERE "Status"='Accepted' LIMIT 1
)
-- Include ProgressPercentage (required NOT NULL) and provenance fields
INSERT INTO "Tasks" ("UserId","Type","Title","Description","Priority","Status","CreatedDate","ProgressPercentage","SourceAlertId","SourceAdviceId","SourceType")
SELECT 1,5,'Allocation Rebalance','Execute recommended rebalance per accepted advice.',2,1,NOW(),0,NULL,a."AdviceId",'Advice' FROM a;

-- Backfill LinkedTaskId
UPDATE "Advice" SET "LinkedTaskId" = t."TaskId"
FROM "Tasks" t
WHERE "Advice"."Status"='Accepted' AND "Advice"."LinkedTaskId" IS NULL AND t."Title"='Allocation Rebalance';

COMMIT;
