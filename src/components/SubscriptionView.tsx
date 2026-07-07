import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { 
  CreditCard, Zap, Award, Sparkles, ShieldCheck, 
  Lock, RefreshCw 
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

        {/* 7일 무료 체험 및 데이터 보관 정책 안내 (사장님 요청사항 추가) */}
        {currentStatus === 'none' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">Pico POS 7일 무료 체험 (7-Day Free Trial)</h4>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                현재 가입 즉시 시작되는 <strong>7일 무료 체험 기간</strong>이 적용 중입니다. 카드 등록 없이도 모든 결제 및 관리 기능을 제한 없이 테스트하실 수 있습니다.
              </p>
              <div className="pt-2 border-t border-amber-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-amber-800">
                <span className="flex items-center gap-1">
                  🛡️ <strong>데이터 보관 보장:</strong> 체험 기간 동안 입력하신 소중한 메뉴 및 판매 내역은 안전하게 클라우드에 임시 보관됩니다.
                </span>
                <span className="flex items-center gap-1 font-bold text-red-600">
                  ⚠️ 미구독 시 7일 유예 후 자동 영구 삭제
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
    </div>
  );
};
