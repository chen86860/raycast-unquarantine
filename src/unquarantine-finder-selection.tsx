import { Toast, getPreferenceValues, getSelectedFinderItems, showToast } from "@raycast/api";
import { unquarantine } from "./lib/quarantine";

type Preferences = { adhocSign?: boolean };

export default async function Command() {
  const { adhocSign } = getPreferenceValues<Preferences>();

  let items: { path: string }[];
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "请先在访达中选中要解除隔离的文件" });
    return;
  }

  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "访达中没有选中任何文件" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: `正在解除隔离 ${items.length} 个项目` });
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
    toast.title = `已解除隔离 ${items.length} 个项目`;
    toast.message = elevated ? "使用了管理员权限" : undefined;
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `${failed.length} 个项目解除失败`;
    toast.message = failed.join("、");
  }
}
