import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic | null = null;

export async function getSql() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });
  }
  return SQL;
}

export function createDb(data: Uint8Array): Database {
  if (!SQL) throw new Error("SQL.js not initialized");
  return new SQL.Database(data);
}

export function queryDb(db: Database, query: string) {
  return db.exec(query);
}
