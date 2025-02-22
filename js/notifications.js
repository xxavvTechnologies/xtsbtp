class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.init();
    }

    async init() {
        if (!("Notification" in window)) {
            console.log("This browser does not support notifications");
            return;
        }

        if (Notification.permission === "granted") {
            this.hasPermission = true;
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === "granted";
        }
    }

    async requestPermission() {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === "granted";
        return this.hasPermission;
    }

    notify(title, options = {}) {
        if (!this.hasPermission) return;
        
        const notification = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };

        return notification;
    }
}

export const notificationManager = new NotificationManager();