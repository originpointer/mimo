/**
 * SPA 检测工具
 */

export interface SPADetectionResult {
  isSPA: boolean;
  framework?: 'react' | 'vue' | 'angular' | 'unknown';
  hasHistoryAPI: boolean;
  confidence: number; // 0-1
}

export class SPADetector {
  /**
   * 检测页面是否为 SPA
   */
  static detect(): SPADetectionResult {
    const framework = this.detectFramework();
    const hasHistoryAPI = typeof history.pushState === 'function';
    const hasRouterPatterns = this.detectRouterPatterns();
    const hasSPAStructure = this.detectSPAStructure();

    let confidence = 0;
    let isSPA = false;

    // 框架检测（高置信度）
    if (framework) {
      confidence += 0.5;
      isSPA = true;
    }

    // History API 检测（中置信度）
    if (hasHistoryAPI) {
      confidence += 0.2;
      if (!isSPA) {
        isSPA = true;
      }
    }

    // 路由模式检测（中置信度）
    if (hasRouterPatterns) {
      confidence += 0.2;
      if (!isSPA) {
        isSPA = true;
      }
    }

    // SPA 结构检测（低置信度）
    if (hasSPAStructure) {
      confidence += 0.1;
      if (!isSPA && confidence > 0.3) {
        isSPA = true;
      }
    }

    return {
      isSPA,
      framework,
      hasHistoryAPI,
      confidence: Math.min(confidence, 1),
    };
  }

  /**
   * 检测前端框架
   */
  private static detectFramework(): 'react' | 'vue' | 'angular' | undefined {
    // React
    if (
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
      (window as any).React ||
      document.querySelector('[data-reactroot]') ||
      document.querySelector('[data-react-helmet]')
    ) {
      return 'react';
    }

    // Vue
    if (
      (window as any).__VUE__ ||
      (window as any).Vue ||
      document.querySelector('[data-v-]')
    ) {
      return 'vue';
    }

    // Angular
    if (
      (window as any).ng ||
      (window as any).angular ||
      document.querySelector('[ng-version]') ||
      document.querySelector('[ng-app]')
    ) {
      return 'angular';
    }

    return undefined;
  }

  /**
   * 检测路由模式
   */
  private static detectRouterPatterns(): boolean {
    // 检测常见的路由库
    const routerPatterns = [
      'react-router',
      'vue-router',
      '@angular/router',
      'reach-router',
      'wouter',
    ];

    // 检查全局对象
    const hasRouter = routerPatterns.some((pattern) => {
      return (
        (window as any)[pattern] ||
        document.querySelector(`[data-${pattern}]`) !== null
      );
    });

    // 检查 URL 模式（SPA 通常使用 hash 或 pathname 路由）
    const url = window.location.href;
    const hasHashRouter = url.includes('#/') && url.split('#/').length > 1;
    const hasPathRouter = window.location.pathname !== '/' && !url.endsWith('.html');

    return hasRouter || hasHashRouter || hasPathRouter;
  }

  /**
   * 检测 SPA 结构特征
   */
  private static detectSPAStructure(): boolean {
    // SPA 通常只有一个主要的 app 容器
    const appContainers = [
      '#app',
      '#root',
      '#main',
      '[id*="app"]',
      '[id*="root"]',
      '.app',
      '.application',
    ];

    const hasAppContainer = appContainers.some((selector) => {
      const element = document.querySelector(selector);
      return element !== null;
    });

    // SPA 通常有很少的 script 标签（大部分是打包后的）
    const scriptTags = document.querySelectorAll('script[src]');
    const hasFewScripts = scriptTags.length <= 5;

    // SPA 通常没有多个 HTML 页面链接
    const htmlLinks = document.querySelectorAll('a[href$=".html"]');
    const hasFewHtmlLinks = htmlLinks.length === 0;

    return hasAppContainer && hasFewScripts && hasFewHtmlLinks;
  }

  /**
   * 监听路由变化
   */
  static watchRouteChanges(callback: (url: string) => void): () => void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const notify = () => {
      callback(window.location.href);
    };

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      notify();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      notify();
    };

    window.addEventListener('popstate', notify);

    // 返回清理函数
    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', notify);
    };
  }
}
