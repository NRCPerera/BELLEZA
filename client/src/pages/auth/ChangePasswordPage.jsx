import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword as changePasswordAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const homeByRole = { customer: '/', admin: '/admin', staff: '/staff' };

const ChangePasswordPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setSubmitting(true);
    try {
      const res = await changePasswordAPI({ currentPassword, newPassword });
      login(res.data.user, localStorage.getItem('token'));
      toast.success('Password changed successfully.');
      navigate(homeByRole[res.data.user.role] || '/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Could not change password';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900 text-center">Change your password</h1>
        <p className="mt-2 text-sm text-gray-500 text-center">
          {user?.mustChangePassword
            ? 'Set a new password before continuing to your account.'
            : 'Enter your current password to choose a new one.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
            <input
              type="password"
              className="input-field"
              autoComplete="current-password"
              {...register('currentPassword', { required: 'Current password is required' })}
            />
            {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <input
              type="password"
              className="input-field"
              autoComplete="new-password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Use at least 6 characters' },
              })}
            />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
            <input
              type="password"
              className="input-field"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (value) => value === watch('newPassword') || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Changing password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
