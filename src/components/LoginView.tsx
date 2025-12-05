import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { CloudSun, Lock, Mail, ArrowRight, Sparkles, BarChart3 } from 'lucide-react';

interface LoginViewProps {
  onLogin: (profile: StoreProfile) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    processLogin(email);
  };

  const handleGoogleLogin = () => {
    // Simulate Google Login flow
    processLogin('google-user');
  };

  const processLogin = (userEmail: string) => {
    setIsLoading(true);

    // Simulate Network Request
    setTimeout(() => {
      let profile: StoreProfile;

      // Simulation logic based on user
      if (userEmail.includes('demo')) {
        profile = {
          name: 'Blue Bottle Demo',
          location: 'Gangnam, Seoul',
          currency: 'KRW',
          taxRate: 10,
          panNumber: '123-456-7890',
          settlementAccount: 'KR-BANK-001',
          logoIcon: 'coffee',
          themeColor: 'bg-indigo-900'
        };
      } else {
        // Default / Pico
        profile = {
          name: 'Pico Cafe',
          location: 'Global Branch',
          currency: 'USD',
          taxRate: 8,
          panNumber: '987-654-321',
          settlementAccount: 'US-BANK-999',
          logoIcon: 'cloud',
          themeColor: 'bg-indigo-600'
        };
      }

      onLogin(profile);
      setIsLoading(false);
    }, 1500);
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
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Store Access</h2>
            <p className="text-gray-500 mt-2">Log in to manage your business.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                />
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
               <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                 <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                 Remember me
               </label>
               <a href="#" className="text-indigo-600 font-bold hover:underline">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Sign In <ArrowRight size={20} /></>
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
        </div>
      </div>
    </div>
  );
};

export default LoginView;