import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), '.data', 'comfyflow.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'database', 'schema.sql');

// 确保数据目录存在
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 创建数据库实例
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // 检查是否在构建环境中
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      throw new Error('Database not available during build phase');
    }
    
    ensureDataDir();
    db = new Database(DB_PATH);
    
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    
    // 设置WAL模式提高并发性能
    db.pragma('journal_mode = WAL');
    
    // 设置UTF-8编码
    db.pragma('encoding = "UTF-8"');
    
    // 初始化数据库表结构
    initializeSchema();
  }
  
  return db;
}

// 确保 parameter_mappings 表有所有必需的字段
function ensureParameterMappingColumns() {
  if (!db) return;

  try {
    // 获取当前表结构
    const tableInfo = db.prepare("PRAGMA table_info(parameter_mappings)").all();
    const existingColumns = tableInfo.map((col: any) => col.name);

    // 需要的字段列表
    const requiredColumns = [
      { name: 'keyword_enabled', sql: 'ALTER TABLE parameter_mappings ADD COLUMN keyword_enabled BOOLEAN DEFAULT false' },
      { name: 'keyword_position', sql: "ALTER TABLE parameter_mappings ADD COLUMN keyword_position TEXT DEFAULT 'prefix'" },
      { name: 'keyword_types', sql: 'ALTER TABLE parameter_mappings ADD COLUMN keyword_types TEXT' }
    ];

    // 添加缺失的字段
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        db.exec(column.sql);
      }
    }
  } catch (error) {
    console.error('Error ensuring parameter mapping columns:', error);
  }
}

// 初始化数据库表结构
function initializeSchema() {
  if (!db) return;
  
  try {
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.error('Schema file not found at:', SCHEMA_PATH);
      // 创建基本表结构
      const basicSchema = `
        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          description TEXT,
          json TEXT NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS parameter_mappings (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          api_parameter TEXT NOT NULL,
          node_id TEXT NOT NULL,
          field_name TEXT NOT NULL,
          description TEXT,
          parameter_type TEXT DEFAULT 'string',
          default_value TEXT,
          required BOOLEAN DEFAULT false,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE
        );
      `;
      db.exec(basicSchema);
      console.log('Database schema created with basic structure');
      return;
    }
    
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized from file');

    // 检查并添加缺失的字段（用于向后兼容）
    ensureParameterMappingColumns();
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

// 关闭数据库连接
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// 在进程退出时关闭数据库
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default getDatabase;