import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Github, Loader2, X, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useLogin, useForgotPassword } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'


export default function LoginPage() {
  const { mutate: performLogin, isPending: isLoading, error: mutationError } = useLogin()
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performLogin({ email, password })
  }

  const error = mutationError ? (mutationError as any).response?.data?.detail || 'Invalid email or password' : ''

  const inputClasses = "w-full bg-[var(--surface-4)] border border-[var(--border-default)] rounded-lg py-2.5 pl-10 pr-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm"

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Fuse account"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">Email</label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
              <Mail className="size-4" strokeWidth={1.75} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={inputClasses}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[13px] font-bold text-[var(--text-primary)]">Password</label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline font-bold transition-colors"
            >
              Forget password?
            </button>
          </div>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
              <Lock className="size-4" strokeWidth={1.75} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClasses}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-icon)] hover:text-[var(--text-primary)] transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="size-4" strokeWidth={1.75} />
              ) : (
                <Eye className="size-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] py-2 px-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm text-[14px]"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Or continue with</span>
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
      </div>

      <button className="w-full mt-6 bg-[var(--surface-3)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-[var(--surface-hover)] transition-colors text-[14px]">
        <Github className="size-4" />
        GitHub
      </button>

      <p className="mt-6 text-center text-[12px] text-[var(--text-muted)] leading-relaxed">
        By signing in, you agree to our{' '}
        <a href="#" className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition-colors underline underline-offset-4 decoration-[var(--border-default)]">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition-colors underline underline-offset-4 decoration-[var(--border-default)]">Privacy Policy</a>.
      </p>

      <p className="mt-8 text-center text-[13px] text-[var(--text-muted)]">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="text-[var(--text-primary)] font-medium hover:text-[var(--brand-accent)] transition-colors">
          Create an account
        </Link>
      </p>

      {/* Forgot Password Modal Overlay */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </AuthLayout>
  )
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const { mutate: submitForgot, isPending: isLoading, isSuccess } = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitForgot({ email })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[440px] bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[12px] p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="size-5" />
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="size-12 bg-[var(--brand-accent)]/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="size-6 text-[var(--brand-accent)]" />
            </div>
            <h2 className="text-xl font-bold font-season text-[var(--text-primary)] mb-3">Check your inbox</h2>
            <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
              We&apos;ve sent a password reset link to <span className="text-[var(--text-primary)] font-medium">{email}</span>. Please check your email to continue.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[var(--surface-4)] text-[var(--text-primary)] font-semibold py-2.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold font-season text-[var(--text-primary)] mb-3">Reset password</h2>
            <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
              Enter your email address and we&apos;ll send you a link to reset your password if your account exists.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
                    <Mail className="size-4" strokeWidth={1.75} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[var(--surface-4)] border border-[var(--border-default)] rounded-lg py-2.5 pl-10 pr-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group text-[14px]"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
