import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { isAdmin } from '../../config/roles';
import { USE_MOCK_API } from '../../config/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { error, success } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const validate = () => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errs.username = 'Vui lòng nhập tên đăng nhập';
    }
    if (!password.trim()) {
      errs.password = 'Vui lòng nhập mật khẩu';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const session = await login({ username: username.trim(), password });
      success(`Chào ${session.user.fullName || session.user.username}`);

      if (isAdmin(session.user.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/driver/routes', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setValidationErrors({});
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
            <Route className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">UrbanRoute</p>
            <p className="text-sm text-slate-600">Tìm tuyến giao nhận tại TP.HCM</p>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="login-title">
          <h1 id="login-title" className="text-xl font-semibold">Đăng nhập</h1>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">Tên đăng nhập</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (validationErrors.username) setValidationErrors((prev) => ({ ...prev, username: undefined }));
                }}
                aria-invalid={Boolean(validationErrors.username)}
                aria-describedby={validationErrors.username ? 'username-error' : undefined}
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 aria-invalid:border-rose-500"
              />
              {validationErrors.username && (
                <p id="username-error" className="mt-1 text-sm text-rose-700">{validationErrors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={Boolean(validationErrors.password)}
                  aria-describedby={validationErrors.password ? 'password-error' : undefined}
                  className="block w-full rounded-md border border-slate-300 py-2.5 pl-3 pr-12 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 aria-invalid:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {validationErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-rose-700">{validationErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          {USE_MOCK_API && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700">Tài khoản thử</p>
              <p className="mt-1 text-xs text-slate-600">Chọn một vai trò để điền thông tin đăng nhập.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  Quản trị viên
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('driver', 'driver123')}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  Tài xế
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
