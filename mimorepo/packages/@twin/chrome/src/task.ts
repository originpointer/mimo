/**
 * Task 对象 - 管理浏览器任务的生命周期
 *
 * 封装任务相关的状态，包括关联的 Tab 和 TabGroup。
 * 通过事件通知外部系统（如插件）执行实际的浏览器操作。
 */

import { EventEmitter } from 'events';
import { TabGroupColor } from './types';
import { TwinControlCenter } from './controlCenter';



export interface TaskConfig {
    /** 任务名称 */
    name: string;
    /** 任务颜色 */
    color: TabGroupColor;
    /** 初始 URL 列表 */
    urls?: string[];
}

export interface TaskGroupProxy {
    color: TabGroupColor;
    title: string;
}

export interface TaskEvents {
    /** 任务初始化事件，请求创建 Tab 和 Group */
    task_init: [config: TaskConfig];
    /** 任务组配置变更事件 */
    group_config_change: [changes: Partial<TaskGroupProxy>];
    /** 任务销毁事件 */
    task_destroyed: [];
}

export class Task extends EventEmitter {
    public readonly taskId: string;
    private _config: TaskConfig;
    private controlCenter?: TwinControlCenter;



    /** 关联的 Tab ID */
    public tabId: number | null = null;
    /** 关联的 Group ID */
    public groupId: number | null = null;

    /** Group 属性代理 */
    public readonly group: TaskGroupProxy;

    constructor(taskId: string, config: TaskConfig, controlCenter?: TwinControlCenter) {
        super();
        this.taskId = taskId;
        this._config = { ...config };
        this.controlCenter = controlCenter;



        // 初始化 Group 代理
        this.group = this.createGroupProxy();

        // 在下一帧发出初始化事件，确保监听器已注册
        process.nextTick(() => {
            this.emit('task_init', this._config);
        });
    }

    private createGroupProxy(): TaskGroupProxy {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return new Proxy(
            {
                color: this._config.color,
                title: this._config.name,
            },
            {
                set(target, p, newValue, receiver) {
                    const prop = p as keyof TaskGroupProxy;
                    const oldValue = target[prop];

                    // 如果值没有变化，直接返回
                    if (oldValue === newValue) {
                        return true;
                    }

                    // 更新内部状态
                    Reflect.set(target, p, newValue, receiver);

                    // 更新 config 中的对应值
                    if (prop === 'color') {
                        self._config.color = newValue as TabGroupColor;
                    } else if (prop === 'title') {
                        self._config.name = newValue as string;
                    }

                    // 发出变更事件
                    self.emit('group_config_change', { [prop]: newValue });

                    return true;
                },
            }
        );
    }

    /**
     * 销毁任务
     */
    destroy(): void {
        this.emit('task_destroyed');
        this.removeAllListeners();
        this.removeAllListeners();
    }

    /**
     * Navigate the task's tab to a URL
     */
    async navigate(url: string): Promise<void> {
        if (!this.controlCenter) {
            console.warn(`Task ${this.taskId}: Control center not available for navigation`);
            return;
        }

        await this.controlCenter.dispatch('browser_navigate', { url });
    }

}

/**
 * 类型安全的 EventEmitter 增强
 */
export interface Task {
    on<K extends keyof TaskEvents>(
        event: K,
        listener: (...args: TaskEvents[K]) => void
    ): this;
    emit<K extends keyof TaskEvents>(
        event: K,
        ...args: TaskEvents[K]
    ): boolean;
    off<K extends keyof TaskEvents>(
        event: K,
        listener: (...args: TaskEvents[K]) => void
    ): this;
}
