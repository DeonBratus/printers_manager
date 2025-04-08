export function showError(message) {
    createNotification(message, 'error-message');
}

export function showSuccess(message) {
    createNotification(message, 'success-message');
}

function createNotification(message, className) {
    const notification = document.createElement('div');
    notification.className = className;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Добавляем стили для уведомлений
const styles = document.createElement('style');
styles.textContent = `
.error-message, .success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 4px;
    z-index: 1000;
    color: white;
}
.error-message { background-color: #f44336; }
.success-message { background-color: #4caf50; }
`;
document.head.appendChild(styles);
