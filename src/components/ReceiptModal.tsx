import React, { useState, useEffect } from 'react';
import { Order, StoreProfile } from '../types';
import { X, Printer, Bluetooth, Check, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  isBluetoothSupported, 
  connectPrinter, 
  buildEscPosPayload, 
  transmitPayload, 
  printTestPage,
  ConnectedPrinter
} from '../lib/bluetoothPrinter';

// Keep Bluetooth connection active in global module scope so it persists when the modal closes/reopens
let activePrinterSession: ConnectedPrinter | null = null;

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  storeProfile: StoreProfile;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, storeProfile }) => {
  if (!order) return null;

  const [printer, setPrinter] = useState<ConnectedPrinter | null>(activePrinterSession);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(() => {
    return (localStorage.getItem('pico_printer_papersize') as '58mm' | '80mm') || '58mm';
  });

  // Keep global session in sync with local state
  useEffect(() => {
    if (activePrinterSession && activePrinterSession.device.gatt?.connected) {
      setPrinter(activePrinterSession);
    } else {
      setPrinter(null);
      activePrinterSession = null;
    }
  }, []);

  const handlePrint = () => {
      window.print();
  };

  const handleConnectPrinter = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const conn = await connectPrinter();
      activePrinterSession = conn;
      setPrinter(conn);
    } catch (err: any) {
      console.error(err);
      // Give a highly descriptive error with troubleshooting advice
      if (err.name === 'SecurityError') {
        setErrorMsg('Web Bluetooth is blocked inside iframes. Please open the app in a new tab by clicking the icon at the top right!');
      } else {
        setErrorMsg(err.message || 'Bluetooth connection failed. Make sure your printer is turned on and discoverable.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePrintBluetooth = async () => {
    if (!printer) return;
    setErrorMsg(null);
    setPrintSuccess(false);
    try {
      const payload = buildEscPosPayload(order, storeProfile, paperSize);
      await transmitPayload(printer.characteristic, payload);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Data transmission failed. Try turning the printer off and on.');
    }
  };

  const handleTestPrint = async () => {
    if (!printer) return;
    setErrorMsg(null);
    try {
      await printTestPage(printer.characteristic, storeProfile, paperSize);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Test print failed.');
    }
  };

  const handleDisconnect = () => {
    if (printer?.device.gatt?.connected) {
      try {
        printer.device.gatt.disconnect();
      } catch (e) {}
    }
    activePrinterSession = null;
    setPrinter(null);
    setErrorMsg(null);
  };

  const handlePaperSizeChange = (size: '58mm' | '80mm') => {
    setPaperSize(size);
    localStorage.setItem('pico_printer_papersize', size);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-sm shadow-2xl overflow-hidden relative my-8 animate-in fade-in zoom-in duration-300">
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center no-print">
          <span className="font-semibold">Receipt Preview</span>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        {/* Thermal Paper Effect Area - Designated for Print */}
        <div id="receipt-print-area" className="p-6 bg-white text-gray-900 font-mono text-sm leading-relaxed relative">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-wider mb-2">{storeProfile.name}</h2>
                <p className="text-xs text-gray-500">{storeProfile.location}</p>
                <p className="text-xs text-gray-500">
                    PAN: {storeProfile.panNumber || '123456789'}
                </p>
                <div className="my-3 border-t border-dashed border-gray-300"></div>
                <p>ORDER #{order.id.slice(0, 8)}</p>
                <p>{order.timestamp.toLocaleString('en-US')}</p>
            </div>

            <div className="mb-4">
                <div className="flex justify-between font-bold border-b border-gray-800 pb-1 mb-2">
                    <span>ITEM</span>
                    <span>AMT</span>
                </div>
                {order.items.map((item, idx) => (
                    <div key={idx} className="mb-2">
                        <div className="flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span>{formatCurrency(item.price * item.quantity, storeProfile.currency)}</span>
                        </div>
                        {item.notes && (
                             <div className="text-[10px] text-gray-500 pl-2 mt-0.5 italic">
                                 - {item.notes}
                             </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-t-2 border-gray-800 pt-2 mb-6">
                 <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL</span>
                    <span>{formatCurrency(order.total, storeProfile.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Taxable Amt</span>
                    <span>{formatCurrency(order.total * 0.87, storeProfile.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>VAT ({storeProfile.taxRate}%)</span>
                    <span>{formatCurrency(order.total * (storeProfile.taxRate / 100), storeProfile.currency)}</span>
                </div>
            </div>

            <div className="text-center text-xs text-gray-500">
                <p>Namaste! Thank you for visiting.</p>
                <p>Wi-Fi: Guest / coffee123</p>
                <div className="mt-4">
                  {/* Fake Barcode */}
                  <div className="h-12 bg-gray-900 w-3/4 mx-auto"></div>
                  <p className="mt-1">{order.id}</p>
                </div>
            </div>
            
            {/* Paper tear effect bottom */}
             <div 
                className="absolute bottom-0 left-0 w-full h-4 bg-white no-print" 
                style={{
                    background: 'linear-gradient(-45deg, transparent 8px, white 8px) 0 100%, linear-gradient(45deg, transparent 8px, white 8px) 0 100%',
                    backgroundSize: '16px 16px',
                    backgroundRepeat: 'repeat-x'
                }}
             />
        </div>
        
        {/* Dynamic Printing Options Area */}
        <div className="p-4 bg-gray-50 border-t space-y-4 no-print">
            {/* Bluetooth Integration Container */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Bluetooth size={14} className="text-blue-500" /> Bluetooth Thermal Printer
                </span>
                {printer?.device.gatt?.connected ? (
                  <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black animate-pulse">
                    CONNECTED
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold">DISCONNECTED</span>
                )}
              </div>

              {printer?.device.gatt?.connected ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{printer.name}</p>
                      <p className="text-[9px] text-gray-400 font-mono">GATT Service Bound</p>
                    </div>
                    <button 
                      onClick={handleDisconnect} 
                      className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded font-bold hover:bg-red-100 transition"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Paper Roll Size Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-gray-500">Roll Width:</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        onClick={() => handlePaperSizeChange('58mm')}
                        className={`px-2.5 py-1 rounded-md transition ${paperSize === '58mm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                      >
                        58mm (Narrow)
                      </button>
                      <button
                        onClick={() => handlePaperSizeChange('80mm')}
                        className={`px-2.5 py-1 rounded-md transition ${paperSize === '80mm' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                      >
                        80mm (Wide)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handlePrintBluetooth}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Printer size={14} /> {printSuccess ? 'Printed!' : 'Thermal Print'}
                    </button>
                    <button 
                      onClick={handleTestPrint}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-lg transition"
                    >
                      Test Receipt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={handleConnectPrinter}
                    disabled={isConnecting}
                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 text-xs font-black py-2.5 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Pairing Printer...
                      </>
                    ) : (
                      <>
                        <Bluetooth size={14} /> Pair Bluetooth Printer
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center leading-normal">
                    Quick pairings support 58mm/80mm ESC/POS hardware.
                  </p>
                </div>
              )}

              {/* Troubleshooting alerts */}
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-[11px] leading-relaxed flex gap-1.5 items-start border border-red-100">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {printSuccess && (
                <div className="bg-green-50 text-green-600 p-2.5 rounded-lg text-[11px] font-bold text-center border border-green-100">
                  ✓ Receipt payload transmitted successfully!
                </div>
              )}
            </div>

            {/* Default PDF/AirPrint Print Fallback */}
            {order.status === 'refunded' ? (
                <div className="w-full bg-red-100 text-red-600 font-bold py-3 rounded flex items-center justify-center border border-red-200 text-sm">
                    REFUNDED RECEIPT
                </div>
            ) : (
                <button 
                  onClick={handlePrint} 
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded flex items-center justify-center gap-2 text-sm transition"
                >
                    <Printer size={18} /> System Print (A4 / AirPrint / PDF)
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;