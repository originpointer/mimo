import { eventHandler } from 'h3';
import { listTasks } from '@/server/stores/taskStore';

export default eventHandler(async () => {
  const tasks = await listTasks();

  return {
    ok: true,
    data: tasks,
  };
});
