<div align="center">

<img src="metadata/promo-hero.png" alt="Unquarantine — open blocked downloads from Raycast" width="820">

# Unquarantine

**Open blocked downloads from Raycast. One command, one confirm, no Touch ID.**

English · [简体中文](README.zh-CN.md)

</div>

---

Download an unsigned app, drag it to `/Applications`, double-click — and macOS tells you it "could not be verified". The official way out is a detour: open System Settings, find Privacy & Security, scroll to the bottom, click **Open Anyway**, confirm again, then authenticate with Touch ID.

This Raycast extension turns that into a single search.

## Commands

| Command                           | What it does                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unquarantine Latest App**       | The fast path. Picks the one app downloaded in the last 24 hours that Gatekeeper is actually blocking, asks once, and clears it. No system dialogs, no Touch ID. |
| **Unquarantine Apps**             | Browse everything: the apps Gatekeeper blocks by default, or every file still carrying the quarantine attribute.                                                 |
| **Unquarantine Finder Selection** | Clear whatever is selected in Finder — handy right after dragging an app into `/Applications`.                                                                   |
| **Open Anyway**                   | Prefer Apple's own flow? Opens Privacy & Security scrolled to the Security section and names the blocked app. You click the button.                              |
| **Open Security Settings**        | Plain jump to the Security section. No Accessibility permission needed.                                                                                          |

Under the hood the first three run `xattr -dr com.apple.quarantine <path>`. Apps you own need no password; when a file needs elevation the extension falls back to an authenticated run and macOS prompts you.

## Install

This extension isn't on the Raycast Store, so you install it from source. It takes about a minute, and you don't need to know anything about extension development.

**You'll need:** macOS, [Raycast](https://raycast.com), Node.js 22+ and [pnpm](https://pnpm.io) 11+ (`brew install node pnpm`).

**1. Build it once**

```bash
git clone https://github.com/chen86860/raycast-unquarantine.git
cd raycast-unquarantine
pnpm install
pnpm build
```

That's all the terminal work. `pnpm build` finishes with `built extension successfully` — you don't need a dev server, and you never have to run this again unless you edit the code.

**2. Import it into Raycast**

Open Raycast, run the built-in **Import Extension** command, and select the `raycast-unquarantine` folder you just built.

**3. Use it**

Type `unquarantine` in Raycast. Five commands show up; `Unquarantine Latest App` is the one you'll want most of the time.

> [!TIP]
> Give it a hotkey. In _Raycast Settings › Extensions › Unquarantine_, assign an alias (say `unq`) or a keyboard shortcut to **Unquarantine Latest App**. Then unblocking a fresh download is: hotkey, Enter. The same panel holds this extension's preferences.

To remove the extension later, use Raycast's **Manage Extensions** command.

<details>
<summary>Optional: grant Accessibility permission</summary>

Only **Open Anyway** needs it, and only to read the name of the blocked app out of the Settings window. Tick Raycast under _System Settings › Privacy & Security › Accessibility_. Without it the command still opens the right pane — it just can't tell you which app is blocked.

</details>

<details>
<summary>Check that it works</summary>

Run **Unquarantine Apps**. If nothing is currently blocked the list is empty — that's the correct answer, not a failure. Switch the dropdown in the search bar to the second option and you should see every app macOS ever tagged, each labelled as blocked or already cleared.

</details>

## Preferences

| Preference                 | Default      | Effect                                                                            |
| -------------------------- | ------------ | --------------------------------------------------------------------------------- |
| Interface language         | Match System | English or 简体中文 for messages and dialogs                                      |
| Open after unquarantine    | on           | Launch the app right after clearing it                                            |
| Extra scan folders         | –            | Comma-separated paths beyond `/Applications`, `~/Applications` and `~/Downloads`  |
| Re-sign after unquarantine | off          | Also run `codesign --force --deep --sign -`, for apps that still report "damaged" |

### Language

Messages, dialogs and list labels are bilingual — English and 简体中文. "Match System" reads your macOS preferred languages and picks Chinese if that comes first; the dropdown overrides it.

Command names, their descriptions and the preference labels themselves stay in English. That isn't a shortcut: Raycast has no i18n API. `environment` exposes `appearance` and `textSize` but no locale, and the [extension manifest schema](https://www.raycast.com/schemas/extension.json) accepts a single string for every `title` and `description`. Extensions that localize do it exactly like this one — their own string table plus a preference to pick the language.

## Having the attribute ≠ being blocked

<img src="metadata/promo-detection.png" alt="Three conditions decide whether an app is really blocked" width="820">

This is the trap most one-liner scripts fall into. When you approve an app, macOS **keeps** `com.apple.quarantine` on the file — it only flips a flag. So the attribute on its own tells you nothing. On the machine this was built for, 70 items carried it and exactly one was blocked.

Three conditions have to hold at once:

1. **The attribute is present.** No attribute, no Gatekeeper prompt.
2. **Flags do not contain `0x40`.** That bit records that you already clicked Open Anyway.
3. **`spctl --assess` rejects it.** Notarized apps are never blocked, approved or not.

> [!WARNING]
> Don't use `0x80` to decide. It looks like "assessment passed", but blocked apps carry it too — one blocked app and four perfectly working ones were all `0x381`. Only the three conditions above separate them reliably.

Scanning stays cheap: the flags filter runs first (70 items down to 8 on a real machine), then `spctl` runs on what's left — about two seconds.

## Two ways to unblock

**Clear the attribute** — what `Unquarantine Latest App` does. Deletes `com.apple.quarantine`, so Gatekeeper stops asking. One Raycast confirm, no system dialogs, no Touch ID.

It only looks at `.app` bundles downloaded in the **last 24 hours** that are genuinely blocked; anything without a download timestamp is skipped. Nothing matching means it tells you there is nothing to unlock — older items are left to `Unquarantine Apps`.

**Use Apple's flow** — what `Open Anyway` supports. System Settings → Open Anyway → confirm → Touch ID. Slower, but macOS records a formal approval. The command only opens and locates; it never clicks for you.

<details>
<summary>How the blocked app is identified</summary>

The Open Anyway button in System Settings is a SwiftUI button with no accessibility title, so it can't be found by name. It is located instead by the notice next to it — _"X" was blocked to protect your Mac._ — and the app name is parsed out of that string.

That notice only appears right after you have tried to open a blocked app, and it is cleared when System Settings quits. When it isn't there, the command simply leaves you on the Security section.

</details>

## Safety

Quarantine is a real Gatekeeper defence. Clear it only for apps whose origin you trust — this extension makes approval faster, it doesn't make an untrusted app safe. Every command names the app and its download source before doing anything.

## Development

Only needed if you want to change the code — installing doesn't require any of this.

```bash
pnpm dev     # watch mode, hot reloads into Raycast as you edit
pnpm build   # type-check and bundle
pnpm lint    # Raycast lint rules
```

`src/lib/quarantine.ts` holds the scanning and clearing logic, `src/lib/open-anyway.ts` the Settings-window lookup. Each command is a single file under `src/`.

## License

MIT
