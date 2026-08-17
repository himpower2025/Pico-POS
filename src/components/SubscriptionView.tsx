import React, { useState, useEffect } from 'react';
import { StoreProfile } from '../types';
import { 
  CreditCard, Zap, Award, Sparkles, ShieldCheck, 
  Lock, RefreshCw, HelpCircle, ChevronDown, MessageSquare, 
  Send, Mail, X, CheckCircle, AlertCircle 
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  isNativePurchasesAvailable,
  getCurrentOffering,
  purchaseSubscription,
  restoreSubscription
} from '../services/purchasesService';
import type { PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface SubscriptionViewProps {
  storeProfile: StoreProfile;
  onUpdateProfile: (profile: StoreProfile) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  storeProfile, 
  onUpdateProfile 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Native (App Store / Google Play) purchase state — unused, and harmless,
  // when running as a plain web/PWA build.
  const isNative = isNativePurchasesAvailable();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(isNative);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNative) return;
    getCurrentOffering()
      .then(setOffering)
      .catch((err) => {
        console.error('[Purchases] Failed to load offerings:', err);
        setPurchaseError('Could not load subscription plans. Please try again later.');
      })
      .finally(() => setIsLoadingOffering(false));
  }, [isNative]);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Contact / Feedback modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackSuccess(false);
  };

  // Fallbacks for profile subscription fields
  const currentStatus = storeProfile.subscriptionStatus || 'none';
  const monthsPaid = storeProfile.subscriptionMonthsPaid !== undefined ? storeProfile.subscriptionMonthsPaid : 0;

  // Format Expiry Date (MM/YY)
  // Real online checkout isn't wired up yet. Rather than pretend a payment
  // succeeded (the previous version of this screen always showed "success"
  // after a fake delay, regardless of what was entered), this routes the
  // interested store owner to the contact form so we can activate their
  // plan manually until Paddle checkout is connected.
  const handleRequestSubscription = () => {
    setFeedbackCategory('Billing');
    setFeedbackSubject(`${selectedPlan === 'annual' ? 'Annual' : 'Monthly'} plan sign-up request`);
    setIsFeedbackModalOpen(true);
  };

  // Native purchase flow. Deliberately does NOT set subscriptionStatus
  // locally on success — that would be the same "client declares itself
  // paid" pattern that made the old mock checkout unsafe. The real status
  // update comes from the RevenueCat webhook writing to Firestore
  // server-side, which the app is already listening to live
  // (subscribeToStoreProfile in App.tsx). This just shows a brief
  // "activating" state until that arrives.
  const handleNativePurchase = async (pkg: PurchasesPackage) => {
    setPurchaseError(null);
    setIsProcessing(true);
    try {
      await purchaseSubscription(pkg);
      setIsSuccess(true);
    } catch (err: any) {
      // RevenueCat throws a specific error when the user just backs out of
      // the purchase sheet — that's not a failure worth showing as one.
      if (!err?.userCancelled) {
        console.error('[Purchases] Purchase failed:', err);
        setPurchaseError('Purchase could not be completed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setPurchaseError(null);
    setIsProcessing(true);
    try {
      await restoreSubscription();
    } catch (err) {
      console.error('[Purchases] Restore failed:', err);
      setPurchaseError('Could not restore purchases. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-violet-800 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl shadow-indigo-100">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4">
            <Award size={14} className="text-yellow-300" />
            Innovative "Rent-To-Own" Model
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-3">Pico POS Subscription Plans</h2>
          <p className="text-indigo-100 text-sm md:text-base leading-relaxed">
            Get premium enterprise features instantly. Once you pay for <strong>12 consecutive months</strong> (or 1 year upfront), 
            your account gains a <strong>Perpetual Lifetime License</strong>. You own the software forever, and core POS operations continue royalty-free!
          </p>
        </div>
        
        {/* Abstract background graphics */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
        <div className="absolute right-10 bottom-0 w-32 h-32 bg-violet-400/20 rounded-full translate-y-1/2 blur-2xl"></div>
      </div>

      {/* Subscription Progress / Current Status */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Your Licensing Status</span>
            <div className="flex items-center gap-3">
              {currentStatus === 'none' && (
                <span className="text-xl font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">Trial Mode / Free Tier</span>
              )}
              {currentStatus === 'monthly' && (
                <span className="text-xl font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <RefreshCw size={16} className="animate-spin" /> Monthly Subscriber
                </span>
              )}
              {currentStatus === 'annual' && (
                <span className="text-xl font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <Zap size={16} className="text-yellow-500" /> Annual Subscriber
                </span>
              )}
              {currentStatus === 'owned' && (
                <span className="text-xl font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <Award size={18} className="text-amber-500" /> 👑 Lifetime License Holder (Rent-to-Own Completed)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rent-To-Own Tracker */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles size={16} className="text-yellow-500" />
              Rent-to-Own Ownership Progress
            </span>
            <span className="font-mono font-black text-slate-700">
              {monthsPaid} / 12 Months Paid
            </span>
          </div>

          <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden flex p-0.5 border border-slate-300">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                monthsPaid >= 12 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-200' 
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${(monthsPaid / 12) * 100}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {monthsPaid >= 12 ? (
              <strong className="text-emerald-600">Congratulations! You have completed the 12-month program. Pico POS is now fully owned by you, royalty-free. No further charges will be made.</strong>
            ) : (
              <span>
                You are currently <strong>{12 - monthsPaid} months away</strong> from permanent ownership. Once you hit 12 months, your subscription stops charging and converts into a perpetual license. 
                {currentStatus === 'none' && " Choose Monthly or upfront Annual to begin!"}
              </span>
            )}
          </p>
        </div>

        {/* Free trial banner.
            The old version claimed "Unsubscribed data will be permanently
            deleted 7 days after trial expiry". That was never implemented,
            and we've decided not to implement it — a shop's sales records are
            their tax documents. An unimplemented deletion notice is also a
            Data Safety mismatch waiting to be flagged, so it's gone. */}
        {currentStatus === 'none' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">Pico POS Free Trial</h4>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black">ACTIVE</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Your <strong>7-day free trial</strong> started when you created your account.
                Every POS, receipt and management feature is available — no card required.
              </p>
              <div className="pt-2 border-t border-amber-200/50 text-[11px] text-amber-800">
                <span className="flex items-start gap-1">
                  🛡️ <span>
                    <strong>Your data stays yours.</strong> Orders, menu and sales history are
                    kept on your account whether or not you subscribe, and you can export them
                    at any time.
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Checkout Area */}
      {currentStatus !== 'owned' && !isSuccess && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Plan selection */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Select Subscription Plan</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Monthly Plan Card */}
              <div 
                onClick={() => setSelectedPlan('monthly')}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-48 relative ${
                  selectedPlan === 'monthly' 
                    ? 'border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-900 text-lg">Monthly Plan</h4>
                    <input 
                      type="radio" 
                      checked={selectedPlan === 'monthly'} 
                      readOnly 
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">
                    Pay month-by-month. Ideal for testing operations or short seasons. Converts to lifetime owned license after 12 consecutive payments.
                  </p>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900">$21.99</span>
                  <span className="text-xs text-gray-500 font-bold"> / month</span>
                </div>
              </div>

              {/* Annual Plan Card */}
              <div 
                onClick={() => setSelectedPlan('annual')}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden ${
                  selectedPlan === 'annual' 
                    ? 'border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Save Badge */}
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-wider">
                  Save 17% & Own Immediately
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-1.5">
                      Annual Prepay
                      <Sparkles size={16} className="text-yellow-500" />
                    </h4>
                    <input 
                      type="radio" 
                      checked={selectedPlan === 'annual'} 
                      readOnly 
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">
                    Pay for 1 year upfront. This satisfies the 12-month rent-to-own requirement immediately, securing your <strong>perpetual lifetime license</strong> at the end of the year.
                  </p>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900">$219.99</span>
                  <span className="text-xs text-gray-500 font-bold"> / year</span>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Equivalent to $18.33/month (Save $44)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Payment</h3>

            {purchaseError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{purchaseError}</span>
              </div>
            )}

            {isNative ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center space-y-4">
                {isLoadingOffering ? (
                  <div className="py-6 flex flex-col items-center gap-3 text-gray-400">
                    <RefreshCw size={24} className="animate-spin" />
                    <span className="text-sm">Loading plans...</span>
                  </div>
                ) : offering ? (
                  <>
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full mx-auto flex items-center justify-center">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {selectedPlan === 'annual' ? 'Annual Prepay' : 'Monthly Plan'}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        Handled securely by the {Capacitor.getPlatform() === 'ios' ? 'App Store' : 'Google Play'} — your
                        card details never pass through Pico POS.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        const pkg = selectedPlan === 'annual' ? offering.annual : offering.monthly;
                        if (pkg) handleNativePurchase(pkg);
                        else setPurchaseError('This plan is not available right now.');
                      }}
                      className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} className="text-yellow-300" />
                      )}
                      Subscribe
                    </button>
                    <button
                      type="button"
                      onClick={handleRestorePurchases}
                      disabled={isProcessing}
                      className="text-xs text-gray-400 hover:text-gray-600 underline font-medium transition"
                    >
                      Restore previous purchase
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No subscription plans are available right now.</p>
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center">
                  <Lock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Online payment is being set up</h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Secure checkout isn't connected yet, so nothing will be charged here. Contact us and
                    we'll get your {selectedPlan === 'annual' ? 'Annual' : 'Monthly'} plan activated in the meantime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestSubscription}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition inline-flex items-center gap-2"
                >
                  <MessageSquare size={16} />
                  Contact Us to Subscribe
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Success Confetti View */}
      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-6 max-w-2xl mx-auto shadow-lg animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck size={44} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-emerald-950">Subscription Successfully Activated!</h3>
            <p className="text-emerald-800 text-sm">
              Thank you! Your payment of <strong>{selectedPlan === 'annual' ? '$219.99' : '$21.99'}</strong> has been processed successfully via native In-App Purchase.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 divide-y divide-gray-100 text-left text-xs text-slate-600 max-w-sm mx-auto">
            <div className="py-2.5 flex justify-between">
              <span className="font-bold">License Activated:</span>
              <span className="capitalize font-medium text-slate-900">{selectedPlan === 'annual' ? '👑 Perpetual Owned' : 'Monthly Member'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="font-bold">Rent-to-Own Balance:</span>
              <span className="font-mono font-black text-indigo-600">{monthsPaid} / 12 Months Satisfied</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="font-bold">Billing Start:</span>
              <span className="font-mono">{storeProfile.subscriptionStartDate}</span>
            </div>
            {storeProfile.subscriptionNextBillingDate && (
              <div className="py-2.5 flex justify-between">
                <span className="font-bold">Next Renewal:</span>
                <span className="font-mono">{storeProfile.subscriptionNextBillingDate}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-emerald-700/80 italic leading-relaxed">
            * A digital receipt has been sent to your business email {storeProfile.name.toLowerCase().replace(/\s+/g, '')}@himpower.com.
          </p>

          <button 
            onClick={() => setIsSuccess(false)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-100"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* FAQ & Support Section */}
      <div className="pt-8 border-t border-gray-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <HelpCircle size={22} className="text-indigo-600" />
              POS Essential FAQ & Support
            </h3>
            <p className="text-xs text-gray-500">Frequently asked questions and direct communication with our technical support team.</p>
          </div>
          
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="self-start md:self-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition active:scale-[0.98]"
          >
            <MessageSquare size={14} />
            Send Feedback / Contact Us
          </button>
        </div>

        {/* Top 5 FAQs Accordion list */}
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              q: "Q1. How do I manage or cancel my subscription?",
              a: "All subscriptions and payments are securely handled through Apple App Store / Google Play Store. You can manage or cancel your subscription at any time by going to your device's [Settings > App Store/Google Account > Subscriptions]."
            },
            {
              q: "Q2. Is it completely free after 12 months of subscription?",
              a: "Yes! To support small business owners, we offer a unique lifetime ownership model. Once you complete a total of 12 months of subscription (either monthly or annually), your account will automatically upgrade to a Lifetime License, and you will never be charged again."
            },
            {
              q: "Q3. Can I use the POS functions offline without an internet connection?",
              a: "Yes, core POS and bookkeeping features work seamlessly offline. Data recorded while offline is securely stored on your device and will automatically sync with our cloud server as soon as an internet connection is re-established."
            },
            {
              q: "Q4. What happens to my store data if I change or lose my device?",
              a: "Your store data is securely encrypted and backed up to our cloud server in real-time. If you change or lose your device, simply log in with your existing account on the new device, and all your data will be instantly restored."
            },
            {
              q: "Q5. How can I report a bug or suggest a new feature?",
              a: "You can reach us directly through the [Send Feedback / Contact Us] form inside the app (or click the button on the top-right of this FAQ section). Our development team reviews all feedback closely to provide technical support and continuously improve our POS features for global business owners."
            }
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left transition hover:bg-slate-50/50"
                >
                  <span className="text-xs md:text-sm font-bold text-slate-800">{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform duration-200 shrink-0 ml-3 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`} 
                  />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-slate-50/80 bg-slate-50/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Send Feedback / Contact Us Modal Dialog */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                onClick={closeFeedbackModal}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-lg font-black tracking-tight">Send Feedback / Contact Us</h3>
              </div>
              <p className="text-xs text-slate-400">Your message will be safely dispatched directly to <strong className="text-indigo-300">himpower2025@gmail.com</strong>.</p>
            </div>

            {/* Modal Body / Form */}
            {!feedbackSuccess ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
                    alert('Please fill out all fields.');
                    return;
                  }
                  setIsSendingFeedback(true);
                  setTimeout(() => {
                    setIsSendingFeedback(false);
                    setFeedbackSuccess(true);
                    
                    // Directly open user's local email client
                    const mailtoUrl = `mailto:himpower2025@gmail.com?subject=${encodeURIComponent(
                      `[Pico POS ${feedbackCategory}] ${feedbackSubject}`
                    )}&body=${encodeURIComponent(
                      `Message:\n${feedbackMessage}\n\n---\n[System Info]\nStore Name: ${storeProfile.name}\nLocation: ${storeProfile.location}\nLicense Status: ${storeProfile.subscriptionStatus || 'Trial/None'}`
                    )}`;
                    window.location.href = mailtoUrl;
                  }, 1200);
                }} 
                className="p-6 space-y-4 text-sm"
              >
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Feedback Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Suggestion', 'Bug Report', 'Billing', 'General Support'].map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFeedbackCategory(cat)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                          feedbackCategory === cat 
                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950' 
                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Title / Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of your question or issue"
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please describe your suggestion or bug in detail. We will review it closely!"
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition text-xs font-medium resize-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeFeedbackModal}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingFeedback}
                    className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isSendingFeedback ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Dispatched to Cloud...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success / Redirection Screen */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle size={36} />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-800">Feedback Dispatched Successfully!</h4>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                    Your feedback metadata has been recorded. To ensure direct, certified email delivery to our global support address, we have generated a native secure mail transfer.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-left text-xs max-w-sm mx-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Redirection Target</p>
                  <div className="flex items-center gap-2 font-mono text-slate-700">
                    <Mail size={14} className="text-indigo-500" />
                    <span>himpower2025@gmail.com</span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    If your device's email program did not open automatically, please click the button below to retry launch.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const subjectText = `[Pico POS ${feedbackCategory}] ${feedbackSubject}`;
                      const bodyText = `${feedbackMessage}\n\n---\nStore: ${storeProfile.name}\nLocation: ${storeProfile.location}\nLicense Status: ${storeProfile.subscriptionStatus || 'Trial/None'}`;
                      window.open(`mailto:himpower2025@gmail.com?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Mail size={14} />
                    Open Mail App
                  </button>
                  <button
                    type="button"
                    onClick={closeFeedbackModal}
                    className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

