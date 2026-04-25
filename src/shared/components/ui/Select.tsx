import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'children'
> & {
  label?: string
  hint?: string
  error?: string
  rootClassName?: string
  selectClassName?: string
  children: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, rootClassName, selectClassName, id, className, children, ...props },
  ref,
) {
  const showError = Boolean(error)
  const showHint = Boolean(hint) && !showError

  return (
    <div className={cn('w-full', rootClassName)}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-base-content/80"
        >
          {label}
        </label>
      ) : null}

      <select
        ref={ref}
        id={id}
        className={cn(
          'select w-full',
          showError && 'select-error',
          className,
          selectClassName,
        )}
        {...props}
      >
        {children}
      </select>

      {showError || showHint ? (
        <p className={cn('mt-1 text-sm', showError ? 'text-error' : 'text-base-content/60')}>
          {showError ? error : hint}
        </p>
      ) : null}
    </div>
  )
})
