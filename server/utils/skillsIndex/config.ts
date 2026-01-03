import path from "node:path"

export function resolveSkillsDirFromEnv(): string {
  const raw = process.env.SKILLS_DIR
  if (!raw || !raw.trim()) {
    throw new Error("缺少环境变量 SKILLS_DIR。请在 .env 中设置，例如：SKILLS_DIR=/abs/path/to/skills")
  }
  const p = raw.trim()
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
}


