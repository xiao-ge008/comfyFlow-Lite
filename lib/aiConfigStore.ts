import { AIConfig } from '@/lib/types';
import getDatabase from '@/lib/database';

/**
 * 读取所有AI配置
 */
export function readAIConfigs(): AIConfig[] {
  const db = getDatabase();
  
  try {
    // 确保表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_configs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        headers TEXT,
        max_tokens INTEGER,
        temperature REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const stmt = db.prepare('SELECT * FROM ai_configs WHERE enabled = 1 ORDER BY created_at DESC');
    const rows = stmt.all();
    
    return rows.map(convertDbRowToAIConfig);
  } catch (error) {
    console.error('Read AI configs error:', error);
    return [];
  }
}

/**
 * 根据ID获取单个AI配置
 */
export function getAIConfigById(id: string): AIConfig | null {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND enabled = 1');
    const row = stmt.get(id);
    
    if (!row) {
      return null;
    }
    
    return convertDbRowToAIConfig(row);
  } catch (error) {
    console.error('Get AI config by ID error:', error);
    return null;
  }
}

/**
 * 获取启用的AI配置（第一个启用的配置）
 */
export function getEnabledAIConfig(): AIConfig | null {
  const configs = readAIConfigs();
  return configs.length > 0 ? configs[0] : null;
}

/**
 * 数据库行转换为AIConfig对象
 */
function convertDbRowToAIConfig(row: any): AIConfig {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    model: row.model,
    enabled: Boolean(row.enabled),
    headers: row.headers ? JSON.parse(row.headers) : undefined,
    maxTokens: row.max_tokens || undefined,
    temperature: row.temperature || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}