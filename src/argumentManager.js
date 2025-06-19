// argumentManager.js
class ArgumentManager {
    constructor() {
        this.VALID_FLAGS = ['-h', '--poll', '--host', '--port', '--apiport', '--silent'];
    }

    printHelp() {
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
  --apiport <number>  Override HTTP server port for /status endpoint
  --silent            Disable print status logs to console
`);
    }

    parse() {
        const args = process.argv.slice(2);
        const options = {};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (!this.VALID_FLAGS.includes(arg) && !this.VALID_FLAGS.includes(args[i - 1])) {
                console.error(`❌ Unknown option: ${arg}`);
                this.printHelp();
                process.exit(1);
            }
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
                case '--apiport': {
                    const next = args[i + 1];
                    if (next && !next.startsWith('-')) {
                        options.apiPortOverride = parseInt(next);
                        i++;
                    } else {
                        console.warn('⚠️ --apiport flag requires a numeric value');
                    }
                    break;
                }
                case '--silent': {
                    options.silent = true;
                    break;
                }
            }
        }

        return options;
    }
}

module.exports = ArgumentManager;
