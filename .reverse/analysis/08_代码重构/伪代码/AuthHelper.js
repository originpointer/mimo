/**
 * AuthHelper - 认证助手伪代码重构
 *
 * 职责：
 * - 监听 Manus 应用的 Cookie 变化
 * - 将 Cookie 同步到 chrome.storage.local
 * - 管理浏览器设置
 */
class AuthHelper {
  constructor() {
    this.cleanupWatcher = null        // 清理函数
    this.debounceTimers = new Map()   // 防抖定时器映射
  }

  /**
   * 初始化认证助手
   * @returns {Promise<{token: string | null, initialized: boolean}>}
   */
  async initialize() {
    try {
      // 步骤 1: 确保浏览器设置存在
      const settings = BrowserSettings.getBrowserSettings()
      if (!settings?.browserName) {
        const defaultSettings = {
          browserName: this.generateRandomBrowserName(),
          allowCrossBrowser: false,
          skipAuthorization: false
        }
        await BrowserSettings.setBrowserSettings(defaultSettings)
      }

      // 步骤 2: 读取 Manus 应用的 Cookie
      const cookies = await this.getManusAppCookies()
      logger.info("Manus app cookies obtained", { cookies })

      // 步骤 3: 同步 session_id Cookie 到令牌存储
      if (cookies.token) {
        const normalized = this.normalizeValue(cookies.token)
        await Token.setToken(normalized)
      } else {
        logger.info("No token found in cookies")
      }

      // 步骤 4: 同步 devBranch Cookie
      if (cookies.devBranch) {
        const normalized = this.normalizeValue(cookies.devBranch)
        await DevBranch.setDevBranch(normalized)
      } else {
        logger.info("No devBranch found in cookies")
      }

      return {
        token: this.normalizeValue(cookies.token),
        initialized: true
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error("Failed to initialize auth", { error: errorMsg })
      return {
        token: null,
        initialized: false
      }
    }
  }

  /**
   * 启动 Cookie 监听器
   */
  startWatcher() {
    // 检查 chrome.cookies API 是否可用
    if (!chrome.cookies?.onChanged) {
      logger.warn("chrome.cookies API unavailable; skip Manus cookies watcher")
      return
    }

    // 停止现有的监听器
    this.stopWatcher()

    // 获取 Manus 应用域名
    const webAppDomain = Environment.getEnvParams().webAppDomain
    let hostname

    try {
      hostname = new URL(webAppDomain).hostname
    } catch (error) {
      logger.error("Failed to start Manus cookies watcher; invalid URL", {
        url: webAppDomain,
        error
      })
      return
    }

    // 定义要监听的 Cookie 配置
    const cookiesToWatch = [
      {
        cookieName: "session_id",
        getCurrentValue: () => Token.getToken(),
        setValue: (value) => Token.setToken(value)
      }
    ]

    // Cookie 变更监听器
    const listener = (changeInfo) => {
      const { cookie, removed } = changeInfo
      if (!cookie) return

      // 验证 Cookie 域名
      const cookieDomain = cookie.domain.startsWith(".")
        ? cookie.domain.slice(1)
        : cookie.domain

      if (hostname !== cookieDomain && !hostname.endsWith(`.${cookieDomain}`)) {
        return  // 不是 Manus 域名的 Cookie
      }

      // 查找匹配的监听配置
      const watcher = cookiesToWatch.find(w => w.cookieName === cookie.name)
      if (watcher) {
        this.handleCookieChangeWithDebounce(
          cookie.name,
          removed,
          cookie.value,
          watcher
        )
      }
    }

    // 添加监听器
    chrome.cookies.onChanged.addListener(listener)

    logger.info("Started watching Manus app cookies", {
      host: hostname,
      cookies: cookiesToWatch.map(c => c.cookieName)
    })

    // 保存清理函数
    this.cleanupWatcher = () => {
      chrome.cookies.onChanged.removeListener(listener)

      // 清除所有防抖定时器
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer)
      }
      this.debounceTimers.clear()

      logger.info("Stopped watching Manus app cookies", {
        host: hostname,
        cookies: cookiesToWatch.map(c => c.cookieName)
      })
    }
  }

  /**
   * 停止 Cookie 监听器
   */
  stopWatcher() {
    if (this.cleanupWatcher) {
      this.cleanupWatcher()
      this.cleanupWatcher = null
    }
  }

  /**
   * 获取 Manus 应用的 Cookie
   * @returns {Promise<{token: string | null, devBranch: string | null}>}
   */
  async getManusAppCookies() {
    const webAppDomain = Environment.getEnvParams().webAppDomain

    // 并行读取两个 Cookie
    const [tokenCookie, devBranchCookie] = await Promise.all([
      this.getCookie(webAppDomain, "session_id"),
      this.getCookie(webAppDomain, "devBranch")
    ])

    return {
      token: tokenCookie?.value ?? null,
      devBranch: devBranchCookie?.value ?? null
    }
  }

  /**
   * 获取单个 Cookie
   * @param {string} url
   * @param {string} name
   * @returns {Promise<Cookie | null>}
   */
  async getCookie(url, name) {
    return new Promise((resolve, reject) => {
      chrome.cookies.get({ url, name }, (cookie) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(cookie)
      })
    })
  }

  /**
   * 防抖处理 Cookie 变更
   * @param {string} cookieName
   * @param {boolean} removed
   * @param {string} value
   * @param {object} config
   */
  handleCookieChangeWithDebounce(cookieName, removed, value, config) {
    // 清除现有的防抖定时器
    const existingTimer = this.debounceTimers.get(cookieName)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 计算新值（移除的 Cookie 为 null）
    const nextValue = removed ? null : this.normalizeValue(value)

    // 设置新的防抖定时器（500ms）
    const newTimer = setTimeout(async () => {
      const currentValue = config.getCurrentValue()

      // 仅在值实际变化时才更新
      if (nextValue !== currentValue) {
        logger.info(`Manus ${cookieName} cookie changed (debounced)`, {
          removed,
          nextValue,
          currentValue
        })

        await config.setValue(nextValue).catch(error => {
          logger.error(`Failed to sync ${cookieName} from cookie change`, {
            removed,
            error: error instanceof Error ? error.message : String(error)
          })
        })
      }

      // 删除定时器引用
      this.debounceTimers.delete(cookieName)
    }, 500)

    // 保存定时器引用
    this.debounceTimers.set(cookieName, newTimer)
  }

  /**
   * 规范化值
   * @param {unknown} value
   * @returns {string | null}
   */
  normalizeValue(value) {
    if (typeof value !== "string") {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  /**
   * 生成随机浏览器名称
   * @returns {string}
   */
  generateRandomBrowserName() {
    const adjectives = [
      "Swift", "Bright", "Quick", "Smart", "Cosmic", "Quantum",
      "Radiant", "Nova", "Stellar", "Aurora", "Turbo", "Lightning",
      "Mighty", "Noble", "Mystic", "Crimson", "Silver", "Golden",
      "Thunder", "Crystal"
    ]

    const nouns = [
      "Fox", "Eagle", "Falcon", "Phoenix", "Dragon", "Voyager",
      "Explorer", "Navigator", "Ranger", "Seeker", "Hawk",
      "Wolf", "Tiger", "Panther", "Comet", "Meteor", "Titan",
      "Shadow", "Spirit", "Hunter"
    ]

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${adj}-${noun}`
  }
}

// 单例导出
export const authHelper = new AuthHelper()
