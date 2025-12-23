import mongoose from 'mongoose';
import { env } from './env';
import { MetricsService } from './services/metrics-service';
import { logger } from './logger';

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

/**
 * Setup MongoDB Query Profiling
 * Tracks slow queries (>100ms by default) and logs them to Sentry
 * Enabled by default in development/staging, configurable via MONGODB_QUERY_PROFILING_ENABLED
 */
function setupQueryProfiling(): void {
  // Check if profiling is enabled
  const isEnabled = process.env.MONGODB_QUERY_PROFILING_ENABLED === 'true' ||
    (process.env.MONGODB_QUERY_PROFILING_ENABLED !== 'false' && 
     process.env.NODE_ENV !== 'production');
  
  if (!isEnabled) {
    return;
  }

  // Configurable threshold (default: 100ms)
  const slowQueryThreshold = Number.parseInt(
    process.env.MONGODB_SLOW_QUERY_THRESHOLD || '100',
    10
  );

  // Intercept Query.prototype.exec() to measure all queries
  const originalExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function (this: any) {
    const startTime = Date.now();
    const queryModel = this.model;
    const queryCollection = queryModel?.collection?.name || 'unknown';
    const queryOp = this.op || 'unknown';
    const queryObj = this.getQuery ? this.getQuery() : {};

    // Execute original query
    const result = originalExec.apply(this, arguments as any);

    // Handle both sync and async results
    if (result && typeof (result as any).then === 'function') {
      // Async query (Promise)
      return result
        .then((docs: any) => {
          const duration = Date.now() - startTime;

          // Track all queries
          MetricsService.trackDbQuery(queryCollection, queryOp, duration, true);

          // Log slow queries
          if (duration > slowQueryThreshold) {
            logger.warn('Slow query detected', {
              collection: queryCollection,
              operation: queryOp,
              duration,
              threshold: slowQueryThreshold,
              query: JSON.stringify(queryObj).substring(0, 500),
            });
          }

          return docs;
        })
        .catch((error: any) => {
          const duration = Date.now() - startTime;

          // Track failed queries
          MetricsService.trackDbQuery(queryCollection, queryOp, duration, false);

          // Re-throw error
          throw error;
        });
    }

    // Sync query (shouldn't happen in practice, but handle it)
    const duration = Date.now() - startTime;

    MetricsService.trackDbQuery(queryCollection, queryOp, duration, true);

    if (duration > slowQueryThreshold) {
      logger.warn('Slow query detected', {
        collection: queryCollection,
        operation: queryOp,
        duration,
        threshold: slowQueryThreshold,
        query: JSON.stringify(queryObj).substring(0, 500),
      });
    }

    return result;
  };

  // Intercept Aggregate operations
  const originalAggregateExec = mongoose.Aggregate.prototype.exec;
  mongoose.Aggregate.prototype.exec = function (this: any) {
    const startTime = Date.now();
    const aggregateModel = this.model();
    const aggregateCollection = aggregateModel?.collection?.name || 'unknown';
    const aggregatePipeline = this.pipeline || [];

    const result = originalAggregateExec.apply(this, arguments as any);

    if (result && typeof (result as any).then === 'function') {
      return result
        .then((docs: any) => {
          const duration = Date.now() - startTime;
          const operation = 'aggregate';

          MetricsService.trackDbQuery(aggregateCollection, operation, duration, true);

          if (duration > slowQueryThreshold) {
            const pipelineStr = JSON.stringify(aggregatePipeline).substring(0, 500);
            logger.warn('Slow aggregate query detected', {
              collection: aggregateCollection,
              operation,
              duration,
              threshold: slowQueryThreshold,
              pipeline: pipelineStr,
            });
          }

          return docs;
        })
        .catch((error: any) => {
          const duration = Date.now() - startTime;
          MetricsService.trackDbQuery(aggregateCollection, 'aggregate', duration, false);
          throw error;
        });
    }

    return result;
  };

  // Track save operations via schema plugin
  const saveProfilingPlugin = function (schema: mongoose.Schema) {
    schema.pre('save', function (this: mongoose.Document) {
      (this as any)._saveStartTime = Date.now();
    });

    schema.post('save', function (this: mongoose.Document) {
      const startTime = (this as any)._saveStartTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        const collection = this.collection?.name || 'unknown';
        const operation = 'save';

        MetricsService.trackDbQuery(collection, operation, duration, true);

        if (duration > slowQueryThreshold) {
          logger.warn('Slow save operation detected', {
            collection,
            operation,
            duration,
            threshold: slowQueryThreshold,
            documentId: this._id?.toString(),
          });
        }
      }
    });
  };

  // Apply plugin to all schemas
  mongoose.plugin(saveProfilingPlugin);

  logger.info('MongoDB query profiling enabled', {
    threshold: slowQueryThreshold,
    environment: process.env.NODE_ENV,
  });
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
      // Setup query profiling after connection
      setupQueryProfiling();
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

/**
 * Get read preference for queries that can use read replicas
 * Returns 'secondary' if read replicas are configured, 'primary' otherwise
 * 
 * Read replicas should be configured in MongoDB Atlas connection string:
 * - Add ?readPreference=secondaryPreferred to MONGODB_READ_REPLICA_URI
 * - Or set MONGODB_USE_READ_REPLICAS=true to enable read preference
 */
export function getReadPreference(): 'primary' | 'secondary' | 'secondaryPreferred' {
  // Check if read replicas are explicitly enabled
  if (process.env.MONGODB_USE_READ_REPLICAS === 'true') {
    return 'secondaryPreferred'; // Prefer read replicas, fallback to primary
  }
  
  // Check if read replica URI is configured
  if (process.env.MONGODB_READ_REPLICA_URI) {
    return 'secondaryPreferred';
  }
  
  // Default to primary (no read replicas)
  return 'primary';
}

/**
 * Check if read replicas are available
 */
export function hasReadReplicas(): boolean {
  return process.env.MONGODB_USE_READ_REPLICAS === 'true' || !!process.env.MONGODB_READ_REPLICA_URI;
}

export default dbConnect;