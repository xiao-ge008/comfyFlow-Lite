import type { NextApiRequest, NextApiResponse } from 'next';
import { AIService, createAIService } from '../../../lib/aiService';
import { ChatMessage, ToolCall, ToolResult, AIConfig } from '../../../lib/types';
import getDatabase from '../../../lib/database';
import axios from 'axios';

interface ChatRequest {
  configId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}

interface ChatResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '仅支持POST请求'
    });
  }

  try {
    const { configId, messages, systemPrompt } = req.body as ChatRequest;

    if (!configId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: '请求参数错误：需要configId和messages'
      });
    }

    // 读取AI配置
    const config = await getAIConfig(configId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: '未找到指定的AI配置'
      });
    }

    // 准备消息列表
    let chatMessages = [...messages];
    
    // 如果提供了系统提示，添加到消息开头
    if (systemPrompt && (chatMessages.length === 0 || chatMessages[0].role !== 'system')) {
      chatMessages.unshift({
        id: `system_${Date.now()}`,
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString()
      });
    }

    // 创建 AI服务实例
    console.log('Using AI Config:', {
      id: config.id,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      enabled: config.enabled
    });
    
    const aiService = createAIService(config);

    // 定义工具调用处理器
    const handleToolCall = async (toolCall: ToolCall): Promise<ToolResult> => {
      console.log('执行工具调用:', toolCall);
      
      try {
        // 调用ComfyUI生成图片
        const result = await executeComfyUITool(toolCall);
        
        return {
          toolCallId: toolCall.id,
          success: true,
          result,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('工具调用失败:', error);
        
        return {
          toolCallId: toolCall.id,
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        };
      }
    };

    // 发送消息到AI
    const responseMessage = await aiService.sendMessage(chatMessages, handleToolCall);

    res.status(200).json({
      success: true,
      message: responseMessage
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: `聊天服务错误: ${(error as Error).message}`
    });
  }
}

/**
 * 执行ComfyUI工具调用
 */
async function executeComfyUITool(toolCall: ToolCall): Promise<any> {
  const { name, arguments: args } = toolCall;
  
  // 从工具名称推断端点
  const endpoint = getEndpointFromToolName(name);
  if (!endpoint) {
    throw new Error(`未知的工具: ${name}`);
  }

  // 构建请求
  const generateRequest = {
    method: 'POST',
    url: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/generate/${endpoint}`,
    data: {
      ...args,
      force: true // 强制生成，不使用缓存
    },
    timeout: 120000, // 2分钟超时
  };

  console.log('调用ComfyUI:', generateRequest);

  const response = await axios(generateRequest);
  
  if (!response.data.success) {
    throw new Error(response.data.error || '图片生成失败');
  }

  return {
    imageUrl: response.data.data?.url ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${response.data.data.url}` : undefined,
    prompt: args['9_text'] || args.prompt || args.text || '生成的图片',
    workflow: endpoint,
    parameters: args,
    duration: response.data.data?.duration,
    cached: response.data.data?.cached
  };
}

/**
 * 从工具名称获取端点
 */
function getEndpointFromToolName(toolName: string): string | null {
  // generateVerticalPainting -> vertical-painting
  if (!toolName.startsWith('generate')) {
    return null;
  }
  
  const pascalCase = toolName.slice(8); // 移除 'generate' 前缀
  
  // 将PascalCase转换为kebab-case
  const kebabCase = pascalCase
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .slice(1); // 移除开头的 '-'
  
  return kebabCase;
}

/**
 * 从数据库获取AI配置
 */
async function getAIConfig(configId: string): Promise<AIConfig | null> {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND enabled = 1');
    const row = stmt.get(configId);
    
    if (!row) {
      return null;
    }
    
    return convertDbRowToAIConfig(row);
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return null;
  }
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
