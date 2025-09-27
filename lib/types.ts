// 数据模型类型定义

// 国际化相关类型
export type SupportedLanguage = 'zh' | 'en' | 'ja';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

export interface Workflow {
  id: string;               // uuid
  endpoint: string;         // URL 段 & MCP 方法后缀
  name: string;
  description?: string;
  json: any;                // ComfyUI 原始图
  enabled?: boolean;        // 是否启用
  mappings?: ParameterMapping[];      // 参数映射（从数据库关联表获取）
  createdAt?: string;       // 数据库中为 created_at
  updatedAt?: string;       // 数据库中为 updated_at
}

// 数据库中的参数映射结构
export interface ParameterMapping {
  id: string;
  workflow_id: string;
  api_parameter: string;    // API参数名
  node_id: string;          // ComfyUI节点ID
  field_name: string;       // 节点字段名（如 inputs.text）
  description?: string;     // 参数描述
  parameter_type: 'string' | 'number' | 'boolean' | 'array';
  default_value?: string;   // JSON字符串格式的默认值
  required: boolean;
  keyword_enabled?: boolean; // 是否启用关键词引用
  keywordEnabled?: boolean;  // 兼容性字段
  keyword_position?: 'prefix' | 'suffix'; // 关键词位置
  keyword_types?: string[];  // 筛选关键词类型
  created_at?: string;
  updated_at?: string;
}

// 兼容性：保留旧的Mapping接口用于前端
export interface Mapping {
  paramName: string;        // 外部参数
  nodeId: string;
  fieldPath: string;        // e.g. "inputs.text" | "widgets_values.0"
  type: 'string' | 'number' | 'boolean';
  default?: any;
  required?: boolean;
  description?: string;
}

export interface GenerationRequest {
  [paramName: string]: any;
}

export interface GenerationResponse {
  url: string;
  duration: number;
  taskId?: string;
}

export interface GenerationProgress {
  taskId: string;
  progress: number;
  stage: string;
  error?: string;
}

// ComfyUI 相关类型
export interface ComfyUINode {
  class_type: string;
  inputs: Record<string, any>;
  widgets_values?: any[];
}

export interface ComfyUIWorkflow {
  [nodeId: string]: ComfyUINode;
}

export interface ComfyUIQueueResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

export interface ComfyUIProgressMessage {
  type: 'executing' | 'progress' | 'executed';
  data: {
    node?: string;
    prompt_id: string;
    value?: number;
    max?: number;
  };
}

// MCP 相关类型
export interface MCPMethod {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      default?: any;
    }>;
    required: string[];
  };
}

// AI 配置相关类型
export interface AIConfig {
  id?: string;
  provider: 'openai' | 'gemini' | 'custom';
  name: string;                    // 配置名称，如 "GPT-4" 或 "Gemini Pro"
  baseUrl: string;                 // API基础URL
  apiKey: string;                  // API密钥
  model: string;                   // 模型名称
  enabled: boolean;                // 是否启用
  headers?: Record<string, string>; // 额外的请求头
  maxTokens?: number;              // 最大token数
  temperature?: number;            // 温度参数
  createdAt?: string;
  updatedAt?: string;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];          // AI调用的工具
  toolResults?: ToolResult[];      // 工具执行结果
}

// 工具调用类型
export interface ToolCall {
  id: string;
  name: string;                    // 工具名称，如 "generateVerticalPainting"
  arguments: Record<string, any>;  // 调用参数
  timestamp: string;
}

// 工具结果类型
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result?: any;                    // 成功时的结果
  error?: string;                  // 失败时的错误信息
  timestamp: string;
}

// 聊天会话类型
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  configId: string;                // 使用的AI配置ID
  createdAt: string;
  updatedAt: string;
}

// 兼容性：保留ChatSession别名
export interface ChatSession extends ChatConversation {
  aiConfigId: string;              // 使用的AI配置ID
}

// AI API响应格式（OpenAI兼容）
export interface AIResponse {
  choices: Array<{
    message: {
      role: 'assistant';
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 关键词类型
export interface Keyword {
  id: string;
  kyeid: string;
  type: 'person' | 'action' | 'style';
  keyword_en: string;
  keyword_cn?: string;
  tags?: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 扩展的参数映射类型（包含关键词配置）
export interface ParameterMappingExtended extends ParameterMapping {
  keyword_enabled: boolean;
  keyword_position: 'prefix' | 'suffix';
  keyword_types?: string[];
}

// 关键词查询参数
export interface KeywordQueryParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

// 关键词导入结果
export interface KeywordImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
