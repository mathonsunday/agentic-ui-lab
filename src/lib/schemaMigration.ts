
/**
 * Schema Migration and Type Versioning
 *
 * Provides:
 * - Type versioning support
 * - Schema migration for protocol evolution
 * - Forward compatibility with unknown fields
 * - JSON Schema validation
 */

/**
 * Versioned type with schema metadata
 */
export interface VersionedType<T> {
  /** Protocol version this type conforms to */
  __version: string;

  /** ISO timestamp of schema creation */
  __timestamp: number;

  /** Extensions for forward compatibility */
  __extensions?: Record<string, unknown>;

  /** The actual typed data */
  data: T;
}

/**
 * Wrap a value in versioned type
 */
export function versionType<T>(data: T, version = '1.0.0'): VersionedType<T> {
  return {
    __version: version,
    __timestamp: Date.now(),
    data,
  };
}

/**
 * Extract data from versioned type
 */
export function extractData<T>(versioned: VersionedType<T> | T): T {
  if (versioned && typeof versioned === 'object' && '__version' in versioned) {
    return (versioned as VersionedType<T>).data;
  }
  return versioned as T;
}

/**
 * Schema migration functions for type evolution
 */
export type SchemaMigration<From, To> = (data: From) => To;

/**
 * Schema migrator for handling version transitions
 */
export class SchemaMigrator {
  private migrations = new Map<string, Map<string, SchemaMigration<any, any>>>();

  /**
   * Register a migration from one version to another
   */
  registerMigration<From, To>(
    type: string,
    fromVersion: string,
    toVersion: string,
    migrate: SchemaMigration<From, To>
  ): void {
    if (!this.migrations.has(type)) {
      this.migrations.set(type, new Map());
    }

    const typeMigrations = this.migrations.get(type)!;
    typeMigrations.set(`${fromVersion}->${toVersion}`, migrate);
  }

  /**
   * Migrate data from one version to another
   */
  migrate<T>(
    type: string,
    data: VersionedType<T> | T,
    targetVersion: string
  ): VersionedType<T> {
    // Handle unversioned data
    if (!data || typeof data !== 'object' || !('__version' in data)) {
      return versionType(data as T, targetVersion);
    }

    const versioned = data as VersionedType<T>;
    const currentVersion = versioned.__version;

    if (currentVersion === targetVersion) {
      return versioned;
    }

    // For now, just update version (in production would chain migrations)
    return {
      ...versioned,
      __version: targetVersion,
    };
  }

  /**
   * Preserve unknown fields in extensions
   */
  static preserveUnknownFields<T extends Record<string, unknown>>(
    data: T,
    knownKeys: string[]
  ): Partial<T> & { __extensions?: Record<string, unknown> } {
    const result: any = {};
    const extensions: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (knownKeys.includes(key)) {
        result[key] = value;
      } else {
        extensions[key] = value;
      }
    }

    if (Object.keys(extensions).length > 0) {
      result.__extensions = extensions;
    }

    return result;
  }
}

/**
 * Discriminated union type helper for type-safe events
 */
export type Discriminator<T extends { type: string }> = {
  [K in T['type']]: T extends { type: K } ? T : never;
};

/**
 * Type guard helper
 */
export function isType<T extends { type: string }>(
  event: unknown,
  type: string
): event is T {
  return (
    event !== null &&
    typeof event === 'object' &&
    'type' in event &&
    (event as any).type === type
  );
}

/**
 * Global schema registry
 */
export const globalSchemaRegistry = {
  schemas: new Map<string, unknown>(),

  /**
   * Register a JSON Schema
   */
  register(name: string, schema: unknown): void {
    this.schemas.set(name, schema);
  },

  /**
   * Get a registered schema
   */
  get(name: string): unknown {
    return this.schemas.get(name);
  },

  /**
   * List all registered schemas
   */
  list(): Array<{ name: string; schema: unknown }> {
    return Array.from(this.schemas.entries()).map(([name, schema]) => ({
      name,
      schema,
    }));
  },
};

/**
 * JSON Schema for Mira event types
 */
export const MiraEventSchema = {
  TEXT_MESSAGE_START: {
    type: 'object',
    properties: {
      event_id: { type: 'string' },
      schema_version: { type: 'string' },
      type: { const: 'TEXT_MESSAGE_START' },
      timestamp: { type: 'number' },
      sequence_number: { type: 'number' },
      parent_event_id: { type: 'string', nullable: true },
      data: {
        type: 'object',
        properties: {
          message_id: { type: 'string' },
        },
      },
    },
    required: ['event_id', 'schema_version', 'type', 'timestamp', 'sequence_number', 'data'],
  },

  STATE_DELTA: {
    type: 'object',
    properties: {
      event_id: { type: 'string' },
      schema_version: { type: 'string' },
      type: { const: 'STATE_DELTA' },
      timestamp: { type: 'number' },
      sequence_number: { type: 'number' },
      data: {
        type: 'object',
        properties: {
          version: { type: 'number' },
          timestamp: { type: 'number' },
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                op: {
                  enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'],
                },
                path: { type: 'string' },
                value: {},
              },
            },
          },
        },
      },
    },
    required: ['event_id', 'schema_version', 'type', 'timestamp', 'sequence_number', 'data'],
  },
};

// Register schemas
globalSchemaRegistry.register('TEXT_MESSAGE_START', MiraEventSchema.TEXT_MESSAGE_START);
globalSchemaRegistry.register('STATE_DELTA', MiraEventSchema.STATE_DELTA);
