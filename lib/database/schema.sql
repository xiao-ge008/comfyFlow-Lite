-- 工作流表
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    description TEXT,
    json TEXT NOT NULL, -- 存储工作流JSON的序列化字符串
    enabled BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 参数映射表
CREATE TABLE IF NOT EXISTS parameter_mappings (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    api_parameter TEXT NOT NULL, -- API参数名
    node_id TEXT NOT NULL, -- ComfyUI节点ID
    field_name TEXT NOT NULL, -- 节点字段名
    description TEXT, -- 参数描述
    parameter_type TEXT DEFAULT 'string', -- 参数类型: string, number, boolean, array
    default_value TEXT, -- 默认值（JSON字符串）
    required BOOLEAN DEFAULT false,
    keyword_enabled BOOLEAN DEFAULT false, -- 是否启用关键词引用
    keyword_position TEXT DEFAULT 'prefix', -- 关键词位置: prefix/suffix
    keyword_types TEXT, -- JSON数组，筛选关键词类型
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE
);

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_workflows_endpoint ON workflows (endpoint);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows (enabled);
CREATE INDEX IF NOT EXISTS idx_parameter_mappings_workflow_id ON parameter_mappings (workflow_id);
CREATE INDEX IF NOT EXISTS idx_parameter_mappings_api_parameter ON parameter_mappings (api_parameter);

-- 创建触发器自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_workflows_updated_at 
    AFTER UPDATE ON workflows
BEGIN
    UPDATE workflows SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_parameter_mappings_updated_at
    AFTER UPDATE ON parameter_mappings
BEGIN
    UPDATE parameter_mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 关键词表
CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY,
    kyeid TEXT UNIQUE NOT NULL, -- 用户定义的唯一标识符
    type TEXT NOT NULL, -- 类型：person/action/style
    keyword_en TEXT NOT NULL, -- 英文关键词
    keyword_cn TEXT, -- 中文关键词
    tags TEXT, -- JSON数组格式的标签
    description TEXT, -- 解释说明
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为关键词表创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_kyeid ON keywords(kyeid);
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(type);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword_en ON keywords(keyword_en);

-- 关键词表的更新触发器
CREATE TRIGGER IF NOT EXISTS update_keywords_updated_at
    AFTER UPDATE ON keywords
BEGIN
    UPDATE keywords SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;