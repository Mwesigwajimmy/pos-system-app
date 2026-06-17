/**
 * UNIVERSAL HARDWARE ENGINE (DEEP EDITION - OMEGA ULTRA)
 * Handles: Native Capacitor Bluetooth, Web Bluetooth, Web Serial, Web USB, 
 * Local Network (TCP/IP), and Localhost Service Bridges.
 * 
 * VERSION: v22.2.0 - THE NATIVE APP WELD
 */

import { Capacitor } from '@capacitor/core';
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';

export class DeepHardwareBridge {
  // --- DEEP ESC/POS COMMAND SET ---
  private static ESC_POS_COMMANDS = {
    INIT: [0x1b, 0x40],
    CENTER: [0x1b, 0x61, 0x01],
    LEFT: [0x1b, 0x61, 0x00],
    RIGHT: [0x1b, 0x61, 0x02],
    BOLD_ON: [0x1b, 0x45, 0x01],
    BOLD_OFF: [0x1b, 0x45, 0x00],
    CUT: [0x1d, 0x56, 0x41, 0x03],    
    DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], 
    FEED_3: [0x1b, 0x64, 0x03],
    DOUBLE_HEIGHT: [0x1b, 0x21, 0x10],
    RESET_SIZE: [0x1b, 0x21, 0x00]
  };

  /**
   * SILENT PRINT: The Sovereign Entry Point
   * Logic: Detects Platform and chooses the most powerful transport method.
   */
  static async silentPrint(device: any, receiptData: any) {
    const stream = this.generateEscPosPayload(receiptData);
    const isNative = Capacitor.isNativePlatform();

    console.log(`[Deep Hardware] Initializing Protocol: ${device.type} | Native: ${isNative}`);

    try {
      if (isNative && device.type === 'BLUETOOTH') {
        // --- THE NATIVE APP WELD ---
        // Uses the Capacitor Community Bluetooth LE Plugin for direct thermal access
        await BleClient.initialize();
        
        // Connect and Write (Direct Handshake)
        await BleClient.connect(device.deviceId); 
        
        // Standard Thermal Printer Characteristic UUIDs
        const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
        const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

        // We split into chunks of 20 bytes to prevent Android Bluetooth buffer overflow
        const chunkSize = 20;
        for (let i = 0; i < stream.length; i += chunkSize) {
          const chunk = stream.slice(i, i + chunkSize);
          await BleClient.write(device.deviceId, SERVICE_UUID, CHARACTERISTIC_UUID, numbersToDataView(Array.from(chunk)));
        }

        await BleClient.disconnect(device.deviceId);
        return { success: true, method: 'NATIVE_BLE' };

      } else {
        // --- THE WEB FALLBACK ---
        // Keeps your original logic for desktop users/browsers
        switch (device.connection_protocol || device.type) {
          case 'USB':
            await this.sendUsbChunked(device.raw, stream);
            break;

          case 'BLUETOOTH':
            const server = await device.raw.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
            await char.writeValue(stream);
            break;

          case 'TCP_IP':
            await this.sendToNetworkPrinter(device.ip_address, stream);
            break;

          default:
            throw new Error(`Protocol [${device.type}] not welded for this platform.`);
        }
      }
      return { success: true, timestamp: new Date() };
    } catch (err) {
      console.error("[Deep Hardware] Critical Fail:", err);
      throw err;
    }
  }

  /**
   * GENERATE ESC/POS PAYLOAD
   * Crafts a professional supermarket receipt with Deep Padding logic.
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
    append(encoder.encode(`${(data.businessName || 'BBU1 Shop').toUpperCase()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.RESET_SIZE));
    append(encoder.encode(`${data.businessAddress || ''}\n`));
    append(encoder.encode(`TIN: ${data.taxId || 'N/A'}\n`));
    append(encoder.encode(`--------------------------------\n`));

    // 3. Line Items (32-character column logic)
    append(cmd(this.ESC_POS_COMMANDS.LEFT));
    data.items.forEach((item: any) => {
      const name = (item.name || item.product_name || 'Item').substring(0, 22);
      const total = `${Number(item.price * (item.qty || 1)).toLocaleString()}`;
      append(encoder.encode(name.padEnd(32 - total.length) + total + '\n'));
      append(encoder.encode(`  ${item.qty || 1} x ${item.price}\n`));
    });

    // 4. Grand Totals
    append(encoder.encode(`--------------------------------\n`));
    append(cmd(this.ESC_POS_COMMANDS.RIGHT));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_ON));
    append(encoder.encode(`TOTAL: ${data.currency || 'UGX'} ${data.total.toLocaleString()}\n`));
    append(cmd(this.ESC_POS_COMMANDS.BOLD_OFF));

    // 5. Exit Logic
    append(cmd(this.ESC_POS_COMMANDS.CENTER));
    append(encoder.encode(`\n${data.footer || 'THANK YOU FOR SHOPPING'}\n`));
    append(cmd(this.ESC_POS_COMMANDS.FEED_3));
    append(cmd(this.ESC_POS_COMMANDS.CUT));

    return stream;
  }

  private static async sendUsbChunked(device: USBDevice, data: Uint8Array) {
    const chunkSize = 64; 
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await device.transferOut(1, chunk);
    }
  }

  private static async sendToNetworkPrinter(ip: string, stream: Uint8Array) {
    return await fetch(`http://${ip}:9100`, { method: 'POST', body: stream, mode: 'no-cors' });
  }

  /**
   * HARDWARE DISCOVERY (BLUETOOTH)
   * Handshake with native BLE on mobile or GATT on Web.
   */
  static async connectBluetooth() {
    if (Capacitor.isNativePlatform()) {
      await BleClient.initialize();
      const device = await BleClient.requestDevice({
        services: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      return { deviceId: device.deviceId, type: 'BLUETOOTH' };
    } else {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
      });
      const server = await device.gatt?.connect();
      return { raw: device, type: 'BLUETOOTH' };
    }
  }
}