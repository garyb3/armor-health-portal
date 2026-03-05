import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function RegistrationCompletePage() {
  return (
    <Card className="w-full max-w-md shadow-xl shadow-gray-200/50 border-gray-200/60">
      <CardContent className="p-8 text-center space-y-6">
        <Image
          src="/armor-health-logo.jpg"
          alt="Armor Health"
          width={180}
          height={60}
          className="mx-auto"
          priority
        />

        <div className="flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Account Created
          </h1>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Your account has been set up successfully. You will receive an email
            with the BCI fingerprinting receipt whenever an applicant completes
            that step. No further action is needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
