import { eventHandler, setResponseHeaders, setResponseStatus } from 'h3';

// Handle CORS preflight for any /api/** route.
export default eventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });

  setResponseStatus(event, 204);
  return '';
});

