"use client";

import { useEffect, useMemo, useState } from "react";
import { useMimoChat } from "@/lib/hooks/use-mimo-chat";
import { useSnapshot } from "@/lib/hooks/use-snapshot";

type TaskRecord = {
  taskId: string;
  title: string;
  status: "created" | "running" | "ongoing" | "takeover" | "completed" | "error";
  createdAt: number;
  updatedAt: number;
  selectedClientId?: string;
  currentUrl?: string;
  tabId?: number;
  groupId?: number;
  windowId?: number;
  debuggerAttached?: boolean;
};

type TaskListResponse = {
  ok: boolean;
  data?: TaskRecord[];
};

type TaskResponse = {
  ok: boolean;
  data?: {
    task: TaskRecord;
    messages?: unknown[];
  };
};

const STATUS_COLORS: Record<TaskRecord["status"], string> = {
  created: "gray",
  running: "blue",
  ongoing: "green",
  takeover: "yellow",
  completed: "gray",
  error: "red",
};

export default function HomePage() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<TaskRecord | null>(null);
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/task/id");
      const data = await res.json();
      setTaskId(data?.data?.taskId || null);
    };
    run();
  }, []);

  // Fetch current task details when taskId changes - poll every 2 seconds
  useEffect(() => {
    if (!taskId) return;
    const run = async () => {
      const res = await fetch(`/api/task/${taskId}`);
      const data = (await res.json()) as TaskResponse;
      if (data.ok && data.data?.task) {
        setTaskData(data.data.task);
      }
    };
    run();
    const interval = setInterval(run, 2000);
    return () => clearInterval(interval);
  }, [taskId]);

  // Fetch all tasks list - poll every 2 seconds
  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/task/list");
      const data = (await res.json()) as TaskListResponse;
      if (data.ok && data.data) {
        setAllTasks(data.data);
      }
    };
    run();
    const interval = setInterval(run, 2000);
    return () => clearInterval(interval);
  }, []);

  const chat = useMimoChat(taskId || "pending");
  const { snapshot, error } = useSnapshot();
  const [input, setInput] = useState("");

  const snapshotText = useMemo(() => {
    if (!snapshot) return "No snapshot";
    return `windows: ${snapshot.windows?.length || 0}\n` +
      `tabs: ${snapshot.tabs?.length || 0}\n` +
      `tabGroups: ${snapshot.tabGroups?.length || 0}\n` +
      `activeWindowId: ${snapshot.activeWindowId}\n` +
      `activeTabId: ${snapshot.activeTabId}\n` +
      `lastUpdated: ${snapshot.lastUpdated}`;
  }, [snapshot]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <main className="container">
      <section className="chat-section">
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

      <section className="status-section">
        <h2>Current Task Status</h2>
        {taskData ? (
          <div className="task-card">
            <div className="task-header">
              <h3>{taskData.title}</h3>
              <span className={`status-badge status-${taskData.status}`}>
                {taskData.status}
              </span>
            </div>
            <div className="task-details">
              <div className="detail-row">
                <span className="detail-label">Task ID:</span>
                <span className="detail-value detail-id">{taskData.taskId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value" style={{ color: STATUS_COLORS[taskData.status] }}>
                  {taskData.status}
                </span>
              </div>
              {taskData.selectedClientId && (
                <div className="detail-row">
                  <span className="detail-label">Client ID:</span>
                  <span className="detail-value detail-client">{taskData.selectedClientId}</span>
                </div>
              )}
              {taskData.currentUrl && (
                <div className="detail-row">
                  <span className="detail-label">Current URL:</span>
                  <span className="detail-value detail-url">{taskData.currentUrl}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Tab ID:</span>
                <span className="detail-value">{taskData.tabId ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tab Group ID:</span>
                <span className="detail-value">{taskData.groupId ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Window ID:</span>
                <span className="detail-value">{taskData.windowId ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Debugger:</span>
                <span className={`detail-value detail-debugger ${taskData.debuggerAttached ? "attached" : "detached"}`}>
                  {taskData.debuggerAttached ? "Attached" : "Detached"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span className="detail-value detail-time">{formatDate(taskData.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Updated:</span>
                <span className="detail-value detail-time">{formatDate(taskData.updatedAt)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="no-data">No task data available</p>
        )}
      </section>

      <section className="snapshot-section">
        <h2>Browser Snapshot</h2>
        {error ? <p className="error">Error: {error}</p> : <pre className="snapshot">{snapshotText}</pre>}
      </section>

      <section className="tasks-section">
        <h2>All Tasks</h2>
        {allTasks.length > 0 ? (
          <div className="tasks-list">
            {allTasks.map((task) => (
              <div
                key={task.taskId}
                className={`task-item ${task.taskId === taskId ? "active" : ""}`}
                onClick={() => setTaskId(task.taskId)}
              >
                <div className="task-item-header">
                  <span className="task-item-title">{task.title}</span>
                  <span className={`status-badge status-${task.status}`}>
                    {task.status}
                  </span>
                </div>
                <div className="task-item-details">
                  <span className="task-item-time">{formatDate(task.updatedAt)}</span>
                  {task.currentUrl && (
                    <span className="task-item-url">{task.currentUrl}</span>
                  )}
                </div>
                <div className="task-item-debugger">
                  <span className={`debugger-indicator ${task.debuggerAttached ? "attached" : "detached"}`}>
                    {task.debuggerAttached ? "●" : "○"} Debugger
                  </span>
                  {task.tabId && <span>Tab: {task.tabId}</span>}
                  {task.groupId && <span>Group: {task.groupId}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No tasks found</p>
        )}
      </section>
    </main>
  );
}
