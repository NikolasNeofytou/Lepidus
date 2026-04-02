import React from 'react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Service Description</h2>
            <p>Lepidus is a fuel price comparison platform for Cyprus. We aggregate publicly available fuel price data published by the Cyprus Ministry of Energy, Commerce and Industry via the Ariadni system, and display it in a user-friendly mobile application and operator portal.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Accuracy of Prices</h2>
            <p>Fuel prices shown in Lepidus are sourced from official government data and updated daily. However, we cannot guarantee that prices are accurate at the time of your visit to a station. Prices may change between updates. Lepidus is not responsible for discrepancies between displayed prices and actual pump prices.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You must provide a valid email address to create an account.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You may browse fuel prices without creating an account.</li>
              <li>We reserve the right to suspend accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Operator Accounts</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Station operators may claim their stations and post promotional deals.</li>
              <li>Operators are responsible for the accuracy of promotions they post.</li>
              <li>Misleading or fraudulent promotions will result in account suspension.</li>
              <li>Operators may not claim stations they do not own or operate.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Subscriptions</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>The Pro plan is billed monthly via Stripe.</li>
              <li>You may cancel your subscription at any time. Access continues until the end of the billing period.</li>
              <li>No refunds are provided for partial billing periods.</li>
              <li>We reserve the right to change pricing with 30 days notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Prohibited Use</h2>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Scrape, crawl, or systematically download data from Lepidus.</li>
              <li>Attempt to manipulate prices, analytics, or station data.</li>
              <li>Impersonate other users or station operators.</li>
              <li>Use the service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>Lepidus is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to decisions made based on displayed fuel prices.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Governing Law</h2>
            <p>These terms are governed by the laws of the Republic of Cyprus. Any disputes shall be resolved in the courts of Nicosia, Cyprus.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
            <p>For questions about these terms, contact us at <strong>legal@lepidus.cy</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
