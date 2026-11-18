# Zeno Download Manager (ZenoDM) Releases & Browser Extensions (v1.0.3)

Official public release repository for **Zeno Download Manager (ZenoDM)** — a fast, local-first cross-platform download manager for **macOS** and **Windows**.

- **Website:** [https://zenodownloadmanager.vercel.app/](https://zenodownloadmanager.vercel.app/)
- **Latest Installers (`.dmg`, `.exe`, `.msi`):** [GitHub Releases](https://github.com/MTahir27/ZenoDM-Releases/releases/latest)
- **Developed By:** Muhammad Tahir ([https://mtdeveloper.vercel.app/](https://mtdeveloper.vercel.app/))
- **Support Email:** [zenodownloadmanager@gmail.com](mailto:zenodownloadmanager@gmail.com)

---

## Desktop Installers (v1.0.3)

| Platform | Installer | Direct Download |
| :--- | :--- | :--- |
| **macOS** (Apple Silicon & Intel, macOS 12+) | Universal `.dmg` | [ZenoDM_1.0.3_universal.dmg](https://github.com/MTahir27/ZenoDM-Releases/releases/latest/download/ZenoDM_1.0.3_universal.dmg) |
| **Windows 10 / 11** (64-bit) | Setup `.exe` (NSIS) | [ZenoDM_1.0.3_x64-setup.exe](https://github.com/MTahir27/ZenoDM-Releases/releases/latest/download/ZenoDM_1.0.3_x64-setup.exe) |
| **Windows 10 / 11** (64-bit) | Windows Installer `.msi` | [ZenoDM_1.0.3_x64_en-US.msi](https://github.com/MTahir27/ZenoDM-Releases/releases/latest/download/ZenoDM_1.0.3_x64_en-US.msi) |

> **Built-in `yt-dlp`, `ffmpeg` & `deno`:** ZenoDM automatically bundles and updates standalone `yt-dlp`, `ffmpeg`, and `deno` into its local helper directory on both Windows and macOS — no manual Homebrew or Winget installation is required.

---

## Browser Extensions (All Platforms)

All browser extensions are included in the ZenoDM desktop app and automatically extracted into your permanent App Data folder on first launch (`~/Library/Application Support/ZenoDM/Browser-Extension/` on macOS, `%LOCALAPPDATA%\ZenoDM\Browser-Extension\` on Windows), or downloadable from [GitHub Releases](https://github.com/MTahir27/ZenoDM-Releases/releases/latest):

- **Chrome, Edge, Opera, Brave & Vivaldi** (Manifest V3)
  - Open `chrome://extensions`, `edge://extensions`, or `opera://extensions` → enable **Developer mode** → click **Load unpacked** → select `chrome-edge-opera` (or download `ZenoDM-Chrome-Edge-Opera-Extension.zip`).
- **Mozilla Firefox** (WebExtension)
  - Open `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on…** → select `firefox/manifest.json` (or download `ZenoDM-Firefox-Extension.zip`).
- **Apple Safari (macOS)**
  - Open **Settings → Browser → Safari (Mac)** inside ZenoDM for guided setup.
