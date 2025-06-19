# 🖨️ Printer Watcher

Printer Watcher is a Node.js-based tool for monitoring the status of a network-connected 3D printer. It connects to the printer via TCP, parses its responses, and serves real-time status data via a simple HTTP interface.

## Features

- Connects to a networked 3D printer using a custom command protocol.
- Polls for temperature, print progress, endstop status, and more.
- Serves a JSON API at `/status`.
- Provides a web-based interface at `/` with a live-updating table.
- Supports CLI configuration and overrides.
- Auto-generates a config file on first run.

## Installation

```bash
git clone https://github.com/yourname/printer-watcher.git
cd printer-watcher
npm install
