import { Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";
import { t } from "./lib/i18n";
import { locateBlockedApp } from "./lib/open-anyway";

type Preferences = { language?: string };

export default async function Command() {
  const { language } = getPreferenceValues<Preferences>();
  const s = t(language);

  await closeMainWindow();
  const toast = await showToast({ style: Toast.Style.Animated, title: s.openingSecuritySettings });

  try {
    const result = await locateBlockedApp();

    switch (result.status) {
      case "found":
        toast.style = Toast.Style.Success;
        toast.title = result.app ? s.blockedAppFound(result.app) : s.blockedAppFoundGeneric;
        toast.message = s.clickTheButton;
        break;
      case "not-found":
        toast.style = Toast.Style.Success;
        toast.title = s.jumpedToSecurity;
        toast.message = s.noBlockedApp;
        break;
      default:
        // 没有辅助功能权限或系统设置还没起来，面板已经打开了，不当作错误
        toast.style = Toast.Style.Success;
        toast.title = s.jumpedToSecurity;
        toast.message = s.buttonIsOnThisPage;
        break;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = s.openSettingsFailed;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
