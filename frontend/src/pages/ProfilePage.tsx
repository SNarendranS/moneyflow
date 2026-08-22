import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { User, Lock, Globe, Shield, Sparkles } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currency: z.string(),
  timezone: z.string(),
});

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(6, 'Minimum 6 characters'),
  confirmPassword: z.string().min(6, 'Minimum 6 characters'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type ProfileForm = z.infer<typeof profileSchema>;
type PwForm = z.infer<typeof pwSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const { register: profileReg, handleSubmit: profileSubmit, formState: { errors: profileErrors, isSubmitting: profileSub } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', currency: user?.currency || 'INR', timezone: user?.timezone || 'Asia/Kolkata' },
  });

  const { register: pwReg, handleSubmit: pwSubmit, reset: pwReset, formState: { errors: pwErrors, isSubmitting: pwSub } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const updateProfile = async (data: ProfileForm) => {
    try {
      const res = await authAPI.updateProfile(data);
      updateUser(res.data.data);
      toast.success('Profile updated successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update profile');
    }
  };

  const changePassword = async (data: PwForm) => {
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed successfully');
      pwReset();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Preferences</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your identity, currency defaults, and security credentials</p>
      </div>

      {/* User Hero Card */}
      <div className="card p-6 flex items-center gap-5 bg-gradient-to-r from-[#131626] to-[#0f111c] border-brand-500/20 shadow-glow">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 border border-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-glow flex-shrink-0">
          {userInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-white tracking-tight truncate">{user?.name}</div>
          <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          <div className="text-[11px] text-brand-300/80 mt-1 font-medium">
            Active workspace member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'recently'}
          </div>
        </div>
      </div>

      {/* Profile Info Form */}
      <div className="card p-6">
        <h2 className="section-title flex items-center gap-2 mb-5">
          <User size={17} className="text-brand-400" />
          <span>Profile Information</span>
        </h2>
        <form onSubmit={profileSubmit(updateProfile)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...profileReg('name')} className="input" />
            {profileErrors.name && <p className="text-xs text-rose-400 mt-1">{profileErrors.name.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Currency</label>
              <select {...profileReg('currency')} className="input">
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="SGD">SGD — Singapore Dollar (S$)</option>
                <option value="AED">AED — UAE Dirham (AED)</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select {...profileReg('timezone')} className="input">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={profileSub} className="btn-primary">
              {profileSub ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="section-title flex items-center gap-2 mb-5">
          <Lock size={17} className="text-brand-400" />
          <span>Security & Password</span>
        </h2>
        <form onSubmit={pwSubmit(changePassword)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input {...pwReg('currentPassword')} type="password" placeholder="••••••••" className="input" />
            {pwErrors.currentPassword && <p className="text-xs text-rose-400 mt-1">{pwErrors.currentPassword.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">New Password</label>
              <input {...pwReg('newPassword')} type="password" placeholder="Min. 6 characters" className="input" />
              {pwErrors.newPassword && <p className="text-xs text-rose-400 mt-1">{pwErrors.newPassword.message}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input {...pwReg('confirmPassword')} type="password" placeholder="••••••••" className="input" />
              {pwErrors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{pwErrors.confirmPassword.message}</p>}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={pwSub} className="btn-primary">
              {pwSub ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* System Information */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-3">
          <Shield size={17} className="text-slate-400" />
          <span>System Environment</span>
        </h2>
        <div className="space-y-2.5 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="font-semibold text-white">Cash Canvas Financial OS</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-mono text-white">2.4.0</span>
          </div>
          <div className="flex justify-between">
            <span>Multi-type Category System</span>
            <span className="text-emerald-400 font-medium">Active (Expense, Income, Investment)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
