import { eventHandler, getRouterParam } from "h3";
import { getTask, upsertTask } from "@/stores/taskStore";
import { getMessages } from "@/stores/messageStore";

export default eventHandler(async (event) => {
  const taskId = getRouterParam(event, "taskId");
  if (!taskId) {
    event.node.res.statusCode = 400;
    return { ok: false, error: { code: "BAD_REQUEST", message: "missing taskId" } };
  }

  let task = await getTask(taskId);
  if (!task) {
    task = await upsertTask(taskId, { status: "created" });
  }

  const messages = await getMessages(taskId);

  return {
    ok: true,
    data: {
      task,
      messages,
    },
  };
});
