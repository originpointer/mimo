/**
 * Tab Groups API 消息类型定义
 *
 * 用于 Web UI 与插件之间的通信，支持浏览器选项卡组的创建、更新、删除和查询
 */

// 消息类型常量
export const CREATE_TAB_GROUP = "CREATE_TAB_GROUP" as const
export const UPDATE_TAB_GROUP = "UPDATE_TAB_GROUP" as const
export const DELETE_TAB_GROUP = "DELETE_TAB_GROUP" as const
export const QUERY_TAB_GROUPS = "QUERY_TAB_GROUPS" as const
export const ADD_TABS_TO_GROUP = "ADD_TABS_TO_GROUP" as const

/**
 * 选项卡组颜色枚举
 * 对应 Chrome TabGroups API 的 ColorEnum
 */
export type TabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange"

/**
 * 创建选项卡组的载荷
 */
export interface CreateTabGroupPayload {
  /** 任务名称（用作组标题） */
  taskName: string
  /** 要添加到组的 URL 列表（可选） */
  urls?: string[]
  /** 组的颜色（默认 blue） */
  color?: TabGroupColor
  /** 是否折叠组（默认 false） */
  collapsed?: boolean
}

/**
 * 更新选项卡组的载荷
 */
export interface UpdateTabGroupPayload {
  /** 组 ID */
  groupId: number
  /** 新的任务名称（可选） */
  taskName?: string
  /** 新的颜色（可选） */
  color?: TabGroupColor
  /** 是否折叠（可选） */
  collapsed?: boolean
}

/**
 * 删除选项卡组的载荷
 */
export interface DeleteTabGroupPayload {
  /** 组 ID */
  groupId: number
}

/**
 * 查询选项卡组的载荷
 */
export interface QueryTabGroupsPayload {
  /** 按标题筛选（可选） */
  title?: string
  /** 按颜色筛选（可选） */
  color?: TabGroupColor
  /** 按折叠状态筛选（可选） */
  collapsed?: boolean
}

/**
 * 添加选项卡到现有组的载荷
 */
export interface AddTabsToGroupPayload {
  /** 组 ID */
  groupId: number
  /** 要添加的 URL 列表 */
  urls: string[]
}

/**
 * Tab Groups 操作的通用响应
 */
export type TabGroupResponse =
  | { ok: true; groupId?: number; group?: chrome.tabGroups.TabGroup }
  | { ok: false; error: string }

/**
 * 查询选项卡组的响应
 */
export type QueryTabGroupsResponse =
  | { ok: true; groups: chrome.tabGroups.TabGroup[] }
  | { ok: false; error: string }
