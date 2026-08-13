import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { CloudSun, Lock, Mail, ArrowRight, Sparkles, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogleAccount,
  sendPasswordReset,
  setAuthPersistence,
  loadStoreProfileFromFirebase,
  saveStoreProfileToFirebase
} from '../services/firebaseService';

interface LoginViewProps {
  onLogin: (profile: StoreProfile) => void;
}

type AuthMode = 'signin' | 'signup';

// Turn a Firebase Auth error code into a short, user-facing message.
const getAuthErrorMessage = (code?: string): string => {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Try "Create Account" instead.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try "Sign In" instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Load the store's profile by Auth UID, or create a default one on first login.
  const resolveOrCreateProfile = async (uid: string, userEmail: string | null): Promise<StoreProfile> => {
    let profile = await loadStoreProfileFromFirebase(uid);

    if (!profile) {
      const isDemo = (userEmail || '').includes('demo');
      profile = {
        name: isDemo ? 'Blue Bottle Demo' : 'Pico Cafe',
        location: isDemo ? 'Gangnam, Seoul' : 'Global Branch',
        currency: isDemo ? 'KRW' : 'USD',
        taxRate: isDemo ? 10 : 8,
        panNumber: isDemo ? '123-456-7890' : '987-654-321',
        settlementAccount: isDemo ? 'KR-BANK-001' : 'US-BANK-999',
        logoIcon: isDemo ? 'coffee' : 'cloud',
        themeColor: isDemo ? 'bg-indigo-900' : 'bg-indigo-600',
        subscriptionStatus: 'none',
        subscriptionMonthsPaid: 0,
        ownerId: uid
      };
      await saveStoreProfileToFirebase(profile);
    }

    return profile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await setAuthPersistence(rememberMe);
      const credential = mode === 'signup'
        ? await registerWithEmail(email, password)
        : await signInWithEmail(email, password);

      const profile = await resolveOrCreateProfile(credential.user.uid, credential.user.email);
      onLogin(profile);
    } catch (err: any) {
      setErrorMessage(getAuthErrorMessage(err?.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      await setAuthPersistence(rememberMe);
      const credential = await signInWithGoogleAccount();
      const profile = await resolveOrCreateProfile(credential.user.uid, credential.user.email);
      onLogin(profile);
    } catch (err: any) {
      setErrorMessage(getAuthErrorMessage(err?.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email) {
      setErrorMessage('Enter your email address first, then tap "Forgot password?" again.');
      return;
    }

    try {
      await sendPasswordReset(email);
      setInfoMessage(`Password reset email sent to ${email}.`);
    } catch (err: any) {
      setErrorMessage(getAuthErrorMessage(err?.code));
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="flex w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex-col md:flex-row">
        
        {/* Left Side - Brand / Art */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden min-h-[200px]">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                    <CloudSun size={36} className="text-white" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Pico</h1>
                    <p className="text-indigo-200 text-sm font-medium tracking-wide">Smart POS & Analytics</p>
                </div>
            </div>
            <p className="text-indigo-100 text-lg font-light leading-relaxed max-w-xs">
              Small but mighty. <br/>
              The intelligent way to run your cafe.
            </p>
          </div>
          
          <div className="relative z-10 space-y-4 hidden md:block mt-12">
             <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition cursor-default">
                <div className="p-2 bg-indigo-400 rounded-lg text-indigo-950"><Sparkles size={20} /></div>
                <div>
                   <p className="font-bold">AI Forecasting</p>
                   <p className="text-xs text-indigo-100">Predict demand before it happens</p>
                </div>
             </div>
             <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition cursor-default">
                <div className="p-2 bg-violet-400 rounded-lg text-violet-950"><BarChart3 size={20} /></div>
                <div>
                   <p className="font-bold">Smart Insights</p>
                   <p className="text-xs text-indigo-100">Visualize your growth instantly</p>
                </div>
             </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full -translate-y-1/3 translate-x-1/3 blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-[60px]"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Store Access</h2>
            <p className="text-gray-500 mt-2">
              {mode === 'signin' ? 'Log in to manage your business.' : 'Create an account to get started.'}
            </p>
          </div>

          {/* Sign In / Create Account toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                mode === 'signin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {infoMessage && (
            <div className="mb-5 flex items-start gap-2 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl p-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@pico.app"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                />
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
               <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={rememberMe}
                   onChange={(e) => setRememberMe(e.target.checked)}
                   className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                 />
                 Remember me
               </label>
               {mode === 'signin' && (
                 <button
                   type="button"
                   onClick={handleForgotPassword}
                   className="text-indigo-600 font-bold hover:underline"
                 >
                   Forgot password?
                 </button>
               )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          {/* Google Login Section */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-70 group"
          >
            {/* Simple Google G Logo SVG */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Account
          </button>

          <div className="mt-12 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Developed & Maintained by</p>
            <p className="text-sm text-gray-600 font-bold mt-1">Himpower Pvt. Ltd.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
