import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

/**
 * 检测是否为 Manus 自动化操作
 * @param element - 点击的目标元素
 * @returns 是否为 Manus 操作
 */
function isManusAutomation(element: HTMLElement): boolean {
  return element.hasAttribute('data-manus_clickable') ||
         element.hasAttribute('data-manus_click_id');
}

/**
 * 检测可疑的自动化操作（包括 Manus）
 * @param event - 鼠标事件对象
 * @param element - 点击的目标元素
 * @returns 检测结果
 */
function detectSuspiciousAutomation(event: MouseEvent, element: HTMLElement): {
  isAutomation: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 高置信度：Manus 标记属性
  if (element.hasAttribute('data-manus_clickable')) {
    reasons.push('存在 data-manus_clickable 属性');
    confidence = 'high';
  }

  if (element.hasAttribute('data-manus_click_id')) {
    reasons.push('存在 data-manus_click_id 属性');
    confidence = 'high';
  }

  // 中等置信度：异常特征
  if (event.screenX < 0 && event.isTrusted) {
    reasons.push('screenX 为负数且事件可信');
    if (confidence !== 'high') confidence = 'medium';
  }

  if (document.visibilityState === 'hidden' && (document.activeElement === element || element.contains(document.activeElement))) {
    reasons.push('页面隐藏但元素被激活');
    if (confidence !== 'high') confidence = 'medium';
  }

  return {
    isAutomation: confidence !== 'low',
    confidence,
    reasons
  };
}

function App() {
  const [count, setCount] = useState(0)

  // 监听页面状态变化，检测标签页是否被短暂激活
  useEffect(() => {
    const logState = (type: string, detail: string) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
      console.log(`[${timestamp}] 页面状态: ${type} - ${detail}`)
    }

    const handleVisibilityChange = () => {
      logState('visibilitychange', `visibilityState=${document.visibilityState}, hidden=${document.hidden}`)
    }

    const handleFocus = () => {
      logState('focus', '页面获得焦点')
    }

    const handleBlur = () => {
      logState('blur', '页面失去焦点')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // 初始状态
    logState('init', `visibilityState=${document.visibilityState}, hidden=${document.hidden}`)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  /**
   * 处理按钮点击事件
   * @param e - 鼠标点击事件对象
   *
   * isTrusted 属性说明:
   * - true: 事件由用户真实操作触发（如鼠标点击、键盘输入）
   * - false: 事件由脚本触发（如 element.click()、dispatchEvent()）
   */
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLElement

    // 自动化检测
    const detection = detectSuspiciousAutomation(e.nativeEvent as MouseEvent, target)

    console.log('========== 点击事件调试信息 ==========')
    console.log('是否受信 (isTrusted):', e.isTrusted)
    console.log('事件类型:', e.type)

    // 自动化检测结果
    console.log('------ 自动化检测 ------')
    console.log('检测为自动化:', detection.isAutomation ? '是 ✓' : '否')
    console.log('置信度:', detection.confidence.toUpperCase())
    if (detection.reasons.length > 0) {
      console.log('检测原因:', detection.reasons.join(', '))
    }

    // Manus 专用检测
    if (isManusAutomation(target)) {
      const manusClickId = target.getAttribute('data-manus_click_id')
      console.log('Manus Click ID:', manusClickId || '(无)')
      console.log('screenX (Manus通常为负):', e.screenX)
    }

    // 检查页面活动状态
    console.log('------ 页面活动状态 ------')
    console.log('visibilityState:', document.visibilityState)
    console.log('hidden:', document.hidden)
    console.log('document.hasFocus():', document.hasFocus())
    console.log('activeElement:', document.activeElement?.tagName || '(none)')

    console.log('------ 坐标信息 ------')
    console.log('clientX/Y (相对于视口):', `(${e.clientX}, ${e.clientY})`)
    console.log('pageX/Y (相对于页面):', `(${e.pageX}, ${e.pageY})`)
    console.log('screenX/Y (相对于屏幕):', `(${e.screenX}, ${e.screenY})`)
    console.log('offsetX/Y (相对于目标元素):', `(${e.nativeEvent.offsetX}, ${e.nativeEvent.offsetY})`)

    console.log('------ PointerEvent 详情 ------')
    const nativeEvent = e.nativeEvent as PointerEvent
    console.log('pointerId:', nativeEvent.pointerId)
    console.log('pointerType:', nativeEvent.pointerType)
    console.log('isPrimary:', nativeEvent.isPrimary)
    console.log('=====================================')

    setCount((count) => count + 1)
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={handleButtonClick}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
