import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'children'
> & {
  label?: string
  hint?: string
  error?: string
  rootClassName?: string
  inputClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, rootClassName, inputClassName, id, className, ...props },
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

      <input
        ref={ref}
        id={id}
        className={cn(
          'input w-full',
          showError && 'input-error',
          className,
          inputClassName,
        )}
        {...props}
      />

      {showError || showHint ? (
        <p className={cn('mt-1 text-sm', showError ? 'text-error' : 'text-base-content/60')}>
          {showError ? error : hint}
        </p>
      ) : null}
    </div>
  )
})
