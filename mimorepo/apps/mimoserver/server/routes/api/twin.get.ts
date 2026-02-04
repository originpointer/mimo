import { eventHandler } from 'h3';

/**
 * Twin State API Endpoint
 * GET /api/twin
 * 返回当前浏览器数字孪生状态
 */
export default eventHandler((event) => {
  const twin = globalThis.__bion?.getBrowserTwin();
  if (!twin) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Bion runtime not available',
    });
  }
  return twin.toJSON();
});
