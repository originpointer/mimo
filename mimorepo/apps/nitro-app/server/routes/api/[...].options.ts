import { eventHandler, setResponseStatus } from "h3"

export default eventHandler((event) => {
  setResponseStatus(event, 204)
  return ""
})
