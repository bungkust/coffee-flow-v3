import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { backupService } from '../core/services';
import type { Backup } from '../features/settings/domain/entities';

export const BackupRestorePage = () => {
    const navigate = useNavigate();
    const [backups, setBackups] = useState<Backup[]>([]);
    const [lastBackup, setLastBackup] = useState<Backup | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const data = await backupService.getBackups();
            setBackups(data);
            const last = await backupService.getLastSuccessfulBackup();
            setLastBackup(last);
        } catch (error) {
            console.error('Failed to load backups:', error);
        }
    };

    const handleBackup = async () => {
        if (isBackingUp) return;
        setIsBackingUp(true);
        try {
            await backupService.performBackup();
            await loadBackups();
        } catch (error) {
            console.error('Backup failed:', error);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async (id: string) => {
        if (confirm('Are you sure you want to restore? Current data will be overwritten.')) {
            try {
                await backupService.restoreBackup(id);
                alert('Restore successful!');
            } catch (error) {
                console.error('Restore failed:', error);
                alert('Restore failed. See console for details.');
            }
        }
    };

    return (
        <div className="flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl font-display text-[#181411]">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-50">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#181411]"
                >
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h2 className="text-lg font-bold tracking-tight text-[#181411]">Backup & Restore</h2>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-6 gap-6">
                {/* Backup Status Card */}
                <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[#181411] text-base font-bold">Last Successful Backup</h3>
                                {lastBackup ? (
                                    <div className="flex items-center gap-1.5 text-primary">
                                        <Icon name="check_circle" className="text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        <span className="text-sm font-medium">Synced</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <Icon name="cloud_off" className="text-[18px]" />
                                        <span className="text-sm font-medium">Not Synced</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-primary/10 rounded-full p-2 text-primary">
                                <Icon name="cloud_done" className="text-[24px]" />
                            </div>
                        </div>
                        <div className="text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-3">
                            {lastBackup ? (
                                <>
                                    <p>{new Date(lastBackup.created_at).toLocaleString()}</p>
                                    <p>Size: {(lastBackup.size_bytes / 1024 / 1024).toFixed(1)} MB • {lastBackup.location}</p>
                                </>
                            ) : (
                                <p>No backups found</p>
                            )}
                        </div>
                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className={`mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl h-12 text-sm font-bold transition-all shadow-md gap-2 ${isBackingUp ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'}`}
                        >
                            {isBackingUp ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Backing up...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="backup" className="text-[20px]" />
                                    <span>Backup Now</span>
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {/* Available Backups List */}
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[#181411] text-lg font-bold">Cloud History</h3>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">iCloud Drive</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {backups.map(backup => (
                            <div key={backup.id} className="group relative flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <Icon name="cloud" className="text-[24px]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[#181411] text-base font-bold">{new Date(backup.created_at).toLocaleDateString()}</p>
                                        <p className="text-gray-400 text-xs font-semibold">{new Date(backup.created_at).toLocaleTimeString()} • {(backup.size_bytes / 1024 / 1024).toFixed(1)} MB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRestore(backup.id)}
                                    className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/15 active:bg-primary/20 transition-colors uppercase tracking-wider"
                                >
                                    Restore
                                </button>
                            </div>
                        ))}
                        {backups.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No backup history available
                            </div>
                        )}
                    </div>
                </section>

                {/* Info Section */}
                <section className="mt-2 rounded-xl bg-gray-50/80 p-4 border border-dashed border-gray-200">
                    <div className="flex items-start gap-3">
                        <Icon name="info" className="text-gray-400 text-[20px] mt-0.5" />
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-bold text-[#181411]">Data Safety</p>
                            <p className="text-xs text-text-secondary leading-relaxed text-gray-500">
                                Restoring a backup will overwrite your current recipes, brewing logs, and inventory settings. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};
