import { BrowserTransport, BrowserActionName, BrowserObservation } from '@bion/browser-tools';

// Twin控制中心配置接口
export interface TwinControlCenterConfig {
    transport: BrowserTransport;      // 浏览器传输层，用于执行浏览器操作
    sessionId: string;                // 会话ID，用于标识当前会话
    clientId: string;                  // 客户端ID，用于标识客户端
    createActionId: () => string;     // 创建操作ID的函数
}

// Twin控制中心类，用于管理和执行浏览器操作
export class TwinControlCenter {
    private config: TwinControlCenterConfig | null = null;  // 配置对象，初始为空

    // 设置配置信息
    setConfig(config: TwinControlCenterConfig) {
        this.config = config;
    }

    // 检查控制中心是否已准备就绪（配置是否已设置）
    isReady(): boolean {
        return this.config !== null;
    }

    // 分发浏览器操作并返回观察结果
    async dispatch(
        actionName: BrowserActionName,        // 操作名称
        params: Record<string, unknown>       // 操作参数
    ): Promise<BrowserObservation | null> {
        // 检查配置是否已设置，如果未配置则发出警告并返回null
        if (!this.config) {
            console.warn('TwinControlCenter: Transport not configured, ignoring command', actionName);
            return null;
        }

        // 从配置中解构所需的属性
        const { transport, sessionId, clientId, createActionId } = this.config;
        const actionId = createActionId();  // 创建唯一的操作ID

        try {
            // 通过传输层执行浏览器操作
            const result = await transport.execute({
                sessionId,
                clientId,
                actionId,
                actionName,
                params,
            });

            // 检查执行结果是否为错误状态
            if (result.status === 'error') {
                console.error(`TwinControlCenter: Command ${actionName} failed`, result.error);
                throw new Error(result.error);
            }

            // 返回观察结果，如果没有观察结果则返回null
            return result.observation ?? null;
        } catch (error) {
            // 捕获并处理分发过程中的错误
            console.error(`TwinControlCenter: Error dispatching ${actionName}`, error);
            throw error;
        }
    }
}
