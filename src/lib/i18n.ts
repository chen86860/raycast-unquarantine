import { execFileSync } from "node:child_process";

/**
 * Raycast 没有 i18n API：`environment` 里没有 locale 字段，manifest 的
 * title / description / 偏好项标题也只接受单个字符串。所以命令名固定用英文，
 * 这里只负责运行时的界面文案。
 */
export type Lang = "en" | "zh";

export type Strings = {
  // 通用
  cancel: string;
  adminUsed: string;
  noTouchIdNeeded: string;
  unquarantineFailed: string;

  // Unquarantine Latest App
  nothingToUnlock: string;
  nothingToUnlockDetail: string;
  confirmTitle: (name: string) => string;
  fromAgent: (agent: string) => string;
  unquarantineAndOpen: string;
  unquarantineOnly: string;
  unquarantining: (name: string) => string;
  unquarantined: (name: string) => string;

  // Unquarantine Apps
  searchPlaceholder: string;
  scopeTooltip: string;
  scopeBlocked: string;
  scopeAll: string;
  scanning: string;
  nothingBlocked: string;
  nothingBlockedDetail: string;
  showAll: string;
  rescan: string;
  openSecuritySettings: string;
  tagBlocked: string;
  tagCleared: string;
  downloadedAt: string;
  copyPath: string;

  // Unquarantine Finder Selection
  selectInFinderFirst: string;
  nothingSelected: string;
  unquarantiningCount: (count: number) => string;
  unquarantinedCount: (count: number) => string;
  failedCount: (count: number) => string;

  // Open Anyway
  openingSecuritySettings: string;
  blockedAppFound: (name: string) => string;
  blockedAppFoundGeneric: string;
  clickTheButton: string;
  jumpedToSecurity: string;
  noBlockedApp: string;
  buttonIsOnThisPage: string;
  openSettingsFailed: string;
};

const en: Strings = {
  cancel: "Cancel",
  adminUsed: "Used administrator privileges",
  noTouchIdNeeded: "No Touch ID needed — it opens normally now",
  unquarantineFailed: "Could not unquarantine",

  nothingToUnlock: "No app to unlock",
  nothingToUnlockDetail: "Nothing downloaded in the last 24 hours is blocked by Gatekeeper",
  confirmTitle: (name) => `Unquarantine “${name}”?`,
  fromAgent: (agent) => `from ${agent}`,
  unquarantineAndOpen: "Unquarantine & Open",
  unquarantineOnly: "Unquarantine",
  unquarantining: (name) => `Unquarantining ${name}`,
  unquarantined: (name) => `${name} is unquarantined`,

  searchPlaceholder: "Search…",
  scopeTooltip: "Scope",
  scopeBlocked: "Blocked by Gatekeeper",
  scopeAll: "All with the quarantine attribute",
  scanning: "Scanning…",
  nothingBlocked: "Nothing is being blocked",
  nothingBlockedDetail:
    "Apps that carry com.apple.quarantine but were already approved are not blocked. Switch the dropdown to see them.",
  showAll: "Show All with the Quarantine Attribute",
  rescan: "Rescan",
  openSecuritySettings: "Open Privacy & Security Settings",
  tagBlocked: "blocked",
  tagCleared: "cleared",
  downloadedAt: "Downloaded",
  copyPath: "Copy Path",

  selectInFinderFirst: "Select the files in Finder first",
  nothingSelected: "Nothing is selected in Finder",
  unquarantiningCount: (count) => `Unquarantining ${count} item${count === 1 ? "" : "s"}`,
  unquarantinedCount: (count) => `Unquarantined ${count} item${count === 1 ? "" : "s"}`,
  failedCount: (count) => `${count} item${count === 1 ? "" : "s"} failed`,

  openingSecuritySettings: "Opening Security settings…",
  blockedAppFound: (name) => `“${name}” is blocked`,
  blockedAppFoundGeneric: "Found the blocked app",
  clickTheButton: "Open Anyway is in the middle of the pane — one click",
  jumpedToSecurity: "Jumped to the Security section",
  noBlockedApp: "Nothing is blocked right now; the notice only appears after you try to open a blocked app",
  buttonIsOnThisPage: "Open Anyway is on this page",
  openSettingsFailed: "Could not open System Settings",
};

const zh: Strings = {
  cancel: "取消",
  adminUsed: "使用了管理员权限",
  noTouchIdNeeded: "无需 Touch ID，现在可以直接打开",
  unquarantineFailed: "解除隔离失败",

  nothingToUnlock: "没有可解锁的 App",
  nothingToUnlockDetail: "24 小时内没有下载到被 Gatekeeper 拦住的 App",
  confirmTitle: (name) => `解除「${name}」的隔离？`,
  fromAgent: (agent) => `来自 ${agent}`,
  unquarantineAndOpen: "解除并打开",
  unquarantineOnly: "解除隔离",
  unquarantining: (name) => `正在解除「${name}」的隔离`,
  unquarantined: (name) => `「${name}」已解除隔离`,

  searchPlaceholder: "搜索…",
  scopeTooltip: "显示范围",
  scopeBlocked: "只看会被拦住的",
  scopeAll: "全部带隔离属性的",
  scanning: "扫描中…",
  nothingBlocked: "没有会被拦住的 App",
  nothingBlockedDetail: "带 com.apple.quarantine 属性但已放行的 App 不会被拦；切换下拉可以看到它们",
  showAll: "显示全部带隔离属性的",
  rescan: "重新扫描",
  openSecuritySettings: "打开隐私与安全性设置",
  tagBlocked: "会被拦",
  tagCleared: "已放行",
  downloadedAt: "下载时间",
  copyPath: "复制路径",

  selectInFinderFirst: "请先在访达中选中要解除隔离的文件",
  nothingSelected: "访达中没有选中任何文件",
  unquarantiningCount: (count) => `正在解除隔离 ${count} 个项目`,
  unquarantinedCount: (count) => `已解除隔离 ${count} 个项目`,
  failedCount: (count) => `${count} 个项目解除失败`,

  openingSecuritySettings: "正在打开安全设置…",
  blockedAppFound: (name) => `「${name}」被阻止`,
  blockedAppFoundGeneric: "已定位到被阻止的 App",
  clickTheButton: "Open Anyway 按钮就在面板中间，点一下即可",
  jumpedToSecurity: "已跳到 Security 分区",
  noBlockedApp: "当前没有被阻止的 App；它只在尝试打开过之后才出现",
  buttonIsOnThisPage: "Open Anyway 按钮就在这一页",
  openSettingsFailed: "打开系统设置失败",
};

const STRINGS: Record<Lang, Strings> = { en, zh };

/**
 * Raycast 不告诉扩展当前语言，也不保证透传 LANG，所以直接读系统的偏好语言列表。
 * 取首选语言即可；读失败一律按英文处理。
 */
function detectLang(): Lang {
  try {
    const output = execFileSync("defaults", ["read", "-g", "AppleLanguages"], {
      encoding: "utf8",
      timeout: 2000,
    });
    const first = output.match(/"?([a-zA-Z-]+)"?/)?.[1] ?? "";
    return first.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

let cached: Strings | undefined;

/** 传入偏好里的 language（auto / en / zh），返回该语言的文案表 */
export function t(preference?: string): Strings {
  if (preference === "en" || preference === "zh") return STRINGS[preference];
  cached ??= STRINGS[detectLang()];
  return cached;
}
