// main.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const PrinterWatcher = require('./printerWatcher');

const CONFIG_FILE = path.resolve(__dirname, 'config.json');

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
    loadOrCreateConfig(config => {
        const watcher = new PrinterWatcher(config.PRINTER_HOST, config.PRINTER_PORT, config.POLL_INTERVAL);
        watcher.start();
    });
}

start();
