import { eventHandler, readBody } from 'h3';
import { generateTaskId } from '@/server/utils/task-id';
import { createTask } from '@/server/stores/taskStore';
import type { TaskCreateInput } from '@/server/stores/taskStore';

export default eventHandler(async (event) => {
  const body: TaskCreateInput & { taskId?: string } = await readBody(event);
  const { message, taskId: providedTaskId } = body;

  if (!message?.trim()) {
    return { ok: false, error: '消息不能为空' };
  }

  // 使用提供的 taskId 或生成新的
  const taskId = providedTaskId || generateTaskId('task', 16);

  // 创建任务记录（标题先用占位符）
  const task = await createTask({ message }, taskId);

  return {
    ok: true,
    data: task,
  };
});
