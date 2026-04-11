'use client'

import { useState, forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TIPOS
// ============================================================================

interface FormFieldProps {
  label: string
  error?: string
  success?: boolean
  hint?: string
  required?: boolean
}

// ============================================================================
// INPUT COM VALIDAÇÃO
// ============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FormFieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, hint, required, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    
    return (
      <div className="space-y-1.5">
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'input pr-10',
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              success && !error && 'border-emerald-300 focus:ring-emerald-500',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!isPassword && error && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
          )}
          {!isPassword && success && !error && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ============================================================================
// SELECT COM VALIDAÇÃO
// ============================================================================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FormFieldProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={cn(
            'input',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// ============================================================================
// TEXTAREA COM VALIDAÇÃO
// ============================================================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FormFieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          ref={ref}
          className={cn(
            'input min-h-[100px] resize-y',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// ============================================================================
// FORM SECTION
// ============================================================================

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export function FormSection({ title, description, children, icon }: FormSectionProps) {
  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-primary-600">{icon}</span>}
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// FORM ACTIONS (FIXED ON MOBILE)
// ============================================================================

interface FormActionsProps {
  children: React.ReactNode
  sticky?: boolean
}

export function FormActions({ children, sticky = true }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex gap-3 pt-4',
        sticky && 'lg:relative lg:pt-0 fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-40 lg:border-0 lg:bg-transparent lg:p-0'
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// FORM ROW (DUAS COLUNAS)
// ============================================================================

interface FormRowProps {
  children: React.ReactNode
  cols?: 2 | 3 | 4
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  return (
    <div className={cn(
      'grid gap-4',
      cols === 2 && 'grid-cols-1 sm:grid-cols-2',
      cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      cols === 4 && 'grid-cols-2 sm:grid-cols-4',
    )}>
      {children}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Input
