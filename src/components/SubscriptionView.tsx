import React, { useState, useEffect } from 'react';
import { StoreProfile } from '../types';
import { 
  CreditCard, Check, Zap, Award, Sparkles, ShieldCheck, 
  HelpCircle, Code2, ArrowRight, Lock, Calendar, RefreshCw 
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
  const [showDeveloperGuide, setShowDeveloperGuide] = useState(false);

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
                  <span className="text-2xl font-black text-slate-900">$19.99</span>
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
                  <span className="text-2xl font-black text-slate-900">$199.99</span>
                  <span className="text-xs text-gray-500 font-bold"> / year</span>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Equivalent to $16.66/month (Save $40)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Form / Credit Card */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Secure Billing Details</h3>
            
            <form onSubmit={handlePaymentSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              
              {/* Virtual Credit Card View */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 aspect-[1.586/1] shadow-xl relative flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pico POS Subscriber Card</p>
                    <span className="text-xs font-mono font-medium text-indigo-300">{selectedPlan === 'annual' ? 'Annual Plan Upgrade' : 'Monthly Plan'}</span>
                  </div>
                  <div className="h-8 flex items-center justify-end font-black italic text-lg tracking-tight text-white/80">
                    {cardType !== 'Unknown' ? cardType : 'Pico'}
                  </div>
                </div>

                <div className="my-2">
                  <div className="h-9 w-12 bg-amber-200/80 rounded-lg shadow-inner flex items-center justify-center overflow-hidden border border-amber-300">
                    <div className="grid grid-cols-3 gap-0.5 w-full h-full p-1 opacity-40">
                      <div className="border border-slate-950"></div>
                      <div className="border border-slate-950"></div>
                      <div className="border border-slate-950"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Card Number Display */}
                  <div className="text-lg md:text-xl font-mono tracking-[0.2em] font-medium text-slate-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex justify-between items-end text-xs font-mono">
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Cardholder</p>
                      <p className="truncate uppercase max-w-[180px]">{cardName || 'YOUR FULL NAME'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Expires</p>
                      <p>{cardExpiry || 'MM/YY'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">CVV</p>
                      <p>{'•'.repeat(cardCvv.length) || '•••'}</p>
                    </div>
                  </div>
                </div>

                {/* Background watermarks */}
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full translate-x-8 translate-y-8 pointer-events-none"></div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cardholder Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Card Number</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      required
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                    />
                    <CreditCard className="absolute left-4 text-gray-400" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expiration Date</label>
                    <input 
                      type="text" 
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CVV / Security Code</label>
                    <input 
                      type="password" 
                      required
                      placeholder="123"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Billing Postal / ZIP Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 10001"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 8))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Secure terms footer */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-emerald-500" />
                  SSL Secured & Compliant
                </span>
                <span>Powered by Stripe Demo API</span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing Payment securely via Stripe...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Confirm & Activate Sub - {selectedPlan === 'annual' ? '$199.99' : '$19.99'}
                  </>
                )}
              </button>
            </form>
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
              Thank you! Your payment of <strong>{selectedPlan === 'annual' ? '$199.99' : '$19.99'}</strong> has been processed successfully via Stripe.
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

      {/* Stripe Developer Integration Guide */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowDeveloperGuide(!showDeveloperGuide)}
          className="w-full px-6 py-5 flex items-center justify-between bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Code2 size={20} /></div>
            <div>
              <h4 className="font-bold text-gray-900">Stripe Live Integration Guide (For Developers)</h4>
              <p className="text-xs text-gray-500">Learn how to configure real credit card billing in production</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            {showDeveloperGuide ? 'Hide Guide' : 'Show Guide'}
          </span>
        </button>

        {showDeveloperGuide && (
          <div className="p-6 md:p-8 space-y-8 animate-in slide-in-from-top-4 duration-300 text-sm leading-relaxed text-gray-700 max-h-[800px] overflow-y-auto">
            
            <section className="space-y-3">
              <h5 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                <ShieldCheck size={18} className="text-indigo-600" />
                1. System Requirements & Architecture
              </h5>
              <p>
                To enable safe credit card handling without exposing your server to heavy PCI liability, Stripe isolates credentials completely:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><strong>Frontend:</strong> Uses Stripe Elements (iframe) or Stripe Checkout (hosted redirect) to capture card details and returns a secure <code>PaymentMethod</code> or <code>Token</code> ID.</li>
                <li><strong>Backend:</strong> Uses the Stripe API token on your secure node server (<code>server.ts</code>) to create subscriptions or payments.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h5 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                <Code2 size={18} className="text-indigo-600" />
                2. Environment Configurations (.env)
              </h5>
              <p>Add these environment secrets to your server context. Do not commit actual private keys to GitHub:</p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-normal">
{`# .env.example
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...`}
              </pre>
            </section>

            <section className="space-y-3">
              <h5 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                <ArrowRight size={18} className="text-indigo-600" />
                3. Backend Express API Sample (`server.ts`)
              </h5>
              <p>This Express routing handles creation of checkout sessions using Stripe subscriptions. Place this code inside your server controller:</p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-normal">
{`import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Endpoint: Create Subscription Checkout Session
app.post('/api/billing/create-checkout', async (req, res) => {
  const { customerEmail, planType } = req.body;
  
  // Choose Price ID configured in your Stripe Dashboard
  const priceId = planType === 'annual' 
    ? 'price_1YearPrepay_ID' 
    : 'price_1MonthRecurring_ID';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://pico-pos.app/settings?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://pico-pos.app/settings?cancelled=true',
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});`}
              </pre>
            </section>

            <section className="space-y-3">
              <h5 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                <Lock size={18} className="text-indigo-600" />
                4. Handling Stripe Webhooks for "Rent-to-Own" Syncing
              </h5>
              <p>
                To track continuous monthly cycles, set up a webhook that receives Stripe events and increments the <code>subscriptionMonthsPaid</code> field in your cloud database:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-normal">
{`// Endpoint: Stripe Webhook Listener
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription;
    
    // 1. Fetch current customer from Database
    const userProfile = await db.getUserByStripeId(invoice.customer);

    // 2. Increment months paid counter
    const updatedMonths = (userProfile.subscriptionMonthsPaid || 0) + 1;
    
    if (updatedMonths >= 12) {
      // 3. Complete Rent-To-Own milestone: Cancel Stripe auto-renew, grant permanent license
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      await db.updateUserLicense(userProfile.id, { 
        subscriptionStatus: 'owned', 
        subscriptionMonthsPaid: 12 
      });
    } else {
      await db.updateUserLicense(userProfile.id, { 
        subscriptionStatus: 'monthly', 
        subscriptionMonthsPaid: updatedMonths 
      });
    }
  }

  res.json({ received: true });
});`}
              </pre>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
