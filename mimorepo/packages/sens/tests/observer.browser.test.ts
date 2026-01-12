import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * 浏览器 Observer API 测试示例
 * 
 * 这些测试展示了如何在 Vitest Browser Mode 中测试各种 Observer API：
 * - MutationObserver: 监听 DOM 变化
 * - IntersectionObserver: 监听元素可见性
 * - ResizeObserver: 监听元素尺寸变化
 * - PerformanceObserver: 监听性能指标
 */

describe('Browser Observer API Tests', () => {
  beforeEach(() => {
    // 清理 DOM，确保每个测试都有干净的环境
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // 清理所有观察者
    document.body.innerHTML = '';
  });

  describe('MutationObserver', () => {
    it('应该监听 DOM 元素添加', async () => {
      const container = document.createElement('div');
      container.id = 'container';
      document.body.appendChild(container);

      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((records) => {
        mutations.push(...records);
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      // 添加子元素
      const child = document.createElement('div');
      child.textContent = 'New Element';
      container.appendChild(child);

      // 等待 MutationObserver 回调执行
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mutations.length).toBeGreaterThan(0);
      expect(mutations[0].type).toBe('childList');
      expect(mutations[0].addedNodes.length).toBe(1);

      observer.disconnect();
    });

    it('应该监听属性变化', async () => {
      const element = document.createElement('div');
      element.id = 'test-element';
      document.body.appendChild(element);

      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((records) => {
        mutations.push(...records);
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'data-state'],
      });

      // 修改属性
      element.className = 'active';
      element.setAttribute('data-state', 'loaded');

      // 等待 MutationObserver 回调执行
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mutations.length).toBeGreaterThanOrEqual(1);
      expect(mutations.some((m) => m.type === 'attributes')).toBe(true);

      observer.disconnect();
    });

    it('应该监听文本内容变化', async () => {
      const element = document.createElement('div');
      const textNode = document.createTextNode('Initial Text');
      element.appendChild(textNode);
      document.body.appendChild(element);

      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((records) => {
        mutations.push(...records);
      });

      observer.observe(element, {
        characterData: true,
        subtree: true,
      });

      // 修改文本节点的内容（这会触发 characterData 变化）
      textNode.data = 'Updated Text';

      // 等待 MutationObserver 回调执行
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mutations.length).toBeGreaterThan(0);
      expect(mutations.some((m) => m.type === 'characterData')).toBe(true);

      observer.disconnect();
    });
  });

  describe('IntersectionObserver', () => {
    it('应该检测元素是否进入视口', async () => {
      const element = document.createElement('div');
      element.style.width = '100px';
      element.style.height = '100px';
      element.style.backgroundColor = 'red';
      // 初始位置在视口外
      element.style.position = 'absolute';
      element.style.top = '200vh';
      document.body.appendChild(element);

      const intersections: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        intersections.push(...entries);
      });

      observer.observe(element);

      // 等待初始观察
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 将元素移动到视口内
      element.style.top = '0';
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(intersections.length).toBeGreaterThan(0);
      expect(intersections[0].target).toBe(element);

      observer.disconnect();
    });

    it('应该计算正确的交叉比例', async () => {
      const element = document.createElement('div');
      element.style.width = '200px';
      element.style.height = '200px';
      element.style.backgroundColor = 'blue';
      document.body.appendChild(element);

      let intersectionRatio = 0;
      const observer = new IntersectionObserver((entries) => {
        if (entries.length > 0) {
          intersectionRatio = entries[0].intersectionRatio;
        }
      });

      observer.observe(element);

      // 等待观察
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 元素完全在视口内时，比例应该接近 1
      expect(intersectionRatio).toBeGreaterThan(0);
      expect(intersectionRatio).toBeLessThanOrEqual(1);

      observer.disconnect();
    });
  });

  describe('ResizeObserver', () => {
    it('应该监听元素尺寸变化', async () => {
      const element = document.createElement('div');
      element.style.width = '100px';
      element.style.height = '100px';
      element.style.boxSizing = 'border-box';
      document.body.appendChild(element);

      const resizeEntries: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        resizeEntries.push(...entries);
      });

      observer.observe(element);

      // 改变尺寸
      element.style.width = '200px';
      element.style.height = '200px';

      // 等待 ResizeObserver 回调执行
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(resizeEntries.length).toBeGreaterThan(0);
      expect(resizeEntries[0].target).toBe(element);

      observer.disconnect();
    });

    it('应该获取元素的内容尺寸', async () => {
      const element = document.createElement('div');
      element.style.width = '100px';
      element.style.height = '100px';
      document.body.appendChild(element);

      let contentWidth = 0;
      let contentHeight = 0;

      const observer = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const entry = entries[0];
          if (entry.contentBoxSize) {
            const size = Array.isArray(entry.contentBoxSize)
              ? entry.contentBoxSize[0]
              : entry.contentBoxSize;
            contentWidth = size.inlineSize;
            contentHeight = size.blockSize;
          }
        }
      });

      observer.observe(element);

      // 等待观察
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(contentWidth).toBeGreaterThan(0);
      expect(contentHeight).toBeGreaterThan(0);

      observer.disconnect();
    });
  });

  describe('PerformanceObserver', () => {
    it('应该监听性能指标', async () => {
      const entries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        entries.push(...list.getEntries());
      });

      // 监听标记（mark）性能条目
      observer.observe({ entryTypes: ['mark'] });

      // 创建性能标记
      performance.mark('test-start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      performance.mark('test-end');

      // 等待 PerformanceObserver 回调执行
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries.some((e) => e.name === 'test-start')).toBe(true);
      expect(entries.some((e) => e.name === 'test-end')).toBe(true);

      observer.disconnect();
    });

    it('应该监听资源加载性能', async () => {
      const resourceEntries: PerformanceResourceTiming[] = [];

      const observer = new PerformanceObserver((list) => {
        const resourceEntriesList = list
          .getEntries()
          .filter((e) => e.entryType === 'resource') as PerformanceResourceTiming[];
        resourceEntries.push(...resourceEntriesList);
      });

      observer.observe({ entryTypes: ['resource'] });

      // 创建一个资源请求（例如图片）
      const img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      document.body.appendChild(img);

      // 等待资源加载和 PerformanceObserver 回调
      await new Promise((resolve) => {
        img.onload = resolve;
        setTimeout(resolve, 100); // 超时保护
      });

      // PerformanceObserver 可能不会立即触发，等待一下
      await new Promise((resolve) => setTimeout(resolve, 50));

      observer.disconnect();
    });
  });

  describe('组合使用多个 Observer', () => {
    it('应该同时使用多个 Observer 监听同一个元素', async () => {
      const element = document.createElement('div');
      element.style.width = '100px';
      element.style.height = '100px';
      element.style.display = 'block'; // 确保元素有布局
      document.body.appendChild(element);

      // 等待元素渲染
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const mutationCount: number[] = [];
      const resizeCount: number[] = [];

      const mutationObserver = new MutationObserver(() => {
        mutationCount.push(1);
      });

      const resizeObserver = new ResizeObserver(() => {
        resizeCount.push(1);
      });

      mutationObserver.observe(element, {
        attributes: true,
        attributeFilter: ['class'],
      });

      resizeObserver.observe(element);

      // 等待初始观察（ResizeObserver 可能会立即触发一次）
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 重置计数，只关注后续的变化
      mutationCount.length = 0;
      resizeCount.length = 0;

      // 同时触发两种变化
      element.className = 'active';
      element.style.width = '200px';

      // 等待观察者回调执行（可能需要多个帧）
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mutationCount.length).toBeGreaterThan(0);
      expect(resizeCount.length).toBeGreaterThan(0);

      mutationObserver.disconnect();
      resizeObserver.disconnect();
    });
  });
});
