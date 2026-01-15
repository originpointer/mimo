export const LIST_TABS = "LIST_TABS" as const

export type ListTabsPayload = {
  includeAllWindows?: boolean
}

export type ListTabsItem = {
  id: number
  url?: string
  title?: string
  windowId?: number
  active?: boolean
}

export type ListTabsResponse =
  | { ok: true; tabs: ListTabsItem[] }
  | { ok: false; error: string }

