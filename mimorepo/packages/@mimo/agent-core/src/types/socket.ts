/**
 * Socket.IO事件类型
 * 参考来源: Manus.im socket消息格式
 */
export enum SocketEventType {
    // 连接事件
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    ERROR = 'error',

    // 插件事件 (后端 <-> 插件)
    ACTIVATE_EXTENSION = 'activate_extension',
    EXTENSION_CONNECTED = 'my_browser_extension_connected',
    BROWSER_EXTENSION_MESSAGE = 'my_browser_extension_message',

    // 前端事件 (后端 <-> 前端)
    MESSAGE = 'message',
    USER_MESSAGE = 'user_message',
    SELECT_MY_BROWSER = 'select_my_browser',

    // 会话事件
    SESSION_STATUS = 'session_status',

    // 浏览器操作
    BROWSER_ACTION = 'browser_action',
    BROWSER_GET_CONTENT = 'browser_get_content',
}

/**
 * 前端消息类型
 */
export enum FrontendMessageType {
    // 聊天相关
    CHAT = 'chat',
    CHAT_DELTA = 'chatDelta',

    // 状态相关
    LIVE_STATUS = 'liveStatus',
    STATUS_UPDATE = 'statusUpdate',

    // 计划相关
    PLAN_UPDATE = 'planUpdate',
    NEW_PLAN_STEP = 'newPlanStep',

    // 工具相关
    TOOL_USED = 'toolUsed',

    // 思考过程
    EXPLANATION = 'explanation',

    // 浏览器选择
    MY_BROWSER_SELECTION = 'myBrowserSelection',

    // 队列相关
    QUEUE_STATUS_CHANGE = 'queueStatusChange',

    // 沙箱相关
    SANDBOX_UPDATE = 'sandboxUpdate',

    // 任务模式
    TASK_MODE_CHANGED = 'taskModeChanged',
}

/**
 * 扩展激活消息
 * 参考来源: Manus.im activate_extension
 */
export interface ActivateExtensionMessage {
    type: 'activate_extension';
    id: string;
    clientId: string;
    ua: string;
    version: string;
    browserName: string;
    allowOtherClient: boolean;
    skipAuthorization: boolean;
}

/**
 * 扩展连接响应
 */
export interface ExtensionConnectedMessage {
    type: 'my_browser_extension_connected';
    id: string;
    success: boolean;
    roomId: string;
    clientId: string;
    timestamp: number;
}

/**
 * 会话状态消息
 * 参考来源: Manus.im session_status
 */
export interface SessionStatusMessage {
    type: 'session_status';
    sessionId: string;
    sessionTitle: string;
    status: 'running' | 'stopped';
    timestamp: number;
}

/**
 * 浏览器操作消息
 * 参考来源: Manus.im browser_action
 */
export interface BrowserActionMessage {
    type: 'browser_action';
    sessionId: string;
    actionId: string;
    clientId: string;
    timestamp: number;
    action: {
        [actionType: string]: {
            brief?: string;
            intent?: 'navigational' | 'interaction';
            [key: string]: any;
        };
    };
    screenshotPresignedUrl?: string;
    cleanScreenshotPresignedUrl?: string;
}

/**
 * 浏览器操作结果
 * 参考来源: Manus.im browser result
 */
export interface BrowserActionResult {
    status: 'success' | 'error';
    actionId: string;
    result?: {
        url: string;
        title: string;
        elements: string;
        markdown: string;
        fullMarkdown: string;
        viewportWidth: number;
        viewportHeight: number;
        pixelsAbove: number;
        pixelsBelow: number;
        newPages: any[];
        screenshotUploaded: boolean;
        cleanScreenshotUploaded: boolean;
    };
    error?: string;
}

/**
 * 前端消息事件
 * 参考来源: Manus.im message events
 */
export interface FrontendMessageEvent {
    type: 'event';
    id: string;
    sessionId: string;
    timestamp: number;
    event: {
        id: string;
        type: FrontendMessageType;
        timestamp: number;
        [key: string]: any;
    };
}

/**
 * 聊天Delta事件
 */
export interface ChatDeltaEvent {
    type: FrontendMessageType.CHAT_DELTA;
    delta: {
        content: string;
        thought?: string;
    };
    finished: boolean;
    sender: 'user' | 'assistant';
    targetEventId: string;
}

/**
 * 实时状态事件
 */
export interface LiveStatusEvent {
    type: FrontendMessageType.LIVE_STATUS;
    text: string;
}

/**
 * 计划更新事件
 */
export interface PlanUpdateEvent {
    type: FrontendMessageType.PLAN_UPDATE;
    tasks: PlanTask[];
}

/**
 * 计划任务
 */
export interface PlanTask {
    status: 'todo' | 'doing' | 'done' | 'error';
    title: string;
    startedAt?: number;
    endAt?: number;
}

/**
 * 工具使用事件
 */
export interface ToolUsedEvent {
    type: FrontendMessageType.TOOL_USED;
    tool: string;
    actionId: string;
    status: 'start' | 'streaming' | 'argumentsFinished' | 'success' | 'error';
    planStepId: string;
    brief?: string;
    description?: string;
    detail?: {
        browser?: {
            toolName: string;
            url?: string;
            screenshot?: string;
            fromMyBrowser?: boolean;
        };
    };
}

/**
 * 思考过程事件
 */
export interface ExplanationEvent {
    type: FrontendMessageType.EXPLANATION;
    content: string;
    status: 'streaming' | 'end';
    planStepId: string;
}

/**
 * 状态更新事件
 */
export interface StatusUpdateEvent {
    type: FrontendMessageType.STATUS_UPDATE;
    agentStatus: import('./agent').AgentStatus;
    brief: string;
    description: string;
    noRender?: boolean;
    planStepId?: string;
}

/**
 * 浏览器选择事件
 */
export interface MyBrowserSelectionEvent {
    type: FrontendMessageType.MY_BROWSER_SELECTION;
    status: 'waiting_for_selection' | 'selected';
    browserCandidates?: BrowserCandidate[];
    connectedBrowser?: BrowserCandidate;
}

/**
 * 浏览器候选
 */
export interface BrowserCandidate {
    client_id: string;
    client_name: string;
    ua: string;
    allow_other_client_id: boolean;
}
