import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const QUARANTINE_ATTR = "com.apple.quarantine";

/** Finder 里手动拖进来的 App 通常在这几个目录之一 */
export const DEFAULT_DIRS = ["/Applications", join(homedir(), "Applications"), join(homedir(), "Downloads")];

const INTERESTING_SUFFIXES = [".app", ".dmg", ".pkg", ".command", ".jar"];

/**
 * 隔离属性第一段是一组标志位，其中 0x40 表示用户已经点过 Open Anyway 放行。
 * 放行后属性不会被删除，只是加上这一位，所以「有没有属性」不能当判断依据。
 *
 * 注意 0x80 不能用来判断：本机被拦住的 CleanMyCodex 也带着 0x80，
 * 而带 0x80 的 App 里既有能开的也有开不了的。
 */
const QTN_FLAG_USER_APPROVED = 0x40;

export type QuarantinedItem = {
  path: string;
  name: string;
  /** com.apple.quarantine 的原始值，形如 `03c1;68b7...;Safari;UUID` */
  raw: string;
  /** 第一段标志位 */
  flags: number;
  /** 真的会被 Gatekeeper 拦住吗（标志位未放行 + spctl 也拒绝） */
  blocked: boolean;
  /** 隔离信息里记录的下载来源 App（Safari / Chrome …） */
  agent?: string;
  /** 下载时间，由隔离属性里的十六进制时间戳解析而来 */
  downloadedAt?: Date;
};

export function expandDirs(extraPaths: string | undefined): string[] {
  const extra = (extraPaths ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("~") ? join(homedir(), p.slice(1)) : resolve(p)));
  return [...new Set([...DEFAULT_DIRS, ...extra])];
}

async function candidatesIn(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => !name.startsWith(".") && INTERESTING_SUFFIXES.some((s) => name.toLowerCase().endsWith(s)))
    .map((name) => join(dir, name));
}

/**
 * `xattr -p attr a b c` 会为每个命中的路径输出 `path: value`，未命中的走 stderr。
 * 只传一个路径时它只输出裸值，所以这里单独处理。
 */
async function readQuarantineValues(paths: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (paths.length === 0) return found;

  if (paths.length === 1) {
    try {
      const { stdout } = await run("xattr", ["-p", QUARANTINE_ATTR, paths[0]]);
      const value = stdout.trim();
      if (value) found.set(paths[0], value);
    } catch {
      // 没有该属性，xattr 以非 0 退出
    }
    return found;
  }

  // 命中与否都会让 xattr 返回非 0，所以拿 stdout 而不是看 exit code
  let stdout = "";
  try {
    ({ stdout } = await run("xattr", ["-p", QUARANTINE_ATTR, ...paths], { maxBuffer: 8 * 1024 * 1024 }));
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? "";
  }

  for (const line of stdout.split("\n")) {
    const sep = line.indexOf(": ");
    if (sep === -1) continue;
    const path = line.slice(0, sep);
    const value = line.slice(sep + 2).trim();
    if (value) found.set(path, value);
  }
  return found;
}

function parseRaw(path: string, raw: string): QuarantinedItem {
  const [hexFlags, hexTime, agent] = raw.split(";");
  const flags = Number.parseInt(hexFlags ?? "", 16);
  const seconds = Number.parseInt(hexTime ?? "", 16);
  return {
    path,
    name: path.split("/").pop() ?? path,
    raw,
    flags: Number.isFinite(flags) ? flags : 0,
    blocked: false,
    agent: agent && agent !== "" ? agent : undefined,
    downloadedAt: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : undefined,
  };
}

/** 用户还没放行过——只是「可能会被拦」，还要过一遍 spctl */
function looksPending(item: QuarantinedItem): boolean {
  return (item.flags & QTN_FLAG_USER_APPROVED) === 0;
}

/** Gatekeeper 的实际判定；已签名/公证过的 App 即使没放行过也不会被拦 */
async function spctlRejects(path: string): Promise<boolean> {
  // .app 走 execute 评估，dmg/pkg 这类要用 open + primary-signature
  const args = path.endsWith(".app")
    ? ["--assess", "--type", "execute", path]
    : ["--assess", "--type", "open", "--context", "context:primary-signature", path];
  try {
    await run("spctl", args, { timeout: 20_000 });
    return false;
  } catch {
    return true;
  }
}

/**
 * 有 com.apple.quarantine 属性 ≠ 会被拦：放行过或评估通过之后属性还在，
 * 只是标志位变了。所以默认只返回真正会被 Gatekeeper 拦住的项。
 */
export async function listQuarantined(
  dirs: string[],
  options: { includeCleared?: boolean; withinMs?: number } = {},
): Promise<QuarantinedItem[]> {
  const paths = (await Promise.all(dirs.map(candidatesIn))).flat();
  const found = await readQuarantineValues(paths);
  let items = [...found.entries()]
    .map(([path, raw]) => parseRaw(path, raw))
    .sort((a, b) => (b.downloadedAt?.getTime() ?? 0) - (a.downloadedAt?.getTime() ?? 0));

  if (options.withinMs !== undefined) {
    // 没有时间戳就无从判断是不是新下载的，一律排除
    const earliest = Date.now() - options.withinMs;
    items = items.filter((item) => item.downloadedAt !== undefined && item.downloadedAt.getTime() >= earliest);
  }

  // 标志位先筛一遍，通常只剩 0～1 个，再对这几个跑 spctl 确认
  const pending = items.filter(looksPending);
  const verdicts = await Promise.all(pending.map((item) => spctlRejects(item.path)));
  pending.forEach((item, index) => {
    item.blocked = verdicts[index];
  });

  return options.includeCleared ? items : items.filter((item) => item.blocked);
}

export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 最近 24 小时内下载、且真正被拦住的那个 App——也就是你刚下完打不开的那个。
 * 更早的东西留给 Unquarantine Apps 处理，避免误碰放了很久的文件。
 */
export async function latestQuarantinedApp(
  dirs: string[],
  withinMs = RECENT_WINDOW_MS,
): Promise<QuarantinedItem | undefined> {
  const items = await listQuarantined(dirs, { withinMs });
  return items.find((item) => item.path.endsWith(".app"));
}

export async function isQuarantined(path: string): Promise<boolean> {
  return (await readQuarantineValues([path])).size > 0;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** 用 osascript 提权重跑同一条命令，会弹系统的密码框 */
async function runWithPrivileges(command: string): Promise<void> {
  await run("osascript", ["-e", `do shell script ${JSON.stringify(command)} with administrator privileges`]);
}

function isPermissionError(error: unknown): boolean {
  const message = String((error as { stderr?: string })?.stderr ?? (error as Error)?.message ?? "");
  return /not permitted|Permission denied|Operation not permitted|EACCES|EPERM/i.test(message);
}

/**
 * 去掉隔离属性；用户目录以外的 App 可能需要提权，此时回退到带密码框的执行。
 * adhocSign 用于处理去掉属性后仍报「已损坏」的 App。
 */
export async function unquarantine(path: string, adhocSign = false): Promise<{ elevated: boolean }> {
  const commands = [`/usr/bin/xattr -dr ${shellQuote(QUARANTINE_ATTR)} ${shellQuote(path)}`];
  if (adhocSign && path.endsWith(".app")) {
    commands.push(`/usr/bin/codesign --force --deep --sign - ${shellQuote(path)}`);
  }

  try {
    for (const command of commands) {
      await run("/bin/sh", ["-c", command]);
    }
    return { elevated: false };
  } catch (error) {
    if (!isPermissionError(error)) throw error;
    await runWithPrivileges(commands.join(" && "));
    return { elevated: true };
  }
}

export async function openPath(path: string): Promise<void> {
  await run("open", [path]);
}
