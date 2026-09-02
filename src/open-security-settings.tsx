import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { openSecuritySettings } from "./lib/open-anyway";

export default async function Command() {
  try {
    await openSecuritySettings();
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "打开系统设置失败",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
