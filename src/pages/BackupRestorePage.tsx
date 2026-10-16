import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { backupService } from '../core/services';
import type { Backup } from '../features/settings/domain/entities';
import { useSafeBack } from '../shared/utils/backNavigation';

export const BackupRestorePage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const location = useLocation();
    const restoreOnly = (location.state as { restore?: boolean } | null)?.restore === true;
    const [backups, setBackups] = useState<Backup[]>([]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Confirmation Modal States
    const [restoreModalId, setRestoreModalId] = useState<string | null>(null);
    const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
    const [importedModalId, setImportedModalId] = useState<string | null>(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const list = await backupService.getBackups();
            setBackups(list);
        } catch (error) {
            console.error('Failed to list backups:', error);
        }
    };

    const handleBackup = async () => {
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

    const confirmRestore = async () => {
        if (!restoreModalId) return;
        try {
            await backupService.restoreBackup(restoreModalId);
            navigate(restoreOnly ? '/' : '/home');
        } catch (error) {
            console.error('Restore failed:', error);
        } finally {
            setRestoreModalId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModalId) return;
        try {
            await backupService.deleteBackup(deleteModalId);
            await loadBackups();
        } catch (error) {
            console.error('Failed to delete backup:', error);
        } finally {
            setDeleteModalId(null);
        }
    };

    const handleDownloadFile = (backupId: string) => {
        try {
            backupService.downloadBackupFile(backupId);
        } catch (error) {
            console.error('Failed to export backup file:', error);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const importedBackup = await backupService.importBackupFromFile(text);
            await loadBackups();
            setImportedModalId(importedBackup.id);
        } catch (error) {
            console.error('Failed to import backup file:', error);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmImportRestore = async () => {
        if (!importedModalId) return;
        try {
            await backupService.restoreBackup(importedModalId);
            navigate(restoreOnly ? '/' : '/home');
        } catch (error) {
            console.error('Restore failed:', error);
        } finally {
            setImportedModalId(null);
        }
    };

    const lastBackup = backups[0];

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-24">
            {/* Hidden File Input for Importing Backup */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Header */}
            <PageHeader title={restoreOnly ? 'Restore Backup' : 'Backup & Restore'} onBack={() => safeBack(restoreOnly ? '/' : '/settings')} />

            {/* Main Content */}
            <main className="flex-1 px-5 pt-4 space-y-6">
                {/* Backup Status Card */}
                <div>
                    <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant mb-2.5 ml-1">Device Status</h2>
                    <div className="bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 p-5 shadow-md-1 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="typescale-title-medium font-bold text-md-on-surface">Last Backup Status</h3>
                                {lastBackup ? (
                                    <div className="flex items-center gap-1.5 text-md-primary">
                                        <Icon name="check_circle" className="text-base" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        <span className="typescale-body-small font-medium">Ready ({lastBackup.location})</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-md-on-surface-variant/70">
                                        <Icon name="cloud_off" className="text-base" />
                                        <span className="typescale-body-small font-medium">No Backup Available</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-md-primary-container/40 rounded-full p-2.5 text-md-primary">
                                <Icon name="cloud_done" className="text-2xl" />
                            </div>
                        </div>
                        <div className="typescale-body-small text-md-on-surface-variant border-t border-md-outline-variant/20 pt-3">
                            {lastBackup ? (
                                <>
                                    <p>{new Date(lastBackup.created_at).toLocaleString()}</p>
                                    <p>Size: {(lastBackup.size_bytes / 1024 / 1024).toFixed(2)} MB • {lastBackup.location}</p>
                                </>
                            ) : (
                                <p>No backups found on this device</p>
                            )}
                        </div>

                        {/* Action Buttons: Backup Now (full mode) & Import File */}
                        <div className="flex gap-2.5 pt-1">
                            {!restoreOnly && (
                                <Button
                                    variant="filled"
                                    size="md"
                                    onClick={handleBackup}
                                    disabled={isBackingUp}
                                    className="flex-1"
                                >
                                    <Icon name="backup" className="text-lg" />
                                    <span>{isBackingUp ? 'Backing up...' : 'Backup Now'}</span>
                                </Button>
                            )}

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                                className="flex-1 flex cursor-pointer items-center justify-center rounded-full h-10 px-4 typescale-label-large font-bold border border-md-primary text-md-primary hover:bg-md-primary-container/30 active:scale-[0.98] transition-all gap-2"
                            >
                                <Icon name="file_upload" className="text-lg" />
                                <span>{isImporting ? 'Importing...' : 'Import File'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Available Backups List */}
                <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Backup Snapshots</h2>
                        <span className="typescale-label-small font-bold text-md-on-secondary-container bg-md-secondary-container px-2.5 py-0.5 rounded-full border border-md-outline-variant/20">Local & Shareable</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {backups.map(backup => (
                            <div key={backup.id} className="group relative flex items-center justify-between gap-3 rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-4 transition-all hover:bg-md-surface-container-high shadow-md-1">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="size-10 shrink-0 rounded-full bg-md-surface-container-highest flex items-center justify-center text-md-primary">
                                        <Icon name={backup.location === 'Imported File' ? "folder_zip" : "cloud"} className="text-xl" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="typescale-title-small font-bold text-md-on-surface truncate">{new Date(backup.created_at).toLocaleDateString()}</p>
                                        <p className="typescale-body-small text-md-on-surface-variant truncate">
                                            {new Date(backup.created_at).toLocaleTimeString()} • {(backup.size_bytes / 1024 / 1024).toFixed(2)} MB • {backup.location}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {!restoreOnly && (
                                        <>
                                            {/* Download / Export Button */}
                                            <button
                                                onClick={() => handleDownloadFile(backup.id)}
                                                className="size-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-primary hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                                title="Download JSON file to share"
                                            >
                                                <Icon name="download" className="text-lg" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => setDeleteModalId(backup.id)}
                                                className="size-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container/20 transition-colors cursor-pointer"
                                                title="Delete backup snapshot"
                                            >
                                                <Icon name="delete" className="text-lg" />
                                            </button>
                                        </>
                                    )}

                                    {/* Restore Button */}
                                    <button
                                        onClick={() => setRestoreModalId(backup.id)}
                                        className="rounded-full px-3.5 py-1 typescale-label-small font-bold text-md-primary bg-md-primary-container/40 hover:bg-md-primary-container transition-colors uppercase tracking-wider cursor-pointer ml-1"
                                    >
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                        {backups.length === 0 && (
                            <div className="text-center py-8 text-md-on-surface-variant typescale-body-medium bg-md-surface-container-low rounded-2xl border border-dashed border-md-outline-variant">
                                No backup history available
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                {!restoreOnly && (
                <div className="rounded-2xl bg-md-surface-container-low p-4 border border-md-outline-variant/30 shadow-md-1">
                    <div className="flex items-start gap-3">
                        <Icon name="info" className="text-md-primary text-xl mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1">
                            <p className="typescale-title-small font-bold text-md-on-surface">Cross-Device Backup Sharing</p>
                            <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                Click the <Icon name="download" className="inline text-sm text-md-primary" /> download icon to export a `.json` backup file. You can send this file via WhatsApp, Email, or Bluetooth to another phone and use <strong>Import File</strong> to restore all your recipes and logs there!
                            </p>
                        </div>
                    </div>
                </div>
                )}
            </main>

            {/* Restore Confirmation Modal */}
            <Modal
                isOpen={!!restoreModalId}
                onClose={() => setRestoreModalId(null)}
                onConfirm={confirmRestore}
                title="Restore Backup?"
                message="Are you sure you want to restore this backup? Your current recipes and brew logs will be replaced."
                confirmText="Restore Data"
                cancelText="Cancel"
                type="warning"
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteModalId}
                onClose={() => setDeleteModalId(null)}
                onConfirm={confirmDelete}
                title="Delete Snapshot?"
                message="Are you sure you want to delete this backup snapshot from your device storage?"
                confirmText="Delete"
                cancelText="Cancel"
                type="warning"
            />

            {/* Imported File Restore Confirmation Modal */}
            <Modal
                isOpen={!!importedModalId}
                onClose={() => setImportedModalId(null)}
                onConfirm={confirmImportRestore}
                title="Import Successful"
                message="Backup file imported successfully! Would you like to restore all data to your device now?"
                confirmText="Restore Now"
                cancelText="Later"
                type="info"
            />
        </div>
    );
};
