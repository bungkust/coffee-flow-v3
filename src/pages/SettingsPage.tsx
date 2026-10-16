import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { settingsService } from '../core/services';
import { seedInitialData } from '../core/database/seeding';

import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useSafeBack } from '../shared/utils/backNavigation';

// Google Form URLs
// View form: https://docs.google.com/forms/d/1c0okral6Qh0uZZqWyp9NvhsXSqhpfsemkWGZB6HxYMs/viewform
// Pre-filled URL params:
// entry.1983030597 = Your Name
// entry.912074794 = Email
// entry.1950246015 = Category
// entry.27032554 = Message
const GOOGLE_TERMS_URL = 'https://policies.google.com/terms';
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';
const GOOGLE_FORM_BASE_URL = 'https://docs.google.com/forms/d/1c0okral6Qh0uZZqWyp9NvhsXSqhpfsemkWGZB6HxYMs/viewform';

const Toggle = ({ icon, label, checked, onToggle }: { icon: string, label: string, checked: boolean, onToggle: () => void }) => (
    <div className="flex items-center justify-between p-4 border-b border-md-outline-variant/20">
        <div className="flex items-center gap-3">
            <Icon name={icon} className="text-md-primary text-xl" />
            <span className="typescale-body-large font-medium text-md-on-surface">{label}</span>
        </div>
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                checked ? 'bg-md-primary' : 'bg-md-surface-container-highest'
            }`}
        >
            <div className={`size-4 rounded-full bg-white transition-transform duration-200 ${
                checked ? 'translate-x-6' : 'translate-x-0'
            }`} />
        </button>
    </div>
);

export const SettingsPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const [appUnit, setAppUnit] = useState<'metric' | 'imperial'>('metric');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [timerFeedbackEnabled, setTimerFeedbackEnabled] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({
        name: '',
        email: '',
        category: 'bug',
        message: ''
    });
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);

    useEffect(() => {
        Promise.all([
            settingsService.getAppUnit(),
            settingsService.getNotificationsEnabled(),
            settingsService.getTimerFeedbackEnabled()
        ])
            .then(([unit, notifications, feedback]) => {
                setAppUnit(unit);
                setNotificationsEnabled(notifications);
                setTimerFeedbackEnabled(feedback);
            })
            .catch((error) => {
                console.error('Failed to load settings:', error);
            });
    }, []);

    const handleToggleUnit = async () => {
        const newUnit = appUnit === 'metric' ? 'imperial' : 'metric';
        setAppUnit(newUnit);
        await settingsService.setAppUnit(newUnit);
    };

    const handleToggleNotifications = async () => {
        const next = !notificationsEnabled;
        setNotificationsEnabled(next);
        if (next && 'Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission().catch(() => {});
        }
        await settingsService.setNotificationsEnabled(next);
    };

    const handleToggleTimerFeedback = async () => {
        const next = !timerFeedbackEnabled;
        setTimerFeedbackEnabled(next);
        await settingsService.setTimerFeedbackEnabled(next);
    };

    const confirmDeleteData = async () => {
        try {
            await settingsService.clearUserData();
            await seedInitialData();
            window.location.reload();
        } catch (error) {
            console.error('Failed to delete data:', error);
            setShowDeleteModal(false);
        }
    };

    const handleFeedbackChange = (field: string, value: string) => {
        setFeedbackForm(prev => ({ ...prev, [field]: value }));
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedbackSubmitting(true);
        
        try {
            // Build pre-filled Google Form URL
            const params = new URLSearchParams({
                'entry.1983030597': feedbackForm.name,
                'entry.912074794': feedbackForm.email,
                'entry.1950246015': feedbackForm.category,
                'entry.27032554': feedbackForm.message,
            });
            
            const prefilledUrl = `${GOOGLE_FORM_BASE_URL}?usp=pp_url&${params.toString()}`;
            
            // Open in new tab for user to review & submit
            window.open(prefilledUrl, '_blank');
            
            // Reset form immediately
            setFeedbackForm({ name: '', email: '', category: 'bug', message: '' });
            setShowFeedbackModal(false);
            
            // Show success toast
            setFeedbackSuccess(true);
            setTimeout(() => setFeedbackSuccess(false), 3000);
            
        } catch (error) {
            console.error('Failed to open feedback form:', error);
            alert('Failed to open feedback form. Please try again.');
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    return (
        <div className="flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-24">
            {/* Header */}
            <PageHeader title="Settings" onBack={() => safeBack('/home')} />

            {/* Settings Groups */}
            <div className="px-5 space-y-6">
                {/* Data Management */}
                <div>
                    <h3 className="px-1 mb-2.5 typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Data Management</h3>
                    <div className="bg-md-surface-container-low rounded-xl overflow-hidden border border-md-outline-variant/30 shadow-md-1">
                        <button
                            onClick={() => navigate('/settings/backup')}
                            className="w-full flex items-center justify-between p-4 hover:bg-md-surface-container-high transition-colors border-b border-md-outline-variant/20 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="cloud_upload" className="text-md-primary text-xl" />
                                <span className="typescale-body-large font-medium text-md-on-surface">Backup & Restore</span>
                            </div>
                            <Icon name="chevron_right" className="text-md-on-surface-variant text-xl" />
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-md-error-container/30 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="delete_forever" className="text-md-error text-xl group-hover:scale-110 transition-transform" />
                                <span className="typescale-body-large font-semibold text-md-error">Delete Data</span>
                            </div>
                            <Icon name="chevron_right" className="text-md-error/60 text-xl" />
                        </button>
                    </div>
                </div>

                {/* Preferences */}
                <div>
                    <h3 className="px-1 mb-2.5 typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Preferences</h3>
                    <div className="bg-md-surface-container-low rounded-xl overflow-hidden border border-md-outline-variant/30 shadow-md-1">
                        <Toggle icon="notifications" label="Notifications" checked={notificationsEnabled} onToggle={handleToggleNotifications} />
                        <Toggle icon="vibration" label="Timer Feedback" checked={timerFeedbackEnabled} onToggle={handleToggleTimerFeedback} />
                        <button
                            onClick={handleToggleUnit}
                            className="w-full flex items-center justify-between p-4 hover:bg-md-surface-container-high transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="straighten" className="text-md-primary text-xl" />
                                <span className="typescale-body-large font-medium text-md-on-surface">App Units</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="typescale-body-medium font-semibold text-md-on-surface-variant capitalize">{appUnit}</span>
                                <Icon name="chevron_right" className="text-md-on-surface-variant text-xl" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Support & Legal */}
                <div>
                    <h3 className="px-1 mb-2.5 typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Support & Legal</h3>
                    <div className="bg-md-surface-container-low rounded-xl overflow-hidden border border-md-outline-variant/30 shadow-md-1">
                        <button onClick={() => setShowFeedbackModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-md-surface-container-high transition-colors border-b border-md-outline-variant/20 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Icon name="chat_bubble" className="text-md-primary text-xl" />
                                <span className="typescale-body-large font-medium text-md-on-surface">Send Feedback</span>
                            </div>
                            <Icon name="chevron_right" className="text-md-on-surface-variant text-xl" />
                        </button>
                        {[
                            { icon: 'gavel', label: 'Terms of Use', url: GOOGLE_TERMS_URL },
                            { icon: 'shield', label: 'Privacy Policy', url: GOOGLE_PRIVACY_URL }
                        ].map(link => (
                            <button key={link.label} onClick={() => window.open(link.url, '_blank')} className="w-full flex items-center justify-between p-4 hover:bg-md-surface-container-high transition-colors border-b border-md-outline-variant/20 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Icon name={link.icon} className="text-md-primary text-xl" />
                                    <span className="typescale-body-large font-medium text-md-on-surface">{link.label}</span>
                                </div>
                                <Icon name="open_in_new" className="text-md-on-surface-variant text-xl" />
                            </button>
                        ))}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <Icon name="info" className="text-md-primary text-xl" />
                                <span className="typescale-body-large font-medium text-md-on-surface">About CoffeeFlow</span>
                            </div>
                            <span className="typescale-label-large font-bold text-md-primary">v1.2.0</span>
                        </div>
                    </div>
                </div>

                {/* Back to Home Button */}
                <button onClick={() => navigate('/home')} className="w-full py-4 text-md-on-surface-variant hover:text-md-primary font-semibold transition-colors text-center typescale-label-large cursor-pointer">
                    Back to Home
                </button>
            </div>

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
            {feedbackSuccess ? (
                <Modal
                    isOpen={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                    title="Feedback Sent!"
                    message="Thank you for your feedback! We'll review it and get back to you if needed."
                    confirmText="Done"
                    type="success"
                />
            ) : (
                <Modal
                    isOpen={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                    title="Send Feedback"
                    message={
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Your Name</label>
                                <input
                                    type="text"
                                    value={feedbackForm.name}
                                    onChange={(e) => handleFeedbackChange('name', e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={feedbackForm.email}
                                    onChange={(e) => handleFeedbackChange('email', e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Category</label>
                                <select
                                    value={feedbackForm.category}
                                    onChange={(e) => handleFeedbackChange('category', e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                                >
                                    <option value="bug">Bug Report</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="improvement">Improvement</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Message</label>
                                <textarea
                                    value={feedbackForm.message}
                                    onChange={(e) => handleFeedbackChange('message', e.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                                    placeholder="Describe your feedback..."
                                />
                            </div>
                        </form>
                    }
                    confirmText={feedbackSubmitting ? 'Sending...' : 'Send Feedback'}
                    cancelText="Cancel"
                    type="info"
                    size="lg"
                />
            )}
        </div>
    );
};
