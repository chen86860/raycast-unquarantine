import { Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";
import { t } from "./lib/i18n";
import { openSecuritySettings } from "./lib/open-anyway";

type Preferences = { language?: string };

export default async function Command() {
  const { language } = getPreferenceValues<Preferences>();

  try {
    await openSecuritySettings();
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: t(language).openSettingsFailed,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
