import { eventHandler, sendRedirect } from "h3"

// Backward/typo-compatible alias: /control/weapp -> /control/webapp
export default eventHandler((event) => {
  return sendRedirect(event, "/control/webapp", 302)
})


