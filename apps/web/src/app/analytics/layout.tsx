import Navigation from '../../components/Navigation'

export default function AnalyticsLayout({
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