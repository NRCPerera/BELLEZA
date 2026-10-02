import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { register as registerAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Scissors, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await registerAPI(data);
      login(res.data.user, res.data.token);
      toast.success('Account created! Welcome to Belleza.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-ink-900 px-5 py-12"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(213,82,123,.5),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(236,205,138,.18),transparent_28%)]" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-gray-900">Belleza</span>
          </Link>
          <h1 className="font-display text-4xl font-bold text-white">Create your account</h1>
          <p className="text-white/60 mt-2">Join us and book your first appointment</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" className="input-field" placeholder="Jane Doe" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="tel" className="input-field" placeholder="(555) 123-4567" {...register('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input-field pr-10" placeholder="At least 6 characters" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {!loading && <Sparkles className="w-4 h-4" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
