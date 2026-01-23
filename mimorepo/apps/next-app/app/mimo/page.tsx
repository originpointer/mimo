'use client';

import { useState } from 'react';
import { sendMimoCommand, navigate, act, extract, observe } from '@/lib/mimo-client';

export default function MimoPage() {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const quickCommands = [
    { label: '导航到百度', action: () => navigate('https://www.baidu.com') },
    { label: '观察页面', action: () => observe('当前页面') },
    { label: '执行操作', action: () => act('点击搜索按钮') },
  ];

  const handleQuickCommand = async (action: () => Promise<any>) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await action();
      setResult(res);
      console.log('[Mimo Page] Result:', res);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommand = async () => {
    if (!command.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      // 检测命令类型
      const { detectMimoCommand, executeMimoCommand } = await import('@/lib/mimo-handler');
      const detected = detectMimoCommand(command);

      if (detected) {
        const message = await executeMimoCommand(detected);
        setResult({ message });
      } else {
        // 原始命令发送
        const res = await sendMimoCommand('act', { input: command });
        setResult(res);
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Mimo 控制面板</h1>

      {/* 快捷命令 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">快捷命令</h2>
        <div className="flex gap-2 flex-wrap">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommand(cmd.action)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义命令 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">自定义命令</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="输入命令，如: /mimo navigate https://example.com"
            className="flex-1 px-4 py-2 border rounded"
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
          />
          <button
            onClick={handleSendCommand}
            disabled={loading || !command.trim()}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '执行中...' : '发送'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          支持格式: /mimo navigate &lt;url&gt; | @mimo act &lt;instruction&gt; | /navigate &lt;url&gt;
        </p>
      </div>

      {/* 结果显示 */}
      {result && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">执行结果</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* 控制台日志说明 */}
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm text-blue-800">
          💡 所有操作都会在浏览器控制台中打印详细日志。
          <br />
          打开开发者工具 (F12) 查看完整的请求和响应信息。
        </p>
      </div>
    </div>
  );
}
