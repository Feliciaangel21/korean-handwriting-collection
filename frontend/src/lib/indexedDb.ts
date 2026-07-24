import { openDB, type IDBPDatabase } from "idb";
import type { CollectionSession } from "./types";

const DB_NAME = "handwriting-collection";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "writer.anonymousCode" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSession(session: CollectionSession): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, session);
}

export async function loadSession(anonymousCode: string): Promise<CollectionSession | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, anonymousCode);
}

export async function deleteSession(anonymousCode: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, anonymousCode);
}
