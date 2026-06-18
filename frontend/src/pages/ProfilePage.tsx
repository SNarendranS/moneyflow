import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { useAuth } from '../store/auth';
import toast from 'react-hot-toast';
import { User, Lock, Globe } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2),
  currency: z.string(),
  timezone: z.string(),
});
const pwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

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
      toast.success('Profile updated!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const changePassword = async (data: PwForm) => {
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed!');
      pwReset();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
        <p className="text-muted mt-0.5">Manage your account preferences</p>
      </div>

      {/* Avatar / Info */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-2xl font-bold text-brand-400">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{user?.name}</div>
          <div className="text-muted">{user?.email}</div>
          <div className="text-xs text-gray-500 mt-1">Member since {new Date(user?.createdAt || '').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-5"><User size={18}/> Profile Information</h2>
        <form onSubmit={profileSubmit(updateProfile)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...profileReg('name')} className="input"/>
            {profileErrors.name && <p className="text-xs text-red-400 mt-1">{profileErrors.name.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Currency</label>
              <select {...profileReg('currency')} className="input">
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="SGD">SGD — Singapore Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
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
          <div className="flex justify-end">
            <button type="submit" disabled={profileSub} className="btn-primary">{profileSub ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>

      {/* Password Form */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-5"><Lock size={18}/> Change Password</h2>
        <form onSubmit={pwSubmit(changePassword)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input {...pwReg('currentPassword')} type="password" placeholder="••••••••" className="input"/>
            {pwErrors.currentPassword && <p className="text-xs text-red-400 mt-1">{pwErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">New Password</label>
            <input {...pwReg('newPassword')} type="password" placeholder="Min 6 characters" className="input"/>
            {pwErrors.newPassword && <p className="text-xs text-red-400 mt-1">{pwErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input {...pwReg('confirmPassword')} type="password" placeholder="••••••••" className="input"/>
            {pwErrors.confirmPassword && <p className="text-xs text-red-400 mt-1">{pwErrors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={pwSub} className="btn-primary">{pwSub ? 'Changing…' : 'Change Password'}</button>
          </div>
        </form>
      </div>

      {/* App info */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-3"><Globe size={18}/> App Info</h2>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="font-mono text-white">1.0.0</span></div>
          <div className="flex justify-between"><span>Stack</span><span className="text-white">React + Node + MongoDB</span></div>
          <div className="flex justify-between"><span>Default Categories</span><span className="text-white">8 categories auto-seeded</span></div>
        </div>
      </div>
    </div>
  );
}
