import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Coins, ArrowRight } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  currency: z.string().default('INR'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'INR' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authRegister(data);
      toast.success('Account created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-6 text-left">
        <h1 className="text-xl font-bold text-white tracking-tight">Create Workspace</h1>
        <p className="text-xs text-slate-400 mt-1">Start organizing your personal wealth and assets</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <div className="relative">
            <input
              {...register('name')}
              placeholder="e.g. Arjun Kumar"
              className="input pl-10"
            />
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
        </div>

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
              type="password"
              placeholder="Min. 6 characters"
              className="input pl-10"
            />
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Base Currency</label>
          <div className="relative">
            <select {...register('currency')} className="input pl-10">
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
              <option value="SGD">SGD — Singapore Dollar (S$)</option>
              <option value="AED">AED — UAE Dirham (AED)</option>
            </select>
            <Coins size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-2.5"
        >
          <span>{isSubmitting ? 'Setting up Workspace…' : 'Create Account'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-300 hover:text-white font-semibold transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  );
}
