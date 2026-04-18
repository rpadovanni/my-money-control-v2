import { forwardRef } from 'react'

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
    <label className={`form-control w-full ${rootClassName ?? ''}`.trim()}>
      {label ? (
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
      ) : null}

      <select
        ref={ref}
        id={id}
        className={[
          'select select-bordered w-full',
          showError ? 'select-error' : '',
          className ?? '',
          selectClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </select>

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

