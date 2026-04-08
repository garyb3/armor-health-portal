import { loginSchema } from "@/schemas/auth";

const testData = {
  email: "ncampo@armorhealthcare.com",
  password: "AdminPassword123!",
};

console.log("Testing loginSchema validation:");
console.log("Input data:", testData);

const result = loginSchema.safeParse(testData);
console.log("Validation result:", result);

if (result.success) {
  console.log("Parsed data:", result.data);
  console.log("Email matches input?", result.data.email === testData.email);
}
