// main.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const PrinterWatcher = require('./printerWatcher');

const CONFIG_FILE = path.resolve(__dirname, 'config.json');

function printHelp() {
    console.log(`
3D Printer Network Monitor
---------------------------
Monitors and logs the status of a networked 3D printer over TCP.

Usage:
  node main.js [options]

Options:
  -h                  Show this help message and exit
  --poll <ms>         Override polling interval in milliseconds
  --host <hostname>   Override printer hostname or IP address
  --port <number>     Override printer port
`);
}

function parseArguments() {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '-h':
                options.help = true;
                break;
            case '--poll': {
                const next = args[i + 1];
                if (next && !next.startsWith('-')) {
                    options.pollOverride = parseInt(next);
                    i++;
                } else {
                    console.warn('⚠️ --poll flag requires a value (in milliseconds)');
                }
                break;
            }
            case '--host': {
                const next = args[i + 1];
                if (next && !next.startsWith('-')) {
                    options.hostOverride = next.trim();
                    i++;
                } else {
                    console.warn('⚠️ --host flag requires a hostname or IP address');
                }
                break;
            }
            case '--port': {
                const next = args[i + 1];
                if (next && !next.startsWith('-')) {
                    options.portOverride = parseInt(next);
                    i++;
                } else {
                    console.warn('⚠️ --port flag requires a numeric value');
                }
                break;
            }
            default:
                console.warn(`Unknown option: ${arg}`);
        }
    }

    return options;
}

function loadOrCreateConfig(callback) {
    let config = {};
    let missingKeys = [];

    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (!config.PRINTER_HOST) missingKeys.push('PRINTER_HOST');
        if (!config.PRINTER_PORT) missingKeys.push('PRINTER_PORT');
        if (!config.POLL_INTERVAL) missingKeys.push('POLL_INTERVAL');
    } else {
        console.warn('⚠️ config.json not found. Creating a new one.');
        missingKeys = ['PRINTER_HOST', 'PRINTER_PORT', 'POLL_INTERVAL'];
    }

    if (missingKeys.length > 0) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        const askNext = () => {
            if (missingKeys.length === 0) {
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
                rl.close();
                callback(config);
                return;
            }

            const key = missingKeys.shift();
            rl.question(`Enter value for ${key}: `, answer => {
                config[key] = ['PRINTER_PORT', 'POLL_INTERVAL'].includes(key) ? parseInt(answer.trim()) : answer.trim();
                askNext();
            });
        };

        askNext();
    } else {
        callback(config);
    }
}

function start() {
    const options = parseArguments();
    if (options.help) {
        printHelp();
        return;
    }

    loadOrCreateConfig(config => {
        const pollInterval = options.pollOverride || config.POLL_INTERVAL;
        const host = options.hostOverride || config.PRINTER_HOST;
        const port = options.portOverride || config.PRINTER_PORT;
        const watcher = new PrinterWatcher(host, port, pollInterval);
        watcher.start();
    });
}

start();
