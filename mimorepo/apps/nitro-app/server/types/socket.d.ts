import type { Socket as IOSocket } from "socket.io"
import type { Server as SocketIOServer } from "socket.io"
import type { defineNitroPlugin } from "nitropack/runtime"

declare module "nitropack/runtime" {
  interface NitroApp {
    io?: SocketIOServer
  }

  export interface NitroPluginContext {
    io?: SocketIOServer
  }
}

declare module "h3" {
  interface H3EventContext {
    socket?: IOSocket
  }
}

export {}
