import { Toast, getPreferenceValues, getSelectedFinderItems, showToast } from "@raycast/api";
import { t } from "./lib/i18n";
import { unquarantine } from "./lib/quarantine";

type Preferences = { adhocSign?: boolean; language?: string };

export default async function Command() {
  const { adhocSign, language } = getPreferenceValues<Preferences>();
  const s = t(language);

  let items: { path: string }[];
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: s.selectInFinderFirst });
    return;
  }

  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: s.nothingSelected });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: s.unquarantiningCount(items.length) });
  const failed: string[] = [];
  let elevated = false;

  for (const item of items) {
    try {
      const result = await unquarantine(item.path, adhocSign ?? false);
      elevated ||= result.elevated;
    } catch {
      failed.push(item.path.split("/").pop() ?? item.path);
    }
  }

  if (failed.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = s.unquarantinedCount(items.length);
    toast.message = elevated ? s.adminUsed : undefined;
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = s.failedCount(failed.length);
    toast.message = failed.join(", ");
  }
}
