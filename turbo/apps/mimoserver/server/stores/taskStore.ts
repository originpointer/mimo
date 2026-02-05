import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { join } from "node:path";


export type TaskStatus = "created" | "running" | "ongoing" | "takeover" | "completed" | "error";

export type TaskRecord = {
  taskId: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  selectedClientId?: string;
  currentUrl?: string;
};

export type TaskCreateInput = {
  title?: string;
  status?: TaskStatus;
};

const STORAGE_BASE = join(process.cwd(), ".data", "kv");

// Create a singleton storage instance
let storageInstance: ReturnType<typeof createStorage> | null = null;

async function getStorage() {
  if (!storageInstance) {
    storageInstance = createStorage({
      driver: fsDriver({
        base: STORAGE_BASE,
      }),
    });
  }
  return storageInstance;
}

function keyByTaskId(taskId: string) {
  return `tasks:task:${taskId}`;
}

export async function createTask(taskId: string, input?: TaskCreateInput): Promise<TaskRecord> {
  const storage = await getStorage();
  const now = Date.now();

  const task: TaskRecord = {
    taskId,
    title: input?.title ?? "新任务",
    status: input?.status ?? "created",
    createdAt: now,
    updatedAt: now,
  };

  await storage.setItem(keyByTaskId(taskId), task);
  return task;
}

export async function getTask(taskId: string): Promise<TaskRecord | null> {
  const storage = await getStorage();
  const value = await storage.getItem<TaskRecord>(keyByTaskId(taskId));
  return value ?? null;
}

export async function upsertTask(taskId: string, update: Partial<TaskRecord>): Promise<TaskRecord> {
  const storage = await getStorage();
  const existing = await storage.getItem<TaskRecord>(keyByTaskId(taskId));
  const now = Date.now();

  const next: TaskRecord = {
    taskId,
    title: existing?.title ?? "新任务",
    status: existing?.status ?? "created",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    selectedClientId: existing?.selectedClientId,
    currentUrl: existing?.currentUrl,
    ...update,
  };

  await storage.setItem(keyByTaskId(taskId), next);
  return next;
}

export async function listTasks(): Promise<TaskRecord[]> {
  const storage = await getStorage();
  const keys = await storage.getKeys();
  const taskKeys = keys.filter((k: string) => k.startsWith("tasks:task:"));
  if (!taskKeys.length) return [];

  const items = await storage.getItems<TaskRecord>(taskKeys);
  const tasks = items.map((it: any) => it?.value).filter((it: any): it is TaskRecord => Boolean(it));

  return tasks.sort((a: TaskRecord, b: TaskRecord) => b.updatedAt - a.updatedAt);
}
