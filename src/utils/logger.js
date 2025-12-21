const fs = require('fs-extra');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../output/logs');
    this.logFile = path.join(this.logDir, `processing-${new Date().toISOString().split('T')[0]}.log`);
    this.ensureLogDir();
  }

  async ensureLogDir() {
    await fs.ensureDir(this.logDir);
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
    
    console.log(logLine.trim());
    
    try {
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async info(message, data = null) {
    await this.log('info', message, data);
  }

  async error(message, data = null) {
    await this.log('error', message, data);
  }

  async warn(message, data = null) {
    await this.log('warn', message, data);
  }

  async debug(message, data = null) {
    await this.log('debug', message, data);
  }

  async progress(current, total, operation = 'Processing') {
    const percentage = ((current / total) * 100).toFixed(1);
    await this.info(`${operation}: ${current}/${total} (${percentage}%)`);
  }
}

module.exports = new Logger();