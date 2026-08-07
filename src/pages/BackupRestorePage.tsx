import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { backupService } from '../core/services';
import type { Backup } from '../features/settings/domain/entities';

export const BackupRestorePage = () => {
    const navigate = useNavigate();
    const [backups, setBackups] = useState<Backup[]>([]);
    const [lastBackup, setLastBackup] = useState<Backup | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                alert('Restore successful! Your data has been updated.');
            } catch (error) {
                console.error('Restore failed:', error);
                alert('Restore failed. See console for details.');
            }
        }
    };

    const handleDownloadFile = (id: string) => {
        try {
            backupService.downloadBackupFile(id);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download backup file.');
        }
    };

    const handleDeleteBackup = async (id: string) => {
        if (confirm('Delete this backup snapshot?')) {
            try {
                await backupService.deleteBackup(id);
                await loadBackups();
            } catch (error) {
                console.error('Delete failed:', error);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            await backupService.importBackupFromFile(text);
            await loadBackups();
            alert(`Backup "${file.name}" imported and restored successfully!`);
        } catch (error) {
            console.error('Import failed:', error);
            alert(error instanceof Error ? error.message : 'Failed to import backup file.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl font-display text-neutral-text pb-24">
            {/* Hidden File Input for Importing Backup */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-neutral-text hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-[24px]" />
                        </button>
                        <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                            Backup & Restore
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col px-4 pt-4 gap-6">
                {/* Backup Status Card */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 ml-1">Device Status</h3>
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-neutral-text text-base font-bold">Last Backup Status</h3>
                                    {lastBackup ? (
                                        <div className="flex items-center gap-1.5 text-primary">
                                            <Icon name="check_circle" className="text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                            <span className="text-sm font-medium">Ready ({lastBackup.location})</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <Icon name="cloud_off" className="text-[18px]" />
                                            <span className="text-sm font-medium">No Backup Available</span>
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
                                        <p>Size: {(lastBackup.size_bytes / 1024 / 1024).toFixed(2)} MB • {lastBackup.location}</p>
                                    </>
                                ) : (
                                    <p>No backups found on this device</p>
                                )}
                            </div>

                            {/* Action Buttons: Backup Now & Import File */}
                            <div className="flex gap-2.5 pt-1">
                                <button
                                    onClick={handleBackup}
                                    disabled={isBackingUp}
                                    className={`flex-1 flex cursor-pointer items-center justify-center rounded-xl h-11 text-xs font-bold transition-all shadow-md gap-2 ${isBackingUp ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98] shadow-primary/20'}`}
                                >
                                    {isBackingUp ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Backing up...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="backup" className="text-[18px]" />
                                            <span>Backup Now</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className="flex-1 flex cursor-pointer items-center justify-center rounded-xl h-11 text-xs font-bold border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] transition-all gap-2"
                                >
                                    {isImporting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span>Importing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="file_upload" className="text-[18px]" />
                                            <span>Import File</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Available Backups List */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Backup Snapshots</h3>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">Local & Shareable</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {backups.map(backup => (
                            <div key={backup.id} className="group relative flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3.5 transition-all hover:border-primary/30 hover:shadow-sm">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <Icon name={backup.location === 'Imported File' ? "folder_zip" : "cloud"} className="text-[20px]" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-neutral-text text-sm font-bold truncate">{new Date(backup.created_at).toLocaleDateString()}</p>
                                        <p className="text-gray-400 text-[11px] font-medium truncate">
                                            {new Date(backup.created_at).toLocaleTimeString()} • {(backup.size_bytes / 1024 / 1024).toFixed(2)} MB • {backup.location}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Download / Export Button */}
                                    <button
                                        onClick={() => handleDownloadFile(backup.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                        title="Download JSON file to share"
                                    >
                                        <Icon name="download" className="text-[18px]" />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDeleteBackup(backup.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Delete backup snapshot"
                                    >
                                        <Icon name="delete" className="text-[18px]" />
                                    </button>

                                    {/* Restore Button */}
                                    <button
                                        onClick={() => handleRestore(backup.id)}
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white active:scale-95 transition-all uppercase tracking-wider cursor-pointer ml-1"
                                    >
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                        {backups.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
                                No backup history available
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                <div className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-start gap-3">
                        <Icon name="info" className="text-primary/60 text-[20px] mt-0.5" />
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-neutral-text">Cross-Device Backup Sharing</p>
                            <p className="text-xs text-text-secondary leading-relaxed text-gray-500">
                                Click the <Icon name="download" className="inline text-[13px] text-primary" /> download icon to export a `.json` backup file. You can send this file via WhatsApp, Email, or Bluetooth to another phone and use <strong>Import File</strong> to restore all your recipes and logs there!
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
