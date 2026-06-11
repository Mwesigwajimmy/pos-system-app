/**
 * UNIVERSAL HARDWARE ENGINE (DEEP EDITION - OMEGA)
 * Handles: Web Bluetooth, Web Serial, Web USB (HID/ESC-POS), 
 * Local Network (TCP/IP), and Localhost Service Bridges.
 * 
 * VERSION: v22.0.4 - SOVEREIGN HARDWARE WELD
 */

export class DeepHardwareBridge {
  private static ESC_POS_COMMANDS = {
    INIT: [0x1b, 0x40],
    CENTER: [0x1b, 0x61, 0x01],
    LEFT: [0x1b, 0x61, 0x00],
    RIGHT: [0x1b, 0x61, 0x02],
    BOLD_ON: [0x1b, 0x45, 0x01],
    BOLD_OFF: [0x1b, 0x45, 0x00],
    CUT: [0x1d, 0x56, 0x41, 0x03],    // Physical Paper Cut
    DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // Open Cash Drawer
    FEED_3: [0x1b, 0x64, 0x03],       // Feed 3 lines
    DOUBLE_HEIGHT: [0x1b, 0x21, 0x10],
    RESET_SIZE: [0x1b, 0x21, 0x00]
  };

  /**
   * SILENT PRINT: The Apex Entry Point
   * Automatically detects the communication protocol and fires the command.
   */
  static async silentPrint(device: any, receiptData: any) {
    const stream = this.generateEscPosPayload(receiptData);

    console.log(`[Deep Hardware] Initializing Protocol: ${device.connection_protocol || device.type}`);

    try {
      switch (device.connection_protocol || device.type) {
        case 'USB':
          await device.raw.transferOut(1, stream);
          break;

        case 'BLUETOOTH':
          // Standard GATT characteristic for thermal printers
          const service = await device.raw.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
          const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
          await char.writeValue(stream);
          break;

        case 'TCP_IP':
        case 'NETWORK':
          // Deep Network Communication: Sends binary to the printer's local IP (Port 9100)
          await this.sendToNetworkPrinter(device.ip_address, stream);
          break;

        case 'LOCAL_BRIDGE':
          // Handles local drivers/service agents running on the machine (e.g., RawBT or Node Bridge)
          await this.sendToLocalServiceBridge(stream);
          break;

        default:
          throw new Error(`Protocol [${device.connection_protocol}] not welded for deep access.`);
      }
      return { success: true, message: "Hardware Stream Sealed" };
    } catch (err) {
      console.error("[Deep Hardware] Critical Failure:", err);
      throw err;
    }
  }

  /**
   * GENERATE ESC/POS PAYLOAD
   * Converts ReceiptData into raw binary instructions for the thermal head.
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

    // 1. Initialize & Open Drawer
    append(cmd(this.ESC_POS_COMMANDS.INIT));
    append(cmd(this.ESC_POS_COMMANDS.DRAWER_KICK));
    
    // 2. Business Identity
    append(cmd(this.ESC_POS_COMMANDS.CENTER));
    append(cmd(this.ESC_POS_COMMANDS.DOUBLE_HEIGHT));
    append(encoder.encode(`${data.businessName.toUpperCase()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.RESET_SIZE));
    append(encoder.encode(`${data.businessAddress || ''}\n`));
    append(encoder.encode(`TEL: ${data.businessPhone || 'N/A'}\n`));
    append(encoder.encode(`--------------------------------\n`));

    // 3. Item List
    append(cmd(this.ESC_POS_COMMANDS.LEFT));
    data.items.forEach((item: any) => {
      const name = (item.name || item.product_name).substring(0, 20);
      const price = `${data.currency || ''} ${Number(item.price * (item.qty || 1)).toLocaleString()}`;
      const line = name.padEnd(22) + price.padStart(10) + '\n';
      append(encoder.encode(line));
    });

    // 4. Totals
    append(encoder.encode(`--------------------------------\n`));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_ON));
    append(cmd(this.ESC_POS_COMMANDS.RIGHT));
    append(encoder.encode(`TOTAL: ${data.currency} ${data.total.toLocaleString()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_OFF));

    // 5. Footer & Cut
    append(cmd(this.ESC_POS_COMMANDS.CENTER));
    append(encoder.encode(`\n${data.footer || 'THANK YOU'}\n`));
    append(cmd(this.ESC_POS_COMMANDS.FEED_3));
    append(cmd(this.ESC_POS_COMMANDS.CUT));

    return stream;
  }

  /**
   * DEEP NETWORK BRIDGE
   * Connects to printers shared on the local WiFi/Ethernet.
   */
  private static async sendToNetworkPrinter(ip: string, stream: Uint8Array) {
    // Requires a small backend proxy or a direct WebSocker-to-TCP bridge
    const response = await fetch(`http://${ip}:9100`, {
        method: 'POST',
        body: stream,
        mode: 'no-cors' 
    });
    return response;
  }

  /**
   * LOCAL SERVICE BRIDGE
   * Handles communication with local service agents (RawBT, PrintNode, or custom Node proxies)
   */
  private static async sendToLocalServiceBridge(stream: Uint8Array) {
    const base64Data = btoa(String.fromCharCode.apply(null, Array.from(stream)));
    return await fetch('http://localhost:54321/print-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: base64Data })
    });
  }

  /**
   * DEEP SCANNER (SERIAL/RS232)
   * Handshakes with industrial fixed supermarket scanners.
   */
  static async connectIndustrialScanner() {
    if ('serial' in navigator) {
        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });
            return port;
        } catch (e) {
            console.error("Industrial Serial Access Denied", e);
            return null;
        }
    }
    return null;
  }
}