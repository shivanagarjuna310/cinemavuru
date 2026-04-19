// src/app/privacy/page.tsx
// Privacy Policy page

import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Privacy Policy — CinemaVuru',
  description: 'Privacy Policy for CinemaVuru — Hyperlocal Short Films from Telangana',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
            <span>›</span>
            <span className="text-[#D4A017]">Privacy Policy</span>
          </div>

          <h1 className="text-3xl font-bold text-[#D4A017] mb-2">Privacy Policy</h1>
          <p className="text-[#7A6040] text-sm mb-10">Last updated: April 2026</p>

          <div className="space-y-8 text-[#7A6040] leading-relaxed text-sm">

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">1. Introduction</h2>
              <p>CinemaVuru ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights. By using CinemaVuru, you agree to this policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#FDF6E3] font-semibold mb-1">Account Information</h3>
                  <p>When you register, we collect your name and email address. This is used to create and manage your account.</p>
                </div>
                <div>
                  <h3 className="text-[#FDF6E3] font-semibold mb-1">Film & Content Data</h3>
                  <p>When you upload a film, we store the film title, description, genre, YouTube URL, and associated metadata you provide.</p>
                </div>
                <div>
                  <h3 className="text-[#FDF6E3] font-semibold mb-1">Usage Data</h3>
                  <p>We collect anonymised data on film views (using IP address hashed per day), likes, and comments to power our platform features.</p>
                </div>
                <div>
                  <h3 className="text-[#FDF6E3] font-semibold mb-1">Payment Data</h3>
                  <p>Contest entry payments are processed by Razorpay. We do not store your card or bank details. We only store the Razorpay payment reference ID to confirm your entry.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>To create and manage your account</li>
                <li>To publish and display your films on the Platform</li>
                <li>To process contest entries and prize payments</li>
                <li>To send transactional emails (film approval, contest updates)</li>
                <li>To improve and maintain the Platform</li>
                <li>To prevent fraud and ensure platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">4. Data Storage & Security</h2>
              <p>Your data is stored securely on Supabase (PostgreSQL), hosted on servers in Singapore. We use industry-standard encryption for data in transit (HTTPS) and at rest. Authentication is handled by Supabase Auth with secure token management.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">5. Third-Party Services</h2>
              <p className="mb-3">We use the following third-party services that may process your data:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><span className="text-[#FDF6E3]">Supabase</span> — database and authentication</li>
                <li><span className="text-[#FDF6E3]">Razorpay</span> — payment processing</li>
                <li><span className="text-[#FDF6E3]">Resend</span> — transactional email delivery</li>
                <li><span className="text-[#FDF6E3]">Vercel</span> — website hosting</li>
                <li><span className="text-[#FDF6E3]">YouTube</span> — video embedding (videos hosted on YouTube are subject to Google's privacy policy)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">6. Cookies</h2>
              <p>We use essential cookies and local storage to maintain your login session. We do not use advertising or tracking cookies. We do not use Google Analytics or any third-party analytics that track you across websites.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">7. Your Rights</h2>
              <p className="mb-3">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Withdraw consent for email communications at any time</li>
              </ul>
              <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:shivanagarjuna777@gmail.com" className="text-[#D4A017] hover:underline">shivanagarjuna777@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">8. Data Retention</h2>
              <p>We retain your account data for as long as your account is active. If you delete your account, your personal data will be removed within 30 days. Film content may be retained for archival purposes unless you request its removal.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">9. Children's Privacy</h2>
              <p>CinemaVuru is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">11. Contact Us</h2>
              <p>For any privacy-related queries or requests, please contact:</p>
              <p className="mt-2">
                <a href="mailto:shivanagarjuna777@gmail.com"
                  className="text-[#D4A017] hover:underline">
                  shivanagarjuna777@gmail.com
                </a>
              </p>
            </section>

          </div>

          {/* Footer links */}
          <div className="mt-12 pt-8 border-t border-[#2E2010] flex gap-6 text-sm">
            <Link href="/terms" className="text-[#7A6040] hover:text-[#D4A017] transition">Terms of Service</Link>
            <Link href="/" className="text-[#7A6040] hover:text-[#D4A017] transition">← Back to Home</Link>
          </div>

        </div>
      </main>
    </>
  )
}
