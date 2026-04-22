import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description: string
  actions?: ReactNode
  titleClassName?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  titleClassName = 'text-2xl sm:text-3xl',
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
      <div>
        <h2 className={`${titleClassName} font-black text-gray-900`}>{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  )
}
