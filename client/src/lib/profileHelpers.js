// Letters shown in an avatar when the user has no photo:
// the first letter of up to two words of their name (or email).
export function getInitials(user) {
  return (user?.name || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
