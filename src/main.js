// main.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const PrinterWatcher = require('./printerWatcher');
const PrinterServer = require('./printerServer');
const ArgumentManager = require('./argumentManager');

// const CONFIG_FILE = path.resolve(__dirname, 'config.json');
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

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
    const argManager = new ArgumentManager();
    const options = argManager.parse();
    if (options.help) {
        argManager.printHelp();
        return;
    }

    loadOrCreateConfig(config => {
        const pollInterval = options.pollOverride || config.POLL_INTERVAL;
        const host = options.hostOverride || config.PRINTER_HOST;
        const port = options.portOverride || config.PRINTER_PORT;
        const apiPort = options.apiPortOverride || 1337;

        const watcher = new PrinterWatcher(host, port, pollInterval, options.silent);
        watcher.start();

        const server = new PrinterServer(watcher.printer, apiPort);
        server.start();
    });
}

start();
