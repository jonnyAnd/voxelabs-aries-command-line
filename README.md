# voxelabs-aries-command-line

voxelabs-aries-command-line is a command-line tool that connects to a networked voxelabs 3D printer, and serves real-time status data via a simple HTTP interface.

## Features

- Polls for temperature, print progress, endstop status, and more.
- Serves a JSON API at `/status`.
- Provides a web-based interface at `/` with a live-updating table.
- Supports CLI configuration and overrides.
- Auto-generates a config file on first run.

## Installation
go to relase page and download the latest release for your platform.
and run.

When running go to http://localhost:1337/ to see the live data. or http://localhost:1337/status to see the json data.

## Still in beta!
For now thi project will only report a few stats, working on more features, incuting ability to submit prints!