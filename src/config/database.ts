import { Db, MongoClient } from "mongodb";
import { env } from "./env";

let client: MongoClient | undefined;
let database: Db | undefined;

export const getDatabase = (): Db => {
  if (!database) {
    throw new Error("MongoDB has not been connected");
  }

  return database;
};

export const connectDatabase = async (): Promise<Db> => {
  if (database) {
    return database;
  }

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  client = new MongoClient(env.mongodbUri);
  await client.connect();
  database = client.db(env.mongodbDbName);
  return database;
};

export const pingDatabase = async (): Promise<number> => {
  const startedAt = process.hrtime.bigint();
  const connectedDatabase = await connectDatabase();
  await connectedDatabase.command({ ping: 1 });
  return Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(1));
};

export const closeDatabase = async (): Promise<void> => {
  await client?.close();
  client = undefined;
  database = undefined;
};