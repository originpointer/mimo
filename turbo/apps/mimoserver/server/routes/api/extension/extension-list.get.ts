import { eventHandler } from "h3";
import { listExtensionRecords } from "@/stores/extensionStore";

export default eventHandler(async () => {
  const items = await listExtensionRecords();
  return { ok: true, data: items };
});
