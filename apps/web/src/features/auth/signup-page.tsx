import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Github } from 'lucide-react'
import { useRegister } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { Button, Input, Alert } from '@/components/ui'

export default function SignupPage() {
  const { mutate: performRegister, isPending: isLoading, error: mutationError } = useRegister()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performRegister({ email, password, full_name: fullName })
  }

  const error = mutationError
    ? (mutationError as any).response?.data?.detail || 'Something went wrong. Please try again.'
    : ''

  return (
    <AuthLayout title="Create your account" subtitle="Start building with Fuse today">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          icon={<User className="size-4" strokeWidth={1.75} />}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          icon={<Mail className="size-4" strokeWidth={1.75} />}
          required
        />
        <div className="space-y-1.5">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="size-4" strokeWidth={1.75} />}
            required
          />
          <p className="text-[11px] text-[var(--text-muted)] ml-1 font-[380]">
            Minimum 8 characters with letters &amp; numbers
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Create account
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Or sign up with</span>
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
      </div>

      <Button variant="secondary" size="lg" fullWidth leftIcon={<Github className="size-4" />} className="mt-6">
        GitHub
      </Button>

      <p className="mt-6 text-center text-[12px] text-[var(--text-muted)] leading-relaxed">
        By signing in, you agree to our{' '}
        <a href="#" className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition-colors underline underline-offset-4 decoration-[var(--border-default)]">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition-colors underline underline-offset-4 decoration-[var(--border-default)]">Privacy Policy</a>.
      </p>

      <p className="mt-8 text-center text-[13px] text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--text-primary)] font-medium hover:text-[var(--brand-accent)] transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
