const variantStyles = {
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  secondary:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function StatusBadge({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) {
  const classes = [
    'inline-flex items-center rounded-full font-medium',
    variantStyles[variant] ?? variantStyles.secondary,
    sizeStyles[size] ?? sizeStyles.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
