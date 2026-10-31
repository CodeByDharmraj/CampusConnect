import { useState } from 'react'
import { ArrowRight, Check, Plus, Save, Trash2 } from 'lucide-react'
import Button from '../components/Button.jsx'
import Dialog from '../components/Dialog.jsx'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/Card.jsx'

import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'

const buttonVariants = ['primary', 'secondary', 'outline', 'ghost', 'danger']

const badgeVariants = ['success', 'warning', 'danger', 'info', 'secondary']

export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Developer tools
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Design System
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          A central showcase of reusable CampusConnect interface components,
          their variants, sizes, and visual states.
        </p>
      </header>

      <section aria-labelledby="buttons-heading" className="space-y-4">
        <div>
          <h2
            id="buttons-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Buttons
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use buttons for actions that change application state or submit
            information.
          </p>
        </div>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Button variants</CardTitle>
            <CardDescription>
              Five visual styles for different levels of action importance.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5 flex flex-wrap items-center gap-3">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Button sizes</CardTitle>
            <CardDescription>
              Three sizes for different interface contexts.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Button states and icons</CardTitle>
            <CardDescription>
              Loading, disabled, icon, and full-width examples.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5 flex flex-wrap items-center gap-3">
            <Button leftIcon={<Plus size={16} />}>Create</Button>

            <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
              Continue
            </Button>

            <Button variant="outline" leftIcon={<Save size={16} />}>
              Save
            </Button>

            <Button variant="danger" leftIcon={<Trash2 size={16} />}>
              Delete
            </Button>

            <Button isLoading>Saving</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="cards-heading" className="space-y-4">
        <div>
          <h2
            id="cards-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Cards
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use cards to group related information into reusable content
            sections.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Default card</CardTitle>
              <CardDescription>Standard content container.</CardDescription>
            </CardHeader>

            <CardContent className="mt-4">
              This card is suitable for ordinary dashboard content and
              information panels.
            </CardContent>
          </Card>

          <Card variant="elevated" padding="md">
            <CardHeader>
              <CardTitle>Elevated card</CardTitle>
              <CardDescription>Stronger visual separation.</CardDescription>
            </CardHeader>

            <CardContent className="mt-4">
              Use elevation sparingly when a section needs more visual emphasis.
            </CardContent>
          </Card>

          <Card variant="interactive" padding="md">
            <CardHeader>
              <CardTitle>Interactive appearance</CardTitle>
              <CardDescription>
                Hover-responsive visual treatment.
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-4">
              This variant demonstrates hover feedback. It does not make the
              card itself clickable.
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle>Computer Networks</CardTitle>
                  <CardDescription>CSE-301 � Semester 5</CardDescription>
                </div>

                <StatusBadge variant="success">Active</StatusBadge>
              </div>
            </CardHeader>

            <CardContent className="mt-4 space-y-2">
              <p>Faculty: Dr. Sharma</p>
              <p>Enrolled students: 62</p>
            </CardContent>

            <CardFooter className="mt-4 justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Course example
              </span>

              <Button size="sm" variant="outline">
                View course
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section aria-labelledby="badges-heading" className="space-y-4">
        <div>
          <h2
            id="badges-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Status badges
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use badges to communicate the current state of requests, accounts,
            assignments, and other resources.
          </p>
        </div>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Badge variants</CardTitle>
            <CardDescription>
              Five semantic styles for common application statuses.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5 flex flex-wrap items-center gap-3">
            {badgeVariants.map((variant) => (
              <StatusBadge key={variant} variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </StatusBadge>
            ))}
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Badge sizes</CardTitle>
            <CardDescription>
              Small, medium, and large badge examples.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5 flex flex-wrap items-center gap-3">
            <StatusBadge variant="success" size="sm">
              Small
            </StatusBadge>

            <StatusBadge variant="success" size="md">
              Medium
            </StatusBadge>

            <StatusBadge variant="success" size="lg">
              Large
            </StatusBadge>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="dialog-heading" className="space-y-4">
        <div>
          <h2
            id="dialog-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Dialogs
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use dialogs for confirmation, important information, and focused
            interactions.
          </p>
        </div>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Confirmation dialog</CardTitle>
            <CardDescription>
              Demonstrates controlled opening, closing, and accessible dialog
              behavior.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5">
            <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          </CardContent>
        </Card>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirm action"
          description="This is a demonstration of the CampusConnect dialog component."
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>

              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>
            This dialog demonstrates the native HTML dialog element, keyboard
            dismissal, backdrop behavior, and focus management.
          </p>
        </Dialog>
      </section>

      <section aria-labelledby="empty-states-heading" className="space-y-4">
        <div>
          <h2
            id="empty-states-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Empty states
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use empty states when a page has no data to display. Explain why the
            content is missing and provide a useful next action when
            appropriate.
          </p>
        </div>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Default empty state</CardTitle>
            <CardDescription>
              An example for a student who has no assignments yet.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5">
            <EmptyState
              title="No assignments yet"
              description="Your assigned coursework will appear here when your faculty publishes an assignment."
            />
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Empty state with an action</CardTitle>
            <CardDescription>
              Provide an action when the user can resolve the empty state.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5">
            <EmptyState
              title="No courses available"
              description="You haven't been assigned any courses yet. Contact your department coordinator if you think this is unexpected."
              icon={<Plus size={28} />}
              action={
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh page
                </Button>
              }
            />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="theme-heading" className="space-y-4">
        <div>
          <h2
            id="theme-heading"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Theme support
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All components support the existing CampusConnect light and dark
            themes.
          </p>
        </div>

        <Card padding="md">
          <CardContent className="flex flex-wrap items-center gap-3">
            <StatusBadge variant="success">
              <Check size={12} className="mr-1" />
              Theme compatible
            </StatusBadge>

            <Button>Primary action</Button>

            <Button variant="outline">Secondary action</Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        CampusConnect Design System � Development reference
      </footer>
    </div>
  )
}
