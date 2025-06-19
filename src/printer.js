// printer.js
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
        Object.assign(this, parsed);
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

module.exports = Printer;
