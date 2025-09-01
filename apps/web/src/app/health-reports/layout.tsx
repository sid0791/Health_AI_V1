import Navigation from '../../components/Navigation'

export default function HealthReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Navigation>
      {children}
    </Navigation>
  )
}