# GrabAll — Official Releases & Browser Extension

GrabAll is a fast, local-first desktop download manager for macOS and Windows with multi-connection acceleration, YouTube & playlist support, speed scheduling, and browser integration.

## Download Latest Installers

* **macOS (Universal — Apple Silicon & Intel, macOS 12+):**
  [Download GrabAll (.dmg)](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.0_universal.dmg)
* **Windows 10 / 11 (64-bit):**
  * [Download Installer (.exe)](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.0_x64-setup.exe)
  * [Download MSI Package (.msi)](https://github.com/MTahir27/GrabAll-Releases/releases/latest/download/GrabAll_1.0.0_x64_en-US.msi)
* **All Releases:** [View Releases](https://github.com/MTahir27/GrabAll-Releases/releases)

---

## Browser Extension Setup (Chrome & Edge)

1. Download or clone this repository (or copy the `extensions/chrome-edge` folder).
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the [`extensions/chrome-edge`](./extensions/chrome-edge) folder.
4. Copy the shown **Extension ID**, open **GrabAll → Settings → Browser**, paste the ID (if needed), and click **Reconnect**.

---

## Optional Media Tools (YouTube & HD Video Merging)

GrabAll uses `yt-dlp` and `ffmpeg` for video extraction and merging HD (`720p`+) video + audio streams into `.mp4`:

* **macOS (Homebrew):** `brew install yt-dlp ffmpeg`
* **Windows (Winget):** `winget install yt-dlp.yt-dlp Gyan.FFmpeg`

---

## Bug Reports & Support

Please open an issue in the [Issues tab](https://github.com/MTahir27/GrabAll-Releases/issues) with your OS, GrabAll version, and optional redacted diagnostics copied from **GrabAll → Settings → About → Copy diagnostics**.
