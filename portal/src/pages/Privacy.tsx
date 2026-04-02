import React from 'react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>Lepidus collects the following information to provide our fuel price comparison service:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><strong>Account information:</strong> Email address and password when you create an account.</li>
              <li><strong>Location data:</strong> Your device location (with your permission) to show nearby fuel stations and sort by distance. Location is used in real-time and is not stored on our servers.</li>
              <li><strong>Usage data:</strong> Anonymous analytics about which stations you view, favourite, or get directions to, used to help station operators understand customer interest.</li>
              <li><strong>Push notification tokens:</strong> Device identifiers for sending price alert notifications, stored only while your account is active.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Display fuel prices and station locations relevant to you.</li>
              <li>Send price alert notifications when fuel prices drop below your set threshold.</li>
              <li>Provide aggregated, anonymised analytics to station operators (e.g., "42 users viewed your station this week").</li>
              <li>Improve our service and fix technical issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><strong>Supabase:</strong> Our database and authentication provider (EU-hosted).</li>
              <li><strong>Stripe:</strong> Payment processing for operator subscriptions (operators only).</li>
              <li><strong>Expo:</strong> Push notification delivery service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Retention</h2>
            <p>Account data is retained while your account is active. You can delete your account at any time by contacting us, and all personal data will be removed within 30 days. Anonymous analytics data is retained indefinitely.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Your Rights (GDPR)</h2>
            <p>As a resident of the European Union, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Access your personal data.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to processing of your data.</li>
              <li>Data portability.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <strong>privacy@lepidus.cy</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
            <p>The Lepidus mobile app does not use cookies. The operator portal uses essential cookies for authentication only — no tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact</h2>
            <p>For privacy-related enquiries, contact us at <strong>privacy@lepidus.cy</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
