import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity duration-300"
        onClick={onCancel}
      />
      {/* Modal Card Centered container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000] pointer-events-none animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 pointer-events-auto transform scale-100 transition-all duration-300 animate-in zoom-in-95">
          <div className="flex gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShieldAlert size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 leading-6">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                isDanger 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/15' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
