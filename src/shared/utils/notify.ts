import { settingsService } from '../../core/services';

export const sendNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!(await settingsService.getNotificationsEnabled())) return;
    new Notification(title, { body });
};
