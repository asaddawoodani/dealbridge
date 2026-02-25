export default function DisclaimerPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Investment Disclaimer</h1>
        <p className="text-sm text-[--text-muted] mb-8">Last updated: February 2026</p>

        <div className="prose-custom space-y-8 text-[--text-secondary] text-sm leading-relaxed">
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-6">
            <p className="text-amber-200 font-medium">
              DealBridge is not a registered broker-dealer, investment adviser, or funding portal. The Platform does not
              provide investment advice, recommendations, or endorsements of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">Not Investment Advice</h2>
            <p>
              Nothing on the DealBridge platform constitutes investment advice, financial advice, trading advice,
              or any other sort of advice. You should not treat any of the platform&apos;s content as such. DealBridge
              does not recommend that any investment be bought, sold, or held by you. You should conduct your own
              due diligence and consult with a qualified financial professional before making any investment decision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">Risk Warning</h2>
            <p>Investing in private deals and alternative investments involves substantial risk, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-[--text-primary]">Loss of capital:</strong> You may lose some or all of your invested capital.</li>
              <li><strong className="text-[--text-primary]">Illiquidity:</strong> Private investments are typically illiquid. There may be no secondary market for your investment, and you may be unable to sell your position for an extended period.</li>
              <li><strong className="text-[--text-primary]">Lack of information:</strong> Private companies are not subject to the same reporting requirements as publicly traded companies. Information may be limited, incomplete, or unaudited.</li>
              <li><strong className="text-[--text-primary]">Dilution:</strong> Future funding rounds may dilute your ownership percentage.</li>
              <li><strong className="text-[--text-primary]">Concentration risk:</strong> Individual private investments represent concentrated exposure to a single business or asset.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">No Guarantees</h2>
            <p>
              DealBridge makes no representations or warranties about the accuracy, completeness, or reliability of
              any information provided by operators or listed on the Platform. Deal listings, financial projections,
              and operator claims have not been independently verified by DealBridge unless explicitly stated.
              Past performance of any deal, operator, or investment strategy is not indicative of future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">Regulatory Notice</h2>
            <p>
              Securities offered through the Platform have not been registered under the Securities Act of 1933
              or any state securities laws. They are offered pursuant to exemptions from registration. These securities
              may only be offered to persons who are &ldquo;accredited investors&rdquo; as defined in Rule 501(a) of
              Regulation D under the Securities Act.
            </p>
            <p className="mt-3">
              DealBridge performs KYC (Know Your Customer) and identity verification as part of its compliance
              obligations. However, KYC verification does not constitute an endorsement of any investor&apos;s
              financial suitability for any particular investment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-3">Your Responsibility</h2>
            <p>
              By using the Platform, you acknowledge that you are solely responsible for evaluating the merits
              and risks of any investment. You should perform your own due diligence, including reviewing all
              available documents, consulting with your own legal and financial advisors, and verifying all
              information independently before committing capital.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
