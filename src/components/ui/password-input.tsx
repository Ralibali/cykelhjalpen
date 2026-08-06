import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface PasswordInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /** Optional icon rendered inside the field, on the left. */
  leftIcon?: React.ReactNode
  /** Extra classes for the wrapper element. */
  wrapperClassName?: string
  showLabel?: string
  hideLabel?: string
}

/**
 * Password field with a show/hide toggle. Toggling only swaps the input type,
 * the value and any validation (required/minLength) stay untouched.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, leftIcon, wrapperClassName, showLabel = 'Visa lösenord', hideLabel = 'Dölj lösenord', ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className={cn('relative', wrapperClassName)}>
        {leftIcon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </span>
        ) : null}
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(leftIcon && 'pl-10', 'pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-xl"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
