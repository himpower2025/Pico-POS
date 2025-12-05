import React from 'react';
import { Order, StoreProfile } from '../types';
import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  storeProfile: StoreProfile;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, storeProfile }) => {
  if (!order) return null;

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
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
                            <span>{(item.price * item.quantity).toLocaleString()}</span>
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
                    <span>{storeProfile.currency} {order.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Taxable Amt</span>
                    <span>{storeProfile.currency} {Math.floor(order.total * 0.87).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>VAT ({storeProfile.taxRate}%)</span>
                    <span>{storeProfile.currency} {Math.floor(order.total * (storeProfile.taxRate / 100)).toLocaleString()}</span>
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
            
            {/* Paper tear effect bottom - Hide on print usually, but kept for style */}
             <div 
                className="absolute bottom-0 left-0 w-full h-4 bg-white no-print" 
                style={{
                    background: 'linear-gradient(-45deg, transparent 8px, white 8px) 0 100%, linear-gradient(45deg, transparent 8px, white 8px) 0 100%',
                    backgroundSize: '16px 16px',
                    backgroundRepeat: 'repeat-x'
                }}
             />
        </div>
        
        <div className="p-4 bg-gray-50 border-t no-print">
            {order.status === 'refunded' ? (
                <div className="w-full bg-red-100 text-red-600 font-bold py-3 rounded flex items-center justify-center border border-red-200">
                    REFUNDED RECEIPT
                </div>
            ) : (
                <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                    <Printer size={18} /> Print Invoice
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;