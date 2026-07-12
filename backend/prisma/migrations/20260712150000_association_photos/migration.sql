CREATE TABLE "association_photos" (
  "id"             TEXT NOT NULL,
  "association_id" TEXT NOT NULL,
  "url"            TEXT NOT NULL,
  "caption"        TEXT,
  "order"          INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "association_photos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "association_photos"
  ADD CONSTRAINT "association_photos_association_id_fkey"
  FOREIGN KEY ("association_id")
  REFERENCES "associations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
