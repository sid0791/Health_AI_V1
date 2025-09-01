import Navigation from '../../components/Navigation'

export default function MealPlanLayout({
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