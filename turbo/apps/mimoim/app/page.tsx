"use client";

import { useEffect, useMemo, useState } from "react";
import { useMimoChat } from "@/lib/hooks/use-mimo-chat";
import { useSnapshot } from "@/lib/hooks/use-snapshot";

export default function HomePage() {
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/task/id");
      const data = await res.json();
      setTaskId(data?.data?.taskId || null);
    };
    run();
  }, []);

  const chat = useMimoChat(taskId || "pending");
  const { snapshot, error } = useSnapshot();
  const [input, setInput] = useState("");

  const snapshotText = useMemo(() => {
    if (!snapshot) return "No snapshot";
    return `windows: ${snapshot.windows?.length || 0}\n` +
      `tabs: ${snapshot.tabs?.length || 0}\n` +
      `activeWindowId: ${snapshot.activeWindowId}\n` +
      `activeTabId: ${snapshot.activeTabId}\n` +
      `lastUpdated: ${snapshot.lastUpdated}`;
  }, [snapshot]);

  return (
    <main>
      <section>
        <h1>Mimo Chat</h1>
        <div className="chat-list">
          {chat.messages.map((m) => (
            <div key={m.id} className={`chat-item ${m.role}`}>
              <strong>{m.role}:</strong> {m.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={() => {
              if (!input.trim()) return;
              chat.sendMessage(input.trim());
              setInput("");
            }}
          >
            Send
          </button>
        </div>
      </section>

      <section>
        <h2>Snapshot</h2>
        {error ? <p>Error: {error}</p> : <pre className="snapshot">{snapshotText}</pre>}
      </section>
    </main>
  );
}
