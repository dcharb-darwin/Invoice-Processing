import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbDir = path.resolve(__dirname, "../../data");
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, "ipc.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent reads
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Run migrations on import if called directly
if (process.argv[1]?.includes("migrate")) {
    console.log("Running migrations...");
    migrate(db, { migrationsFolder: path.resolve(__dirname, "migrations") });
    console.log("Migrations complete.");
}
