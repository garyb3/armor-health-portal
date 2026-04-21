import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// TODO(statement-timeout): libSQL's adapter + @libsql/client don't expose a
// statement/query timeout knob today, so a runaway query will pin a serverless
// function until the platform timeout (Vercel: ~10-60s depending on plan). If
// we migrate to Postgres or hosted libSQL with HTTP pooling that supports it,
// add `?statement_timeout=10s` to DATABASE_URL (Postgres) or the equivalent
// driver option here. For now, any slow-path defense has to live at the
// handler level (AbortController + request-side timeouts).
function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
