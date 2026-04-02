"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Save, Send, ArrowLeft, Loader2 } from "lucide-react";

interface FormActionsProps {
  onSaveDraft: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  isCompleted?: boolean;
}

export function FormActions({
  onSaveDraft,
  isSaving = false,
  isSubmitting = false,
  isCompleted = false,
}: FormActionsProps) {
  return (
    <div className="no-print flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-gray-100 mt-8">
      <Link href="/background-clearance">
        <Button variant="ghost" type="button">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Overview
        </Button>
      </Link>
      <div className="flex-1" />
      {!isCompleted && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Draft
          </Button>
          <Button type="submit" disabled={isSubmitting || isSaving}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Submit
          </Button>
        </>
      )}
    </div>
  );
}
