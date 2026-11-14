const cardStyles = {
  default:
    'border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
  elevated:
    'border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900',
  interactive:
    'border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({
  children,
  variant = 'default',
  padding = 'none',
  className = '',
  ...props
}) {
  const classes = [
    'rounded-xl',
    cardStyles[variant] ?? cardStyles.default,
    paddingStyles[padding] ?? paddingStyles.none,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={[
        'text-base font-semibold leading-tight text-slate-900 dark:text-slate-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p
      className={['text-sm text-slate-500 dark:text-slate-400', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div
      className={['text-sm text-slate-700 dark:text-slate-300', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={[
        'flex items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
