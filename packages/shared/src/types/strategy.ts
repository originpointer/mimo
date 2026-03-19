/**
 * 选择器类型
 */
export type SelectorType = 'xpath' | 'css'

/**
 * 数据转换配置
 */
export interface TransformConfig {
  type: 'number' | 'string'
  pattern?: string
  replace?: [string, string][]
}

/**
 * 采样配置
 */
export interface SamplingConfig {
  mode: 'polling' | 'mutation'
  interval?: number
  debounce?: number
}

/**
 * 字段监听配置
 */
export interface FieldWatcher {
  selector: {
    type: SelectorType
    value: string
    attribute?: string
  }
  transform?: TransformConfig
  sampling?: SamplingConfig
}

/**
 * 上传配置
 */
export interface UploadConfig {
  channel: 'socket'
  event: string
  batch?: {
    enabled: boolean
    interval: number
  }
}

/**
 * 页面监听策略
 */
export interface PageWatchStrategy {
  id: string
  version: string
  name: string
  match: {
    urlPattern: string | string[]
    hostnames?: string[]
  }
  fields: Record<string, FieldWatcher>
  upload: UploadConfig
}
