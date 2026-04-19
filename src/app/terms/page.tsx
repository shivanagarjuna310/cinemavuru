// src/app/terms/page.tsx
// Terms of Service page

import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Terms of Service — CinemaVuru',
  description: 'Terms of Service for CinemaVuru — Hyperlocal Short Films from Telangana',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
            <span>›</span>
            <span className="text-[#D4A017]">Terms of Service</span>
          </div>

          <h1 className="text-3xl font-bold text-[#D4A017] mb-2">Terms of Service</h1>
          <p className="text-[#7A6040] text-sm mb-10">Last updated: April 2026</p>

          <div className="space-y-8 text-[#7A6040] leading-relaxed text-sm">

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using CinemaVuru ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. CinemaVuru is operated by its founder and is based in Hyderabad, Telangana, India.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">2. What CinemaVuru Is</h2>
              <p>CinemaVuru is a hyperlocal short film platform for filmmakers from Telangana, India. It allows users to upload, discover, and engage with short films, and to participate in film contests with cash prizes.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">3. User Accounts</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>You must provide accurate information when registering.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must be at least 18 years old to register and participate in paid contests.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">4. Content Upload Rules</h2>
              <p className="mb-3">By uploading a film or any content to CinemaVuru, you confirm that:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>You are the original creator or have full rights to the content.</li>
                <li>The content does not infringe any third-party copyright, trademark, or intellectual property rights.</li>
                <li>The content does not contain hate speech, explicit sexual content, graphic violence, or illegal material.</li>
                <li>The content does not defame or harm any individual or community.</li>
                <li>You grant CinemaVuru a non-exclusive, royalty-free licence to display and promote your content on the Platform.</li>
              </ul>
              <p className="mt-3">All uploaded films are subject to admin review before being published. We reserve the right to reject or remove any content at our discretion.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">5. Contest Rules</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Contest entry fees are non-refundable once payment is confirmed.</li>
                <li>Each filmmaker may submit one film per contest.</li>
                <li>Winners are determined by a combination of public votes and view counts as specified on the contest page.</li>
                <li>Prize money will be transferred to winners via bank transfer within 7 working days of contest closure.</li>
                <li>CinemaVuru reserves the right to disqualify entries that violate content rules or are found to have manipulated votes.</li>
                <li>CinemaVuru reserves the right to cancel or postpone a contest with a full refund of entry fees in exceptional circumstances.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">6. Payments</h2>
              <p>Payments are processed securely via Razorpay. CinemaVuru does not store your card or bank details. All transactions are subject to Razorpay's terms and conditions. Contest entry fees are collected in Indian Rupees (INR).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">7. Intellectual Property</h2>
              <p>All platform design, code, branding, and original content created by CinemaVuru is the property of CinemaVuru. You may not copy, reproduce, or use any part of the Platform without written permission. Filmmaker content remains the property of the respective creators.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">8. Limitation of Liability</h2>
              <p>CinemaVuru is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to loss of data, revenue, or reputation.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">9. Changes to Terms</h2>
              <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms. We will notify users of significant changes via email.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">10. Governing Law</h2>
              <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#FDF6E3] mb-3">11. Contact Us</h2>
              <p>For any questions regarding these Terms, please contact us at:</p>
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
            <Link href="/privacy" className="text-[#7A6040] hover:text-[#D4A017] transition">Privacy Policy</Link>
            <Link href="/" className="text-[#7A6040] hover:text-[#D4A017] transition">← Back to Home</Link>
          </div>

        </div>
      </main>
    </>
  )
}
