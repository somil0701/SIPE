import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface ReviewCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

interface BadgeListProps {
  items?: string[];
  emptyLabel?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
}

export function ReviewCard({ title, icon: Icon, children, className = '', actions }: ReviewCardProps) {
  return (
    <section className={`rounded-xl border bg-card shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

export function BadgeList({ items, emptyLabel = 'None detected', tone = 'default' }: BadgeListProps) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>
          {item}
        </span>
      ))}
    </div>
  )
}
