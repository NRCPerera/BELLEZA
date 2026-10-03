import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login as loginAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = ({ staffOnly = false }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const homeByRole = { admin: '/admin', staff: '/staff' };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await loginAPI(data);
      if (staffOnly && res.data.user.role === 'customer') {
        toast.error('Customer login is disabled. Please book as a guest.');
        return;
      }
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate(
        res.data.user.mustChangePassword
          ? '/change-password'
          : homeByRole[res.data.user.role] || '/admin/login',
        { replace: true }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-primary-700 px-5 py-10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(217,154,166,.45),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(197,164,109,.18),transparent_28%)]" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex mb-6 rounded-2xl bg-white px-4 py-2 shadow-md">
            <img src="/logo.jpg" alt="Belleza" className="h-12 w-auto" />
          </Link>
          <h1 className="font-display text-4xl font-bold text-white">Staff login</h1>
          <p className="text-white/60 mt-2">Admin and staff only</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email format' },
                })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {!loading && <Sparkles className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
