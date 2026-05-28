const DB_NAME = "wash360_offline";
const STORE = "bingo_submissions";
const DB_VERSION = 1;

export interface QueuedSubmission {
  id?: number;
  card_id: string;
  user_id: string;
  category: string;
  photo_data_url: string;
  photo_hash: string;
  item_count: number;
  is_extra: boolean;
  points_awarded: number;
  queued_at: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(submission: Omit<QueuedSubmission, "id">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(submission);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeueAll(): Promise<QueuedSubmission[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedSubmission[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteById(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushQueue(
  supabase: ReturnType<typeof import("@/lib/supabase").createClient>
): Promise<void> {
  const items = await dequeueAll();
  if (!items.length) return;

  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (const item of items) {
    try {
      await db.from("bingo_submissions").insert({
        card_id: item.card_id,
        user_id: item.user_id,
        category: item.category,
        photo_path: "offline/placeholder.jpg",
        photo_hash: item.photo_hash,
        ml_confidence: 0.8,
        item_count: item.item_count,
        is_extra: item.is_extra,
        status: "pending",
        points_awarded: item.points_awarded,
        location: null,
        synced_at: new Date().toISOString(),
      });
      if (item.id !== undefined) await deleteById(item.id);
    } catch {
      // Leave in queue to retry next time
    }
  }
}
