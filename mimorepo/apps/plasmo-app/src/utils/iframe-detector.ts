/**
 * iframe 检测和处理工具
 */

export interface IFrameInfo {
  element: HTMLIFrameElement;
  frameId?: number;
  isSameOrigin: boolean;
  isLoaded: boolean;
  url?: string;
}

export class IFrameDetector {
  /**
   * 检测页面中的所有 iframe
   */
  static detectIFrames(): IFrameInfo[] {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    
    return iframes.map((iframe) => {
      const info: IFrameInfo = {
        element: iframe,
        isSameOrigin: this.isSameOrigin(iframe),
        isLoaded: iframe.complete || iframe.contentDocument?.readyState === 'complete',
      };

      try {
        if (info.isSameOrigin && iframe.contentWindow) {
          info.url = iframe.contentWindow.location.href;
        } else {
          info.url = iframe.src;
        }
      } catch (e) {
        // 跨域 iframe，无法访问
        info.url = iframe.src;
      }

      return info;
    });
  }

  /**
   * 检查 iframe 是否同源
   */
  private static isSameOrigin(iframe: HTMLIFrameElement): boolean {
    try {
      // 尝试访问 contentWindow，如果成功则同源
      const win = iframe.contentWindow;
      if (!win) {
        return false;
      }
      
      // 尝试访问 location，如果成功则同源
      const loc = win.location;
      return loc.origin === window.location.origin;
    } catch (e) {
      // 跨域访问会抛出异常
      return false;
    }
  }

  /**
   * 监听 iframe 加载状态
   */
  static watchIFrameLoad(
    iframe: HTMLIFrameElement,
    callback: (isLoaded: boolean) => void
  ): () => void {
    const handleLoad = () => {
      callback(true);
    };

    const handleError = () => {
      callback(false);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // 如果已经加载完成，立即调用回调
    if (iframe.complete) {
      callback(true);
    }

    // 返回清理函数
    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }

  /**
   * 检查 iframe 内容是否可见
   */
  static isIFrameVisible(iframe: HTMLIFrameElement): boolean {
    const rect = iframe.getBoundingClientRect();
    const style = window.getComputedStyle(iframe);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * 获取 iframe 的 readyState（仅同源）
   */
  static getIFrameReadyState(iframe: HTMLIFrameElement): string | null {
    try {
      if (iframe.contentDocument) {
        return iframe.contentDocument.readyState;
      }
    } catch (e) {
      // 跨域，无法访问
    }
    return null;
  }
}
