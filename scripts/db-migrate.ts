import "./_bootstrap/index.ts";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it to .env or .env.local before running migrations."
  );
  process.exit(1);
}

type Journal = {
  entries?: { tag: string; when: number }[];
};

async function columnExists(
  client: Client,
  table: string,
  column: string
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return result.rowCount !== 0;
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [table]
  );
  return result.rowCount !== 0;
}

async function prepareExistingDb(): Promise<void> {
  const initPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  if (!existsSync(initPath) || !existsSync(journalPath)) return;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    if (!(await tableExists(client, "app_user"))) return;

    const isAuthJs =
      (await columnExists(client, "account", "provider")) ||
      (await columnExists(client, "app_user", "password"));
    const isBetterAuth = await columnExists(client, "account", "providerId");

    if (isAuthJs && !isBetterAuth) {
      console.warn(
        "This database still has the Auth.js schema — skipping drizzle-kit migrate so pnpm dev can start."
      );
      console.warn(
        "Do not apply drizzle/0000_init.sql to it. Finish the DB upgrade with /migrate-to-better-auth."
      );
      await client.end();
      process.exit(0);
    }

    if (!isBetterAuth) return;

    const hash = createHash("sha256")
      .update(readFileSync(initPath, "utf8"))
      .digest("hex");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
    const entry = journal.entries?.find((e) => e.tag === "0000_init");
    if (!entry) return;

    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const existing = await client.query(
      `SELECT 1 FROM drizzle.__drizzle_migrations
       WHERE hash = $1 OR created_at = $2
       LIMIT 1`,
      [hash, entry.when]
    );
    if ((existing.rowCount ?? 0) > 0) return;

    console.log(
      "Baselining drizzle/0000_init.sql (existing database was created with drizzle-kit push)."
    );
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
       VALUES ($1, $2)`,
      [hash, entry.when]
    );
  } finally {
    await client.end();
  }
}

await prepareExistingDb();

console.log("Running database migrations...");
execSync("pnpm exec drizzle-kit migrate", { stdio: "inherit" });
console.log("Migrations complete.");
