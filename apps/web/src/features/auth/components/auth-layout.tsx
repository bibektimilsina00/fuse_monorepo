import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg)] relative overflow-hidden">
      {/* Very Subtle Background Accents to match dashboard's depth */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-[var(--brand-accent)]/5 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-[520px] z-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <svg width="32" height="32" viewBox="0 0 22 22" fill="none" className="text-[var(--brand-accent)]">
              <path d="M10.68 9.25C10.68 11.91 9.61 14.28 7.74 15.98C5.87 17.68 3.33 18.63 0.68 18.63H0.23V0H0.68C3.33 0 5.87 0.95 7.74 2.65C9.61 4.35 10.68 6.72 10.68 9.38" fill="currentColor" />
              <rect x="13.1" y="12.8" width="6.3" height="6.3" rx="1.5" fill="currentColor" />
            </svg>
            <span className="text-2xl font-bold tracking-[-0.04em] font-season text-[var(--text-primary)]">Fuse</span>
          </div>
          
          <h1 className="text-[28px] font-[430] font-season text-[var(--text-primary)] tracking-[-0.02em] text-center">
            {title}
          </h1>
          <p className="text-[var(--text-muted)] text-[14px] mt-1.5 font-[380] text-center">
            {subtitle}
          </p>
        </div>

        <div className="bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[12px] p-8 shadow-card relative overflow-hidden">
          {/* Subtle top light effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
