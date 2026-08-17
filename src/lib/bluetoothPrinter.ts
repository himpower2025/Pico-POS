import { Order, StoreProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';

// ═══════════════════════════════════════════════════════════════════════
// Bluetooth thermal receipt printing
//
// WHY THIS WAS REWRITTEN
//
// The previous implementation used the Web Bluetooth API
// (`navigator.bluetooth`). That API exists only in desktop Chrome/Edge and
// Chrome for Android — it is NOT available in WKWebView (iOS) and NOT
// available in Android WebView, which is exactly what a Capacitor app runs
// in. So in the shipped native apps, receipt printing silently did nothing
// on every platform. For a POS, that is not a missing nice-to-have; it is
// the product.
//
// This version talks to the printer through @capacitor-community/bluetooth-le
// on native, and keeps the Web Bluetooth path for the browser/PWA build so
// desktop Chrome users are unaffected.
//
// The ESC/POS payload builder below is unchanged in substance — that part
// was correct.
//
// SETUP REQUIRED (see MIGRATION_GUIDE.md):
//   Android: BLUETOOTH_SCAN + BLUETOOTH_CONNECT in AndroidManifest.xml
//   iOS:     NSBluetoothAlwaysUsageDescription in Info.plist
// ═══════════════════════════════════════════════════════════════════════

/** Common thermal-printer GATT service UUIDs, most-likely first. */
export const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic thermal printer service
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
  '49535343-fe90-294c-7f11-687032777b80', // ISSC BLE SPP
  '00004953-5343-fe90-294c-7f1168703277', // ISSC alternative
  'e7810a71-73ae-499d-8c15-faa9ae9a2c61'  // Generic BLE serial
];

export interface ConnectedPrinter {
  transport: 'ble' | 'web';
  name: string;
  /** BLE transport */
  deviceId?: string;
  serviceUuid?: string;
  characteristicUuid?: string;
  writeWithoutResponse?: boolean;
  /** Web Bluetooth transport */
  device?: any;
  characteristic?: any;
}

const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Whether this build can talk to a Bluetooth printer at all. Use it to
 * grey out the pairing button with an honest explanation rather than
 * letting the user tap into a dead end.
 */
export const isBluetoothSupported = (): boolean => {
  if (isNative()) return true;
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

export const bluetoothUnavailableReason = (): string =>
  'Bluetooth printing needs the Pico POS app, or Chrome/Edge on desktop or Android. ' +
  'Safari and iOS browsers do not support it.';

// ── Native (Capacitor BLE) ─────────────────────────────────────────────

const connectPrinterNative = async (): Promise<ConnectedPrinter> => {
  await BleClient.initialize({ androidNeverForLocation: true });

  const device = await BleClient.requestDevice({
    optionalServices: PRINTER_SERVICE_UUIDS
  });

  await BleClient.connect(device.deviceId, () => {
    console.warn('[Printer] Bluetooth device disconnected:', device.deviceId);
  });

  const services = await BleClient.getServices(device.deviceId);

  // Prefer a known printer service; fall back to any writable characteristic.
  const ordered = [
    ...services.filter((s) => PRINTER_SERVICE_UUIDS.includes(s.uuid.toLowerCase())),
    ...services.filter((s) => !PRINTER_SERVICE_UUIDS.includes(s.uuid.toLowerCase()))
  ];

  for (const service of ordered) {
    for (const char of service.characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        return {
          transport: 'ble',
          name: device.name || 'Bluetooth Printer',
          deviceId: device.deviceId,
          serviceUuid: service.uuid,
          characteristicUuid: char.uuid,
          writeWithoutResponse: !!char.properties.writeWithoutResponse
        };
      }
    }
  }

  await BleClient.disconnect(device.deviceId).catch(() => {});
  throw new Error(
    'Could not find a writable Bluetooth channel. Make sure the printer is switched on and in range.'
  );
};

// ── Web (desktop Chrome / Android Chrome) ──────────────────────────────

const connectPrinterWeb = async (): Promise<ConnectedPrinter> => {
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS
  });

  if (!device.gatt) {
    throw new Error('Bluetooth GATT Server is not available on this device.');
  }

  const server = await device.gatt.connect();
  let writeCharacteristic: any = null;

  for (const uuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(uuid);
      for (const char of await service.getCharacteristics()) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeCharacteristic = char;
          break;
        }
      }
      if (writeCharacteristic) break;
    } catch {
      // Service not present on this printer — try the next.
    }
  }

  if (!writeCharacteristic) {
    try {
      for (const service of await server.getPrimaryServices()) {
        for (const char of await service.getCharacteristics()) {
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
    throw new Error(
      'Could not find a writable Bluetooth channel. Make sure your thermal printer is turned on and paired.'
    );
  }

  return {
    transport: 'web',
    name: device.name || 'Bluetooth Printer',
    device,
    characteristic: writeCharacteristic
  };
};

export const connectPrinter = async (): Promise<ConnectedPrinter> => {
  if (!isBluetoothSupported()) {
    throw new Error(bluetoothUnavailableReason());
  }
  return isNative() ? connectPrinterNative() : connectPrinterWeb();
};

export const disconnectPrinter = async (printer: ConnectedPrinter): Promise<void> => {
  try {
    if (printer.transport === 'ble' && printer.deviceId) {
      await BleClient.disconnect(printer.deviceId);
    } else if (printer.device?.gatt?.connected) {
      printer.device.gatt.disconnect();
    }
  } catch {
    /* already gone */
  }
};

// ── Payload transmission ───────────────────────────────────────────────

/**
 * Budget thermal printers have a tiny receive buffer (often a 20-byte MTU),
 * so the payload goes out in small chunks with a short pause between them.
 * Pushing faster produces truncated or garbled receipts.
 */
export const transmitPayload = async (
  printer: ConnectedPrinter,
  payload: Uint8Array,
  chunkSize: number = 20
): Promise<void> => {
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);

    if (printer.transport === 'ble') {
      const data = numbersToDataView(Array.from(chunk));
      if (printer.writeWithoutResponse) {
        await BleClient.writeWithoutResponse(
          printer.deviceId!,
          printer.serviceUuid!,
          printer.characteristicUuid!,
          data
        );
      } else {
        await BleClient.write(
          printer.deviceId!,
          printer.serviceUuid!,
          printer.characteristicUuid!,
          data
        );
      }
    } else {
      await printer.characteristic.writeValue(chunk);
    }

    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};

// ── ESC/POS payload construction ───────────────────────────────────────

/**
 * Replace symbols budget thermal printers can't render with ASCII, so a
 * receipt shows "Rs 450" instead of a row of black boxes.
 */
const cleanTextForThermalPrinter = (text: string): string =>
  text
    .replace(/₩/g, 'W')
    .replace(/₹/g, 'Rs')
    .replace(/€/g, 'EUR')
    .replace(/Rs\./g, 'Rs')
    .replace(/[^\x00-\x7F]/g, ' ');

const formatTwoColumns = (left: string, right: string, width: number): string => {
  const leftClean = cleanTextForThermalPrinter(left);
  const rightClean = cleanTextForThermalPrinter(right);

  const totalLength = leftClean.length + rightClean.length;
  if (totalLength >= width) {
    const availableSpace = width - rightClean.length - 1;
    const truncatedLeft = leftClean.slice(0, Math.max(0, availableSpace));
    const spacesCount = width - truncatedLeft.length - rightClean.length;
    return truncatedLeft + ' '.repeat(spacesCount > 0 ? spacesCount : 1) + rightClean;
  }

  return leftClean + ' '.repeat(width - totalLength) + rightClean;
};

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  init: new Uint8Array([ESC, 0x40]),
  alignCenter: new Uint8Array([ESC, 0x61, 0x01]),
  alignLeft: new Uint8Array([ESC, 0x61, 0x00]),
  boldOn: new Uint8Array([ESC, 0x45, 0x01]),
  boldOff: new Uint8Array([ESC, 0x45, 0x00]),
  doubleOn: new Uint8Array([GS, 0x21, 0x11]),
  doubleOff: new Uint8Array([GS, 0x21, 0x00]),
  feedAndCut: new Uint8Array([ESC, 0x64, 0x06])
};

const mergeChunks = (chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
};

export const buildEscPosPayload = (
  order: Order,
  storeProfile: StoreProfile,
  paperSize: '58mm' | '80mm' = '58mm'
): Uint8Array => {
  const width = paperSize === '58mm' ? 32 : 48;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const text = (line: string) => chunks.push(encoder.encode(line + '\n'));
  const raw = (bytes: Uint8Array) => chunks.push(bytes);
  const rule = (char = '-') => text(char.repeat(width));

  raw(CMD.init);

  // Header
  raw(CMD.alignCenter);
  raw(CMD.doubleOn);
  raw(CMD.boldOn);
  text(cleanTextForThermalPrinter((storeProfile.name || 'STORE').toUpperCase()));
  raw(CMD.doubleOff);
  raw(CMD.boldOff);

  if (storeProfile.location) {
    text(cleanTextForThermalPrinter(storeProfile.location));
  }
  // Only print a tax number if the store actually configured one. The old
  // code fell back to a hardcoded '123456789' — printing a fabricated tax
  // registration number on a real customer's receipt is a genuine legal
  // problem, not a cosmetic one.
  if (storeProfile.panNumber) {
    text(`PAN: ${cleanTextForThermalPrinter(storeProfile.panNumber)}`);
  }
  rule();

  // Order details
  text(`ORDER #${order.id.slice(0, 8)}`);
  text(new Date(order.timestamp).toLocaleString('en-US', { hour12: false }));
  rule();

  // Items
  raw(CMD.alignLeft);
  raw(CMD.boldOn);
  text(formatTwoColumns('ITEM', 'AMT', width));
  raw(CMD.boldOff);
  rule('=');

  order.items.forEach((item) => {
    text(
      formatTwoColumns(
        `${item.name} x${item.quantity}`,
        `${(item.price * item.quantity).toFixed(2)} ${storeProfile.currency}`,
        width
      )
    );
    if (item.notes) {
      text(` - ${cleanTextForThermalPrinter(item.notes)}`);
    }
  });
  rule();

  // Totals
  raw(CMD.boldOn);
  text(
    formatTwoColumns(
      order.status === 'refunded' ? 'REFUNDED TOTAL' : 'TOTAL',
      `${order.total.toFixed(2)} ${storeProfile.currency}`,
      width
    )
  );
  raw(CMD.boldOff);

  // NOTE: this reports tax as total × rate, i.e. tax ON TOP of the total.
  // If your prices are tax-INCLUSIVE (the norm in Nepal and most of Asia),
  // the included tax is total − total/(1 + rate/100) and this line currently
  // over-reports it. Confirm which convention you use before launch.
  const taxAmt = order.total * (storeProfile.taxRate / 100);
  text(
    formatTwoColumns(`VAT (${storeProfile.taxRate}%)`, `${taxAmt.toFixed(2)} ${storeProfile.currency}`, width)
  );
  rule();

  // Footer
  raw(CMD.alignCenter);
  text('Thank you for your visit.');
  // The old footer hardcoded "Wi-Fi: Guest / coffee123" onto every receipt
  // of every store that ever used this app. Removed.
  text(`ID: ${order.id}`);
  text('\n\n');

  raw(CMD.feedAndCut);

  return mergeChunks(chunks);
};

export const printReceipt = async (
  printer: ConnectedPrinter,
  order: Order,
  storeProfile: StoreProfile,
  paperSize: '58mm' | '80mm' = '58mm'
): Promise<void> => {
  await transmitPayload(printer, buildEscPosPayload(order, storeProfile, paperSize));
};

export const printTestPage = async (
  printer: ConnectedPrinter,
  storeProfile: StoreProfile,
  paperSize: '58mm' | '80mm' = '58mm'
): Promise<void> => {
  const width = paperSize === '58mm' ? 32 : 48;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const text = (line: string) => chunks.push(encoder.encode(line + '\n'));

  chunks.push(CMD.init, CMD.alignCenter, CMD.doubleOn, CMD.boldOn);
  text('PICO POS');
  chunks.push(CMD.doubleOff, CMD.boldOff);

  text('Bluetooth Print Connection');
  text('SUCCESSFUL!');
  text('-'.repeat(width));

  chunks.push(CMD.alignLeft);
  text(`Store Name: ${cleanTextForThermalPrinter(storeProfile.name || '(not set)')}`);
  text(`Printer: ${cleanTextForThermalPrinter(printer.name)}`);
  text(`Paper Width: ${paperSize}`);
  text(`Currency: ${storeProfile.currency}`);
  text(`Local Time: ${new Date().toLocaleTimeString()}`);

  chunks.push(CMD.alignCenter);
  text('-'.repeat(width));
  text('Ready to print orders.');
  text('\n\n');
  chunks.push(CMD.feedAndCut);

  await transmitPayload(printer, mergeChunks(chunks));
};
