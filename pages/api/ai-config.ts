import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { AIConfig, ApiResponse } from '@/lib/types';
import { initializeStore } from '@/lib/store';
import getDatabase from '@/lib/database';

// 初始化存储
initializeStore();

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ApiResponse<AIConfig | AIConfig[]>>
) {
  const db = getDatabase();
  
  try {
    // 初始化AI配置表（如果不存在）
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
    
    switch (req.method) {
      case 'GET':
        return handleGetRequest(req, res, db);
      case 'POST':
        return handlePostRequest(req, res, db);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('AI Config API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// 处理GET请求（兼容action参数格式）
function handleGetRequest(req: NextApiRequest, res: NextApiResponse, db: any) {
  const { action, id } = req.query;
  
  try {
    // 如果有action参数，根据action处理
    if (action === 'list') {
      const stmt = db.prepare('SELECT * FROM ai_configs ORDER BY created_at DESC');
      const rows = stmt.all();
      
      return res.json({
        success: true,
        configs: rows.map(convertDbRowToAIConfig)
      });
    }
    
    if (id) {
      // 获取单个配置
      const stmt = db.prepare('SELECT * FROM ai_configs WHERE id = ?');
      const row = stmt.get(id);
      
      if (!row) {
        return res.status(404).json({
          success: false,
          error: 'AI config not found'
        });
      }
      
      return res.json({
        success: true,
        config: convertDbRowToAIConfig(row)
      });
    } else {
      // 默认返回所有配置
      const stmt = db.prepare('SELECT * FROM ai_configs ORDER BY created_at DESC');
      const rows = stmt.all();
      
      return res.json({
        success: true,
        configs: rows.map(convertDbRowToAIConfig)
      });
    }
  } catch (error) {
    console.error('Get AI config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get AI config'
    });
  }
}

// 处理POST请求（支持action参数）
function handlePostRequest(req: NextApiRequest, res: NextApiResponse, db: any) {
  const { action } = req.body;
  
  switch (action) {
    case 'save':
      return handleSaveConfig(req, res, db);
    case 'delete':
      return handleDeleteConfig(req, res, db);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
  }
}

// 保存AI配置（创建或更新）
function handleSaveConfig(req: NextApiRequest, res: NextApiResponse, db: any) {
  const { config } = req.body;
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Config data is required'
    });
  }
  const {
    id,
    provider,
    name,
    baseUrl,
    apiKey,
    model,
    enabled = true,
    headers,
    maxTokens,
    temperature
  } = config;
  
  // 验证必需字段
  if (!provider || !name || !baseUrl || !apiKey || !model) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: provider, name, baseUrl, apiKey, model'
    });
  }
  
  const now = new Date().toISOString();
  
  try {
    if (id) {
      // 更新现有配置
      const existingConfig = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id);
      if (!existingConfig) {
        return res.status(404).json({
          success: false,
          error: 'AI config not found'
        });
      }
      
      const stmt = db.prepare(`
        UPDATE ai_configs SET 
          provider = ?, name = ?, base_url = ?, api_key = ?, model = ?, 
          enabled = ?, headers = ?, max_tokens = ?, temperature = ?, updated_at = ?
        WHERE id = ?
      `);
      
      stmt.run(
        provider,
        name,
        baseUrl,
        apiKey,
        model,
        enabled ? 1 : 0,
        headers ? JSON.stringify(headers) : null,
        maxTokens || null,
        temperature || null,
        now,
        id
      );
      
      const updatedConfig = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id);
      
      return res.json({
        success: true,
        config: convertDbRowToAIConfig(updatedConfig)
      });
    } else {
      // 创建新配置
      const configId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO ai_configs (
          id, provider, name, base_url, api_key, model, enabled, 
          headers, max_tokens, temperature, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        configId,
        provider,
        name,
        baseUrl,
        apiKey,
        model,
        enabled ? 1 : 0,
        headers ? JSON.stringify(headers) : null,
        maxTokens || null,
        temperature || null,
        now,
        now
      );
      
      const newConfig = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(configId);
      
      return res.status(201).json({
        success: true,
        config: convertDbRowToAIConfig(newConfig)
      });
    }
  } catch (error) {
    console.error('Save AI config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save AI config'
    });
  }
}

// 删除AI配置
function handleDeleteConfig(req: NextApiRequest, res: NextApiResponse, db: any) {
  const { configId } = req.body;
  
  if (!configId) {
    return res.status(400).json({
      success: false,
      error: 'Config ID is required'
    });
  }
  
  try {
    const stmt = db.prepare('DELETE FROM ai_configs WHERE id = ?');
    const result = stmt.run(configId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI config not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'AI config deleted successfully'
    });
  } catch (error) {
    console.error('Delete AI config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete AI config'
    });
  }
}


// 数据库行转换为AIConfig对象
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