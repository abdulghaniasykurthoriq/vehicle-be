// swagger.ts
import swaggerJSDoc from "swagger-jsdoc";

export function initSwagger() {
  const serverUrl =
    process.env.SWAGGER_SERVER_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://103-186-1-205.nip.io" // ✅ nip.io pakai strip
      : "http://localhost:4000");

  const options = {
    definition: {
      openapi: "3.0.3",
      info: { title: "Vehicle API", version: "1.0.0" },
      servers: [{ url: serverUrl }], // ✅ dinamis via env
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          cookieAuth: { type: "apiKey", in: "cookie", name: "accessToken" },
        },
        schemas: {
          AuthRegisterRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
              },
              name: { type: "string", nullable: true, example: "Abdul" },
              password: { type: "string", minLength: 6, example: "secret123" },
            },
          },
          AuthLoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
              },
              password: { type: "string", example: "secret123" },
            },
          },
          UserSummary: {
            type: "object",
            properties: {
              id: { type: "string", example: "clz1abc234" },
              email: {
                type: "string",
                format: "email",
                example: "user@example.com",
              },
              role: { type: "string", example: "USER" },
              name: { type: "string", nullable: true, example: "Abdul" },
            },
          },
          RegisterResponse: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", format: "email" },
              name: { type: "string", nullable: true },
            },
          },
          LoginResponse: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/UserSummary" },
            },
          },
          OkResponse: {
            type: "object",
            properties: { ok: { type: "boolean", example: true } },
          },
          ErrorResponse: {
            type: "object",
            properties: {
              message: { type: "string", example: "Invalid credentials" },
            },
          },
        },
      },
    },
    // ✅ dukung dev (ts) & build (js)
    apis: [
      "src/routes/**/*.ts",
      "src/**/routes/**/*.ts",
      "dist/routes/**/*.js",
      "dist/**/routes/**/*.js",
    ],
  };

  return swaggerJSDoc(options);
}
