const net = require('net');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

//////////////////////////
// 📌 Configuration Loader
//////////////////////////

const CONFIG_FILE = path.resolve(__dirname, 'config.json');
let PRINTER_HOST = '192.168.1.75';
let PRINTER_PORT = 8899;
let POLL_INTERVAL = 5000;

function promptForMissingConfig(config, missingKeys, callback) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askNext = () => {
        if (missingKeys.length === 0) {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            rl.close();
            PRINTER_HOST = config.PRINTER_HOST;
            PRINTER_PORT = config.PRINTER_PORT;
            POLL_INTERVAL = config.POLL_INTERVAL;
            callback();
            return;
        }

        const key = missingKeys.shift();
        rl.question(`Enter value for ${key}: `, (answer) => {
            config[key] = key === 'PRINTER_PORT' || key === 'POLL_INTERVAL' ? parseInt(answer.trim()) : answer.trim();
            askNext();
        });
    };

    askNext();
}

function loadConfig() {
    let config = {};
    let missingKeys = [];

    if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        config = JSON.parse(configData);

        if (!config.PRINTER_HOST) missingKeys.push('PRINTER_HOST');
        if (!config.PRINTER_PORT) missingKeys.push('PRINTER_PORT');
        if (!config.POLL_INTERVAL) missingKeys.push('POLL_INTERVAL');

        if (missingKeys.length > 0) {
            console.warn('⚠️ config.json is missing the following keys:', missingKeys);
            promptForMissingConfig(config, missingKeys, startWatcher);
            return false;
        } else {
            PRINTER_HOST = config.PRINTER_HOST;
            PRINTER_PORT = config.PRINTER_PORT;
            POLL_INTERVAL = config.POLL_INTERVAL;
        }
    } else {
        console.warn('⚠️ config.json not found. Creating a new one.');
        missingKeys = ['PRINTER_HOST', 'PRINTER_PORT', 'POLL_INTERVAL'];
        promptForMissingConfig(config, missingKeys, startWatcher);
        return false;
    }
    return true;
}

//////////////////////////
// 📌 Command Constants
//////////////////////////

const CMD_GET_TEMP = '~M105\n';            // Get extruder and bed temperatures
const CMD_GET_PRINT_STATUS = '~M27\n';     // Get SD printing progress
const CMD_GET_ENDSTOP_STATUS = '~M119\n';  // Get endstop switch status

const POLL_COMMANDS = [CMD_GET_TEMP, CMD_GET_PRINT_STATUS, CMD_GET_ENDSTOP_STATUS];

//////////////////////////
// 📨 Printer Class
//////////////////////////

class Printer {
    constructor() {
        this.nozzleTemp = null;
        this.nozzleTargetTemp = null;
        this.bedTemp = null;
        this.bedTargetTemp = null;

        this.endstopX = null;
        this.endstopY = null;
        this.endstopZ = null;

        this.sdBytesPrinted = null;
        this.sdBytesTotal = null;

        this.status = null;
        this.moveMode = null;
    }

    updateFromParsedData(parsed) {
        if ('nozzleTemp' in parsed) this.nozzleTemp = parsed.nozzleTemp;
        if ('nozzleTargetTemp' in parsed) this.nozzleTargetTemp = parsed.nozzleTargetTemp;
        if ('bedTemp' in parsed) this.bedTemp = parsed.bedTemp;
        if ('bedTargetTemp' in parsed) this.bedTargetTemp = parsed.bedTargetTemp;

        if ('endstopX' in parsed) this.endstopX = parsed.endstopX;
        if ('endstopY' in parsed) this.endstopY = parsed.endstopY;
        if ('endstopZ' in parsed) this.endstopZ = parsed.endstopZ;

        if ('sdBytesPrinted' in parsed) this.sdBytesPrinted = parsed.sdBytesPrinted;
        if ('sdBytesTotal' in parsed) this.sdBytesTotal = parsed.sdBytesTotal;

        if ('status' in parsed) this.status = parsed.status;
        if ('moveMode' in parsed) this.moveMode = parsed.moveMode;
    }

    printStatus() {
        console.log('📨 Printer Status:');
        console.log(`Nozzle Temp: ${this.nozzleTemp} / ${this.nozzleTargetTemp}`);
        console.log(`Bed Temp: ${this.bedTemp} / ${this.bedTargetTemp}`);
        console.log(`Endstops: X=${this.endstopX}, Y=${this.endstopY}, Z=${this.endstopZ}`);
        console.log(`SD Progress: ${this.sdBytesPrinted}/${this.sdBytesTotal}`);
        console.log(`Status: ${this.status}`);
        console.log(`Move Mode: ${this.moveMode}`);
        console.log('------------------------');
    }
}

//////////////////////////
// 👁️ PrinterWatcher Class
//////////////////////////

class PrinterWatcher {
    constructor(host, port, pollInterval = POLL_INTERVAL, logFile = 'printer_raw.log') {
        this.host = host;
        this.port = port;
        this.pollInterval = pollInterval;
        this.commands = POLL_COMMANDS;
        this.pollIndex = 0;
        this.buffer = '';
        this.client = null;
        this.printer = new Printer();
        this.logPath = path.resolve(logFile);
    }

    start() {
        this.client = new net.Socket();

        this.client.connect(this.port, this.host, () => {
            console.log(`✅ Connected to printer at ${this.host}:${this.port}`);
            this.startPolling();
        });

        this.client.on('data', (data) => this.handleData(data));
        this.client.on('error', (err) => console.error('❌ Connection error:', err.message));
        this.client.on('close', () => console.log('🔌 Connection closed'));
    }

    startPolling() {
        setInterval(() => {
            const command = this.commands[this.pollIndex];
            this.sendCommand(command);
            this.pollIndex = (this.pollIndex + 1) % this.commands.length;
        }, this.pollInterval);
    }

    sendCommand(command) {
        if (this.client && !this.client.destroyed) {
            console.log(`📤 Sending: ${command.trim()}`);
            this.client.write(command);
        } else {
            console.warn('⚠️ Cannot send command, client not connected');
        }
    }

    handleData(data) {
        this.buffer += data.toString();

        while (this.buffer.includes('ok')) {
            const [response, remaining] = this.buffer.split('ok', 2);
            this.buffer = remaining;

            const cleanResponse = response.trim();
            this.logRawResponse(cleanResponse);

            const parsed = this.parseResponse(cleanResponse);
            this.printer.updateFromParsedData(parsed);
            this.printer.printStatus();
        }
    }

    logRawResponse(raw) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${raw}\n\n`;
        fs.appendFile(this.logPath, entry, (err) => {
            if (err) console.error('⚠️ Failed to write to log:', err.message);
        });
    }

    parseResponse(raw) {
        const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
        const parsed = {};

        for (const line of lines) {
            if (line.startsWith('T0:')) {
                const matches = line.match(/T0:(\d+) \/(\d+)\s+B:(\d+)\/(\d+)/);
                if (matches) {
                    parsed.nozzleTemp = parseInt(matches[1]);
                    parsed.nozzleTargetTemp = parseInt(matches[2]);
                    parsed.bedTemp = parseInt(matches[3]);
                    parsed.bedTargetTemp = parseInt(matches[4]);
                }
            } else if (line.startsWith('Endstop')) {
                const parts = line.split(/\s+/);
                for (const part of parts.slice(1)) {
                    const [axis, state] = part.split(':');
                    if (axis === 'X-max') parsed.endstopX = parseInt(state);
                    if (axis === 'Y-max') parsed.endstopY = parseInt(state);
                    if (axis === 'Z-max') parsed.endstopZ = parseInt(state);
                }
            } else if (line.startsWith('SD printing byte')) {
                const matches = line.match(/SD printing byte (\d+)\/(\d+)/);
                if (matches) {
                    parsed.sdBytesPrinted = parseInt(matches[1]);
                    parsed.sdBytesTotal = parseInt(matches[2]);
                }
            } else if (line.startsWith('MachineStatus')) {
                parsed.status = line.split(':')[1].trim();
            } else if (line.startsWith('MoveMode')) {
                parsed.moveMode = line.split(':')[1].trim();
            }
        }

        return parsed;
    }
}

//////////////////////////
// ▶️ Run It
//////////////////////////

function startWatcher() {
    const watcher = new PrinterWatcher(PRINTER_HOST, PRINTER_PORT);
    watcher.start();
}

if (loadConfig()) {
    startWatcher();
}
