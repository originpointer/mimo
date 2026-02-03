import { eventHandler } from 'h3';
import { generateTaskId } from '~/utils/task-id';

/**
 * 生成新的任务 ID
 * GET /api/task/id
 */
export default eventHandler(() => {
  const taskId = generateTaskId('task', 16);
  return {
    ok: true,
    data: { taskId },
  };
});
