type SectionProps = {
  title: string
  children?: React.ReactNode
}

const Section = ({ title, children }: SectionProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">{title}</h2>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  )
}

export default Section
