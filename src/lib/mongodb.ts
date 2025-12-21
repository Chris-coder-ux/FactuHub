import mongoose from 'mongoose';
import { env } from './env';

// Skip validation during build (NEXT_PHASE is set during build)
const isBuildTime = process.env.NEXT_PHASE?.includes('build') || 
                    process.env.NEXT_PHASE === 'phase-export';

const MONGODB_URI = env.MONGODB_URI;

// Only validate during runtime, not during build
if (!MONGODB_URI && !isBuildTime && process.env.NODE_ENV !== 'test') {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (globalThis as any).mongoose;

if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // Validate MONGODB_URI at runtime (not during build)
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;