import { Alert, Toast, closeMainWindow, confirmAlert, getPreferenceValues, showToast } from "@raycast/api";
import { expandDirs, latestQuarantinedApp, openPath, unquarantine } from "./lib/quarantine";

type Preferences = {
  extraPaths?: string;
  adhocSign?: boolean;
  openAfterUnquarantine?: boolean;
};

function describe(agent: string | undefined, downloadedAt: Date | undefined): string {
  const parts: string[] = [];
  if (agent) parts.push(`来自 ${agent}`);
  if (downloadedAt) parts.push(downloadedAt.toLocaleString());
  return parts.join(" · ");
}

export default async function Command() {
  const { extraPaths, adhocSign, openAfterUnquarantine } = getPreferenceValues<Preferences>();
  const shouldOpen = openAfterUnquarantine ?? true;

  const item = await latestQuarantinedApp(expandDirs(extraPaths));
  if (!item) {
    await showToast({
      style: Toast.Style.Failure,
      title: "没有可解锁的 App",
      message: "24 小时内没有下载到被 Gatekeeper 拦住的 App",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `解除「${item.name}」的隔离？`,
    message: [item.path, describe(item.agent, item.downloadedAt)].filter(Boolean).join("\n"),
    icon: { fileIcon: item.path },
    primaryAction: {
      title: shouldOpen ? "解除并打开" : "解除隔离",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: { title: "取消" },
  });
  if (!confirmed) return;

  await closeMainWindow();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `正在解除「${item.name}」的隔离`,
  });
  try {
    const { elevated } = await unquarantine(item.path, adhocSign ?? false);
    if (shouldOpen) await openPath(item.path);
    toast.style = Toast.Style.Success;
    toast.title = `「${item.name}」已解除隔离`;
    // toast.message = elevated ? "使用了管理员权限" : "无需 Touch ID，可以直接打开了";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "解除隔离失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
