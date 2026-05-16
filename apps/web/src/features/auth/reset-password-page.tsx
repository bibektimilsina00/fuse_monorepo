import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { useResetPassword } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Button, Input, Alert } from '@/components/ui'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const { mutate: performReset, isPending: isLoading, isSuccess, error: mutationError } = useResetPassword()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || password !== confirmPassword) return
    performReset({ token, new_password: password })
  }

  const error = mutationError
    ? (mutationError as any).response?.data?.detail || 'Failed to reset password. The link may be expired.'
    : ''
  const passwordsMatch = password && confirmPassword ? password === confirmPassword : true

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="This password reset link is invalid or missing a token.">
        <div className="flex flex-col items-center text-center py-4">
          <XCircle className="size-12 text-red-500 mb-6 opacity-20" />
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
            Please request a new password reset link from the login page.
          </p>
          <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/login')}>
            Back to login
          </Button>
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
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter a strong password for your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock className="size-4" strokeWidth={1.75} />}
          required
          minLength={8}
        />
        <div className="space-y-1.5">
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="size-4" strokeWidth={1.75} />}
            required
          />
          {!passwordsMatch && (
            <p className="text-[11px] text-red-500 ml-1">Passwords do not match</p>
          )}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          disabled={!passwordsMatch || !password}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Reset password
        </Button>
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
