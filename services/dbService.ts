/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const DB_NAME = 'nano-banana-session-db';
const DB_VERSION = 1;
const STORE_NAME = 'edit-session';
const SESSION_KEY = 'current-session';

export interface SessionData {
  id: string;
  history: (File & { lastModified: number })[]; // Ensure lastModified is available for reconstruction
  historyIndex: number;
  credits: number;
}

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBRequest).error);
      reject("IndexedDB error");
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSession = async (sessionData: Omit<SessionData, 'id'>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const dataToStore: SessionData = { ...sessionData, id: SESSION_KEY };
    
    // Use structured cloning directly, which correctly handles File objects.
    // JSON.stringify would corrupt the File data.
    const request = store.put(dataToStore);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
        console.error("Failed to save session:", (event.target as IDBRequest).error);
        reject("Failed to save session");
    };
  });
};

export const loadSession = async (): Promise<SessionData | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(SESSION_KEY);

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest<SessionData>).result;
      resolve(result || null);
    };
    request.onerror = (event) => {
      console.error("Failed to load session:", (event.target as IDBRequest).error);
      reject("Failed to load session");
    };
  });
};

export const clearSession = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(SESSION_KEY);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error("Failed to clear session:", (event.target as IDBRequest).error);
      reject("Failed to clear session");
    };
  });
};