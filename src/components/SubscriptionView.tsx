import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { 
  CreditCard, Zap, Award, Sparkles, ShieldCheck, 
  Lock, RefreshCw, HelpCircle, ChevronDown, MessageSquare, 
  Send, Mail, X, CheckCircle 
} from 'lucide-react';

interface SubscriptionViewProps {
  storeProfile: StoreProfile;
  onUpdateProfile: (profile: StoreProfile) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  storeProfile, 
  onUpdateProfile 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Format Card Number (adds spaces)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += value[i];
    }
    setCardNumber(formattedValue.slice(0, 19));
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    setCardExpiry(value.slice(0, 5));
  };

  // Format CVV (max 4 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    setCardCvv(value.slice(0, 4));
  };

  // Detect Card Network
  const getCardType = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNum)) return 'Mastercard';
    if (/^3[47]/.test(cleanNum)) return 'Amex';
    if (/^(?:6011|65|64[4-9]|622)/.test(cleanNum)) return 'Discover';
    return 'Unknown';
  };

  const cardType = getCardType(cardNumber);

  // Handle Mock Payment Submission
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      alert('Please fill out all card details.');
      return;
    }

    setIsProcessing(true);

    // Simulate Payment Gateway call to Stripe
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      // Determine next billing date and months paid update
      const now = new Date();
      const nextBilling = new Date();
      let updatedMonths = monthsPaid;

      if (selectedPlan === 'annual') {
        nextBilling.setFullYear(now.getFullYear() + 1);
        updatedMonths = 12; // Annual prepay grants perpetual ownership at the end of year cycle or right away
      } else {
        nextBilling.setMonth(now.getMonth() + 1);
        updatedMonths = Math.min(12, monthsPaid + 1);
      }

      const updatedProfile: StoreProfile = {
        ...storeProfile,
        subscriptionStatus: updatedMonths >= 12 ? 'owned' : selectedPlan,
        subscriptionMonthsPaid: updatedMonths,
        subscriptionStartDate: now.toLocaleDateString(),
        subscriptionNextBillingDate: updatedMonths >= 12 ? undefined : nextBilling.toLocaleDateString()
      };

      onUpdateProfile(updatedProfile);
    }, 2500);
  };

  // Reset demo subscription state to try again
  const handleResetSubscription = () => {
    if (confirm('Would you like to reset your subscription state to test the checkout again?')) {
      onUpdateProfile({
        ...storeProfile,
        subscriptionStatus: 'none',
        subscriptionMonthsPaid: 0,
        subscriptionStartDate: undefined,
        subscriptionNextBillingDate: undefined
      });
      setCardNumber('');
      setCardName('');
      setCardExpiry('');
      setCardCvv('');
      setZipCode('');
      setIsSuccess(false);
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

          {currentStatus !== 'none' && (
            <button 
              onClick={handleResetSubscription}
              className="text-xs text-gray-400 hover:text-red-500 underline font-medium transition"
            >
              Reset Subscription (Demo Mode)
            </button>
          )}
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

        {/* 7-Day Free Trial and Data Retention Policy Banner */}
        {currentStatus === 'none' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">Pico POS 7-Day Free Trial</h4>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                A <strong>7-day free trial period</strong> has automatically started with your registration. You can test all POS checkout, receipt, and management features immediately without registering any credit card details.
              </p>
              <div className="pt-2 border-t border-amber-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-amber-800">
                <span className="flex items-center gap-1">
                  🛡️ <strong>Data Storage Guarantee:</strong> Your customized menu, inventory, and transaction history are safely backed up to our cloud server.
                </span>
                <span className="flex items-center gap-1 font-bold text-red-600">
                  ⚠️ Unsubscribed data will be permanently deleted 7 days after trial expiry
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

          {/* Right Column: Google Play & App Store In-App Purchase Simulator */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">App Store In-App Purchase</h3>
              <div className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-bold">
                Hybrid App SDK Integrated
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              {/* Informational Banner about Card-free IAP */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500" /> Nepal Local Carrier & Wallet billing
                </h4>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  <strong>No international credit card required!</strong> By choosing Google Play or Apple App Store In-App Purchase, your Nepalese clients can easily pay for subscriptions using <strong>local wallets (eSewa, Khalti)</strong>, <strong>carrier billing (Ncell / NTC)</strong>, or <strong>prepaid Gift Cards</strong> purchased with cash.
                </p>
              </div>

              {/* Platform Selector Tabs */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Choose Native Platform Store
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCardName('Google Play');
                      setCardNumber('google');
                    }}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                      cardNumber === 'google' || cardNumber === ''
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950'
                        : 'border-gray-100 bg-gray-50/50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.783 12 3.609 22.186a2.204 2.204 0 01-.601-1.503V3.317c0-.574.22-1.096.601-1.503zM14.973 13.19l3.056 3.056L5.353 22.95l9.62-9.76zM14.973 10.81l9.62-9.76-12.676 6.704 3.056 3.056zM14.49 12.707l2.846-2.846 4.103 2.139a1.69 1.69 0 010 2.915l-4.103 2.138-2.846-2.846z" fill="currentColor" />
                    </svg>
                    Google Play (Android Tablet)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardName('Apple App Store');
                      setCardNumber('apple');
                    }}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                      cardNumber === 'apple'
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950'
                        : 'border-gray-100 bg-gray-50/50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
                    </svg>
                    Apple App Store (iPad)
                  </button>
                </div>
              </div>

              {/* Native simulated billing selector */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Simulated Billing Method (Nepal Compliant)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">
                        Wallet
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Nepal Mobile Wallets (eSewa / Khalti)</p>
                        <p className="text-[10px] text-slate-500">Deducts instantly via regional App Store linkage</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold">Supported</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                        Carrier
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Carrier Airtime Billing (Ncell / NTC)</p>
                        <p className="text-[10px] text-slate-500">Charge is added to mobile balance or postpaid bill</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold">Supported</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase">
                        GiftCard
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Store Gift Cards / Redemptions</p>
                        <p className="text-[10px] text-slate-500">Enter code bought at physical retailers</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold">Supported</span>
                  </div>
                </div>
              </div>

              {/* Secure terms footer */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-emerald-500" />
                  Native Sandbox Verified
                </span>
                <span>{cardNumber === 'apple' ? 'Apple App Store Server v2' : 'Google Play Billing Library v6'}</span>
              </div>

              {/* Trigger In-App Purchase Button */}
              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={isProcessing}
                className={`w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition active:scale-[0.99] ${
                  cardNumber === 'apple' 
                    ? 'bg-slate-900 hover:bg-black' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Connecting to {cardNumber === 'apple' ? 'App Store' : 'Google Play'} Dialog...
                  </>
                ) : (
                  <>
                    <Zap size={18} className="text-yellow-300" />
                    Purchase with {cardNumber === 'apple' ? 'Apple App Store' : 'Google Play Store'} - {selectedPlan === 'annual' ? '$219.99' : '$21.99'}
                  </>
                )}
              </button>
            </div>
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

