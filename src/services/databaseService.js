import supabase from '../config/supabase.js';
import { CONSTANTS } from '../constants/index.js';

class DatabaseService {
  constructor() {
    this.tableName = CONSTANTS.TABLES.WORLD_HOT_KEYS;
  }

  /**
   * 保存或更新热点数据到数据库
   * @param {Array} hotKeys - 热点数据数组
   * @returns {Promise<Object>}
   */
  async saveHotKeys(hotKeys) {
    try {
      const results = {
        inserted: 0,
        updated: 0,
        errors: 0,
      };

      for (const hotKey of hotKeys) {
        try {
          await this.upsertHotKey(hotKey);
          results.inserted++;
        } catch (error) {
          console.error('保存热点数据失败:', error.message);
          results.errors++;
        }
      }

      console.log(`✅ 数据保存完成: 插入/更新 ${results.inserted} 条, 错误 ${results.errors} 条`);
      return results;
    } catch (error) {
      console.error('批量保存热点数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 插入或更新单条热点数据
   * @param {Object} hotKey 
   * @returns {Promise<Object>}
   */
  async upsertHotKey(hotKey) {
    try {
      const dataToSave = {
        area: hotKey.area || CONSTANTS.AREAS.GLOBAL,
        hotKeys: this.truncateText(hotKey.keyword || '', CONSTANTS.HOT_KEY_MAX_LENGTH),
        hotKeysDesc: this.truncateText(hotKey.description || '', CONSTANTS.HOT_KEY_DESC_MAX_LENGTH),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 检查是否已存在相同的热点数据
      const { data: existingData, error: selectError } = await supabase
        .from(this.tableName)
        .select('id, created_at')
        .eq('area', dataToSave.area)
        .eq('hotKeys', dataToSave.hotKeys)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingData) {
        // 如果存在，只更新 updated_at 时间
        const { data, error } = await supabase
          .from(this.tableName)
          .update({
            updated_at: dataToSave.updated_at,
            hotKeysDesc: dataToSave.hotKeysDesc, // 也更新描述，以防有新信息
          })
          .eq('id', existingData.id)
          .select();

        if (error) throw error;
        
        console.log(`🔄 更新热点: ${dataToSave.hotKeys} (${dataToSave.area})`);
        return { type: 'updated', data };
      } else {
        // 如果不存在，插入新记录
        const { data, error } = await supabase
          .from(this.tableName)
          .insert(dataToSave)
          .select();

        if (error) throw error;
        
        console.log(`✨ 新增热点: ${dataToSave.hotKeys} (${dataToSave.area})`);
        return { type: 'inserted', data };
      }
    } catch (error) {
      console.error('Upsert 热点数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取指定地区的热点数据
   * @param {string} area - 地区
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>}
   */
  async getHotKeysByArea(area, limit = 10) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('area', area)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`获取 ${area} 地区热点数据失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有热点数据
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>}
   */
  async getAllHotKeys(limit = 50) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取所有热点数据失败:', error.message);
      return [];
    }
  }

  /**
   * 删除过期的热点数据
   * @param {number} daysOld - 删除多少天前的数据
   * @returns {Promise<number>}
   */
  async cleanupOldData(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .lt('updated_at', cutoffDate.toISOString())
        .select();

      if (error) throw error;
      
      const deletedCount = data?.length || 0;
      console.log(`🗑️  清理了 ${deletedCount} 条过期数据 (${daysOld} 天前)`);
      
      return deletedCount;
    } catch (error) {
      console.error('清理过期数据失败:', error.message);
      return 0;
    }
  }

  /**
   * 检查数据库连接
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('count', { count: 'exact', head: true });

      if (error) throw error;
      
      console.log('✅ 数据库连接正常');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      return false;
    }
  }

  /**
   * 创建数据库表（如果不存在）
   * @returns {Promise<boolean>}
   */
  async createTableIfNotExists() {
    try {
      // 注意：这个方法需要在 Supabase 控制台中手动创建表
      // 或者使用 SQL 命令创建
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          area VARCHAR(50) NOT NULL,
          hotKeys VARCHAR(${CONSTANTS.HOT_KEY_MAX_LENGTH}) NOT NULL,
          hotKeysDesc VARCHAR(${CONSTANTS.HOT_KEY_DESC_MAX_LENGTH}),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(area, hotKeys)
        );
        
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_area ON ${this.tableName}(area);
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated_at ON ${this.tableName}(updated_at);
      `;
      
      console.log('📝 请在 Supabase SQL 编辑器中执行以下 SQL 创建表:');
      console.log(createTableSQL);
      
      return true;
    } catch (error) {
      console.error('创建表失败:', error.message);
      return false;
    }
  }

  /**
   * 截断文本到指定长度
   * @param {string} text 
   * @param {number} maxLength 
   * @returns {string}
   */
  truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  /**
   * 获取数据库统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const { data: totalCount, error: totalError } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      const { data: areaStats, error: areaError } = await supabase
        .from(this.tableName)
        .select('area')
        .order('area');

      if (areaError) throw areaError;

      const areaDistribution = {};
      areaStats?.forEach(item => {
        areaDistribution[item.area] = (areaDistribution[item.area] || 0) + 1;
      });

      return {
        totalCount: totalCount || 0,
        areaDistribution,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('获取统计信息失败:', error.message);
      return {
        totalCount: 0,
        areaDistribution: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

export default DatabaseService;