import { eventHandler } from "h3";
import { createTaskId } from "@repo/mimo-utils";

export default eventHandler(() => {
  const taskId = createTaskId();
  return { ok: true, data: { taskId } };
});
