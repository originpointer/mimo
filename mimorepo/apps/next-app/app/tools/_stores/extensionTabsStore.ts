import { create } from "zustand"
import { sendToExtension } from "@/lib/extension-bridge"
import { fetchExtensionList, type ExtensionListItem } from "@/lib/nitro-config"
import { LIST_TABS, type ListTabsItem, type ListTabsResponse } from "@/types/plasmo"

export type ChromeTabLite = ListTabsItem

type ExtensionTabsState = {
  extensionId: string
  extensionName: string
  extensionList: ExtensionListItem[]
  extensionError: string | null
  tabs: ChromeTabLite[]
  targetTabId: number | "active"
  tabsError: string | null
  refreshTabs: (extId?: string) => Promise<void>
  selectExtension: (name: string) => void
  setTargetTabId: (id: number | "active") => void
  initExtensionTabs: () => Promise<void>
}

export function isScannableUrl(url: string | undefined): boolean {
  const u = String(url || "")
  if (!u) return false
  const blockedPrefixes = [
    "chrome://",
    "edge://",
    "about:",
    "devtools://",
    "chrome-extension://",
    "moz-extension://",
    "view-source:"
  ]
  if (blockedPrefixes.some((p) => u.startsWith(p))) return false
  if (u.startsWith("file://")) return false
  return true
}

export const useExtensionTabsStore = create<ExtensionTabsState>((set, get) => ({
  extensionId: "",
  extensionName: "",
  extensionList: [],
  extensionError: null,
  tabs: [],
  targetTabId: "active",
  tabsError: null,
  setTargetTabId: (targetTabId) => set({ targetTabId }),
  refreshTabs: async (extId?: string) => {
    set({ tabsError: null })
    const effectiveId = String(extId || get().extensionId || "").trim()
    if (!effectiveId) {
      set({ tabsError: "extensionId 未就绪，请先启动扩展并完成上报" })
      return
    }
    try {
      const out = await sendToExtension<ListTabsResponse>(
        {
          type: LIST_TABS,
          payload: { includeAllWindows: true }
        },
        effectiveId
      )
      if (!out) {
        set({ tabsError: "未收到 tabs 响应" })
        return
      }
      if (out.ok === false) {
        set({ tabsError: out.error })
        return
      }
      set({ tabs: out.tabs })
    } catch (e) {
      set({ tabsError: e instanceof Error ? e.message : String(e) })
    }
  },
  selectExtension: (name: string) => {
    set({ extensionName: name })
    const picked = get().extensionList.find((item) => item.extensionName === name)
    if (!picked) {
      set({ extensionId: "", extensionError: "extensionId 未就绪，请先启动扩展并完成上报" })
      return
    }
    set({ extensionError: null, extensionId: picked.extensionId })
    void get().refreshTabs(picked.extensionId)
  },
  initExtensionTabs: async () => {
    set({ extensionError: null })
    const out = await fetchExtensionList()
    if (!out.extensions.length) {
      set({
        extensionId: "",
        extensionName: "",
        extensionList: [],
        extensionError: out.error || "未发现已注册扩展，请先启动扩展并完成上报"
      })
      return
    }
    const selected = out.latest || out.extensions[0]
    if (!selected) {
      set({
        extensionId: "",
        extensionName: "",
        extensionError: out.error || "未发现可用扩展"
      })
      return
    }
    set({
      extensionList: out.extensions,
      extensionName: selected.extensionName,
      extensionId: selected.extensionId,
      extensionError: null
    })
    void get().refreshTabs(selected.extensionId)
  }
}))
