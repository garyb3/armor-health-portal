"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Image from "next/image";
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

export default function RegisterPage() {
  const { register: registerUser, loading, error, setError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "APPLICANT" },
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    await registerUser(data);
  };

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
        <CardTitle className="text-2xl font-bold text-gray-900">Create Your Account</CardTitle>
        <CardDescription className="text-gray-500">
          Start your Armor Health onboarding process
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200/60">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName" required>
                First Name
              </Label>
              <Input
                id="firstName"
                placeholder="First name"
                autoComplete="given-name"
                {...register("firstName")}
                error={!!errors.firstName}
                className="mt-1"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" required>
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="Last name"
                autoComplete="family-name"
                {...register("lastName")}
                error={!!errors.lastName}
                className="mt-1"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              {...register("email")}
              error={!!errors.email}
              className="mt-1"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <input type="hidden" {...register("role")} />
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(614) 555-1234"
              autoComplete="tel"
              {...register("phone")}
              error={!!errors.phone}
              className="mt-1"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              {...register("password")}
              error={!!errors.password}
              className="mt-1"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword" required>
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
              className="mt-1"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
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
            <Link
              href="/"
              className="text-accent-500 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
