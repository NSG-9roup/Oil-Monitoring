interface OilDropLoaderProps {
  label?: string
  compact?: boolean
  className?: string
}

export default function OilDropLoader({
  label = 'Loading...',
  compact = false,
  className = '',
}: OilDropLoaderProps) {
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
        <span className="oil-drop-loader" aria-hidden="true">
          <span className="oil-drop-core" />
          <span className="oil-drop-ripple" />
        </span>
        <span>{label}</span>
      </span>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`.trim()}>
      <span className="oil-drop-loader oil-drop-loader-lg" aria-hidden="true">
        <span className="oil-drop-core" />
        <span className="oil-drop-ripple" />
      </span>
      <p className="text-sm font-semibold text-gray-600">{label}</p>
    </div>
  )
}
