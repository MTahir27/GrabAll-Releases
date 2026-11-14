# GrabAll Releases & Browser Extensions (v1.0.13)

Official public release repository for **GrabAll** — fast, local-first cross-platform download manager for **macOS** and **Windows**.

- **Website:** [https://graball-project.vercel.app/](https://graball-project.vercel.app/)
- **Latest Installers (`.dmg`, `.exe`, `.msi`):** [GitHub Releases](https://github.com/MTahir27/GrabAll-Releases/releases/latest)
- **Developed By:** Muhammad Tahir ([https://mtdeveloper.vercel.app/](https://mtdeveloper.vercel.app/))
- **Support Email:** [m.tahiridrees27@gmail.com](mailto:m.tahiridrees27@gmail.com)

---

## Desktop Installers (v1.0.13)

| Platform | Installer | Direct Download |
| :--- | :--- | :--- |
| **macOS** (Apple Silicon & Intel, macOS 12+) | Universal `.dmg` | [GrabAll_1.0.13_universal.dmg](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.13_universal.dmg) |
| **Windows 10 / 11** (64-bit) | Setup `.exe` (NSIS) | [GrabAll_1.0.13_x64-setup.exe](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.13_x64-setup.exe) |
| **Windows 10 / 11** (64-bit) | Windows Installer `.msi` | [GrabAll_1.0.13_x64_en-US.msi](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.13_x64_en-US.msi) |

> **Built-in `yt-dlp` & `ffmpeg`:** GrabAll automatically bundles and downloads standalone `yt-dlp` and `ffmpeg` into its local helper directory on both Windows and macOS — no manual Homebrew or Winget installation is required.

---

## Browser Extensions (All Platforms)

All browser extensions are included in [`extensions/`](./extensions) and are also **automatically extracted** by the GrabAll desktop app into `Downloads/GrabAll/Browser-Extension/` on first launch:

- **[`extensions/chrome-edge-opera/`](./extensions/chrome-edge-opera)** — **Google Chrome, Microsoft Edge, Opera, Brave, and Vivaldi** (Manifest V3)
  - Open `chrome://extensions`, `edge://extensions`, or `opera://extensions` → enable **Developer mode** → click **Load unpacked** → select `Downloads/GrabAll/Browser-Extension` (or `extensions/chrome-edge-opera`).
- **[`extensions/firefox/`](./extensions/firefox)** — **Mozilla Firefox** (WebExtension with Gecko ID `graball@graball.app`)
  - Open `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on…** → select `Downloads/GrabAll/Browser-Extension/firefox/manifest.json` (or `extensions/GrabAll-Firefox-Extension.zip`).
- **[`extensions/safari/`](./extensions/safari)** — **Apple Safari on macOS**
  - Convert with `xcrun safari-web-extension-converter Downloads/GrabAll/Browser-Extension/safari` (or `extensions/safari`) in Xcode on macOS.
