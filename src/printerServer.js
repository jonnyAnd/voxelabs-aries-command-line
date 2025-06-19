// printerServer.js
const http = require('http');
const WebInterface = require('./webInterface');

class PrinterServer {
    constructor(printer, port = 1337) {
        this.printer = printer;
        this.port = port;
    }

    start() {
        const server = http.createServer((req, res) => {
            if (req.method === 'GET') {
                if (req.url === '/status') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.printer));
                } else if (req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(WebInterface.getHomePageHTML());
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                }
            } else {
                res.writeHead(405, { 'Content-Type': 'text/plain' });
                res.end('405 Method Not Allowed');
            }
        });

        server.listen(this.port, () => {
            console.log(`🌐 PrinterServer listening on http://localhost:${this.port}`);
        });
    }
}

module.exports = PrinterServer;
