import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Armor Health Portal API",
    version: "1.0.0",
    description: "External API for Armor Health Portal integrations",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        description: "Returns service status. No authentication required.",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    version: { type: "string", example: "1" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "API key with ahp_ prefix. Obtain from an administrator.",
      },
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "auth-token",
        description: "Browser session cookie (internal frontend use only).",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
