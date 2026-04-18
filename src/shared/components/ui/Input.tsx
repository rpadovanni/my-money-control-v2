import { forwardRef } from 'react'

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
    <label className={`form-control w-full ${rootClassName ?? ''}`.trim()}>
      {label ? (
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
      ) : null}

      <input
        ref={ref}
        id={id}
        className={[
          'input input-bordered w-full',
          showError ? 'input-error' : '',
          className ?? '',
          inputClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

      {showError || showHint ? (
        <div className="label">
          <span className={`label-text-alt ${showError ? 'text-error' : 'opacity-70'}`.trim()}>
            {showError ? error : hint}
          </span>
        </div>
      ) : null}
    </label>
  )
})

