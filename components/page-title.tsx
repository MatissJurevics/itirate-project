interface PageTitleProps {
  children: string
}

export function PageTitle({ children }: PageTitleProps) {
  return (
    <div className="px-4 pt-6 pb-2">
      <h1 className="text-5xl font-fancy">
        {children.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())}
      </h1>
      <div className="h-px bg-border mt-2 mb-4" />
    </div>
  )
}
