import Navigation from '../../components/Navigation'

export default function FitnessLayout({
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