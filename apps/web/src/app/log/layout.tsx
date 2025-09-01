import Navigation from '../../components/Navigation'

export default function LogLayout({
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