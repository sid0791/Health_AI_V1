import Link from 'next/link'
import { 
  HeartIcon, 
  ChartBarIcon, 
  BeakerIcon, 
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'AI-Powered Meal Planning',
    description: 'Personalized nutrition plans based on your health reports, preferences, and goals.',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Health Report Analysis',
    description: 'Upload blood tests and get AI-powered insights with personalized recommendations.',
    icon: BeakerIcon,
  },
  {
    name: 'Fitness Planning',
    description: 'Smart workout plans adapted to your fitness level, goals, and available equipment.',
    icon: HeartIcon,
  },
  {
    name: 'Progress Analytics',
    description: 'Track your journey with detailed analytics and predictive health insights.',
    icon: ChartBarIcon,
  },
  {
    name: 'AI Health Coach',
    description: 'Chat with your personal AI assistant for health questions and meal logging.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: 'Privacy First',
    description: 'Bank-grade security with field-level encryption and GDPR compliance.',
    icon: ShieldCheckIcon,
  },
]

const stats = [
  { name: 'Health reports analyzed', value: '10,000+' },
  { name: 'Personalized meal plans', value: '50,000+' },
  { name: 'User satisfaction', value: '98%' },
  { name: 'Countries supported', value: '15+' },
]

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
              India&apos;s #1 AI Health Coach Platform.{' '}
              <a href="#features" className="font-semibold text-primary-600">
                <span className="absolute inset-0" aria-hidden="true" />
                Learn more <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl font-display">
              Your Personal AI
              <span className="text-primary-600"> Health Coach</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transform your health with AI-powered nutrition, fitness planning, and health report analysis. 
              Get personalized recommendations based on your unique health profile and goals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
              >
                Get Started Free
              </Link>
              <Link href="#demo" className="text-sm font-semibold leading-6 text-gray-900">
                View Demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Everything You Need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-display">
              Complete Health & Wellness Platform
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              From meal planning to fitness coaching, our AI-powered platform provides comprehensive 
              health management tailored to Indian lifestyles with global medical standards.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="bg-primary-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-display">
                Trusted by thousands of users worldwide
              </h2>
              <p className="mt-4 text-lg leading-8 text-gray-600">
                Join our growing community of health-conscious individuals transforming their lives with AI.
              </p>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.name} className="flex flex-col bg-white p-8">
                  <dt className="text-sm font-semibold leading-6 text-gray-600">{stat.name}</dt>
                  <dd className="order-first text-3xl font-bold tracking-tight text-primary-600">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-white">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl font-display">
              Ready to transform your health?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Start your personalized health journey today. Get AI-powered insights, meal plans, 
              and fitness coaching tailored just for you.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                Start Free Trial
              </Link>
              <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white font-display">HealthCoach AI</h3>
                <p className="mt-2 text-sm text-gray-300">
                  Your personal AI health coach for nutrition, fitness, and wellness.
                </p>
              </div>
              <div className="flex space-x-6">
                <GlobeAltIcon className="h-6 w-6 text-gray-400" />
                <DevicePhoneMobileIcon className="h-6 w-6 text-gray-400" />
                <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">Platform</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li><Link href="/dashboard" className="text-sm leading-6 text-gray-300 hover:text-white">Dashboard</Link></li>
                    <li><Link href="/meal-plan" className="text-sm leading-6 text-gray-300 hover:text-white">Meal Planning</Link></li>
                    <li><Link href="/fitness" className="text-sm leading-6 text-gray-300 hover:text-white">Fitness</Link></li>
                    <li><Link href="/analytics" className="text-sm leading-6 text-gray-300 hover:text-white">Analytics</Link></li>
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li><a href="#" className="text-sm leading-6 text-gray-300 hover:text-white">Help Center</a></li>
                    <li><a href="#" className="text-sm leading-6 text-gray-300 hover:text-white">Privacy Policy</a></li>
                    <li><a href="#" className="text-sm leading-6 text-gray-300 hover:text-white">Terms of Service</a></li>
                    <li><a href="#" className="text-sm leading-6 text-gray-300 hover:text-white">Contact</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-gray-700 pt-8">
            <p className="text-xs leading-5 text-gray-400">
              &copy; 2024 HealthCoach AI. All rights reserved. Made with ❤️ for better health.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
