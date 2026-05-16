import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Github, CheckCircle2 } from 'lucide-react'
import { useLogin, useForgotPassword } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Button, Input, Alert, Modal } from '@/components/ui'

export default function LoginPage() {
  const { mutate: performLogin, isPending: isLoading, error: mutationError } = useLogin()
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performLogin({ email, password })
  }

  const error = mutationError ? (mutationError as any).response?.data?.detail || 'Invalid email or password' : ''

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Fuse account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          icon={<Mail className="size-4" strokeWidth={1.75} />}
          required
        />

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
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="size-4" strokeWidth={1.75} />}
            required
          />
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          rightIcon={<ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />}
          className="group"
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Or continue with</span>
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
      </div>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        leftIcon={<Github className="size-4" />}
        className="mt-6"
      >
        GitHub
      </Button>

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

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </AuthLayout>
  )
}

function ForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const { mutate: submitForgot, isPending: isLoading, isSuccess } = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitForgot({ email })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {isSuccess ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="size-12 bg-[var(--brand-accent)]/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="size-6 text-[var(--brand-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Check your inbox</h2>
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mb-8">
            We&apos;ve sent a password reset link to <span className="text-[var(--text-primary)] font-medium">{email}</span>.
          </p>
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <>
          <Modal.Header
            title="Reset password"
            subtitle="Enter your email address and we'll send you a reset link if your account exists."
          />
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              icon={<Mail className="size-4" strokeWidth={1.75} />}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="size-4" />}
            >
              Send reset link
            </Button>
          </form>
        </>
      )}
    </Modal>
  )
}
