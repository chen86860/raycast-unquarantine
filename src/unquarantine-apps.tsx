import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dirname } from "node:path";
import { useState } from "react";
import { t } from "./lib/i18n";
import { openSecuritySettings } from "./lib/open-anyway";
import { QuarantinedItem, expandDirs, listQuarantined, openPath, unquarantine } from "./lib/quarantine";

type Preferences = {
  extraPaths?: string;
  adhocSign?: boolean;
  language?: string;
};

export default function Command() {
  const { extraPaths, adhocSign, language } = getPreferenceValues<Preferences>();
  const s = t(language);
  const dirs = expandDirs(extraPaths);
  const [includeCleared, setIncludeCleared] = useState(false);
  const { data, isLoading, revalidate } = useCachedPromise(listQuarantined, [dirs, { includeCleared }], {
    initialData: [],
  });

  async function approve(item: QuarantinedItem, andOpen: boolean) {
    const toast = await showToast({ style: Toast.Style.Animated, title: s.unquarantining(item.name) });
    try {
      const { elevated } = await unquarantine(item.path, adhocSign ?? false);
      toast.style = Toast.Style.Success;
      toast.title = s.unquarantined(item.name);
      toast.message = elevated ? s.adminUsed : undefined;
      if (andOpen) await openPath(item.path);
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = s.unquarantineFailed;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={s.searchPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip={s.scopeTooltip}
          value={String(includeCleared)}
          onChange={(v) => setIncludeCleared(v === "true")}
        >
          <List.Dropdown.Item title={s.scopeBlocked} value="false" />
          <List.Dropdown.Item title={s.scopeAll} value="true" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={isLoading ? s.scanning : s.nothingBlocked}
        description={isLoading ? undefined : s.nothingBlockedDetail}
        actions={
          <ActionPanel>
            <Action title={s.showAll} icon={Icon.Eye} onAction={() => setIncludeCleared(true)} />
            <Action title={s.openSecuritySettings} icon={Icon.Gear} onAction={openSecuritySettings} />
            <Action title={s.rescan} icon={Icon.ArrowClockwise} onAction={revalidate} />
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
            item.blocked ? { tag: { value: s.tagBlocked, color: "#FF6363" } } : { tag: s.tagCleared },
            item.agent ? { text: item.agent } : {},
            item.downloadedAt ? { date: item.downloadedAt, tooltip: s.downloadedAt } : {},
          ]}
          actions={
            <ActionPanel>
              <Action title={s.unquarantineAndOpen} icon={Icon.Play} onAction={() => approve(item, true)} />
              <Action title={s.unquarantineOnly} icon={Icon.LockUnlocked} onAction={() => approve(item, false)} />
              <Action.ShowInFinder path={item.path} />
              <Action title={s.openSecuritySettings} icon={Icon.Gear} onAction={openSecuritySettings} />
              <Action
                title={s.rescan}
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action.CopyToClipboard
                title={s.copyPath}
                content={item.path}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
