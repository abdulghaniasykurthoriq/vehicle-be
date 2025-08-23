export const config = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4000",
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
    accessTtl: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshTtl: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};
