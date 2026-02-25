export default function PrivacyPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[--text-muted] mb-8">Last updated: February 2026</p>

        <div className="prose-custom space-y-8 text-[--text-secondary] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">1. Data We Collect</h2>
            <p>We collect the following categories of personal information:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-[--text-primary]">Account Information:</strong> Name, email address, password, and role (investor or operator).</li>
              <li><strong className="text-[--text-primary]">Verification Data:</strong> Legal name, phone number, accreditation type, business details (for operators).</li>
              <li><strong className="text-[--text-primary]">KYC Data:</strong> Date of birth, nationality, tax identification numbers (stored as hashed values), address, government-issued ID documents, selfie images, source of funds information, and PEP status.</li>
              <li><strong className="text-[--text-primary]">Usage Data:</strong> Pages visited, deals viewed, introductions requested, messages sent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">2. KYC Data Handling</h2>
            <p>
              KYC data is collected for regulatory compliance purposes. We take special care to protect this sensitive information:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Tax identification numbers (SSN, EIN, ITIN) are hashed using SHA-256 before storage. The raw values are never stored.</li>
              <li>Identity documents are stored in encrypted storage buckets with restricted access.</li>
              <li>KYC data is accessible only to authorized compliance personnel.</li>
              <li>KYC approvals expire after one year, after which re-verification may be required.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To create and manage your account.</li>
              <li>To verify your identity and accreditation status.</li>
              <li>To facilitate introductions between investors and operators.</li>
              <li>To comply with anti-money laundering (AML) and know-your-customer (KYC) regulations.</li>
              <li>To send transactional emails (verification updates, deal alerts, messages).</li>
              <li>To improve the Platform and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">4. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services.
              KYC records and identity verification documents are retained for a minimum of 5 years after account closure,
              as required by applicable anti-money laundering regulations. You may request deletion of non-regulated data
              by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">5. Third-Party Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-[--text-primary]">Service Providers:</strong> Email delivery (Resend), hosting (Vercel), database (Supabase), and file storage services that help us operate the Platform.</li>
              <li><strong className="text-[--text-primary]">Regulatory Authorities:</strong> When required by law, regulation, or legal process.</li>
              <li><strong className="text-[--text-primary]">Operators:</strong> Limited contact information shared only when you request an introduction to a specific deal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data (subject to legal retention requirements).</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Data portability where technically feasible.</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <span className="text-teal-400">privacy@dealbridge.com</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS),
              encryption at rest, access controls, and regular security reviews. However, no method of
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">8. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at{" "}
              <span className="text-teal-400">privacy@dealbridge.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
