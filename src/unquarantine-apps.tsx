import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dirname } from "node:path";
import { useState } from "react";
import { openSecuritySettings } from "./lib/open-anyway";
import { QuarantinedItem, expandDirs, listQuarantined, openPath, unquarantine } from "./lib/quarantine";

type Preferences = {
  extraPaths?: string;
  adhocSign?: boolean;
};

export default function Command() {
  const { extraPaths, adhocSign } = getPreferenceValues<Preferences>();
  const dirs = expandDirs(extraPaths);
  const [includeCleared, setIncludeCleared] = useState(false);
  const { data, isLoading, revalidate } = useCachedPromise(listQuarantined, [dirs, { includeCleared }], {
    initialData: [],
  });

  async function approve(item: QuarantinedItem, andOpen: boolean) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `正在解除隔离 ${item.name}` });
    try {
      const { elevated } = await unquarantine(item.path, adhocSign ?? false);
      toast.style = Toast.Style.Success;
      toast.title = `${item.name} 已解除隔离`;
      toast.message = elevated ? "使用了管理员权限" : undefined;
      if (andOpen) await openPath(item.path);
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "解除隔离失败";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="显示范围"
          value={String(includeCleared)}
          onChange={(v) => setIncludeCleared(v === "true")}
        >
          <List.Dropdown.Item title="只看会被拦住的" value="false" />
          <List.Dropdown.Item title="全部带隔离属性的" value="true" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={isLoading ? "扫描中…" : "没有会被拦住的 App"}
        description={
          isLoading ? undefined : "带 com.apple.quarantine 属性但已放行的 App 不会被拦；切到「全部」可以看到它们"
        }
        actions={
          <ActionPanel>
            <Action title="显示全部带隔离属性的" icon={Icon.Eye} onAction={() => setIncludeCleared(true)} />
            <Action title="打开隐私与安全性设置" icon={Icon.Gear} onAction={openSecuritySettings} />
            <Action title="重新扫描" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {data.map((item) => (
        <List.Item
          key={item.path}
          icon={{ fileIcon: item.path }}
          title={item.name}
          subtitle={dirname(item.path)}
          accessories={[
            item.blocked ? { tag: { value: "会被拦", color: "#FF6363" } } : { tag: "已放行" },
            item.agent ? { text: item.agent } : {},
            item.downloadedAt ? { date: item.downloadedAt, tooltip: "下载时间" } : {},
          ]}
          actions={
            <ActionPanel>
              <Action title="解除隔离并打开" icon={Icon.Play} onAction={() => approve(item, true)} />
              <Action title="仅解除隔离" icon={Icon.LockUnlocked} onAction={() => approve(item, false)} />
              <Action.ShowInFinder path={item.path} />
              <Action
                title="打开隐私与安全性设置"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={openSecuritySettings}
              />
              <Action
                title="重新扫描"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
              <Action.CopyToClipboard
                title="复制路径"
                content={item.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
