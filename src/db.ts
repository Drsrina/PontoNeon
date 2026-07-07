import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";

const DB_FILE = path.join(process.cwd(), "database.sqlite");

let dbInstance: any = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: DB_FILE,
      driver: sqlite3.Database,
    });
  }
  return dbInstance;
}

export const db = {
  async exec(sql: string): Promise<void> {
    const database = await getDb();
    await database.exec(sql);
  },

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    const database = await getDb();
    const result = await database.run(sql, params);
    return {
      lastID: result.lastID,
      changes: result.changes,
    };
  },

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const database = await getDb();
    return database.get(sql, params) as Promise<T | undefined>;
  },

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await getDb();
    return database.all(sql, params) as Promise<T[]>;
  },
};
