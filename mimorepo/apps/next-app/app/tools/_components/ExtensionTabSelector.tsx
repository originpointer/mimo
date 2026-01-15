import type { ExtensionListItem } from "@/lib/nitro-config"
import type { ListTabsItem } from "@/types/plasmo"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ChromeTabLite = ListTabsItem

type ExtensionTabSelectorProps = {
  extensionError: string | null
  tabsError: string | null
  extensionName: string
  extensionList: ExtensionListItem[]
  selectExtension: (name: string) => void
  targetTabId: number | "active"
  setTargetTabId: (id: number | "active") => void
  tabs: ChromeTabLite[]
  isBusy: boolean
  refreshTabs: () => void
  isScannableUrl: (url: string | undefined) => boolean
}

/**
 * 截断文本到最大长度
 * @param value - 要截断的文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength) + "..."
}

export default function ExtensionTabSelector({
  extensionError,
  tabsError,
  extensionName,
  extensionList,
  selectExtension,
  targetTabId,
  setTargetTabId,
  tabs,
  isBusy,
  refreshTabs,
  isScannableUrl
}: ExtensionTabSelectorProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        {extensionError && <p className="text-sm text-destructive">{extensionError}</p>}
        {tabsError && <p className="text-sm text-destructive">Tabs 获取失败：{tabsError}</p>}
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(320px,1.5fr)_auto] items-end">
          <div className="grid gap-2">
            <Label htmlFor="extension-select">扩展</Label>
            <Select
              value={extensionName}
              onValueChange={selectExtension}
              disabled={!extensionList.length}
            >
              <SelectTrigger id="extension-select" className="min-w-[220px]">
                <SelectValue
                  placeholder={extensionList.length ? "请选择扩展" : "暂无已注册扩展"}
                />
              </SelectTrigger>
              <SelectContent>
                {extensionList.map((item) => (
                  <SelectItem key={item.extensionName} value={item.extensionName}>
                    {item.extensionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target-tab-select">目标 Tab</Label>
            <Select
              value={String(targetTabId)}
              onValueChange={(value: string) => {
                if (value === "active") setTargetTabId("active")
                else setTargetTabId(Number(value))
              }}
            >
              <SelectTrigger id="target-tab-select" className="min-w-[320px]">
                <SelectValue placeholder="选择目标 Tab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">当前活动标签页（active tab）</SelectItem>
                {tabs
                  .filter((t) => typeof t.id === "number")
                  .map((t) => {
                    const id = t.id as number
                    const url = String(t.url || "")
                    const title = String(t.title || "")
                    const maxTextLength = 12
                    const shortUrl = truncateText(url, maxTextLength)
                    const shortTitle = truncateText(title, maxTextLength)
                    const label = `${id} | ${title ? shortTitle + " | " : ""}${shortUrl}`
                    const fullLabel = `${id} | ${title ? title + " | " : ""}${url}`
                    const ok = isScannableUrl(url)
                    const prefix = ok ? "" : "[不可用] "
                    return (
                      <SelectItem
                        key={id}
                        value={String(id)}
                        disabled={!ok}
                        title={prefix + fullLabel}
                      >
                        {prefix + label}
                      </SelectItem>
                    )
                  })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex md:justify-end">
            <Button
              onClick={() => void refreshTabs()}
              disabled={isBusy}
              variant="outline"
              className="w-full md:w-auto"
            >
              Refresh Tabs
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
