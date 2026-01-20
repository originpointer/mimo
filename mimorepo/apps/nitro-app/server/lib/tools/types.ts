export type ToolResult<M extends Record<string, any> = Record<string, any>> = {
  title: string
  output: string
  metadata: M
}

