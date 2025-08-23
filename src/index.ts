import "dotenv/config";
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();
app.listen(config.port, () => {
  console.log(`🚗 Vehicle API listening on http://localhost:${config.port}`);
  console.log(`📚 Swagger UI at http://localhost:${config.port}/docs`);
});
