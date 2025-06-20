// printerWatcher.js
const net = require('net');
// const fs = require('fs');
const path = require('path');
const Printer = require('./printer');

const CMD_GET_TEMP = '~M105\n';
const CMD_GET_PRINT_STATUS = '~M27\n';
const CMD_GET_ENDSTOP_STATUS = '~M119\n';

const COMMAND_NAMES = {
    [CMD_GET_TEMP]: 'GET_TEMP',
    [CMD_GET_PRINT_STATUS]: 'GET_PRINT_STATUS',
    [CMD_GET_ENDSTOP_STATUS]: 'GET_ENDSTOP_STATUS'
};

const POLL_COMMANDS = [CMD_GET_TEMP, CMD_GET_PRINT_STATUS, CMD_GET_ENDSTOP_STATUS];

const RESPONSE_TEMP_PREFIX = 'T0:';
const RESPONSE_ENDSTOP_PREFIX = 'Endstop';
const RESPONSE_SD_PRINTING_PREFIX = 'SD printing byte';
const RESPONSE_STATUS_PREFIX = 'MachineStatus';
const RESPONSE_MOVEMODE_PREFIX = 'MoveMode';

class PrinterWatcher {
    constructor(host, port, pollInterval, silent = false, logFile = 'printer_raw.log') {
        this.host = host;
        this.port = port;
        this.pollInterval = pollInterval;
        this.silent = silent;
        this.commands = POLL_COMMANDS;
        this.pollIndex = 0;
        this.buffer = '';
        this.client = null;
        this.printer = new Printer();
        this.logPath = path.resolve(logFile);
        this.commandTimeout = null;
        this.commandTimeoutDuration = 5000; // 5 seconds
    }

    start() {
        this.client = new net.Socket();
        this.client.connect(this.port, this.host, () => {
            if (!this.silent) console.log(`✅ Connected to printer at ${this.host}:${this.port}`);
            this.startPolling();
        });

        this.client.on('data', data => this.handleData(data));

        this.client.on('error', err => {
            console.error('❌ Failed to connect to printer:', err.message);
            process.exit(1);
        });

        this.client.on('close', () => {
            if (!this.silent) console.log('🔌 Connection closed');
        });
    }

    startPolling() {
        setInterval(() => {
            const command = this.commands[this.pollIndex];
            this.sendCommand(command);
            this.pollIndex = (this.pollIndex + 1) % this.commands.length;
        }, this.pollInterval);
    }

    sendCommand(command) {
        const commandName = COMMAND_NAMES[command] || 'UNKNOWN_COMMAND';
        if (this.client && !this.client.destroyed) {
            if (!this.silent) console.log(`📤 Sending: ${commandName}`);
            this.client.write(command);
            this.startCommandTimeout(commandName);
        } else {
            console.warn('⚠️ Cannot send command, client not connected');
        }
    }

    startCommandTimeout(commandName) {
        if (this.commandTimeout) {
            clearTimeout(this.commandTimeout);
        }
        this.commandTimeout = setTimeout(() => {
            console.warn(`⚠️ No response for command: ${commandName} within ${this.commandTimeoutDuration}ms`);
        }, this.commandTimeoutDuration);
    }

    handleData(data) {
        this.buffer += data.toString();

        while (this.buffer.includes('ok')) {
            const [response, remaining] = this.buffer.split('ok', 2);
            this.buffer = remaining;

            if (this.commandTimeout) {
                clearTimeout(this.commandTimeout);
                this.commandTimeout = null;
            }

            const cleanResponse = response.trim();
            // this.logRawResponse(cleanResponse);

            const parsed = this.parseResponse(cleanResponse);
            this.printer.updateFromParsedData(parsed);
            if (!this.silent) this.printer.printStatus();
        }
    }

    // logRawResponse(raw) {
    //     const timestamp = new Date().toISOString();
    //     const entry = `[${timestamp}] ${raw}\n\n`;
    //     fs.appendFile(this.logPath, entry, err => {
    //         if (err) console.error('⚠️ Failed to write to log:', err.message);
    //     });
    // }

    parseResponse(raw) {
        const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
        const parsed = {};

        for (const line of lines) {
            if (line.startsWith(RESPONSE_TEMP_PREFIX)) {
                const m = line.match(/T0:(\d+) \/(\d+)\s+B:(\d+)\/(\d+)/);
                if (m) Object.assign(parsed, {
                    nozzleTemp: +m[1],
                    nozzleTargetTemp: +m[2],
                    bedTemp: +m[3],
                    bedTargetTemp: +m[4]
                });
            } else if (line.startsWith(RESPONSE_ENDSTOP_PREFIX)) {
                const parts = line.split(/\s+/);
                parts.slice(1).forEach(p => {
                    const [axis, state] = p.split(':');
                    if (axis === 'X-max') parsed.endstopX = +state;
                    if (axis === 'Y-max') parsed.endstopY = +state;
                    if (axis === 'Z-max') parsed.endstopZ = +state;
                });
            } else if (line.startsWith(RESPONSE_SD_PRINTING_PREFIX)) {
                const m = line.match(/SD printing byte (\d+)\/(\d+)/);
                if (m) Object.assign(parsed, {
                    sdBytesPrinted: +m[1],
                    sdBytesTotal: +m[2]
                });
            } else if (line.startsWith(RESPONSE_STATUS_PREFIX)) {
                parsed.status = line.split(':')[1].trim();
            } else if (line.startsWith(RESPONSE_MOVEMODE_PREFIX)) {
                parsed.moveMode = line.split(':')[1].trim();
            }
        }

        return parsed;
    }
}

module.exports = PrinterWatcher;
