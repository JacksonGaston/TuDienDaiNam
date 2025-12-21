const fs = require('fs-extra');
const path = require('path');

class FileUtils {
  static async getTextFiles(dataDir) {
    try {
      const files = await fs.readdir(dataDir);
      return files
        .filter(file => file.toLowerCase().endsWith('.txt'))
        .map(file => ({
          name: file,
          path: path.join(dataDir, file),
          size: 0
        }));
    } catch (error) {
      throw new Error(`Failed to read data directory: ${error.message}`);
    }
  }

  static async getFiles(dir, extension = '') {
    try {
      const files = await fs.readdir(dir);
      return files
        .filter(file => !extension || file.toLowerCase().endsWith(extension.toLowerCase()))
        .map(file => ({
          name: file,
          path: path.join(dir, file)
        }));
    } catch (error) {
      throw new Error(`Failed to read directory ${dir}: ${error.message}`);
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error.message}`);
    }
  }

  static async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  static async writeFile(filePath, data) {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  static async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  static async readTextFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read text file ${filePath}: ${error.message}`);
    }
  }

  static async copyFile(src, dest) {
    try {
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);
    } catch (error) {
      throw new Error(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
    }
  }

  static async deleteFile(filePath) {
    try {
      await fs.remove(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  static async clearDirectory(dirPath) {
    try {
      await fs.emptyDir(dirPath);
    } catch (error) {
      throw new Error(`Failed to clear directory ${dirPath}: ${error.message}`);
    }
  }

  static getOutputPath(type, filename) {
    const outputDir = path.join(__dirname, '../../output');
    const typeDir = path.join(outputDir, type);
    return path.join(typeDir, filename);
  }
}

module.exports = FileUtils;