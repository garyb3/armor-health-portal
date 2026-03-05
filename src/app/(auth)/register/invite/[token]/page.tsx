"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "@/schemas/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const ROLE_LABELS: Record<string, string> = {
  RECRUITER: "Recruiter",
  ADMIN_ASSISTANT: "Admin Assistant",
  COUNTY_REPRESENTATIVE: "County Representative",
  HR: "HR",
};

export default function InviteRegisterPage() {
  const { token } = useParams<{ token: string }>();
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const { register: registerUser, loading, error, setError } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setInviteError(data.error || "Invalid invite link");
          return;
        }
        setInviteData(data.invite);
        setValue("email", data.invite.email);
        setValue("role", data.invite.role);
      } catch {
        setInviteError("Failed to validate invite");
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token, setValue]);

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    await registerUser({ ...data, inviteToken: token });
  };

  if (validating) {
    return (
      <Card className="w-full max-w-md shadow-xl shadow-gray-200/50 border-gray-200/60">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (inviteError) {
    return (
      <Card className="w-full max-w-md shadow-xl shadow-gray-200/50 border-gray-200/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-5">
            <Image
              src="/armor-health-logo.jpg"
              alt="Armor Health"
              width={220}
              height={66}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Invalid Invite</CardTitle>
          <CardDescription className="text-gray-500">
            This invite link is invalid, expired, or has already been used.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">Back to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl shadow-gray-200/50 border-gray-200/60">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-5">
          <Image
            src="/armor-health-logo.jpg"
            alt="Armor Health"
            width={220}
            height={66}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Staff Registration</CardTitle>
        <CardDescription className="text-gray-500">
          You&apos;ve been invited to join as{" "}
          <span className="font-semibold text-gray-700">
            {ROLE_LABELS[inviteData!.role] || inviteData!.role}
          </span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200/60">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName" required>First Name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                {...register("firstName")}
                error={!!errors.firstName}
                className="mt-1"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" required>Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                {...register("lastName")}
                error={!!errors.lastName}
                className="mt-1"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={inviteData!.email}
              readOnly
              className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <input type="hidden" {...register("email")} />
          </div>
          <div>
            <Label>Role</Label>
            <div className="mt-1 flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
              {ROLE_LABELS[inviteData!.role] || inviteData!.role}
            </div>
            <input type="hidden" {...register("role")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(614) 555-1234"
              {...register("phone")}
              error={!!errors.phone}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" required>Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              {...register("password")}
              error={!!errors.password}
              className="mt-1"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword" required>Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
              className="mt-1"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Account
          </Button>
          <p className="text-sm text-gray-500 text-center">
            Already have an account?{" "}
            <Link href="/" className="text-accent-500 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
