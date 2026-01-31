/**
 * 浏览器会话
 */
export interface BrowserSession {
    /** 客户端ID */
    clientId: string;
    /** 浏览器名称 */
    browserName: string;
    /** User-Agent */
    ua: string;
    /** 是否允许其他客户端接管 */
    allowOtherClient: boolean;
    /** 当前URL */
    currentUrl?: string;
    /** 当前标题 */
    currentTitle?: string;
    /** 视口信息 */
    viewport?: {
        width: number;
        height: number;
        deviceScaleFactor: number;
    };
    /** 连接状态 */
    connected: boolean;
}

/**
 * 浏览器操作类型
 */
export enum BrowserActionType {
    NAVIGATE = 'browser_navigate',
    CLICK = 'browser_click',
    FILL = 'browser_fill',
    SCREENSHOT = 'browser_screenshot',
    GET_CONTENT = 'browser_getContent',
    HOVER = 'browser_hover',
    SELECT = 'browser_select',
    CLOSE = 'browser_close',
    EVALUATE = 'browser_evaluate',
}

/**
 * DOM元素表示
 * 参考来源: Manus.im elements格式
 */
export interface DOMElement {
    /** 元素索引 */
    index: number;
    /** 元素标签 */
    tag: string;
    /** 元素ID */
    id?: string;
    /** 元素类名 */
    classes?: string[];
    /** 元素属性 */
    attributes?: Record<string, string>;
    /** 元素文本内容 */
    text?: string;
    /** 可见性 */
    visible?: boolean;
    /** 可交互性 */
    interactive?: boolean;
    /** XPath选择器 */
    xpath?: string;
    /** CSS选择器 */
    selector?: string;
}

/**
 * 页面内容
 * 参考来源: Manus.im markdown格式
 */
export interface PageContent {
    /** 页面URL */
    url: string;
    /** 页面标题 */
    title: string;
    /** 元素表示 */
    elements: string;
    /** Markdown摘要 */
    markdown: string;
    /** 完整Markdown */
    fullMarkdown: string;
    /** 视口宽度 */
    viewportWidth: number;
    /** 视口高度 */
    viewportHeight: number;
    /** 上方不可见像素 */
    pixelsAbove: number;
    /** 下方不可见像素 */
    pixelsBelow: number;
    /** 新打开的页面 */
    newPages: any[];
}

/**
 * 文件系统接口
 */
export interface FileSystem {
    /** 读取文件 */
    read(path: string, encoding?: BufferEncoding): Promise<string>;
    /** 写入文件 */
    write(path: string, content: string): Promise<void>;
    /** 编辑文件 */
    edit(path: string, edits: FileEdit[]): Promise<void>;
    /** 删除文件 */
    delete(path: string): Promise<void>;
    /** 列出目录 */
    list(path: string): Promise<string[]>;
    /** 检查存在 */
    exists(path: string): Promise<boolean>;
}

/**
 * 文件编辑操作
 */
export interface FileEdit {
    /** 旧文本 */
    oldText: string;
    /** 新文本 */
    newText: string;
}

/**
 * 内存存储接口
 */
export interface MemoryStore {
    /** 保存记忆 */
    save(key: string, value: any, metadata?: Record<string, any>): Promise<void>;
    /** 搜索记忆 */
    search(query: string, topK?: number): Promise<MemoryItem[]>;
    /** 获取记忆 */
    get(key: string): Promise<MemoryItem | null>;
    /** 删除记忆 */
    delete(key: string): Promise<void>;
    /** 清空记忆 */
    clear(): Promise<void>;
}

/**
 * 记忆项
 */
export interface MemoryItem {
    key: string;
    value: any;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
    /** 向量嵌入 (用于语义搜索) */
    embedding?: number[];
}

// Logger 从 utils/logger.ts 导入
export type { Logger } from '../utils/logger';
