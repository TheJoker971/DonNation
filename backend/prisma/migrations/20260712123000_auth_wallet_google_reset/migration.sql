-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'WALLET');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN "wallet_private_key_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN "wallet_auth_nonce" TEXT;
ALTER TABLE "users" ADD COLUMN "wallet_auth_nonce_expires_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "password_reset_token_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
