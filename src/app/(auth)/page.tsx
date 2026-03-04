"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function LoginPage() {
  const { login, loading, error, setError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    await login(data.email, data.password);
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
        <CardDescription className="text-gray-500">
          Sign in to your onboarding portal
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200/60">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
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
          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
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
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sign In
          </Button>
          <p className="text-sm text-gray-500 text-center">
            New applicant?{" "}
            <Link
              href="/register"
              className="text-accent-500 hover:underline font-medium"
            >
              Register here
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
