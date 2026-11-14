import { useId } from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({
  title,
  description,
  icon = <Inbox size={28} strokeWidth={1.7} />,
  action,
  secondaryAction,
  className = '',
  ...props
}) {
  const titleId = useId()
  const descriptionId = useId()

  const classes = [
    'flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center',
    'dark:border-slate-700 dark:bg-slate-900/50',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={classes}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...props}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        {icon && (
          <div
            aria-hidden="true"
            className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {icon}
          </div>
        )}

        <h2
          id={titleId}
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>

        {description && (
          <p
            id={descriptionId}
            className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
          >
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </section>
  )
}
