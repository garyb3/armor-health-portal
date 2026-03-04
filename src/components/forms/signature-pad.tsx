"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pen, X } from "lucide-react";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Sacramento&family=Satisfy&display=swap";

const SIGNATURE_STYLES = [
  { fontFamily: "'Dancing Script', cursive", fontWeight: 700 },
  { fontFamily: "'Great Vibes', cursive", fontWeight: 400 },
  { fontFamily: "'Sacramento', cursive", fontWeight: 400 },
  { fontFamily: "'Satisfy', cursive", fontWeight: 400 },
];

interface ESignatureProps {
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (signature: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ESignature({
  label = "Electronic Signature",
  required = false,
  value,
  onChange,
  disabled = false,
  error,
}: ESignatureProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [adopted, setAdopted] = useState(!!value);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  // Load Google Fonts directly to guarantee they render
  useEffect(() => {
    if (document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  const handleAdopt = () => {
    if (!inputValue.trim()) return;
    setAdopted(true);
    setShowPanel(false);
    onChange(inputValue.trim());
  };

  const handleClear = () => {
    setAdopted(false);
    setInputValue("");
    setShowPanel(false);
    onChange("");
  };

  const currentFont = SIGNATURE_STYLES[selectedStyle];

  // ── Signed state ─────────────────────────────────────────────
  if (adopted && value) {
    return (
      <div>
        <Label required={required}>{label}</Label>
        <div className="mt-1 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p
                className="text-3xl leading-snug text-gray-900 truncate"
                style={{
                  fontFamily: currentFont.fontFamily,
                  fontWeight: currentFont.fontWeight,
                }}
              >
                {value}
              </p>
              <div className="border-t border-gray-300 mt-2 pt-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-xs text-green-700 font-medium">
                  Electronically signed
                </span>
              </div>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-xs shrink-0"
              >
                Change
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── "Sign here" tag (yellow DocuSign-style) ──────────────────
  if (!showPanel) {
    return (
      <div>
        <Label required={required}>{label}</Label>
        <div className="mt-1">
          <button
            type="button"
            onClick={() => !disabled && setShowPanel(true)}
            disabled={disabled}
            className={`
              relative flex items-center gap-2.5 pl-4 pr-5 py-3
              bg-[#FFF3CD] border-2 border-[#F5C518] rounded
              hover:bg-[#FFE99A] active:bg-[#FFE066]
              transition-colors cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm
            `}
          >
            {/* Yellow left arrow tab like DocuSign */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[12px] border-t-transparent border-r-[12px] border-r-[#F5C518] border-b-[12px] border-b-transparent" />
            <Pen className="h-4 w-4 text-[#6B5A00]" />
            <span className="text-sm font-bold text-[#6B5A00] tracking-wide">
              SIGN HERE
            </span>
          </button>
          {error && (
            <p className="mt-1.5 text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Signing panel (expanded) ─────────────────────────────────
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="mt-1 rounded-lg border-2 border-[#4C6EF5] bg-white shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#F8F9FA] border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Adopt Your Signature
          </h3>
          <button
            type="button"
            onClick={() => setShowPanel(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name input */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your full legal name"
              autoFocus
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4C6EF5] focus:border-transparent"
            />
          </div>

          {/* Signature style selector */}
          {inputValue.trim() && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Select Signature Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNATURE_STYLES.map((style, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedStyle(idx)}
                      className={`
                        relative p-4 border-2 rounded-lg text-left transition-all
                        ${
                          selectedStyle === idx
                            ? "border-[#4C6EF5] bg-blue-50 ring-1 ring-[#4C6EF5]/30"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      {selectedStyle === idx && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#4C6EF5] flex items-center justify-center">
                          <svg
                            viewBox="0 0 12 12"
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        </div>
                      )}
                      <p
                        className="text-2xl text-gray-900 truncate"
                        style={{
                          fontFamily: style.fontFamily,
                          fontWeight: style.fontWeight,
                        }}
                      >
                        {inputValue}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <p
                  className="text-4xl text-gray-900"
                  style={{
                    fontFamily: currentFont.fontFamily,
                    fontWeight: currentFont.fontWeight,
                  }}
                >
                  {inputValue}
                </p>
                <div className="border-b border-gray-400 mt-1" />
              </div>

              {/* Adopt and Sign button */}
              <Button
                type="button"
                onClick={handleAdopt}
                className="w-full h-11 bg-[#4C6EF5] hover:bg-[#3B5BDB] text-white font-semibold text-sm rounded-md"
              >
                Adopt and Sign
              </Button>
            </>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            By clicking &ldquo;Adopt and Sign&rdquo;, you agree that this
            electronic signature is the legal equivalent of your handwritten
            signature.
          </p>
        </div>
      </div>
    </div>
  );
}

// Keep the old export name for backwards compatibility
export { ESignature as SignaturePad };
