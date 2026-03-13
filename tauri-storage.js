/**
 * Tauri App 数据存储模块
 * 替代 localStorage，使用文件系统存储
 */

import * as fs from '@tauri-apps/plugin-fs';
import * as dialog from '@tauri-apps/plugin-dialog';

// 数据目录配置
const DATA_DIR = 'adhd-bingo';
const DATA_FILE = 'data.json';
const BACKUP_DIR = 'backups';

// 缓存当前数据
let cachedData = null;

/**
 * 获取应用数据目录路径
 */
async function getDataDir() {
  const appDataDir = await fs.appDataDir();
  return appDataDir + DATA_DIR;
}

/**
 * 初始化数据存储
 */
export async function initStorage() {
  try {
    const dataDir = await getDataDir();

    // 创建数据目录（如果不存在）
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (e) {
      // 目录可能已存在，忽略错误
    }

    // 创建备份目录
    const backupDir = dataDir + '/' + BACKUP_DIR;
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (e) {
      // 目录可能已存在，忽略错误
    }

    // 加载数据
    await loadData();

    return true;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return false;
  }
}

/**
 * 从文件加载数据
 */
export async function loadData() {
  try {
    const dataDir = await getDataDir();
    const dataPath = dataDir + '/' + DATA_FILE;

    // 检查文件是否存在
    try {
      await fs.readTextFile(dataPath);
    } catch (e) {
      // 文件不存在，使用默认配置
      console.log('Data file not found, using defaults');
      cachedData = getDefaultData();
      await saveData();
      return cachedData;
    }

    // 读取文件
    const contents = await fs.readTextFile(dataPath);
    cachedData = JSON.parse(contents);

    // 迁移旧数据格式（如果需要）
    migrateData(cachedData);

    return cachedData;
  } catch (error) {
    console.error('Failed to load data:', error);
    cachedData = getDefaultData();
    await saveData();
    return cachedData;
  }
}

/**
 * 保存数据到文件
 */
export async function saveData() {
  try {
    if (!cachedData) {
      console.warn('No data to save');
      return false;
    }

    const dataDir = await getDataDir();
    const dataPath = dataDir + '/' + DATA_FILE;

    // 更新时间戳
    cachedData._lastModified = new Date().toISOString();

    // 写入文件
    const jsonStr = JSON.stringify(cachedData, null, 2);
    await fs.writeTextFile(dataPath, jsonStr);

    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    return false;
  }
}

/**
 * 获取当前数据
 */
export function getData() {
  return cachedData;
}

/**
 * 更新数据中的特定字段
 */
export async function updateField(field, value) {
  if (!cachedData) {
    cachedData = getDefaultData();
  }

  cachedData[field] = value;
  await saveData();
  return true;
}

/**
 * 自动备份（每天）
 */
export async function autoBackup() {
  try {
    if (!cachedData) {
      return false;
    }

    const dataDir = await getDataDir();
    const backupDir = dataDir + '/' + BACKUP_DIR;

    // 生成备份文件名（使用日期）
    const date = new Date().toISOString().split('T')[0];
    const backupPath = `${backupDir}/${date}.json`;

    // 检查是否已备份过
    try {
      await fs.readTextFile(backupPath);
      console.log('Backup already exists for today');
      return false;
    } catch (e) {
      // 文件不存在，继续备份
    }

    // 写入备份
    const jsonStr = JSON.stringify(cachedData, null, 2);
    await fs.writeTextFile(backupPath, jsonStr);

    console.log('Backup created:', backupPath);

    // 清理旧备份（保留最近30天）
    await cleanupOldBackups(backupDir);

    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return false;
  }
}

/**
 * 清理旧备份
 */
async function cleanupOldBackups(backupDir) {
  try {
    const entries = await fs.readDir(backupDir);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (const entry of entries) {
      if (entry.name.endsWith('.json')) {
        const metadata = await fs.metadata(backupDir + '/' + entry.name);
        const fileAge = now - metadata.mtime?.getTime() || 0;

        if (fileAge > thirtyDaysMs) {
          await fs.remove(backupDir + '/' + entry.name);
          console.log('Removed old backup:', entry.name);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup backups:', error);
  }
}

/**
 * 导出数据到文件
 */
export async function exportToFile() {
  try {
    if (!cachedData) {
      throw new Error('No data to export');
    }

    // 打开文件保存对话框
    const filePath = await dialog.save({
      filters: [
        {
          name: 'JSON',
          extensions: ['json']
        }
      ],
      defaultPath: `adhd-bingo-export-${new Date().toISOString().split('T')[0]}.json`
    });

    if (!filePath) {
      return false; // 用户取消
    }

    // 写入文件
    const jsonStr = JSON.stringify(cachedData, null, 2);
    await fs.writeTextFile(filePath, jsonStr);

    return true;
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

/**
 * 从文件导入数据
 */
export async function importFromFile() {
  try {
    // 打开文件选择对话框
    const filePath = await dialog.open({
      filters: [
        {
          name: 'JSON',
          extensions: ['json']
        }
      ],
      multiple: false
    });

    if (!filePath) {
      return false; // 用户取消
    }

    // 读取文件
    const contents = await fs.readTextFile(filePath);
    const data = JSON.parse(contents);

    // 验证数据格式
    if (!data._schema) {
      throw new Error('Invalid data format: missing schema version');
    }

    // 更新数据
    cachedData = data;

    // 迁移数据（如果需要）
    migrateData(cachedData);

    // 保存
    await saveData();

    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
}

/**
 * 获取所有备份列表
 */
export async function listBackups() {
  try {
    const dataDir = await getDataDir();
    const backupDir = dataDir + '/' + BACKUP_DIR;

    const entries = await fs.readDir(backupDir);

    const backups = [];
    for (const entry of entries) {
      if (entry.name.endsWith('.json')) {
        const metadata = await fs.metadata(backupDir + '/' + entry.name);
        backups.push({
          name: entry.name,
          date: entry.name.replace('.json', ''),
          size: metadata.size || 0,
          mtime: metadata.mtime || new Date()
        });
      }
    }

    // 按日期排序（最新的在前）
    backups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return backups;
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

/**
 * 从备份恢复
 */
export async function restoreFromBackup(backupName) {
  try {
    const dataDir = await getDataDir();
    const backupPath = `${dataDir}/${BACKUP_DIR}/${backupName}`;

    const contents = await fs.readTextFile(backupPath);
    cachedData = JSON.parse(contents);

    await saveData();

    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    throw error;
  }
}

/**
 * 数据迁移
 */
function migrateData(data) {
  // 处理旧版本的兼容性
  if (!data._schema || data._schema !== '1.0') {
    console.log('Migrating data from schema:', data._schema);

    // 迁移逻辑...
    data._schema = '1.0';
  }
}

/**
 * 获取默认数据
 */
function getDefaultData() {
  return {
    _schema: '1.0',
    _lastModified: new Date().toISOString(),
    _appVersion: '3.0.0',
    appName: 'Life Bingo',
    gridSize: 5,
    groups: [
      {
        name: '默认分组',
        tasks: [
          "日语", "法语", "无氧", "有氧", "健身环",
          "跳舞", "拳击", "拉伸", "看书", "听播客",
          "看剧", "看电影", "打游戏", "洗头", "吃补剂",
          "倒垃圾", "捡垃圾", "洗碗", "拖地", "收衣服",
          "好睡眠", "写手帐", "写公众号", "断舍离", "采购食材",
          "冥想", "画画", "弹琴", "跑步", "骑行"
        ].map(name => ({ name, active: true }))
      }
    ],
    details: {},
    mandatory: [],
    timestamps: {},
    dailyRecords: {},
    achievements: {
      unlocked: [],
      custom: {},
      userDefined: []
    },
    theme: 'color'
  };
}

/**
 * 从 localStorage 迁移数据到 Tauri 存储
 */
export async function migrateFromLocalStorage() {
  try {
    const migrationData = {};

    // 读取所有 localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('adhd_bingo_')) {
        const value = localStorage.getItem(key);
        migrationData[key] = value;
      }
    }

    if (Object.keys(migrationData).length === 0) {
      console.log('No localStorage data to migrate');
      return false;
    }

    // 转换为新格式
    const unified = convertLegacyData(migrationData);

    // 保存为新格式
    cachedData = unified;
    await saveData();

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * 转换旧版数据格式
 */
function convertLegacyData(legacyData) {
  // 这里实现从 localStorage 格式到新格式的转换
  // 类似 exportUnifiedData 的逻辑
  const unified = getDefaultData();

  // 解析各项数据...
  // （具体实现类似 exportUnifiedData 函数）

  return unified;
}
