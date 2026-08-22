import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-6 text-left">
        <h1 className="text-xl font-bold text-white tracking-tight">Sign In</h1>
        <p className="text-xs text-slate-400 mt-1">Access your portfolio and cashflow insights</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <input
              {...register('email')}
              type="email"
              placeholder="you@domain.com"
              className="input pl-10"
            />
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className="input pl-10 pr-10"
            />
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-2.5"
        >
          <span>{isSubmitting ? 'Signing In…' : 'Sign In'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-300 hover:text-white font-semibold transition-colors">
          Create Account
        </Link>
      </p>
    </div>
  );
}
