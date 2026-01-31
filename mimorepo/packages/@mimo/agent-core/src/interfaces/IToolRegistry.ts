/**
 * 工具策略
 */
export interface ToolPolicy {
    /** 允许的工具列表 */
    allow?: string[];
    /** 拒绝的工具列表 */
    deny?: string[];
}

/**
 * 工具注册接口
 * 参考来源: OpenClaw 工具注册 + Browser-Use 装饰器
 *
 * 设计原则:
 * 1. 支持动态工具注册
 * 2. 工具分组管理
 * 3. 基于策略的工具过滤
 * 4. 标签化工具发现
 */
export interface IToolRegistry {
    /**
     * 注册单个工具
     * @param tool 工具定义
     */
    register<T>(tool: import('../types').ToolDefinition<T>): void;

    /**
     * 批量注册工具
     * @param tools 工具定义列表
     */
    registerBatch<T>(tools: import('../types').ToolDefinition<T>[]): void;

    /**
     * 注销工具
     * @param name 工具名称
     */
    unregister(name: string): void;

    /**
     * 获取所有工具
     * @returns 工具定义列表
     */
    getTools(): import('../types').ToolDefinition[];

    /**
     * 根据名称获取工具
     * @param name 工具名称
     * @returns 工具定义或null
     */
    getTool(name: string): import('../types').ToolDefinition | null;

    /**
     * 根据标签查找工具
     * @param tags 标签列表
     * @returns 工具定义列表
     */
    findToolsByTag(...tags: import('../types').ToolTag[]): import('../types').ToolDefinition[];

    /**
     * 根据策略过滤工具
     * @param policy 工具策略
     * @returns 过滤后的工具列表
     */
    filterTools(policy: ToolPolicy): import('../types').ToolDefinition[];

    /**
     * 获取工具组
     * @param groupName 组名
     * @returns 工具列表
     */
    getGroup(groupName: string): import('../types').ToolDefinition[];

    /**
     * 检查工具是否允许执行
     * @param name 工具名称
     * @param policy 工具策略
     * @returns 是否允许
     */
    isToolAllowed(name: string, policy: ToolPolicy): boolean;
}
