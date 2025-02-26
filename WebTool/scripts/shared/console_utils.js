"use strict";

/**
 * This class holds styles definitions for Console Utils
 *
 * @class ConsoleStyles
 */
class ConsoleStyles {
  static get header() {
    return "font-weight: bold; font-size: 1.2em; color: #9c27b0;";
  }
  
  static get okBlue() {
    return "color: #2196f3;";
  }

  static get okCyan() {
    return "color: #00bcd4;";
  }

  static get okGreen() {
    return "color: #4caf50;";
  }

  static get warning() {
    return "color: #ff9800;";
  }

  static get fail() {
    return "color: #f44336;";
  }

  static get bold() {
    return "font-weight: bold;";
  }

  static get underline() {
    return "text-decoration: underline;";
  }
}

/**
 * Main utility to log styled messages in the console.
 *
 * @type {{logHeader: (message: any) => void, logInfo: (message: any) => void, 
        logSuccess: (message: any) => void, logWarning: (message: any) => void, 
        logError: (message: any) => void, logDebug: (message: any) => void, 
        logBold: (message: any) => void, logUnderline: (message: any) => void}}
 */
export const ConsoleUtils = {
  /**
   * Helper function to apply styles and log messages
   *
   * @param {Function} consoleMethod - The console method to use
   * @param {string} style - The CSS style string
   * @param {string} message - The message to log
   */
  _log: (consoleMethod, style, message) => {
    if (typeof console[consoleMethod] === 'function') {
      console[consoleMethod](`%c${message}`, style);
    }
  },

  /**
   * Logs a message with a header style
   *
   * @param {string} message - The message to log
   */
  logHeader: (message) => ConsoleUtils._log('log', ConsoleStyles.header, message),

  /**
   * Logs a message with an informational style
   *
   * @param {string} message - The message to log
   */
  logInfo: (message) => ConsoleUtils._log('log', ConsoleStyles.okBlue, message),

  /**
   * Logs a message with a success style
   *
   * @param {string} message - The message to log
   */
  logSuccess: (message) => ConsoleUtils._log('log', ConsoleStyles.okGreen, message),

  /**
   * Logs a message with a warning style
   *
   * @param {string} message - The message to log
   */
  logWarning: (message) => ConsoleUtils._log('warn', ConsoleStyles.warning, message),

  /**
   * Logs a message with an error style
   *
   * @param {string} message - The message to log
   */
  logError: (message) => ConsoleUtils._log('error', ConsoleStyles.fail, message),

  /**
   * Logs a message with a debug style
   *
   * @param {string} message - The message to log
   */
  logDebug: (message) => ConsoleUtils._log('debug', ConsoleStyles.okCyan, message),

  /**
   * Logs a message with a bold style
   *
   * @param {string} message - The message to log
   */
  logBold: (message) => ConsoleUtils._log('log', ConsoleStyles.bold, message),

  /**
   * Logs a message with an underline style
   *
   * @param {string} message - The message to log
   */
  logUnderline: (message) => ConsoleUtils._log('log', ConsoleStyles.underline, message),
};

export default ConsoleUtils;