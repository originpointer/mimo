import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Extension Store 状态
 */
export interface ExtensionStoreState {
  /** 已选中的扩展 ID 集合 */
  selectedExtensionIds: Set<string>
}

/**
 * Extension Store 操作
 */
export interface ExtensionStoreActions {
  /** 切换扩展的选中状态 */
  toggleExtension: (extensionId: string) => void
  /** 设置扩展选中状态 */
  setExtensionSelected: (extensionId: string, selected: boolean) => void
  /** 批量设置扩展选中状态 */
  setMultipleExtensionsSelected: (extensionIds: string[], selected: boolean) => void
  /** 清空所有选中的扩展 */
  clearSelectedExtensions: () => void
  /** 检查扩展是否被选中 */
  isExtensionSelected: (extensionId: string) => boolean
}

/**
 * Extension Store 类型
 */
export type ExtensionStore = ExtensionStoreState & ExtensionStoreActions

/**
 * 创建自定义 storage 来处理 Set 的序列化/反序列化
 * Set 需要转换为 Array 才能被 JSON.stringify 正确处理
 */
const createSetStorage = () => {
  return createJSONStorage(() => localStorage, {
    // 反序列化时将 Array 转回 Set
    reviver: (key, value) => {
      if (key === 'selectedExtensionIds' && Array.isArray(value)) {
        return new Set(value)
      }
      return value
    },
    // 序列化时将 Set 转换为 Array
    replacer: (key, value) => {
      if (key === 'selectedExtensionIds' && value instanceof Set) {
        return Array.from(value)
      }
      return value
    },
  })
}

/**
 * 扩展插件管理 Store
 *
 * 使用 zustand + persist 中间件实现扩展选中状态的持久化存储。
 * 选中的扩展 ID 集合会自动保存到 localStorage，并在页面刷新后恢复。
 *
 * @example
 * ```tsx
 * // 在组件中使用
 * const { selectedExtensionIds, toggleExtension, isExtensionSelected } = useExtensionStore()
 *
 * // 切换扩展选中状态
 * toggleExtension('extension-id')
 *
 * // 检查是否选中
 * if (isExtensionSelected('extension-id')) {
 *   // ...
 * }
 * ```
 */
export const useExtensionStore = create<ExtensionStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      selectedExtensionIds: new Set([] as string[]),

      // 切换扩展的选中状态
      toggleExtension: (extensionId: string) => {
        set((state) => {
          const next = new Set(state.selectedExtensionIds)
          if (next.has(extensionId)) {
            next.delete(extensionId)
          } else {
            next.add(extensionId)
          }
          return { selectedExtensionIds: next }
        })
      },

      // 设置扩展选中状态
      setExtensionSelected: (extensionId: string, selected: boolean) => {
        set((state) => {
          const next = new Set(state.selectedExtensionIds)
          if (selected) {
            next.add(extensionId)
          } else {
            next.delete(extensionId)
          }
          return { selectedExtensionIds: next }
        })
      },

      // 批量设置扩展选中状态
      setMultipleExtensionsSelected: (extensionIds: string[], selected: boolean) => {
        set((state) => {
          const next = new Set(state.selectedExtensionIds)
          extensionIds.forEach((id) => {
            if (selected) {
              next.add(id)
            } else {
              next.delete(id)
            }
          })
          return { selectedExtensionIds: next }
        })
      },

      // 清空所有选中的扩展
      clearSelectedExtensions: () => {
        set({ selectedExtensionIds: new Set([] as string[]) })
      },

      // 检查扩展是否被选中
      isExtensionSelected: (extensionId: string) => {
        return get().selectedExtensionIds.has(extensionId)
      },
    }),
    {
      name: 'mimo-extensions-storage', // localStorage 中的 key
      storage: createSetStorage(),
      // 只持久化 selectedExtensionIds，不需要持久化方法
      partialize: (state) => ({ selectedExtensionIds: state.selectedExtensionIds }),
    }
  )
)
