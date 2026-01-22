import { redirect } from "next/navigation";

import { createChat } from "@/lib/chat-store";

export async function newTask(formData: FormData) {
  "use server";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const id = await createChat();
  if (prompt) {
    const qs = new URLSearchParams({ prompt });
    redirect(`/chat/${id}?${qs.toString()}`);
  }
  redirect(`/chat/${id}`);
}

