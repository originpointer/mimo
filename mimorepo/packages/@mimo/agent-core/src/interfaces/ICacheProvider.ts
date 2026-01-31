/**
 * 缓存提供者接口
 *
 * 设计原则:
 * 1. 支持泛型类型存储
 * 2. 支持TTL过期
 * 3. 支持统计信息
 * 4. 支持多种存储后端
 */
export interface ICacheProvider<T = any> {
    /**
     * 获取缓存
     * @param key 缓存键
     * @returns 缓存值或null
     */
    get(key: string): Promise<T | null>;

    /**
     * 设置缓存
     * @param key 缓存键
     * @param value 缓存值
     * @param options 缓存选项
     */
    set(key: string, value: T, options?: import('../types').CacheOptions): Promise<void>;

    /**
     * 删除缓存
     * @param key 缓存键
     * @returns 是否删除成功
     */
    delete(key: string): Promise<boolean>;

    /**
     * 清空所有缓存
     */
    clear(): Promise<void>;

    /**
     * 检查缓存是否存在
     * @param key 缓存键
     * @returns 是否存在
     */
    has(key: string): Promise<boolean>;

    /**
     * 获取所有键
     * @returns 键列表
     */
    keys(): Promise<string[]>;

    /**
     * 获取缓存统计
     * @returns 统计信息
     */
    getStats(): Promise<import('../types').CacheStats>;
}
