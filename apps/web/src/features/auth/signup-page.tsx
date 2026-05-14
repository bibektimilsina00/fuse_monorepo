import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Github, Loader2, Eye, EyeOff } from 'lucide-react'
import { useRegister } from '@/hooks/auth/use-auth'
import { AuthLayout } from '@/features/auth/components/auth-layout'

export default function SignupPage() {
  const { mutate: performRegister, isPending: isLoading, error: mutationError } = useRegister()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performRegister({ email, password, full_name: fullName })
  }

  const error = mutationError ? (mutationError as any).response?.data?.detail || 'Something went wrong. Please try again.' : ''

  const inputClasses = "w-full bg-[var(--surface-4)] border border-[var(--border-default)] rounded-lg py-2.5 pl-10 pr-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm"

  return (
    <AuthLayout 
      title="Create your account" 
      subtitle="Start building with Fuse today"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">Name</label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
              <User className="size-4" strokeWidth={1.75} />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className={inputClasses}
            />
          </div>
        </div>

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
          <label className="text-[13px] font-bold text-[var(--text-primary)] ml-1">Password</label>
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
          <p className="text-[11px] text-[var(--text-muted)] ml-1 font-[380]">Minimum 8 characters with letters & numbers</p>
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
              Create account
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Or sign up with</span>
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
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--text-primary)] font-medium hover:text-[var(--brand-accent)] transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
