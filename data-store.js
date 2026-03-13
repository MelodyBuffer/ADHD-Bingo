/**
 * 数据存储适配器
 * 自动检测运行环境（Web 或 Tauri）并使用相应的存储方法
 */

// 检测是否在 Tauri 环境中运行
const isTauri = window.__TAURI__ !== undefined;

// 存储接口
export const storage = {
  /**
   * 初始化存储
   */
  async init() {
    if (isTauri) {
      const { initStorage, migrateFromLocalStorage } = await import('./tauri-storage.js');
      await initStorage();

      // 如果 localStorage 有数据，询问用户是否迁移
      if (this.hasLocalStorageData()) {
        const shouldMigrate = confirm('检测到浏览器数据，是否迁移到 App？');
        if (shouldMigrate) {
          await migrateFromLocalStorage();
        }
      }
    } else {
      console.log('Running in Web mode, using localStorage');
    }
  },

  /**
   * 检查是否有 localStorage 数据
   */
  hasLocalStorageData() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('adhd_bingo_')) {
        return true;
      }
    }
    return false;
  },

  /**
   * 保存数据
   */
  async save(data) {
    if (isTauri) {
      const { updateField } = await import('./tauri-storage.js');
      // Tauri 环境下，每个字段单独保存
      for (const [key, value] of Object.entries(data)) {
        await updateField(key, value);
      }
    } else {
      // Web 环境下使用 localStorage
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object') {
          localStorage.setItem('adhd_bingo_' + key, JSON.stringify(value));
        } else {
          localStorage.setItem('adhd_bingo_' + key, value);
        }
      }
    }
  },

  /**
   * 加载数据
   */
  async load() {
    if (isTauri) {
      const { getData } = await import('./tauri-storage.js');
      return await getData();
    } else {
      // Web 环境下从 localStorage 加载
      return this.loadFromLocalStorage();
    }
  },

  /**
   * 从 localStorage 加载数据
   */
  loadFromLocalStorage() {
    const data = {};

    try {
      // 加载基础数据
      const groups = localStorage.getItem('adhd_bingo_groups');
      if (groups) data.groups = JSON.parse(groups);

      const details = localStorage.getItem('adhd_bingo_details');
      if (details) data.details = JSON.parse(details);

      const mandatory = localStorage.getItem('adhd_bingo_mandatory');
      if (mandatory) data.mandatory = JSON.parse(mandatory);

      const timestamps = localStorage.getItem('adhd_bingo_timestamps');
      if (timestamps) data.timestamps = JSON.parse(timestamps);

      const gridSize = localStorage.getItem('adhd_bingo_gridsize');
      if (gridSize) data.gridSize = parseInt(gridSize);

      const theme = localStorage.getItem('adhd_bingo_theme');
      if (theme) data.theme = theme;

      const achievements = localStorage.getItem('adhd_bingo_achievements');
      if (achievements) data.achievements = JSON.parse(achievements);

      // 加载每日记录
      const dailyRecords = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('adhd_bingo_')) {
          const match = key.match(/^adhd_bingo_(\d{4}-\d{2}-\d{2})$/);
          if (match) {
            const date = match[1];
            dailyRecords[date] = JSON.parse(localStorage.getItem(key));
          }
        }
      }
      data.dailyRecords = dailyRecords;

    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }

    return data;
  },

  /**
   * 导出数据
   */
  async export() {
    if (isTauri) {
      const { exportToFile } = await import('./tauri-storage.js');
      return await exportToFile();
    } else {
      // Web 环境下使用原有的导出功能
      return null; // 由原代码处理
    }
  },

  /**
   * 导入数据
   */
  async import() {
    if (isTauri) {
      const { importFromFile } = await import('./tauri-storage.js');
      return await importFromFile();
    } else {
      // Web 环境下使用原有的导入功能
      return null; // 由原代码处理
    }
  },

  /**
   * 自动备份
   */
  async backup() {
    if (isTauri) {
      const { autoBackup } = await import('./tauri-storage.js');
      return await autoBackup();
    } else {
      // Web 环境下不需要自动备份
      return false;
    }
  },

  /**
   * 获取备份列表
   */
  async listBackups() {
    if (isTauri) {
      const { listBackups } = await import('./tauri-storage.js');
      return await listBackups();
    } else {
      return [];
    }
  },

  /**
   * 从备份恢复
   */
  async restoreBackup(backupName) {
    if (isTauri) {
      const { restoreFromBackup } = await import('./tauri-storage.js');
      return await restoreFromBackup(backupName);
    } else {
      return false;
    }
  }
};

// 检测环境信息
export const envInfo = {
  isTauri,
  platform: isTauri ? await (async () => {
    try {
      const { invoke } = window.__TAURI__.core;
      return await invoke('get_platform');
    } catch (e) {
      return 'unknown';
    }
  })() : 'web'
};
