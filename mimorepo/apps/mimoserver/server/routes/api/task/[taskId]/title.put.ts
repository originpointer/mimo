import { eventHandler, getRouterParam, readBody } from 'h3';
import { updateTaskTitle } from '~/stores/taskStore';

export default eventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');

  if (!taskId) {
    return { ok: false, error: '缺少 taskId' };
  }

  const { title } = await readBody(event);

  if (!title?.trim()) {
    return { ok: false, error: '标题不能为空' };
  }

  const task = await updateTaskTitle(taskId, title);

  if (!task) {
    return { ok: false, error: '任务不存在' };
  }

  return {
    ok: true,
    data: task,
  };
});
