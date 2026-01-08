import { eventHandler } from "h3"
import { getJwks } from "../../utils/control/keys"

export default eventHandler(() => {
  return getJwks()
})


