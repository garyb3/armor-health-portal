"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

interface PrintableFormProps {
  title: string;
  children: React.ReactNode;
  applicantName: string;
  submittedAt?: string;
}

export function PrintableForm({
  title,
  children,
  applicantName,
  submittedAt,
}: PrintableFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${applicantName.replace(/\s+/g, "_")}.pdf`;
      await html2pdf()
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(formRef.current)
        .save();
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Action buttons */}
      <div className="no-print mb-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print Form
        </Button>
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {downloading ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      {/* Printable content */}
      <div ref={formRef} className="print-form bg-white p-8 rounded-xl border border-gray-200/80 max-w-3xl mx-auto shadow-sm">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold text-brand-700">
            Armor Health of Ohio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Correctional Healthcare Staffing
          </p>
          <h2 className="text-lg font-semibold mt-4">{title}</h2>
        </div>

        {/* Form content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Applicant</p>
              <p className="font-medium">{applicantName}</p>
            </div>
            {submittedAt && (
              <div>
                <p className="text-gray-500">Submitted</p>
                <p className="font-medium">
                  {new Date(submittedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <div className="mt-8">
            <p className="text-sm text-gray-500">Signature:</p>
            <div className="mt-2 border-b border-gray-400 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">
        {value || <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}
