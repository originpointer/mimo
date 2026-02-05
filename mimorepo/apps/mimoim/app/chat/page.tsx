import { ChatPageClient } from "./[id]/chat-page-client";


export default async function ChatPage() {
    const bionUrl = process.env.NEXT_PUBLIC_BION_URL || "http://localhost:6007";

    let taskId: string | undefined;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const res = await fetch(`${bionUrl}/api/task/id`, {
            cache: "no-store",
            signal: controller.signal
        }).catch(() => null); // Catch network errors immediately

        clearTimeout(timeoutId);

        if (res?.ok) {
            const json = await res.json();
            taskId = json.data?.taskId;
        }
    } catch (error) {
        // Silently fail and fallback
    }

    if (!taskId) {
        // Fallback to local UUID if backend fails or times out
        const { generateUUID } = await import("@/lib/utils");
        taskId = generateUUID();
    }

    return <ChatPageClient chatId={taskId} />;
}
