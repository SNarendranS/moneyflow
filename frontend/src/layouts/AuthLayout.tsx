import { Outlet } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#08090e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-glow border border-white/20">
              <Layers size={20} />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Cash Canvas</span>
          </div>
          <p className="text-slate-400 text-xs font-medium">Personal Financial Operating System</p>
        </div>

        {/* Card Container */}
        <div className="bg-[#121422] border border-white/10 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/80 ring-1 ring-white/5 backdrop-blur-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
