<div align="center">
<h1>
  Multi-Stoat

  [![Stars](https://img.shields.io/github/stars/Brinziber/multi-stoat?style=flat-square&logoColor=white)](https://github.com/Brinziber/multi-stoat/stargazers)
  [![Forks](https://img.shields.io/github/forks/Brinziber/multi-stoat?style=flat-square&logoColor=white)](https://github.com/Brinziber/multi-stoat/network/members)
  [![Issues](https://img.shields.io/github/issues/Brinziber/multi-stoat?style=flat-square&logoColor=white)](https://github.com/Brinziber/multi-stoat/issues)
  [![License](https://img.shields.io/github/license/Brinziber/multi-stoat?style=flat-square&logoColor=white)](https://github.com/Brinziber/multi-stoat/blob/main/LICENSE)
</h1>

A community fork of [stoatchat/for-desktop](https://github.com/stoatchat/for-desktop) with multi-instance support.  
Available for Windows, macOS, and Linux.
</div>
<br/>

![Multi-Stoat screenshot showing two instances (Revolt and Self-Hosted) as tabs in the sidebar](image.png)

## What's different from the original?

Multi-Stoat extends the official Stoat desktop client with the ability to connect to **multiple Revolt/Stoat instances simultaneously** — useful for users who operate or participate in self-hosted servers alongside the main Stoat network.

| Feature | Official Stoat | Multi-Stoat |
|---|---|---|
| Connect to stoat.chat | ✅ | ✅ |
| Connect to self-hosted instances | ❌ | ✅ |
| Multiple instances at once | ❌ | ✅ |
| Switch instances via sidebar tabs | ❌ | ✅ |
| Instance manager (add/edit/remove) | ❌ | ✅ |
| Custom sidebar / title bar | ❌ | ✅ |
| All original features (tray, RPC, …) | ✅ | ✅ |

### Multi-instance sidebar

A custom title bar replaces the native window frame. It shows one tab per configured instance and lets you switch between them instantly without opening a new window. Window controls (minimise, maximise, close) are rendered natively per platform.

### Instance manager

An in-app dialog lets you add, rename, and remove instances at any time. Each instance stores a **label** and a **URL** pointing to the Revolt-compatible frontend of your choice.

---

## Installation

### Pre-built binaries (recommended)

Download the latest release from the [Releases page](https://github.com/Brinziber/multi-stoat/releases/latest).

| Platform | File | Notes |
|---|---|---|
| **Linux** (Debian/Ubuntu) | `multi-stoat_*_amd64.deb` | Install via `sudo dpkg -i multi-stoat_*.deb` |
| **Linux** (ARM64) | `multi-stoat_*_arm64.deb` | For Raspberry Pi 4/5 and ARM boards |
| **Linux** (any) | `multi-stoat-linux-*.zip` | Extract and run the `multi-stoat` binary |
| **Windows** | `multi-stoat-setup.exe` | Standard installer wizard |
| **Windows** (portable) | `multi-stoat-win32-*.zip` | Extract and run `multi-stoat.exe` |
| **macOS** (Apple Silicon) | `multi-stoat-darwin-arm64-*.zip` | Extract and move to Applications |
| **macOS** (Intel) | `multi-stoat-darwin-x64-*.zip` | Extract and move to Applications |

> **macOS note:** The app is not notarized. On first launch, right-click the app → **Open** to bypass Gatekeeper.

> **Linux note:** If the app does not launch after installing the `.deb`, make sure `libnotify` and `libgconf` are installed on your system.

---

### Build from source

#### Requirements

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) — enable via `corepack enable`

```bash
# Clone this repository (including assets submodule)
git clone --recursive https://github.com/Brinziber/multi-stoat
cd multi-stoat

# Install dependencies
pnpm i --frozen-lockfile

# Run in development mode
pnpm start

# Build an unpacked bundle
pnpm package

# Build distributable packages (.deb, .zip, Flatpak, …)
pnpm make
```

### Development helpers

```bash
# Point the app at a local Revolt dev server
pnpm start -- --force-server http://localhost:5173

# Install and run the Flatpak build locally (after `pnpm make`)
pnpm install:flatpak
pnpm run:flatpak

# Connect the Flatpak build to a local dev server
pnpm run:flatpak --force-server http://localhost:5173

# NixOS / Nix users
pnpm package
pnpm run:nix
pnpm run:nix --force-server=http://localhost:5173
```

### Assets submodule

Brand assets are tracked as a Git submodule. If they were not cloned automatically, run:

```bash
git -c submodule."assets".update=checkout submodule update --init assets
```

This is required before building. Forks are expected to supply their own assets.

---

## Upstream

This project is a fork of [stoatchat/for-desktop](https://github.com/stoatchat/for-desktop) and is kept in sync with upstream on a best-effort basis. Changes that are general enough may be proposed back via pull request.
