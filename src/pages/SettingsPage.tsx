import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { settingsService } from '../core/services';
import { seedInitialData } from '../core/database/seeding';

import { Modal } from '../components/Modal';

export const SettingsPage = () => {
    const navigate = useNavigate();
    const [appUnit, setAppUnit] = useState<'metric' | 'imperial'>('metric');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const unit = await settingsService.getAppUnit();
            setAppUnit(unit);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleToggleUnit = async () => {
        const newUnit = appUnit === 'metric' ? 'imperial' : 'metric';
        setAppUnit(newUnit);
        await settingsService.setAppUnit(newUnit);
    };

    const confirmDeleteData = async () => {
        try {
            await settingsService.clearUserData();
            // Re-seed to ensure base data is present (restores default recipes to their original state)
            await seedInitialData();
            alert('All user data has been deleted. The app will now reload.');
            window.location.reload();
        } catch (error) {
            console.error('Failed to delete data:', error);
            alert('Failed to delete data. Please try again.');
            setShowDeleteModal(false);
        }
    };

    return (
        <div className="flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-24 font-display text-neutral-text">
            {/* Header */}
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                            Settings
                        </h1>
                    </div>
                </div>
            </div>

            {/* Profile Section */}
            <section className="px-6 flex flex-col items-center">
                <p className="text-xs font-semibold text-primary/80 my-8 uppercase tracking-wider">User ID: CF-102938</p>
            </section>

            {/* Settings Groups */}
            <div className="px-4 space-y-6">
                {/* Data Management */}
                <div>
                    <h3 className="px-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Data Management</h3>
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <button
                            onClick={() => navigate('/settings/backup')}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="cloud_upload" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">Backup & Restore</span>
                            </div>
                            <Icon name="chevron_right" className="text-gray-400 text-[20px]" />
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="delete_forever" className="text-red-500 text-[22px] group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm text-red-500">Delete Data</span>
                            </div>
                            <Icon name="chevron_right" className="text-red-300 text-[20px]" />
                        </button>
                    </div>
                </div>

                {/* Preferences */}
                <div>
                    <h3 className="px-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Preferences</h3>
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <Icon name="notifications" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">Notifications</span>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleUnit}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="straighten" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">App Units</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-semibold text-gray-500 capitalize">{appUnit}</span>
                                <Icon name="chevron_right" className="text-gray-400 text-[20px]" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Support & Legal */}
                <div>
                    <h3 className="px-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Support & Legal</h3>
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <Icon name="chat_bubble" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">Send Feedback</span>
                            </div>
                            <Icon name="chevron_right" className="text-gray-400 text-[20px]" />
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <Icon name="gavel" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">Terms & Privacy</span>
                            </div>
                            <Icon name="chevron_right" className="text-gray-400 text-[20px]" />
                        </button>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <Icon name="info" className="text-primary text-[22px]" />
                                <span className="font-medium text-sm text-neutral-text">About CoffeeFlow</span>
                            </div>
                            <span className="text-sm font-bold text-primary/80">v1.2.0</span>
                        </div>
                    </div>
                </div>

                {/* Log out Button */}
                <button className="w-full py-4 text-gray-400 font-bold hover:text-red-500 transition-colors text-center text-sm">
                    Log Out of CoffeeFlow
                </button>
            </div>

            <BottomNav activeTab="settings" />

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteData}
                title="Delete User Data?"
                message="This will delete your brew logs, custom recipes, and backups. Default recipes will remain. This action cannot be undone."
                confirmText="Yes, Delete Everything"
                cancelText="Cancel"
                type="error"
            />
        </div>
    );
};
