import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { MIGRATIONS } from './schema';

class DatabaseService {
    private sqlite: SQLiteConnection | null = null;
    private db: SQLiteDBConnection | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    async initialize(): Promise<void> {
        if (this.isInitialized && this.db) {
            const isDbOpen = (await this.db.isDBOpen().catch(() => ({ result: false }))).result;
            if (isDbOpen) return;
        }
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.sqlite = new SQLiteConnection(CapacitorSQLite);

                const platform = Capacitor.getPlatform();

                if (platform === 'web') {
                    // Stencil jeep-sqlite component is injected in main.tsx BEFORE React begins.
                    // Just initialize the webstore mechanism here.
                    await this.sqlite.initWebStore().catch(err => {
                        console.warn('initWebStore warning:', err);
                    });
                }

                // Check connection consistency and reuse existing connection if present
                const ret = await this.sqlite.checkConnectionsConsistency().catch(() => ({ result: false }));
                const isConn = (await this.sqlite.isConnection('coffee_flow_db', false).catch(() => ({ result: false }))).result;

                if (ret.result && isConn) {
                    this.db = await this.sqlite.retrieveConnection('coffee_flow_db', false);
                } else {
                    this.db = await this.sqlite.createConnection(
                        'coffee_flow_db',
                        false,
                        'no-encryption',
                        1,
                        false
                    );
                }

                const isDbOpen = (await this.db.isDBOpen().catch(() => ({ result: false }))).result;
                if (!isDbOpen) {
                    await this.db.open();
                }

                await this.runMigrations();

                // Save to store immediately after initializing/migrating
                await this.saveToLocalStore();

                this.isInitialized = true;
            } catch (error) {
                console.error('Database initialization failed:', error);
                this.initPromise = null; // allow retrying
                throw error;
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
                    try {
                        await this.db.execute(trimmed);
                    } catch (stmtErr: unknown) {
                        const errMsg = String((stmtErr as Error)?.message || stmtErr).toLowerCase();
                        if (errMsg.includes('duplicate column') || errMsg.includes('already exists')) {
                            console.warn(`Migration notice (already applied): ${trimmed}`);
                            continue;
                        }
                        throw stmtErr;
                    }
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

export const dbService = new DatabaseService();
