import { eventHandler, getRouterParam } from 'h3';
import { getTask } from '@/server/stores/taskStore';
import { getMessages } from '@/server/stores/messageStore';

export default eventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');

  if (!taskId) {
    return { ok: false, error: '缺少 taskId' };
  }

  const task = await getTask(taskId);
  const messages = await getMessages(taskId);

  return {
    ok: true,
    data: {
      ...task,
      messages,
    },
  };
});
