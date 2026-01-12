import { afterAll } from 'vitest';

/**
 * 在所有浏览器测试完成后，等待30秒再关闭浏览器
 * 这样可以方便调试和观察测试结果
 * 
 * 注意：第二个参数35000是钩子超时时间，必须大于延时时间（30000）
 */
afterAll(async () => {
  // 等待30秒（30000毫秒）
  await new Promise((resolve) => {
    setTimeout(resolve, 30000);
  });
}, 35000); // 钩子超时时间设置为35秒，大于30秒的延时
