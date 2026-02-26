"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Clock, Check, Upload } from "lucide-react";

type KycData = {
  kyc_status: string;
  submission: {
    id: string;
    status: string;
    rejection_reason?: string;
    full_legal_name?: string;
    date_of_birth?: string;
    nationality?: string;
    created_at?: string;
    expires_at?: string;
  } | null;
};

const STEPS = [
  { label: "Personal Info", key: "personal" },
  { label: "Identity Document", key: "identity" },
  { label: "Source of Funds", key: "funds" },
  { label: "Review & Declaration", key: "declaration" },
];

export default function KycPage() {
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state - Step 1
  const [fullLegalName, setFullLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [taxIdType, setTaxIdType] = useState("");
  const [taxId, setTaxId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Step 2
  const [idDocumentType, setIdDocumentType] = useState("passport");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  // Step 3
  const [sourceOfFunds, setSourceOfFunds] = useState("employment");
  const [sourceDetails, setSourceDetails] = useState("");
  const [expectedRange, setExpectedRange] = useState("");

  // Step 4
  const [pepStatus, setPepStatus] = useState(false);
  const [pepDetails, setPepDetails] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [declarationSigned, setDeclarationSigned] = useState(false);

  useEffect(() => {
    fetch("/api/kyc")
      .then(async (r) => {
        if (!r.ok) {
          setLoading(false);
          return;
        }
        const d = await r.json();
        setKycData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append("full_legal_name", fullLegalName);
    formData.append("date_of_birth", dateOfBirth);
    formData.append("nationality", nationality);
    formData.append("tax_id_type", taxIdType);
    formData.append("tax_id", taxId);
    formData.append("address_line1", addressLine1);
    formData.append("address_line2", addressLine2);
    formData.append("city", city);
    formData.append("state_province", stateProvince);
    formData.append("postal_code", postalCode);
    formData.append("country", country);
    formData.append("id_document_type", idDocumentType);
    if (idDocument) formData.append("id_document", idDocument);
    if (selfie) formData.append("selfie", selfie);
    formData.append("source_of_funds", sourceOfFunds);
    formData.append("source_details", sourceDetails);
    formData.append("expected_investment_range", expectedRange);
    formData.append("pep_status", String(pepStatus));
    formData.append("pep_details", pepDetails);
    formData.append("terms_accepted", String(termsAccepted));
    formData.append("declaration_signed", String(declarationSigned));

    try {
      const res = await fetch("/api/kyc", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Submission failed");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  const canAdvanceStep = (s: number) => {
    switch (s) {
      case 0:
        return !!(fullLegalName && dateOfBirth && nationality && addressLine1 && city && stateProvince && postalCode && country);
      case 1:
        return !!(idDocumentType && idDocument);
      case 2:
        return !!sourceOfFunds;
      case 3:
        return termsAccepted && declarationSigned;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="text-[--text-muted]">Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-teal-500/10 text-teal-400 mb-6">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3">KYC Submitted</h1>
          <p className="text-[--text-secondary]">
            Your KYC documents have been submitted. Our compliance team will review your submission and you&apos;ll be notified once it&apos;s complete.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-6 rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Show status if pending/approved
  if (kycData?.kyc_status === "pending") {
    return (
      <div className="px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-400 mb-6">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3">KYC Under Review</h1>
          <p className="text-[--text-secondary]">
            Your KYC submission is being reviewed by our compliance team. You&apos;ll receive an email once the review is complete.
          </p>
          {kycData.submission?.created_at && (
            <p className="text-sm text-[--text-muted] mt-3">
              Submitted {new Date(kycData.submission.created_at).toLocaleDateString()}
            </p>
          )}
          <a
            href="/dashboard"
            className="inline-block mt-6 text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (kycData?.kyc_status === "approved") {
    return (
      <div className="px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-6">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3">KYC Approved</h1>
          <p className="text-[--text-secondary]">
            Your identity has been verified. You have full access to all deals on the platform.
          </p>
          {kycData.submission?.expires_at && (
            <p className="text-sm text-[--text-muted] mt-3">
              Expires {new Date(kycData.submission.expires_at).toLocaleDateString()}
            </p>
          )}
          <a
            href="/deals"
            className="inline-block mt-6 rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all"
          >
            Browse Deals
          </a>
        </div>
      </div>
    );
  }

  // Show rejection reason if rejected
  const showRejection = kycData?.kyc_status === "rejected" && kycData.submission?.rejection_reason;

  const inputCls =
    "mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]";
  const selectCls =
    "mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 text-[--text-primary] focus:border-teal-500 outline-none";

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">KYC Verification</h1>
          <p className="text-[--text-secondary] mt-2">
            Complete your identity verification to access all deals on the platform.
          </p>
        </div>

        {showRejection && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 mb-6">
            <div className="flex items-start gap-3">
              <ShieldX className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-400">Previous submission rejected</div>
                <div className="text-sm text-[--text-secondary] mt-1">
                  {kycData?.submission?.rejection_reason}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className="h-px w-4 bg-[--border]" />}
              <button
                type="button"
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                className={[
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  i < step
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 cursor-pointer"
                    : i === step
                    ? "bg-[--bg-elevated] text-[--text-primary] border border-[--border]"
                    : "bg-[--bg-elevated] text-[--text-muted] border border-[--border] cursor-default",
                ].join(" ")}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-[--bg-error] border border-[--border-error] px-4 py-3 text-sm text-[--text-error] mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 0 && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-teal-400" />
              Personal Information
            </h2>

            <div>
              <label className="text-sm text-[--text-secondary]">Full legal name *</label>
              <input type="text" required value={fullLegalName} onChange={(e) => setFullLegalName(e.target.value)} className={inputCls} placeholder="As it appears on your ID" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[--text-secondary]">Date of birth *</label>
                <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-[--text-secondary]">Nationality *</label>
                <input type="text" required value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls} placeholder="e.g. United States" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[--text-secondary]">Tax ID type</label>
                <select value={taxIdType} onChange={(e) => setTaxIdType(e.target.value)} className={selectCls}>
                  <option value="">None</option>
                  <option value="ssn">SSN</option>
                  <option value="ein">EIN</option>
                  <option value="itin">ITIN</option>
                  <option value="passport">Passport Number</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[--text-secondary]">Tax ID number</label>
                <input type="password" value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputCls} placeholder="Will be encrypted" />
              </div>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Address line 1 *</label>
              <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} placeholder="Street address" />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Address line 2</label>
              <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} placeholder="Apt, suite, unit (optional)" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-[--text-secondary]">City *</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-[--text-secondary]">State/Province *</label>
                <input type="text" required value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-[--text-secondary]">Postal code *</label>
                <input type="text" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-sm text-[--text-secondary]">Country *</label>
                <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="e.g. US" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Identity Document */}
        {step === 1 && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-400" />
              Identity Document
            </h2>

            <div>
              <label className="text-sm text-[--text-secondary]">Document type *</label>
              <select value={idDocumentType} onChange={(e) => setIdDocumentType(e.target.value)} className={selectCls}>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="national_id">National ID Card</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Upload ID document *</label>
              <div className="mt-2">
                <label className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[--border] hover:border-teal-500/50 p-8 cursor-pointer transition-all">
                  <Upload className="h-5 w-5 text-[--text-muted]" />
                  <span className="text-sm text-[--text-secondary]">
                    {idDocument ? idDocument.name : "Click to upload (PDF, JPG, PNG)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Selfie (optional)</label>
              <p className="text-xs text-[--text-muted] mt-1">A photo of yourself holding your ID document for liveness verification.</p>
              <div className="mt-2">
                <label className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[--border] hover:border-teal-500/50 p-6 cursor-pointer transition-all">
                  <Upload className="h-5 w-5 text-[--text-muted]" />
                  <span className="text-sm text-[--text-secondary]">
                    {selfie ? selfie.name : "Click to upload (optional)"}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Source of Funds */}
        {step === 2 && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Source of Funds</h2>

            <div>
              <label className="text-sm text-[--text-secondary]">Primary source of investment funds *</label>
              <select value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)} className={selectCls}>
                <option value="employment">Employment / Salary</option>
                <option value="business">Business Income</option>
                <option value="investments">Investment Returns</option>
                <option value="inheritance">Inheritance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Additional details</label>
              <textarea
                value={sourceDetails}
                onChange={(e) => setSourceDetails(e.target.value)}
                className={inputCls + " min-h-[100px] resize-y"}
                placeholder="Describe the source of your investment funds (optional)"
              />
            </div>

            <div>
              <label className="text-sm text-[--text-secondary]">Expected investment range</label>
              <select value={expectedRange} onChange={(e) => setExpectedRange(e.target.value)} className={selectCls}>
                <option value="">Select range</option>
                <option value="<50k">Less than $50K</option>
                <option value="50-100k">$50K - $100K</option>
                <option value="100-500k">$100K - $500K</option>
                <option value="500k-1m">$500K - $1M</option>
                <option value="1m+">$1M+</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Review & Declaration */}
        {step === 3 && (
          <div className="bg-[--bg-card] border border-[--border] rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-semibold">Review & Declaration</h2>

            {/* Summary */}
            <div className="rounded-xl border border-[--border] bg-[--bg-input] p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Name</span>
                <span>{fullLegalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Date of Birth</span>
                <span>{dateOfBirth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Nationality</span>
                <span>{nationality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Address</span>
                <span className="text-right">{addressLine1}, {city}, {stateProvince} {postalCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">ID Document</span>
                <span>{idDocumentType.replace("_", " ")} — {idDocument?.name ?? "uploaded"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Source of Funds</span>
                <span>{sourceOfFunds}</span>
              </div>
            </div>

            {/* PEP */}
            <div className="rounded-xl border border-[--border] bg-[--bg-input] p-4">
              <label className="flex items-start gap-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={pepStatus}
                  onChange={(e) => setPepStatus(e.target.checked)}
                  className="h-4 w-4 accent-teal-500 mt-1"
                />
                <div>
                  <span className="text-sm font-medium">Politically Exposed Person (PEP)</span>
                  <p className="text-xs text-[--text-muted] mt-1">
                    Are you, or any of your immediate family members, a current or former senior political figure, senior government official, or senior executive of a state-owned enterprise?
                  </p>
                </div>
              </label>
              {pepStatus && (
                <div className="mt-3 ml-7">
                  <textarea
                    value={pepDetails}
                    onChange={(e) => setPepDetails(e.target.value)}
                    className={inputCls + " min-h-[80px] resize-y"}
                    placeholder="Please provide details about the PEP relationship"
                  />
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 accent-teal-500 mt-1"
                />
                <span className="text-sm">
                  I have read and agree to the{" "}
                  <a href="/terms" target="_blank" className="text-teal-400 underline underline-offset-2">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-teal-400 underline underline-offset-2">Privacy Policy</a>.
                </span>
              </label>

              <label className="flex items-start gap-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationSigned}
                  onChange={(e) => setDeclarationSigned(e.target.checked)}
                  className="h-4 w-4 accent-teal-500 mt-1"
                />
                <span className="text-sm">
                  I declare that all the information provided is true and accurate to the best of my knowledge. I understand that providing false or misleading information may result in the rejection of my application and/or legal consequences.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => {
              if (step > 0) setStep(step - 1);
            }}
            className={[
              "text-sm font-medium transition-all",
              step > 0
                ? "text-[--text-muted] hover:text-[--text-primary] underline underline-offset-4"
                : "invisible",
            ].join(" ")}
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvanceStep(step)}
              className="rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvanceStep(step) || submitting}
              className="rounded-xl bg-teal-500 text-white px-6 py-3 font-semibold hover:bg-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit KYC"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
