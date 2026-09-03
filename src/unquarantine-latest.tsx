import { Alert, Toast, closeMainWindow, confirmAlert, getPreferenceValues, showToast } from "@raycast/api";
import { Strings, t } from "./lib/i18n";
import { expandDirs, latestQuarantinedApp, openPath, unquarantine } from "./lib/quarantine";

type Preferences = {
  extraPaths?: string;
  adhocSign?: boolean;
  openAfterUnquarantine?: boolean;
  language?: string;
};

function describe(s: Strings, agent: string | undefined, downloadedAt: Date | undefined): string {
  const parts: string[] = [];
  if (agent) parts.push(s.fromAgent(agent));
  if (downloadedAt) parts.push(downloadedAt.toLocaleString());
  return parts.join(" · ");
}

export default async function Command() {
  const { extraPaths, adhocSign, openAfterUnquarantine, language } = getPreferenceValues<Preferences>();
  const s = t(language);
  const shouldOpen = openAfterUnquarantine ?? true;

  const item = await latestQuarantinedApp(expandDirs(extraPaths));
  if (!item) {
    await showToast({
      style: Toast.Style.Failure,
      title: s.nothingToUnlock,
      message: s.nothingToUnlockDetail,
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: s.confirmTitle(item.name),
    message: [item.path, describe(s, item.agent, item.downloadedAt)].filter(Boolean).join("\n"),
    icon: { fileIcon: item.path },
    primaryAction: {
      title: shouldOpen ? s.unquarantineAndOpen : s.unquarantineOnly,
      style: Alert.ActionStyle.Default,
    },
    dismissAction: { title: s.cancel },
  });
  if (!confirmed) return;

  await closeMainWindow();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: s.unquarantining(item.name),
  });
  try {
    const { elevated } = await unquarantine(item.path, adhocSign ?? false);
    if (shouldOpen) await openPath(item.path);
    toast.style = Toast.Style.Success;
    toast.title = s.unquarantined(item.name);
    // toast.message = elevated ? s.adminUsed : s.noTouchIdNeeded;
    void elevated;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = s.unquarantineFailed;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
