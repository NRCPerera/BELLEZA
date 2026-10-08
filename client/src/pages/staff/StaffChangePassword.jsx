import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword as changePasswordAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const StaffChangePassword = () => {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setSubmitting(true);
    try {
      const res = await changePasswordAPI({ currentPassword, newPassword });
      login(res.data.user);
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Could not change password';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        <p className="text-gray-500 text-sm mt-1">Keep your account secure</p>
      </div>

      <div className="max-w-lg">
        <div className="card p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 p-4 bg-primary-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Security reminder</p>
              <p className="text-xs text-gray-500">
                Use a strong password with at least 6 characters
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                className="input-field"
                autoComplete="current-password"
                {...register('currentPassword', {
                  required: 'Current password is required',
                })}
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New password
              </label>
              <input
                type="password"
                className="input-field"
                autoComplete="new-password"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 6, message: 'Use at least 6 characters' },
                })}
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                className="input-field"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Please confirm your new password',
                  validate: (value) =>
                    value === watch('newPassword') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              {submitting ? 'Changing password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffChangePassword;
