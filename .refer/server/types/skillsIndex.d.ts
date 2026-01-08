import type { SkillsIndexService } from "@/utils/skillsIndex"

declare module "nitropack/types" {
  interface NitroApp {
    skillsIndex: SkillsIndexService
  }
}


