import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** 「隐私与安全性」面板；?Security 锚点会直接滚到底部的 Security 分区 */
export const SECURITY_SETTINGS_URL = "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Security";

export async function openSecuritySettings(): Promise<void> {
  await run("open", [SECURITY_SETTINGS_URL]);
}

/**
 * 只读地找出面板里那条「App 已被阻止」的提示，拿到 App 名字用于提示文案。
 * 按钮本身没有 accessibility title，只能靠同组的提示文案认出来；
 * 这里刻意不 click，Open Anyway 由用户自己按。
 */
const FIND_BLOCKED_APP_JXA = String.raw`
function run() {
  const se = Application("System Events");
  const procs = se.processes.whose({ name: "System Settings" })();
  if (procs.length === 0) return JSON.stringify({ status: "no-window" });
  const proc = procs[0];

  const BLOCKED = /was blocked to protect your Mac|Apple could not verify|已被阻止|无法验证|已封鎖|無法驗證|ブロックされました|確認できません|wurde blockiert|nicht überprüfen|a été bloqué|pas pu vérifier/i;

  function attr(el, name) {
    try {
      const v = el[name]();
      return v == null ? "" : v;
    } catch (e) {
      return "";
    }
  }

  let hit = "";

  function walk(el, depth) {
    if (hit || depth > 12) return;
    let kids = [];
    try {
      kids = el.uiElements();
    } catch (e) {
      return;
    }
    const labels = [];
    let buttons = 0;
    for (const k of kids) {
      const role = String(attr(k, "role"));
      if (role === "AXStaticText") labels.push(String(attr(k, "value") || attr(k, "title")));
      else if (role === "AXButton") buttons++;
    }
    if (buttons === 1 && labels.some((l) => BLOCKED.test(l))) {
      hit = labels.join(" ");
      return;
    }
    for (const k of kids) walk(k, depth + 1);
  }

  let windows = [];
  try {
    windows = proc.windows();
  } catch (e) {
    return JSON.stringify({ status: "denied" });
  }
  for (const w of windows) walk(w, 0);

  if (!hit) return JSON.stringify({ status: "not-found" });

  // 各语言的提示文案都用弯引号把 App 名包起来
  const quoted = hit.match(/[“"„«]([^”"“»]+)[”"“»]/);
  return JSON.stringify({ status: "found", app: quoted ? quoted[1] : "" });
}
`;

export type LocateResult =
  { status: "found"; app: string } | { status: "not-found" } | { status: "no-window" } | { status: "denied" };

function isAccessibilityDenied(error: unknown): boolean {
  const message = String((error as { stderr?: string })?.stderr ?? (error as Error)?.message ?? "");
  return /assistive access|not allowed|1743|25211/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 打开安全设置并定位到被阻止的 App。只做定位与识别，不代替用户点按钮。
 * 读不到（没授辅助功能权限等）也不算失败——面板已经停在 Security 分区了。
 */
export async function locateBlockedApp(timeoutMs = 5000): Promise<LocateResult> {
  await openSecuritySettings();

  const deadline = Date.now() + timeoutMs;
  let last: LocateResult = { status: "no-window" };
  while (Date.now() < deadline) {
    try {
      const { stdout } = await run("osascript", ["-l", "JavaScript", "-e", FIND_BLOCKED_APP_JXA]);
      last = JSON.parse(stdout.trim()) as LocateResult;
    } catch (error) {
      if (isAccessibilityDenied(error)) return { status: "denied" };
      throw error;
    }
    if (last.status === "found" || last.status === "denied") return last;
    await sleep(400);
  }
  return last;
}
