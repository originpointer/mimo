import { useStorage } from 'nitropack/runtime';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type TaskRecord = {
  taskId: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  initialMessage?: string;
};

export type TaskCreateInput = {
  message: string;
};

const STORAGE_MOUNT = 'data';

function keyByTaskId(taskId: string) {
  return `tasks:task:${taskId}`;
}

export async function createTask(input: TaskCreateInput, taskId: string): Promise<TaskRecord> {
  const storage = useStorage(STORAGE_MOUNT);
  const now = Date.now();

  const task: TaskRecord = {
    taskId,
    title: '新任务',
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
    initialMessage: input.message,
  };

  await storage.setItem(keyByTaskId(taskId), task);

  return task;
}

export async function getTask(taskId: string): Promise<TaskRecord | null> {
  const value = await useStorage(STORAGE_MOUNT).getItem<TaskRecord>(keyByTaskId(taskId));
  return value ?? null;
}

export async function updateTaskTitle(taskId: string, title: string): Promise<TaskRecord | null> {
  const storage = useStorage(STORAGE_MOUNT);
  const task = await storage.getItem<TaskRecord>(keyByTaskId(taskId));

  if (!task) {
    return null;
  }

  task.title = title;
  task.updatedAt = Date.now();

  await storage.setItem(keyByTaskId(taskId), task);

  return task;
}

export async function listTasks(): Promise<TaskRecord[]> {
  const storage = useStorage(STORAGE_MOUNT);
  const keys = await storage.getKeys();
  const taskKeys = keys.filter((k) => k.startsWith('tasks:task:'));
  if (!taskKeys.length) return [];

  const items = await storage.getItems<TaskRecord>(taskKeys);
  const tasks = items.map((it) => it?.value).filter((it): it is TaskRecord => Boolean(it));

  // Sort by createdAt descending
  return tasks.sort((a, b) => b.createdAt - a.createdAt);
}
