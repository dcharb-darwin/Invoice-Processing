import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbDir = path.resolve(__dirname, "../../data");
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, "ipc.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const db = drizzle(sqlite);

console.log("Running migrations...");
migrate(db, { migrationsFolder: path.resolve(__dirname, "migrations") });
console.log("✅ Migrations complete.");

sqlite.close();
