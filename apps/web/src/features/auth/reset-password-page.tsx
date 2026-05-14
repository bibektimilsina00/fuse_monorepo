import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, XCircle } from 'lucide-react'
import { useResetPassword } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  
  const { mutate: performReset, isPending: isLoading, isSuccess, error: mutationError } = useResetPassword()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (password !== confirmPassword) return
    
    performReset({ token, new_password: password })
  }

  const error = mutationError ? (mutationError as any).response?.data?.detail || 'Failed to reset password. The link may be expired.' : ''
  const passwordsMatch = password && confirmPassword ? password === confirmPassword : true

  const inputClasses = "w-full bg-[var(--surface-4)] border border-[var(--border-default)] rounded-lg py-2.5 pl-10 pr-10 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm"

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="This password reset link is invalid or missing a token.">
        <div className="flex flex-col items-center text-center py-4">
          <XCircle className="size-12 text-red-500 mb-6 opacity-20" />
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
            Please request a new password reset link from the login page.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[var(--surface-4)] text-[var(--text-primary)] font-semibold py-2.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] transition-colors text-[14px]"
          >
            Back to login
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your password has been successfully updated.">
        <div className="flex flex-col items-center text-center py-4">
          <div className="size-12 bg-[var(--brand-accent)]/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="size-6 text-[var(--brand-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">All set!</h2>
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
            Your password has been updated. You can now use your new password to sign in.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-[14px]"
          >
            Sign in
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter a strong password for your account"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">New Password</label>
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
              minLength={8}
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

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">Confirm Password</label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
              <Lock className="size-4" strokeWidth={1.75} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClasses}
              required
            />
          </div>
          {!passwordsMatch && (
            <p className="text-[11px] text-red-500 ml-1">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] py-2 px-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !passwordsMatch || !password}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm text-[14px]"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Reset password
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[13px] text-[var(--text-muted)]">
        Remember your password?{' '}
        <button
          onClick={() => navigate('/login')}
          className="text-[var(--text-primary)] font-medium hover:text-[var(--brand-accent)] transition-colors"
        >
          Sign in
        </button>
      </p>
    </AuthLayout>
  )
}
