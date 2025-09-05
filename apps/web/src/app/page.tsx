import Link from 'next/link'
import { 
  HeartIcon, 
  ChartBarIcon, 
  BeakerIcon, 
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  FireIcon,
  TrophyIcon,
  SparklesIcon
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
      <div className="relative isolate px-6 pt-14 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        {/* Hero background pattern */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-400 to-secondary-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-4xl py-32 sm:py-48 lg:py-56">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              <div className="hidden sm:mb-8 sm:flex sm:justify-center lg:justify-start">
                <div className="relative rounded-full px-4 py-2 text-sm leading-6 text-primary-700 ring-1 ring-primary-200 hover:ring-primary-300 bg-primary-50">
                  🏆 India&apos;s #1 AI Health Coach Platform.{' '}
                  <a href="#features" className="font-semibold text-primary-600">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Learn more <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl font-display mb-6">
                Your Personal AI
                <span className="text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text"> Health Coach</span>
              </h1>
              <p className="text-lg leading-8 text-gray-600 mb-8">
                Transform your health with AI-powered nutrition, fitness planning, and health report analysis. 
                Get personalized recommendations based on your unique health profile and goals.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-8 py-4 text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 focus:ring-primary-500 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <SparklesIcon className="h-6 w-6 mr-2" />
                  Get Started Free
                </Link>
                <Link href="#demo" className="w-full sm:w-auto inline-flex items-center justify-center text-lg font-semibold leading-6 text-gray-700 hover:text-primary-600 transition-colors duration-200">
                  View Demo <span aria-hidden="true" className="ml-2">→</span>
                </Link>
              </div>
              
              {/* Key features badges */}
              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <HeartIcon className="h-4 w-4 mr-1" />
                  AI-Powered
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  Privacy First
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <GlobeAltIcon className="h-4 w-4 mr-1" />
                  India-Focused
                </span>
              </div>
            </div>
            
            {/* Right side - Hero Image/Dashboard Preview */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Mock dashboard preview */}
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 bg-white/30 rounded-full"></div>
                    <div className="h-3 w-3 bg-white/30 rounded-full"></div>
                    <div className="h-3 w-3 bg-white/30 rounded-full"></div>
                    <div className="ml-auto text-white text-sm font-medium">HealthCoach AI</div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-12 w-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">👋</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Good morning, Alex!</div>
                      <div className="text-sm text-gray-600">Ready for today&apos;s health goals?</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <FireIcon className="h-5 w-5 text-orange-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">1,847 cal</div>
                          <div className="text-xs text-gray-600">Daily Goal</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <BeakerIcon className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">6.2L</div>
                          <div className="text-xs text-gray-600">Water Intake</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Breakfast planned</span>
                      </div>
                      <span className="text-xs text-gray-500">8:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        <span className="text-sm font-medium">Workout reminder</span>
                      </div>
                      <span className="text-xs text-gray-500">6:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating stats */}
              <div className="absolute -top-6 -left-6 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">78%</div>
                    <div className="text-xs text-gray-600">Goal Progress</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">AI Coach</div>
                    <div className="text-xs text-gray-600">Always Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-secondary-400 to-primary-400 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      {/* Features section */}
      <div id="features" className="py-24 sm:py-32 bg-gray-50">
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
              {features.map((feature, index) => (
                <div key={feature.name} className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 mb-4">
                    <div className={`h-12 w-12 flex-none rounded-xl flex items-center justify-center ${
                      index % 3 === 0 ? 'bg-primary-100' : 
                      index % 3 === 1 ? 'bg-secondary-100' : 'bg-green-100'
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        index % 3 === 0 ? 'text-primary-600' : 
                        index % 3 === 1 ? 'text-secondary-600' : 'text-green-600'
                      }`} aria-hidden="true" />
                    </div>
                    <span>{feature.name}</span>
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                    <p className="mt-6">
                      <Link href={`/${feature.name.toLowerCase().replace(/\s+/g, '-').replace('ai-', '').replace('-powered', '').replace('-planning', '')}`} 
                            className="text-sm font-semibold leading-6 text-primary-600 hover:text-primary-700">
                        Learn more <span aria-hidden="true">→</span>
                      </Link>
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-display">
                Trusted by thousands of users worldwide
              </h2>
              <p className="mt-4 text-lg leading-8 text-primary-100">
                Join our growing community of health-conscious individuals transforming their lives with AI.
              </p>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.name} className="flex flex-col bg-white/10 backdrop-blur-sm p-8 border border-white/20">
                  <dt className="text-sm font-semibold leading-6 text-primary-100">{stat.name}</dt>
                  <dd className="order-first text-3xl font-bold tracking-tight text-white">
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
