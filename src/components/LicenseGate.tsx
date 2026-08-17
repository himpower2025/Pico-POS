import React from 'react';
import { Lock, BarChart3, Download, CreditCard } from 'lucide-react';
import { LicenseState } from '../lib/license';

interface LicenseGateProps {
  license: LicenseState;
  onGoToSubscription: () => void;
  onGoToDashboard: () => void;
  children: React.ReactNode;
}

/**
 * Wraps the POS (order-taking) screen. When the trial has ended, new sales
 * are blocked — but nothing is hidden or deleted, and the paths OUT are
 * front and centre: view your data, export it, or subscribe.
 *
 * Deliberately not a modal you can dismiss with Esc, and deliberately not
 * applied to Dashboard / Settings / Subscription.
 */
export const LicenseGate: React.FC<LicenseGateProps> = ({
  license,
  onGoToSubscription,
  onGoToDashboard,
  children
}) => {
  if (license.canTakeOrders) return <>{children}</>;

  return (
    <div className="relative h-full">
      {/* The POS stays visible underneath — the owner can see their own
          store, they just can't ring up a new sale. */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <Lock size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Your free trial has ended</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Subscribe to start taking orders again.
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-bold text-emerald-900">Your data is safe.</p>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Every order, menu item and sales record stays exactly where it is. Nothing is
              deleted, and you can view or export your full history at any time — trial or not.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onGoToSubscription}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CreditCard size={20} />
              View plans
            </button>

            <button
              onClick={onGoToDashboard}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <BarChart3 size={20} />
              Open dashboard &amp; sales history
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
            <Download size={12} />
            Export is available from Dashboard → Transactions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseGate;
