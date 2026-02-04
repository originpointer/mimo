
import { EventEmitter } from 'events';
import { SystemState, TabGroupState, TabState } from './types';
import type { SystemManagerEvents, SystemStateChangeEvent } from './types';
import { Task, TaskConfig } from './task';
import { TwinControlCenter } from './controlCenter';
import { TabGroup } from './tabGroup';
import { Tab } from './tab';




/**
 * System State Manager (Background Session)
 * Manages the lifecycle state of the background session.
 */
export class SystemStateManager extends EventEmitter {
    private _currentState: SystemState;
    private _tasks: Map<string, Task>;
    private _groups: Map<number, TabGroup>;
    private _tabs: Map<number, Tab>; // Maintain active Tab objects
    private _controlCenter: TwinControlCenter;




    constructor(initialState: SystemState = SystemState.Stopped) {
        super();
        this._currentState = initialState;
        this._tasks = new Map();
        this._groups = new Map();
        this._tabs = new Map();
        this._controlCenter = new TwinControlCenter();
    }


    /**
     * Get the control center
     */
    get controlCenter(): TwinControlCenter {
        return this._controlCenter;
    }


    /**
     * Get the current state
     */
    get state(): SystemState {
        return this._currentState;
    }

    /**
     * Transition to a new state
     * @param newState The target state to transition to
     */
    setState(newState: SystemState): void {
        if (this._currentState === newState) return;

        const oldState = this._currentState;
        this._currentState = newState;

        const event: SystemStateChangeEvent = {
            newState,
            oldState,
            timestamp: Date.now(),
        };

        this.emit('state_changed', event);
    }

    /**
     * Helper methods for setting specific states
     */

    setRunning(): void {
        this.setState(SystemState.Running);
    }

    setStopped(): void {
        this.setState(SystemState.Stopped);
    }

    setTakeover(): void {
        this.setState(SystemState.Takeover);
    }

    setOngoing(): void {
        this.setState(SystemState.Ongoing);
    }

    setCompleted(): void {
        this.setState(SystemState.Completed);
    }

    setWaiting(): void {
        this.setState(SystemState.Waiting);
    }

    setError(): void {
        this.setState(SystemState.Error);
    }

    /**
     * Check if currently in a specific state
     */
    is(state: SystemState): boolean {
        return this._currentState === state;
    }

    /**
     * Create a new task
     * @param taskId Unique task identifier
     * @param config Task configuration
     */
    createTask(taskId: string, config: TaskConfig): Task {
        if (this._tasks.has(taskId)) {
            throw new Error(`Task with ID ${taskId} already exists`);
        }

        const task = new Task(taskId, config, this._controlCenter);


        this._tasks.set(taskId, task);

        // 当任务销毁时自动移除
        task.once('task_destroyed', () => {
            this.removeTask(taskId);
        });

        return task;
    }

    /**
     * Get a task by ID
     * @param taskId Task identifier
     */
    getTask(taskId: string): Task | undefined {
        return this._tasks.get(taskId);
    }

    /**
     * Remove a task
     * @param taskId Task identifier
     */
    removeTask(taskId: string): void {
        const task = this._tasks.get(taskId);
        if (task) {
            this._tasks.delete(taskId);
            // 确保任务清理资源
            task.destroy();
        }
    }

    /**
     * Get all active tasks
     */
    getAllTasks(): Task[] {
        return Array.from(this._tasks.values());
    }

    // ========== TabGroup Management ==========

    /**
     * Create or update a TabGroup
     */
    syncTabGroup(state: TabGroupState): TabGroup {
        let group = this._groups.get(state.id);
        if (group) {
            group.updateFromState(state);
        } else {
            group = new TabGroup(state, this._controlCenter);
            this._groups.set(state.id, group);
        }
        return group;
    }

    /**
     * Get a TabGroup by ID
     */
    getTabGroup(groupId: number): TabGroup | undefined {
        return this._groups.get(groupId);
    }

    /**
     * Remove a TabGroup
     */
    removeTabGroup(groupId: number): void {
        this._groups.delete(groupId);
        // Note: Chrome API closes the group, state update follows. Here we just remove reference.
    }

    /**
     * Get all TabGroups
     */
    getAllTabGroups(): TabGroup[] {
        return Array.from(this._groups.values());
    }

    // ========== Tab Management & Helpers ==========

    /**
     * Sync a Tab object (should be called when tab state updates)
     * In a real full twin integration, this might be connected to the Store events
     */
    syncTab(tabState: TabState): Tab {
        let tab = this._tabs.get(tabState.id);
        if (tab) {
            // In a real scenario we would sync properties here
            // For now we assume Tab object manages its own update if it's the same instance,
            // or we replace it / update it.
            // Since Tab class has syncFromRawData, we might use that if we had raw data.
            // But TabState is slightly different.
            // Let's simplified assumption: we are just tracking references here mostly
            // provided by an external updater or created here.

            // Check if we need to simplify this. The user requested getTabsByGroupId.
            // So we must track them.
        } else {
            // Tab Constructor takes TabRawData. tabState is TabState (which matches RawData mostly)
            // We cast for simplicity or need a adapter.
            // TabRawData and TabState are compatible for most parts.
            tab = new Tab(tabState as any);
            this._tabs.set(tabState.id, tab);
        }

        // Update properties if needed.
        // For this specific 'getTabsByGroupId' requirement, we just need to ensure the tab is in the map
        // and its groupId is correct.
        if (tab.id === tabState.id) {
            tab.groupId = tabState.groupId;
        }

        return tab;
    }

    removeTab(tabId: number): void {
        this._tabs.delete(tabId);
    }

    /**
     * Get Tabs by Group ID
     */
    getTabsByGroupId(groupId: number): Tab[] {
        return Array.from(this._tabs.values()).filter(tab => tab.groupId === groupId);
    }
}


/**
 * Type-safe interface for SystemStateManager
 */
export interface SystemStateManager {
    on<K extends keyof SystemManagerEvents>(
        event: K,
        listener: (...args: SystemManagerEvents[K]) => void
    ): this;
    emit<K extends keyof SystemManagerEvents>(
        event: K,
        ...args: SystemManagerEvents[K]
    ): boolean;
    off<K extends keyof SystemManagerEvents>(
        event: K,
        listener: (...args: SystemManagerEvents[K]) => void
    ): this;
}
