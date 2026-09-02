import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { locateBlockedApp } from "./lib/open-anyway";

export default async function Command() {
  await closeMainWindow();
  const toast = await showToast({ style: Toast.Style.Animated, title: "正在打开安全设置…" });

  try {
    const result = await locateBlockedApp();

    switch (result.status) {
      case "found":
        toast.style = Toast.Style.Success;
        toast.title = result.app ? `「${result.app}」被阻止` : "已定位到被阻止的 App";
        toast.message = "Open Anyway 按钮就在面板中间，点一下即可";
        break;
      case "not-found":
        toast.style = Toast.Style.Success;
        toast.title = "已跳到 Security 分区";
        toast.message = "当前没有被阻止的 App；它只在尝试打开过之后才出现";
        break;
      default:
        // 没有辅助功能权限或系统设置还没起来，面板已经打开了，不当作错误
        toast.style = Toast.Style.Success;
        toast.title = "已跳到 Security 分区";
        toast.message = "Open Anyway 按钮就在这一页";
        break;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "打开安全设置失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
