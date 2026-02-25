export default function TermsPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-[--text-muted] mb-8">Last updated: February 2026</p>

        <div className="prose-custom space-y-8 text-[--text-secondary] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">1. Platform Overview</h2>
            <p>
              Dealbridge (&ldquo;Platform&rdquo;) is a private deal-flow marketplace that connects accredited investors with vetted operators
              and business opportunities. The Platform facilitates introductions and information sharing but does not provide
              investment advice, broker-dealer services, or act as a fiduciary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">2. Eligibility</h2>
            <p>
              By creating an account, you represent that you are at least 18 years old and have the legal capacity to enter
              into binding agreements. Investors must complete identity verification (KYC) and may be required to demonstrate
              accredited investor status before accessing certain deal materials or requesting introductions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">3. User Obligations</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate, current, and complete information during registration and verification.</li>
              <li>Maintain the confidentiality of your account credentials.</li>
              <li>Not share deal materials, documents, or confidential information obtained through the Platform with unauthorized parties.</li>
              <li>Comply with all applicable laws and regulations, including securities laws.</li>
              <li>Not use the Platform for any unlawful, fraudulent, or harmful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">4. Investment Disclaimers</h2>
            <p>
              The Platform does not recommend, endorse, or guarantee any deal, operator, or investment opportunity listed.
              All investment decisions are made solely by the investor. Past performance is not indicative of future results.
              Investments in private deals carry significant risk, including the potential loss of your entire investment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">5. Intellectual Property</h2>
            <p>
              All content, trademarks, and materials on the Platform are owned by or licensed to Dealbridge. You may not
              reproduce, distribute, or create derivative works without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">6. Privacy</h2>
            <p>
              Your use of the Platform is subject to our <a href="/privacy" className="text-teal-400 underline underline-offset-2">Privacy Policy</a>,
              which describes how we collect, use, and protect your personal information, including KYC data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Dealbridge and its affiliates shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the Platform or any investment
              decisions made based on information obtained through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any
              other reason at our sole discretion. Upon termination, your right to access the Platform ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance
              of the revised Terms. We will notify registered users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <span className="text-teal-400">support@dealbridge.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
