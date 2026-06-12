import type { ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

type StateFeedbackProps = {
  title?: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
  bordered?: boolean
}

function StateShell({
  title,
  message,
  icon,
  action,
  bordered = true,
}: StateFeedbackProps) {
  return (
    <div
      className={`text-center py-12 ${bordered ? 'rounded-xl border bg-card px-6' : ''}`}
    >
      {icon && <div className="mx-auto mb-4 flex justify-center">{icon}</div>}
      {title && <p className="font-medium">{title}</p>}
      {message && (
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({
  message = 'Loading...',
  bordered = false,
}: Pick<StateFeedbackProps, 'message' | 'bordered'>) {
  return (
    <StateShell
      message={message}
      bordered={bordered}
      icon={<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Check your connection and try again.',
  action,
  bordered = true,
}: StateFeedbackProps) {
  return (
    <StateShell
      title={title}
      message={message}
      action={action}
      bordered={bordered}
      icon={<AlertCircle className="h-10 w-10 text-destructive" />}
    />
  )
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  bordered = true,
}: StateFeedbackProps) {
  return (
    <StateShell
      title={title}
      message={message}
      icon={icon}
      action={action}
      bordered={bordered}
    />
  )
}
