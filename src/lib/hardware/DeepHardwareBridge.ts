/**
 * UNIVERSAL HARDWARE ENGINE (DEEP EDITION - OMEGA ULTRA)
 * Handles: Web Bluetooth, Web Serial (Printer & Scanner), Web USB, 
 * Local Network (TCP/IP), and Localhost Service Bridges.
 * 
 * VERSION: v22.1.0 - THE FINAL OMEGA WELD
 */

export class DeepHardwareBridge {
  // --- DEEP ESC/POS COMMAND SET ---
  private static ESC_POS_COMMANDS = {
    INIT: [0x1b, 0x40],
    CENTER: [0x1b, 0x61, 0x01],
    LEFT: [0x1b, 0x61, 0x00],
    RIGHT: [0x1b, 0x61, 0x02],
    BOLD_ON: [0x1b, 0x45, 0x01],
    BOLD_OFF: [0x1b, 0x45, 0x00],
    CUT: [0x1d, 0x56, 0x41, 0x03],    // Mechanical Blade Trigger
    DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // 24V Pulse to Cash Drawer
    FEED_3: [0x1b, 0x64, 0x03],
    DOUBLE_HEIGHT: [0x1b, 0x21, 0x10],
    RESET_SIZE: [0x1b, 0x21, 0x00],
    QR_MODEL: [0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], // QR Model 2
    QR_SIZE: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06],       // Size 6
    QR_ERR_CORR: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x33],   // Level L
    QR_PRINT: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x31]       // Print Buffer
  };

  /**
   * SILENT PRINT: The Sovereign Entry Point
   * Deeply resolves hardware transport and executes binary handshake.
   */
  static async silentPrint(device: any, receiptData: any) {
    const stream = this.generateEscPosPayload(receiptData);

    console.log(`[Deep Hardware] Initializing Protocol: ${device.connection_protocol || device.type}`);

    try {
      switch (device.connection_protocol || device.type) {
        case 'USB':
          // Deep Chunking: Some USB printers crash if sent > 512 bytes at once
          await this.sendUsbChunked(device.raw, stream);
          break;

        case 'BLUETOOTH':
          // Standard GATT characteristic for POS thermal heads
          const service = await device.raw.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
          const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
          await char.writeValue(stream);
          break;

        case 'SERIAL':
          // Support for legacy RS232 thermal printers
          await this.sendSerialData(device.raw, stream);
          break;

        case 'TCP_IP':
        case 'NETWORK':
          // Direct Socket dump (Port 9100)
          await this.sendToNetworkPrinter(device.ip_address, stream);
          break;

        case 'LOCAL_BRIDGE':
          // Localhost Proxy (v54321) for OS-level driver access
          await this.sendToLocalServiceBridge(stream);
          break;

        default:
          throw new Error(`Protocol [${device.connection_protocol}] not welded.`);
      }
      return { success: true, timestamp: new Date() };
    } catch (err) {
      console.error("[Deep Hardware] Critical Fail:", err);
      throw err;
    }
  }

  /**
   * GENERATE ESC/POS PAYLOAD
   * Crafts a professional supermarket receipt with QR validation.
   */
  private static generateEscPosPayload(data: any): Uint8Array {
    const encoder = new TextEncoder();
    const cmd = (bytes: number[]) => new Uint8Array(bytes);
    
    let stream = new Uint8Array();
    const append = (bytes: Uint8Array) => {
        let n = new Uint8Array(stream.length + bytes.length);
        n.set(stream); n.set(bytes, stream.length);
        stream = n;
    };

    // 1. Initial Handshake & Drawer Kick
    append(cmd(this.ESC_POS_COMMANDS.INIT));
    append(cmd(this.ESC_POS_COMMANDS.DRAWER_KICK));
    
    // 2. Corporate Header
    append(cmd(this.ESC_POS_COMMANDS.CENTER));
    append(cmd(this.ESC_POS_COMMANDS.DOUBLE_HEIGHT));
    append(encoder.encode(`${data.businessName.toUpperCase()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.RESET_SIZE));
    append(encoder.encode(`${data.businessAddress || ''}\n`));
    append(encoder.encode(`TIN: ${data.taxId || 'N/A'}\n`));
    append(encoder.encode(`TEL: ${data.businessPhone || 'N/A'}\n`));
    append(encoder.encode(`--------------------------------\n`));

    // 3. Line Items (Deep Padding Logic)
    append(cmd(this.ESC_POS_COMMANDS.LEFT));
    data.items.forEach((item: any) => {
      const name = (item.name || item.product_name).substring(0, 20);
      const qtyPrice = `${item.qty || 1} x ${item.price}`;
      const total = `${Number(item.price * (item.qty || 1)).toLocaleString()}`;
      append(encoder.encode(name.padEnd(32 - total.length) + total + '\n'));
      append(encoder.encode(`  ${qtyPrice}\n`));
    });

    // 4. Grand Totals
    append(encoder.encode(`--------------------------------\n`));
    append(cmd(this.ESC_POS_COMMANDS.RIGHT));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_ON));
    append(encoder.encode(`TOTAL ${data.currency}: ${data.total.toLocaleString()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_OFF));

    // 5. Fiscal QR Code (Mathematically Sealed)
    if (data.sealId) {
        append(cmd(this.ESC_POS_COMMANDS.CENTER));
        append(encoder.encode(`\nSCAN TO VERIFY\n`));
        append(this.generateQRCode(data.sealId));
    }

    // 6. Exit Logic
    append(cmd(this.ESC_POS_COMMANDS.CENTER));
    append(encoder.encode(`\n${data.footer || 'THANK YOU'}\n`));
    append(cmd(this.ESC_POS_COMMANDS.FEED_3));
    append(cmd(this.ESC_POS_COMMANDS.CUT));

    return stream;
  }

  /**
   * GENERATE QR CODE (ESC/POS RAW)
   * Deep implementation of the QR function block.
   */
  private static generateQRCode(text: string): Uint8Array {
    const encoder = new TextEncoder();
    const content = encoder.encode(text);
    const pL = (content.length + 3) % 256;
    const pH = Math.floor((content.length + 3) / 256);

    let qr = new Uint8Array();
    const add = (b: number[]) => {
        let n = new Uint8Array(qr.length + b.length);
        n.set(qr); n.set(new Uint8Array(b), qr.length); qr = n;
    };

    add(this.ESC_POS_COMMANDS.QR_MODEL);
    add(this.ESC_POS_COMMANDS.QR_SIZE);
    add(this.ESC_POS_COMMANDS.QR_ERR_CORR);
    add([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...Array.from(content)]); // Store Data
    add(this.ESC_POS_COMMANDS.QR_PRINT);

    return qr;
  }

  /**
   * DEEP USB TRANSMISSION
   * Prevents buffer overflow on industrial Epson/Star printers.
   */
  private static async sendUsbChunked(device: USBDevice, data: Uint8Array) {
    const chunkSize = 64; 
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await device.transferOut(1, chunk);
    }
  }

  /**
   * DEEP SERIAL TRANSMISSION
   * Direct byte-stream for legacy COM/RS232 hardware.
   */
  private static async sendSerialData(port: any, data: Uint8Array) {
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
  }

  private static async sendToNetworkPrinter(ip: string, stream: Uint8Array) {
    return await fetch(`http://${ip}:9100`, { method: 'POST', body: stream, mode: 'no-cors' });
  }

  private static async sendToLocalServiceBridge(stream: Uint8Array) {
    const base64Data = btoa(String.fromCharCode(...data));
    return await fetch('http://localhost:54321/print-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: base64Data })
    });
  }

  /**
   * HARDWARE DISCOVERY (SERIAL)
   * Connects to high-performance supermarket scanners.
   */
  static async connectIndustrialScanner() {
    if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        return port;
    }
    return null;
  }

  /**
   * HARDWARE DISCOVERY (BLUETOOTH)
   * Handshake with wireless POS terminals.
   */
  static async connectBluetooth() {
    const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
    });
    return await device.gatt?.connect();
  }
}