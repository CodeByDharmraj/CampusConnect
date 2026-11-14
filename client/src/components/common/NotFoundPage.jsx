import { PlaceholderPage } from '../../routes/lazyPages.js'

// Lazy page: render inside a <Suspense> boundary (AppRoutes provides one).
export default function NotFoundPage() {
  return (
    <PlaceholderPage
      title="Page not found"
      description="The page you requested does not exist. Return to the dashboard to continue."
    />
  )
}
