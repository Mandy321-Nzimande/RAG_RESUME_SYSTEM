import { app } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";

async function start(): Promise<void> {
  try {
    await connectDatabase();
    console.log("MongoDB connected");

    app.listen(env.port, () => {
      console.log(`resume-rag-backend listening on port ${env.port}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
}

start();
