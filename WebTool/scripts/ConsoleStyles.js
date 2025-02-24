class ConsoleStyles {
    static get header() { return 'font-weight: bold; font-size: 1.2em; color: #9c27b0;' }
    static get okBlue() { return 'color: #2196f3;' }
    static get okCyan() { return 'color: #00bcd4;' }
    static get okGreen() { return 'color: #4caf50;' }
    static get warning() { return 'color: #ff9800;' }
    static get fail() { return 'color: #f44336;' }
    static get bold() { return 'font-weight: bold;' }
    static get underline() { return 'text-decoration: underline;' }
    static logHeader(message) {
        console.log(`%c${message}`, this.header);
    }

    static logInfo(message) {
        console.log(`%c${message}`, this.okBlue);
    }

    static logSuccess(message) {
        console.log(`%c${message}`, this.okGreen);
    }

    static logWarning(message) {
        console.warn(`%c${message}`, this.warning);
    }

    static logError(message) {
        console.error(`%c${message}`, this.fail);
    }

    static logDebug(message) {
        console.debug(`%c${message}`, this.okCyan);
    }

    static logBold(message) {
        console.log(`%c${message}`, this.bold);
    }

    static logUnderline(message) {
        console.log(`%c${message}`, this.underline);
    }
}

export default ConsoleStyles