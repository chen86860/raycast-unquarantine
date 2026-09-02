# Unquarantine

从网上下载的未签名 App，macOS 会打上 `com.apple.quarantine` 隔离属性，第一次打开要去「系统设置 › 隐私与安全性」翻到底部点 Open Anyway。这个 Raycast 扩展把这件事变成一次搜索。

## 命令

| 命令                             | 作用                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Unquarantine Latest App`        | **最省事**：取 24 小时内被拦住的那个 App，弹确认框，确认即解除——不走系统弹窗，也不需要 Touch ID              |
| `Open Anyway`                    | 打开安全设置并定位到被阻止的 App，toast 里报出是哪个；按钮由你自己点                                         |
| `Unquarantine Apps`              | 扫描 `/Applications`、`~/Applications`、`~/Downloads`，列出**会被拦住的**项，可切换看全部；回车即解除并打开 |
| `Unquarantine Finder Selection`  | 对访达中当前选中的文件直接解除隔离，适合刚拖进 `/Applications` 的 App                                        |
| `Open Security Settings`         | 兜底，跳到「隐私与安全性 › Security」分区（URL 带 `?Security` 锚点，不用滚动）                               |

除 `Open Anyway` 外的命令底层就是 `xattr -dr com.apple.quarantine <path>`。用户目录下的 App 不需要密码；遇到权限不足会自动回退到带系统密码框的提权执行。

## 设置项

- **解除后自动打开**：`Unquarantine Latest App` 解除隔离后直接启动该 App，默认开启
- **额外扫描目录**：逗号分隔，比如 `~/Desktop, /Volumes/Data/Apps`
- **解除隔离后重新签名**：勾选后额外执行 `codesign --force --deep --sign -`，用于解决部分 App 去掉隔离属性后仍提示「已损坏，无法打开」的情况

## 本地安装

```bash
pnpm install
pnpm dev     # 首次运行会把扩展装进 Raycast，之后 Ctrl-C 退出即可，扩展保留
```

## 「有隔离属性」不等于「会被拦」

最容易踩的坑：App 被放行之后，`com.apple.quarantine` 属性**仍然留在文件上**，只是第一段的标志位加了一位。所以不能拿「有没有这个属性」当判断依据——这台机器上 70 个带属性的项里，实际会被拦的只有 1 个。

判断规则（全量实测得出，标志位 + `spctl` 缺一不可）：

| 条件 | 说明 |
| --- | --- |
| 有 `com.apple.quarantine` 属性 | 没有属性就不会被 Gatekeeper 拦 |
| 标志位 **不含 `0x40`** | `0x40` = 用户点过 Open Anyway，已放行 |
| `spctl --assess` 判定 rejected | 公证过的 App 即使没放行过也不会被拦 |

三条同时成立才算「会被拦」。扫描时先用标志位筛（几乎不花时间，本机 70 个只剩 8 个），再对剩下的跑 `spctl`，整体约 2 秒。

⚠️ **不要用 `0x80` 判断**。它看着像「评估通过」，实际上被拦住的 App 也带着它——本机 `0x381` 这一组里，4 个公证 App 能开，CleanMyCodex 开不了，标志位完全一样。唯一可靠的组合就是上面那三条。

## 两条路的区别

**走 `Unquarantine Latest App`（推荐）**：直接删掉 `com.apple.quarantine` 属性，Gatekeeper 下次就不会拦。一个 Raycast 确认框搞定，不弹系统警告、不需要 Touch ID。

它只看**最近 24 小时内下载**、且真正会被拦的 `.app`（没有下载时间戳的一律排除）。找不到就提示「没有可解锁的 App」，不会去翻更早的东西——那些交给 `Unquarantine Apps` 手动挑。

**走 `Open Anyway`**：保留系统原本的放行流程（系统设置 → Open Anyway → 二次确认 → Touch ID），只是帮你把面板打开并定位好。适合想让系统留下正式放行记录的场景。

`Open Anyway` 识别被拦 App 的方式：系统设置里那个按钮是没有 accessibility title 的 SwiftUI 按钮，只能靠同一 group 里的提示文案（「"X" was blocked to protect your Mac.」）认出来。读这段文案需要 Raycast 有**辅助功能（Accessibility）权限**；没授权也不报错，面板照样停在 Security 分区，只是 toast 里说不出 App 名字。

另外这条提示只在你**刚尝试打开过**某个被拦的 App 时才出现，退出系统设置后记录会被清掉。

## 注意

隔离属性是 Gatekeeper 的一道防线。只对自己确认来源可信的 App 使用。
