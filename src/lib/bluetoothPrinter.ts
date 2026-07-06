import { Order, StoreProfile } from '../types';

// Common bluetooth thermal printer service UUIDs
export const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // General Thermal Printer Service
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
  '49535343-fe90-294c-7f11-687032777b80', // ISSC BLE SPP
  '00004953-5343-fe90-294c-7f1168703277', // ISSC alternative
  'e7810a71-73ae-499d-8c15-faa9ae9a2c61'  // another generic BLE
];

export interface ConnectedPrinter {
  device: any;
  characteristic: any;
  name: string;
}

/**
 * Checks if the browser supports Web Bluetooth API
 */
export const isBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

/**
 * Prompt the user to pair and connect a Bluetooth thermal printer
 */
export const connectPrinter = async (): Promise<ConnectedPrinter> => {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera on Desktop or Android.');
  }

  try {
    // Request bluetooth device
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS
    });

    if (!device.gatt) {
      throw new Error('Bluetooth GATT Server is not available on this device.');
    }

    // Connect to GATT Server
    const server = await device.gatt.connect();

    let writeCharacteristic: any = null;

    // 1. Try connecting using standard printer services
    for (const uuid of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(uuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      } catch (err) {
        // Continue to next UUID if service not found
      }
    }

    // 2. Fallback: Scan all primary services to find any writable characteristic
    if (!writeCharacteristic) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeCharacteristic = char;
              break;
            }
          }
          if (writeCharacteristic) break;
        }
      } catch (err) {
        console.error('Failed to discover custom services', err);
      }
    }

    if (!writeCharacteristic) {
      throw new Error('Could not find a writable Bluetooth channel. Make sure your thermal printer is turned on and paired.');
    }

    return {
      device,
      characteristic: writeCharacteristic,
      name: device.name || 'Bluetooth Printer'
    };
  } catch (error: any) {
    console.error('Bluetooth connection failed', error);
    throw error;
  }
};

/**
 * Helper to replace complex symbols (like ₩, ₹, €, Rs.) with plain ASCII alternatives
 * to prevent budget thermal printers from printing garbled symbols.
 */
const cleanTextForThermalPrinter = (text: string): string => {
  return text
    .replace(/₩/g, 'W')
    .replace(/₹/g, 'Rs')
    .replace(/€/g, 'EUR')
    .replace(/Rs\./g, 'Rs')
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Keep simple spaces or common chars, strip other non-ASCII characters to avoid garbled prints
      return ' ';
    });
};

/**
 * Formats columns with clean alignment depending on roll paper size (32 chars for 58mm, 48 chars for 80mm)
 */
const formatTwoColumns = (left: string, right: string, width: number): string => {
  const leftClean = cleanTextForThermalPrinter(left);
  const rightClean = cleanTextForThermalPrinter(right);
  
  const totalLength = leftClean.length + rightClean.length;
  if (totalLength >= width) {
    // If text is too long, wrap or truncate left column
    const availableSpace = width - rightClean.length - 1;
    const truncatedLeft = leftClean.slice(0, availableSpace);
    const spacesCount = width - truncatedLeft.length - rightClean.length;
    return truncatedLeft + ' '.repeat(spacesCount > 0 ? spacesCount : 1) + rightClean;
  }
  
  const spacesCount = width - totalLength;
  return leftClean + ' '.repeat(spacesCount) + rightClean;
};

/**
 * Builds the ESC/POS payload as a Uint8Array
 */
export const buildEscPosPayload = (
  order: Order,
  storeProfile: StoreProfile,
  paperSize: '58mm' | '80mm' = '58mm'
): Uint8Array => {
  const width = paperSize === '58mm' ? 32 : 48;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // ESC/POS Commands
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;

  const initPrinter = new Uint8Array([ESC, 0x40]); // Initialize
  const alignCenter = new Uint8Array([ESC, 0x61, 0x01]); // Align Center
  const alignLeft = new Uint8Array([ESC, 0x61, 0x00]); // Align Left
  const alignRight = new Uint8Array([ESC, 0x61, 0x02]); // Align Right
  const boldOn = new Uint8Array([ESC, 0x45, 0x01]); // Bold On
  const boldOff = new Uint8Array([ESC, 0x45, 0x00]); // Bold Off
  const doubleSizeOn = new Uint8Array([GS, 0x21, 0x11]); // Double Height & Width
  const doubleSizeOff = new Uint8Array([GS, 0x21, 0x00]); // Normal size
  const feedPaperAndCut = new Uint8Array([ESC, 0x64, 0x06]); // Feed 6 lines and partial cut

  const writeText = (text: string) => {
    chunks.push(encoder.encode(text + '\n'));
  };

  const writeRaw = (bytes: Uint8Array) => {
    chunks.push(bytes);
  };

  const writeDashedLine = () => {
    writeText('-'.repeat(width));
  };

  const writeDoubleDashedLine = () => {
    writeText('='.repeat(width));
  };

  // 1. Initialize
  writeRaw(initPrinter);

  // 2. Header (Center)
  writeRaw(alignCenter);
  writeRaw(doubleSizeOn);
  writeRaw(boldOn);
  writeText(cleanTextForThermalPrinter(storeProfile.name.toUpperCase()));
  writeRaw(doubleSizeOff);
  writeRaw(boldOff);

  writeText(cleanTextForThermalPrinter(storeProfile.location));
  writeText(`PAN: ${storeProfile.panNumber || '123456789'}`);
  writeDashedLine();

  // 3. Order details
  writeText(`ORDER #${order.id.slice(0, 8)}`);
  const dateStr = new Date(order.timestamp).toLocaleString('en-US', { hour12: false });
  writeText(dateStr);
  writeDashedLine();

  // 4. Columns Header (Left align)
  writeRaw(alignLeft);
  writeRaw(boldOn);
  writeText(formatTwoColumns('ITEM', 'AMT', width));
  writeRaw(boldOff);
  writeDoubleDashedLine();

  // 5. Items list
  order.items.forEach(item => {
    const qtyText = `${item.name} x${item.quantity}`;
    const amountText = `${cleanTextForThermalPrinter(item.price * item.quantity + ' ' + storeProfile.currency)}`;
    writeText(formatTwoColumns(qtyText, amountText, width));
    if (item.notes) {
      writeText(` - ${cleanTextForThermalPrinter(item.notes)}`);
    }
  });
  writeDashedLine();

  // 6. Totals
  writeRaw(boldOn);
  const totalLabel = order.status === 'refunded' ? 'REFUNDED TOTAL' : 'TOTAL';
  const totalAmtText = `${order.total} ${storeProfile.currency}`;
  writeText(formatTwoColumns(totalLabel, totalAmtText, width));
  writeRaw(boldOff);

  const taxLabel = `VAT (${storeProfile.taxRate}%)`;
  const taxAmt = order.total * (storeProfile.taxRate / 100);
  const taxAmtText = `${taxAmt.toFixed(2)} ${storeProfile.currency}`;
  writeText(formatTwoColumns(taxLabel, taxAmtText, width));
  writeDashedLine();

  // 7. Footer
  writeRaw(alignCenter);
  writeText('Namaste! Thank you for visiting.');
  writeText('Wi-Fi: Guest / coffee123');
  writeText(`ID: ${order.id}`);
  writeText('\n\n');

  // 8. Feed & Cut
  writeRaw(feedPaperAndCut);

  // Combine chunks
  const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
};

/**
 * Transmits the byte payload to the connected Bluetooth characteristic in safe chunks.
 * Standard budget Bluetooth printers have small MTU (usually 20 bytes), but typical BLE
 * write operations handle up to 512 bytes if written in small segments (e.g., 20 or 100 bytes).
 */
export const transmitPayload = async (
  characteristic: any,
  payload: Uint8Array,
  chunkSize: number = 20
): Promise<void> => {
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
    // Tiny delay to allow printer micro-buffer to process without overflowing
    await new Promise(resolve => setTimeout(resolve, 15));
  }
};

/**
 * Prints a test receipt to verify pairing
 */
export const printTestPage = async (
  characteristic: any,
  storeProfile: StoreProfile,
  paperSize: '58mm' | '80mm' = '58mm'
): Promise<void> => {
  const width = paperSize === '58mm' ? 32 : 48;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const ESC = 0x1B;
  const GS = 0x1D;

  const initPrinter = new Uint8Array([ESC, 0x40]);
  const alignCenter = new Uint8Array([ESC, 0x61, 0x01]);
  const alignLeft = new Uint8Array([ESC, 0x61, 0x00]);
  const boldOn = new Uint8Array([ESC, 0x45, 0x01]);
  const boldOff = new Uint8Array([ESC, 0x45, 0x00]);
  const doubleSizeOn = new Uint8Array([GS, 0x21, 0x11]);
  const doubleSizeOff = new Uint8Array([GS, 0x21, 0x00]);
  const feedPaperAndCut = new Uint8Array([ESC, 0x64, 0x06]);

  const writeText = (text: string) => {
    chunks.push(encoder.encode(text + '\n'));
  };

  chunks.push(initPrinter);
  chunks.push(alignCenter);
  chunks.push(doubleSizeOn);
  chunks.push(boldOn);
  writeText('PICO POS');
  chunks.push(doubleSizeOff);
  chunks.push(boldOff);
  
  writeText('Bluetooth Print Connection');
  writeText('SUCCESSFUL!');
  writeText('-'.repeat(width));
  
  chunks.push(alignLeft);
  writeText(`Store Name: ${cleanTextForThermalPrinter(storeProfile.name)}`);
  writeText(`Paper Width: ${paperSize}`);
  writeText(`Currency: ${storeProfile.currency}`);
  writeText(`Local Time: ${new Date().toLocaleTimeString()}`);
  
  chunks.push(alignCenter);
  writeText('-'.repeat(width));
  writeText('Ready to print coffee orders!');
  writeText('\n\n');
  chunks.push(feedPaperAndCut);

  // Combine
  const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  await transmitPayload(characteristic, merged);
};
