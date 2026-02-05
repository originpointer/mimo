"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Search,
  Library,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskRecord } from "@/lib/types";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const pathname = usePathname();

  const sidebarWidth = isCollapsed ? "w-[52px]" : "w-[300px]";

  const navItems = [
    {
      icon: Plus,
      label: "新建任务",
      shortcut: null,
      href: "/chat",
    },
    {
      icon: Search,
      label: "搜索",
      shortcut: "K",
    },
    {
      icon: Library,
      label: "库",
      shortcut: null,
    },
  ];

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const bionUrl = process.env.NEXT_PUBLIC_BION_URL || "http://localhost:6007";
        const res = await fetch(`${bionUrl}/api/task/list`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            setTasks(json.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className={cn(
        "bg-background border-r border-border flex flex-col transition-all duration-200 h-full start-0 z-10",
        sidebarWidth,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 py-3">
        {!isCollapsed && (
          <div className="flex gap-1">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <MessageSquare className="size-4 text-primary-foreground" />
            </div>
            <div className="size-8 rounded-md bg-muted flex items-center justify-center">
              <FileText className="size-4 text-muted-foreground" />
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center size-8 rounded-md hover:bg-muted cursor-pointer transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4 text-foreground" />
          ) : (
            <PanelLeftClose className="size-4 text-foreground" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col flex-1 min-h-0 p-2 pb-0 gap-px">
        {navItems.map((item) => {
          const content = (
            <>
              <div className="shrink-0 size-[18px] flex items-center justify-center">
                <item.icon className="size-[18px] text-foreground" />
              </div>
              {!isCollapsed && (
                <>
                  <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <div className="shrink-0 flex items-center gap-1">
                      <div className="text-muted-foreground text-sm hidden group-hover:flex items-center gap-1 pr-2">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          {item.shortcut}
                        </kbd>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          );

          const className = cn(
            "flex items-center rounded-[10px] cursor-pointer transition-colors hover:bg-accent w-full h-9 pointer-events-auto",
            isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-2.5 pr-0.5"
          );

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button key={item.label} className={className}>
              {content}
            </button>
          );
        })}

        {/* Divider */}
        {!isCollapsed && (
          <div className="w-full border-t border-border my-2" />
        )}

        {/* Projects and Tasks Section */}
        {!isCollapsed && (
          <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
            <div className="flex flex-col gap-px flex-1">

              {/* Projects Section */}
              <div className="group flex items-center justify-between px-2.5 py-0.5 h-9 gap-3 cursor-pointer hover:bg-accent transition-colors rounded-[10px]">
                <div className="flex items-center flex-1 min-w-0 gap-0.5">
                  <span className="text-[13px] leading-[18px] text-muted-foreground font-medium min-w-0 truncate">
                    项目
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                </div>
                <button className="flex items-center justify-center size-8 rounded-md hover:bg-muted">
                  <Plus className="size-3 text-foreground" />
                </button>
              </div>

              {/* Projects Content */}
              <div className="overflow-hidden">
                <div className="w-full flex flex-col gap-px">
                  <button className="w-full flex items-center rounded-[10px] h-9 px-2.5 pr-2 gap-2 hover:bg-accent cursor-pointer">
                    <FolderOpen className="size-4 text-foreground" />
                    <span className="text-foreground text-sm">新项目</span>
                  </button>
                  <ul className="flex flex-col gap-px" />
                </div>
              </div>

              {/* All Tasks Section */}
              <div className="group flex items-center justify-between px-2.5 py-0.5 h-9 gap-3 cursor-pointer hover:bg-accent transition-colors rounded-[10px] mt-2">
                <div className="flex items-center flex-1 min-w-0 gap-0.5">
                  <span className="text-[13px] leading-[18px] text-muted-foreground font-medium min-w-0 truncate">
                    所有任务
                  </span>
                  <Layers className="size-3 text-muted-foreground shrink-0" />
                </div>
                <button className="flex items-center justify-center size-8 rounded-md hover:bg-muted">
                  <MoreHorizontal className="size-3 text-foreground" />
                </button>
              </div>

              {/* Task List */}
              <div className="overflow-hidden">
                <div className="flex flex-col gap-px">
                  {tasks.map((task) => {
                    const isActive = pathname.startsWith(`/chat/${task.taskId}`);
                    return (
                      <Link
                        key={task.taskId}
                        href={`/chat/${task.taskId}`}
                        className={cn(
                          "flex items-center rounded-[10px] cursor-pointer transition-colors w-full gap-3 h-9 px-2.5 pr-0.5 group",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent text-foreground"
                        )}
                      >
                        <div className="shrink-0 size-[18px] flex items-center justify-center">
                          <MessageSquare className="size-[18px]" />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center text-sm">
                          <span className="truncate">{task.title || "Untitled Task"}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state */}
        {isCollapsed && (
          <div className="flex flex-col gap-px mt-2">
            <div className="flex flex-col gap-px py-2">
              <button className="flex items-center justify-center rounded-[10px] cursor-pointer transition-colors hover:bg-accent w-full h-9 p-2">
                <FolderOpen className="size-[18px] text-foreground" />
              </button>
            </div>
            <div className="w-full border-t border-border" />
            <div className="flex flex-col gap-px py-2 overflow-y-auto">
              {tasks.map((task) => (
                <Link
                  key={task.taskId}
                  href={`/chat/${task.taskId}`}
                  className={cn(
                    "flex items-center justify-center rounded-[10px] cursor-pointer transition-colors hover:bg-accent w-full h-9 p-2",
                    pathname.startsWith(`/chat/${task.taskId}`) && "bg-accent"
                  )}
                  title={task.title}
                >
                  <MessageSquare className="size-[18px] text-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {/* (Keeping Footer implementation same as original but simplified structure in replace logic) */}
      {/* Re-implementing Footer for completeness */}
      <div className="flex flex-col justify-center items-start gap-2 bg-background p-2 overflow-hidden border-t border-border mt-auto">
        {!isCollapsed ? (
          <div className="flex items-center w-full p-0.5 justify-between">
            <div className="flex items-center gap-1">
              {/* <button className="flex items-center justify-center cursor-pointer rounded-md hover:bg-muted size-8">
                <Settings className="size-4 text-foreground" />
              </button> */}
              {/* <button className="flex items-center justify-center cursor-pointer rounded-md hover:bg-muted size-8">
                <HelpCircle className="size-4 text-foreground" />
              </button> */}
            </div>
            {/* <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center cursor-pointer rounded-md hover:bg-muted size-8"
            >
              <Github className="size-4 text-foreground" />
            </a> */}
          </div>
        ) : (
          <div className="flex items-center p-0.5 flex-wrap gap-1 w-[52px]">
            {/* Collapsed footer icons */}
          </div>
        )}
      </div>
    </nav>
  );
}
