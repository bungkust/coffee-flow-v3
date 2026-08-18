import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { MIGRATIONS } from './schema';

class DatabaseService {
    private static instance: DatabaseService;
    private sqlite: SQLiteConnection | null = null;
    private db: SQLiteDBConnection | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    private constructor() { }

    static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.sqlite = new SQLiteConnection(CapacitorSQLite);

                const platform = Capacitor.getPlatform();

                if (platform === 'web') {
                    // Stencil jeep-sqlite component is injected in main.tsx BEFORE React begins.
                    // Just initialize the webstore mechanism here.
                    await this.sqlite.initWebStore();
                }

                this.db = await this.sqlite.createConnection(
                    'coffee_flow_db',
                    false,
                    'no-encryption',
                    1,
                    false
                );

                await this.db.open();
                await this.runMigrations();

                // Save to store immediately after initializing/migrating
                await this.saveToLocalStore();

                this.isInitialized = true;
            } catch (error) {
                console.error('Database initialization failed:', error);
                this.initPromise = null; // allow retrying
                throw new Error('Database initialization failed');
            }
        })();

        return this.initPromise;
    }

    async saveToLocalStore(): Promise<void> {
        try {
            if (this.sqlite && Capacitor.getPlatform() === 'web') {
                await this.sqlite.saveToStore('coffee_flow_db');
            }
        } catch (err) {
            console.error('Failed to save SQLite to IndexedDB Store:', err);
        }
    }

    private async runMigrations(): Promise<void> {
        if (!this.db) return;

        const res = await this.db.query('PRAGMA user_version');
        const currentVersion = res.values?.[0].user_version || 0;

        for (const migration of MIGRATIONS) {
            if (migration.version > currentVersion) {
                // Execute migration statements with column guards for ADD COLUMN
                const statements = migration.sql.split(';').filter(s => s.trim());
                for (const stmt of statements) {
                    const trimmed = stmt.trim();
                    if (trimmed.toUpperCase().includes('ADD COLUMN')) {
                        const match = trimmed.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
                        if (match) {
                            const [, table, column] = match;
                            const cols = await this.db.query(`PRAGMA table_info(${table})`);
                            const exists = cols.values?.some((c: { name: string }) => c.name === column);
                            if (exists) continue; // skip if column already exists
                        }
                    }
                    await this.db.execute(trimmed);
                }
                await this.db.execute(`PRAGMA user_version = ${migration.version}`);
            }
        }
    }

    getDb(): SQLiteDBConnection {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }
}

export const dbService = DatabaseService.getInstance();
