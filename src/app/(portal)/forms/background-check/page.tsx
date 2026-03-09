"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Upload,
  FileCheck,
  X,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  backgroundCheckSchema,
  type BackgroundCheckInput,
} from "@/schemas/background-check";
import { FormActions } from "@/components/forms/form-actions";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BackgroundCheckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<BackgroundCheckInput>({
    resolver: zodResolver(backgroundCheckSchema),
  });

  const { debouncedSave } = useAutoSave({
    formType: "background-check",
    getValues: useCallback(() => getValues(), [getValues]),
    enabled: !isCompleted && !isSubmitting,
  });

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/forms/background-check");
        if (res.ok) {
          const data = await res.json();
          if (data.formData) {
            reset(data.formData);
          }
          if (data.receiptFile) {
            setReceiptFile(data.receiptFile);
          }
          if (
            data.status === "COMPLETED" ||
            data.status === "PENDING_REVIEW" ||
            data.status === "APPROVED"
          ) {
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load form:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, [reset]);

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/forms/background-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: getValues(), action: "save_draft" }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setUploadError("Invalid file type. Please upload JPEG, PNG, or PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch(
        "/api/forms/background-check/upload-receipt",
        { method: "POST", body: formData }
      );

      if (res.ok) {
        const data = await res.json();
        setReceiptFile(data.filePath);
      } else {
        const err = await res.json();
        setUploadError(err.error || "Upload failed");
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: BackgroundCheckInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forms/background-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: data, action: "submit" }),
      });
      if (res.ok) {
        window.location.href = "/background-clearance";
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <FileCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">
              Fingerprinting Complete!
            </h2>
            <p className="text-green-700 mt-2">
              Your BCI fingerprinting step has been submitted. Your receipt is on
              file.
            </p>
            {receiptFile && (
              <p className="text-sm text-green-600 mt-2">
                Receipt uploaded: {receiptFile.split("/").pop()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Schedule Fingerprinting (BCI)
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
            <AlertTriangle className="h-3 w-3" />
            URGENT
          </span>
        </div>
        <p className="text-gray-500 mt-1">
          Complete your fingerprinting at the location below, then confirm and upload your receipt.
        </p>
      </div>

      {/* PDF Downloads */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Required Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-blue-700">
            Download and review these documents before your fingerprinting appointment:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="gap-2">
              <a
                href="/forms/Complete_Your_Background_Check__3_.pdf"
                download
              >
                <Download className="h-4 w-4" />
                BCI Instructions (PDF)
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a
                href="/forms/Nurses_Jail_Armor-Web_Check_Form__1_.pdf"
                download
              >
                <Download className="h-4 w-4" />
                Web Check Form (PDF)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-6 border-gray-200">
        <CardHeader>
          <CardTitle className="text-brand-700">
            Fingerprinting Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-accent-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Location</p>
                <p className="text-sm text-gray-600">
                  Franklin County CCW Office
                  <br />
                  57 E. Main St, Columbus OH 43215
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-accent-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Phone</p>
                <p className="text-sm text-gray-600">614-525-5090</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-accent-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Walk-in Hours</p>
                <p className="text-sm text-gray-600">
                  Mon–Fri 7:30 AM – 1:30 PM
                  <br />
                  <span className="text-amber-600">
                    Closed 11:00 – 11:30 AM for lunch
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-accent-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Cost: $35</p>
                <p className="text-sm text-gray-600">
                  Cash or Money Order ONLY
                  <br />
                  Reimbursed on first paycheck if hired
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} onChange={debouncedSave}>
        {/* Confirmation */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="instructionsRead"
                {...register("instructionsRead")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label htmlFor="instructionsRead" className="text-sm text-gray-700">
                I have read and understand the fingerprinting instructions above.
              </label>
            </div>
            {errors.instructionsRead && (
              <p className="text-xs text-red-600">{errors.instructionsRead.message}</p>
            )}

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="fingerprintingCompleted"
                {...register("fingerprintingCompleted")}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <label htmlFor="fingerprintingCompleted" className="text-sm text-gray-700">
                I have completed my fingerprinting appointment.
              </label>
            </div>
            {errors.fingerprintingCompleted && (
              <p className="text-xs text-red-600">{errors.fingerprintingCompleted.message}</p>
            )}

          </CardContent>
        </Card>

        {/* Receipt Upload */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Upload Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {receiptFile ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md border border-green-200">
                <FileCheck className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 flex-1">
                  Receipt uploaded: {receiptFile.split("/").pop()}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReceiptFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-accent-500 mx-auto" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    {uploading
                      ? "Uploading..."
                      : "Click to upload your fingerprinting receipt"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, or PDF — Max 5MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-red-600">{uploadError}</p>
            )}
          </CardContent>
        </Card>

        <FormActions
          onSaveDraft={saveDraft}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
