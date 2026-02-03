import { eventHandler, getRouterParam } from 'h3';
import { getTask } from '@/server/stores/taskStore';

export default eventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');

  if (!taskId) {
    return { ok: false, error: '缺少 taskId' };
  }

  const task = await getTask(taskId);

  return {
    ok: true,
    data: task,
  };
});
