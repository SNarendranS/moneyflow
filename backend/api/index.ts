import 'dotenv/config';
import { createApp } from '../src/app';
import { connectDB } from '../src/config/database';

const app = createApp();
let dbPromise: Promise<void> | null = null;

const ensureDatabase = () => {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }

  return dbPromise;
};

export default async function handler(req: any, res: any) {
  await ensureDatabase();
  return app(req, res);
}
