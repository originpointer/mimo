import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import z from "zod"

import type { ToolResult } from "@/lib/tools/types"
import { resolvePathInUploads } from "@/lib/tools/uploadsPath"

const DEFAULT_READ_LIMIT = 2000
const MAX_LINE_LENGTH = 2000
const MAX_BYTES = 50 * 1024

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".zip",
  ".gz",
  ".tar",
  ".7z",
  ".pdf",
  ".wasm",
  ".exe",
])

export const ReadTextInputSchema = z.object({
  path: z.string().describe("uploads 内相对路径，也可传入 .data/uploads/... 形式"),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(20_000).optional(),
})

export type ReadTextInput = z.infer<typeof ReadTextInputSchema>

function looksBinary(buf: Buffer) {
  const n = Math.min(buf.length, 4096)
  if (!n) return false
  let nonPrintable = 0
  for (let i = 0; i < n; i++) {
    const b = buf[i]
    if (b === 0) return true
    if (b < 9 || (b > 13 && b < 32)) nonPrintable++
  }
  return nonPrintable / n > 0.3
}

export async function readTextInUploads(input: ReadTextInput): Promise<ToolResult<{ truncated: boolean }>> {
  const { absPath, relPathInUploads } = resolvePathInUploads(input.path)

  const st = await stat(absPath).catch(() => null)
  if (!st || !st.isFile()) {
    throw new Error("not found")
  }

  const ext = path.extname(absPath).toLowerCase()
  if (BINARY_EXT.has(ext)) {
    throw new Error("cannot read binary file")
  }

  // 先读一小段判断二进制，再读全文（upload html 通常不大）
  const head = await readFile(absPath).then((b) => b.subarray(0, 4096))
  if (looksBinary(head)) {
    throw new Error("cannot read binary file")
  }

  const limit = input.limit ?? DEFAULT_READ_LIMIT
  const offset = input.offset ?? 0

  const text = await readFile(absPath, "utf-8")
  const lines = text.split("\n")

  const raw: string[] = []
  let bytes = 0
  let truncatedByBytes = false

  for (let i = offset; i < Math.min(lines.length, offset + limit); i++) {
    const line = lines[i].length > MAX_LINE_LENGTH ? lines[i].slice(0, MAX_LINE_LENGTH) + "..." : lines[i]
    const size = Buffer.byteLength(line, "utf-8") + (raw.length > 0 ? 1 : 0)
    if (bytes + size > MAX_BYTES) {
      truncatedByBytes = true
      break
    }
    raw.push(line)
    bytes += size
  }

  const content = raw.map((line, idx) => `${(idx + offset + 1).toString().padStart(5, "0")}| ${line}`)
  const totalLines = lines.length
  const lastReadLine = offset + raw.length
  const hasMoreLines = totalLines > lastReadLine
  const truncated = hasMoreLines || truncatedByBytes

  let output = "<file>\n"
  output += content.join("\n")
  if (truncatedByBytes) {
    output += `\n\n(Output truncated at ${MAX_BYTES} bytes. Use 'offset' to read beyond line ${lastReadLine})`
  } else if (hasMoreLines) {
    output += `\n\n(File has more lines. Use 'offset' to read beyond line ${lastReadLine})`
  } else {
    output += `\n\n(End of file - total ${totalLines} lines)`
  }
  output += "\n</file>"

  return {
    title: relPathInUploads,
    output,
    metadata: { truncated },
  }
}

