import { eventHandler, getRouterParam } from 'h3';
import { loadMessagesByTaskId, toUIMessages } from '@/server/utils/load-messages';

export default eventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');

  if (!taskId) {
    return { ok: false, error: '缺少 taskId' };
  }

  try {
    const storedMessages = await loadMessagesByTaskId(taskId);
    const uiMessages = toUIMessages(storedMessages);

    return {
      ok: true,
      data: {
        taskId,
        messages: uiMessages,
        count: uiMessages.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '加载消息失败',
    };
  }
});
