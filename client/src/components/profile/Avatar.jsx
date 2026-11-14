import { getInitials } from '../../lib/profileHelpers.js'

const sizeStyles = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
}

// A round profile picture, or the user's initials when there is no photo.
// Decorative: surrounding text always names the person.
export default function Avatar({ user, photoUrl, size = 'md', className = '' }) {
  const sizing = sizeStyles[size] ?? sizeStyles.md

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizing} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 ${className}`.trim()}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`flex ${sizing} shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 ${className}`.trim()}
    >
      {getInitials(user)}
    </span>
  )
}
