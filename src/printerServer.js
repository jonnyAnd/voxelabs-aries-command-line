// printerServer.js
const http = require('http');

class PrinterServer {
    constructor(printer, port = 1337) {
        this.printer = printer;
        this.port = port;
    }

    start() {
        const server = http.createServer((req, res) => {
            if (req.method === 'GET' && req.url === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.printer));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });

        server.listen(this.port, () => {
            console.log(`🚀 PrinterServer running at http://localhost:${this.port}/status`);
        });
    }
}

module.exports = PrinterServer;
