/**
 * TabGroupManager - 浏览器选项卡组管理器
 *
 * 封装 Chrome TabGroups 和 Tabs API，提供选项卡组的创建、更新、删除和查询功能
 */

import type { TabGroupColor } from "../types/tab-groups"

/**
 * 选项卡组管理器类
 */
export class TabGroupManager {
  /**
   * 创建选项卡组并添加选项卡
   * @param taskName 任务名称（用作组标题）
   * @param urls 要添加到组的 URL 列表（可选，默认创建空白页）
   * @param color 组的颜色（默认 blue）
   * @param collapsed 是否折叠组（默认 false）
   * @returns 操作结果
   */
  async createGroup(
    taskName: string,
    urls: string[] = [],
    color: TabGroupColor = "blue",
    collapsed: boolean = false
  ): Promise<{ ok: true; groupId: number } | { ok: false; error: string }> {
    try {
      // 如果没有提供 URL，创建一个空白页
      if (urls.length === 0) {
        urls = ["chrome://newtab"]
      }

      // 创建第一个选项卡
      const firstTab = await chrome.tabs.create({ url: urls[0], active: false })

      // 创建选项卡组
      const groupId = await chrome.tabs.group({ tabIds: firstTab.id })

      // 设置组的属性
      await chrome.tabGroups.update(groupId, {
        title: taskName,
        color: color as chrome.tabGroups.ColorEnum,
        collapsed
      })

      // 添加剩余的选项卡
      if (urls.length > 1) {
        const remainingUrls = urls.slice(1)
        const tabIds: number[] = []

        for (const url of remainingUrls) {
          const tab = await chrome.tabs.create({ url, active: false })
          tabIds.push(tab.id)
        }

        if (tabIds.length > 0) {
          await chrome.tabs.group({ groupId, tabIds })
        }
      }

      return { ok: true, groupId }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 更新选项卡组属性
   * @param groupId 组 ID
   * @param options 更新选项
   * @returns 操作结果
   */
  async updateGroup(
    groupId: number,
    options: {
      taskName?: string
      color?: TabGroupColor
      collapsed?: boolean
    }
  ): Promise<{ ok: true; group: chrome.tabGroups.TabGroup } | { ok: false; error: string }> {
    try {
      const updateProps: {
        title?: string
        color?: chrome.tabGroups.ColorEnum
        collapsed?: boolean
      } = {}

      if (options.taskName !== undefined) updateProps.title = options.taskName
      if (options.color !== undefined) updateProps.color = options.color as chrome.tabGroups.ColorEnum
      if (options.collapsed !== undefined) updateProps.collapsed = options.collapsed

      const group = await chrome.tabGroups.update(groupId, updateProps)

      if (!group) {
        return { ok: false, error: "Group not found" }
      }

      return { ok: true, group }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 删除选项卡组（关闭组内所有选项卡）
   * @param groupId 组 ID
   * @returns 操作结果
   */
  async deleteGroup(
    groupId: number
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const tabs = await chrome.tabs.query({ groupId })

      if (tabs.length > 0) {
        await chrome.tabs.remove(tabs.map(t => t.id))
      }

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 查询选项卡组
   * @param filter 筛选条件
   * @returns 操作结果
   */
  async queryGroups(
    filter: {
      title?: string
      color?: TabGroupColor
      collapsed?: boolean
    }
  ): Promise<{ ok: true; groups: chrome.tabGroups.TabGroup[] } | { ok: false; error: string }> {
    try {
      const queryInfo: chrome.tabGroups.QueryInfo = {}

      if (filter.title !== undefined) queryInfo.title = filter.title
      if (filter.color !== undefined) queryInfo.color = filter.color as chrome.tabGroups.ColorEnum
      if (filter.collapsed !== undefined) queryInfo.collapsed = filter.collapsed

      const groups = await chrome.tabGroups.query(queryInfo)

      return { ok: true, groups }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 添加选项卡到现有组
   * @param groupId 组 ID
   * @param urls 要添加的 URL 列表
   * @returns 操作结果
   */
  async addTabsToGroup(
    groupId: number,
    urls: string[]
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const tabIds: number[] = []

      for (const url of urls) {
        const tab = await chrome.tabs.create({ url, active: false })
        tabIds.push(tab.id)
      }

      if (tabIds.length > 0) {
        await chrome.tabs.group({ groupId, tabIds })
      }

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
