class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.notificationQueue = [];
        this.isProcessing = false;
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
            try {
                const permission = await Notification.requestPermission();
                this.hasPermission = permission === "granted";
            } catch (error) {
                console.error("Error requesting notification permission:", error);
            }
        }
    }

    async requestPermission() {
        if (!("Notification" in window)) {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === "granted";
            return this.hasPermission;
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    }

    async notify(title, options = {}) {
        this.notificationQueue.push({ title, options });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        this.isProcessing = true;
        while (this.notificationQueue.length > 0) {
            const { title, options } = this.notificationQueue.shift();
            await this.createNotification(title, options);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
        this.isProcessing = false;
    }

    createNotification(title, options) {
        const notification = new Notification(title, {
            icon: 'https://d2zcpib8duehag.cloudfront.net/FirstLook.png',
            badge: 'https://d2zcpib8duehag.cloudfront.net/FirstLook.png',
            ...options,
            requireInteraction: true // Make notification persist until user interaction
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };

        // Auto close after 5 seconds if not interacted with
        setTimeout(() => notification.close(), 5000);

        return notification;
    }
}

export const notificationManager = new NotificationManager();