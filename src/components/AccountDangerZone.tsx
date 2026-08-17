import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { deleteMyAccount } from '../services/firebaseService';

/**
 * App Store Review Guideline 5.1.1(v): an app that offers account creation
 * must let the user initiate account deletion FROM WITHIN THE APP. A
 * "contact support to delete" link is an automatic rejection. Google Play's
 * Data Safety form also wants a documented deletion path.
 *
 * Two things this deliberately does:
 *
 *  · Requires typing DELETE. A POS account holds a store's entire sales
 *    history; a single mis-tap should not be able to destroy it.
 *
 *  · Tells the user that cancelling their App Store / Play subscription is
 *    a SEPARATE step. Deleting the Firebase account does not stop Apple or
 *    Google from billing them, and finding that out on the next statement
 *    is exactly how you earn a one-star review.
 */
export const AccountDangerZone: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      // deleteMyAccount signs the user out; App.tsx's auth listener will
      // drop back to LoginView on its own.
    } catch (err) {
      console.error('[Account] Deletion failed:', err);
      setError('Deletion failed. Please check your connection and try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <div className="border border-red-200 bg-red-50/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-red-900">Delete account</h3>
            <p className="text-sm text-red-800/80 mt-1 leading-relaxed">
              Permanently deletes your store profile, menu, tables, orders and all sales
              history. This cannot be undone and the data cannot be recovered.
            </p>
          </div>
        </div>

        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="text-sm font-bold text-red-700 hover:text-red-900 underline underline-offset-2"
          >
            I want to delete my account
          </button>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-white border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1.5">
                Cancel your subscription first
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Deleting this account does not cancel an active subscription. Cancel it in the
                App Store (Settings → Apple Account → Subscriptions) or Google Play
                (Play Store → Payments &amp; subscriptions), or you will keep being charged.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Type <span className="font-mono text-red-700">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoCapitalize="characters"
                autoCorrect="off"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono tracking-widest focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setConfirmText('');
                  setError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDangerZone;
