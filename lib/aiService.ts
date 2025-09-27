import axios from 'axios';
import { AIConfig, AIResponse, ChatMessage, ToolCall, ToolResult } from './types';
import { readWorkflows } from './store';

export class AIService {
  private config: AIConfig;
  
  constructor(config: AIConfig) {
    this.config = config;
  }
  
  /**
   * 发送聊天消息到AI服务
   */
  async sendMessage(
    messages: ChatMessage[],
    onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>
  ): Promise<ChatMessage> {
    const tools = this.getMCPTools();
    
    try {
      const requestBody = this.buildRequestBody(messages, tools);
      const response = await this.callAIAPI(requestBody);
      
      const assistantMessage = this.parseAIResponse(response);
      
      // 如果AI调用了工具，执行工具调用
      if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0 && onToolCall) {
        const toolResults: ToolResult[] = [];
        
        for (const toolCall of assistantMessage.toolCalls) {
          const result = await onToolCall(toolCall);
          toolResults.push(result);
        }
        
        assistantMessage.toolResults = toolResults;
      }
      
      return assistantMessage;
      
    } catch (error) {
      console.error('AI Service error:', error);
      throw new Error(`AI服务调用失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 构建API请求体
   */
  private buildRequestBody(messages: ChatMessage[], tools: any[]): any {
    const apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.toolCalls && {
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }))
      }),
      ...(msg.toolResults && {
        tool_call_id: msg.toolResults[0]?.toolCallId,
        name: msg.toolResults[0]?.success ? 'success' : 'error',
        content: JSON.stringify(msg.toolResults[0]?.result || msg.toolResults[0]?.error)
      })
    }));
    
    const requestBody: any = {
      model: this.config.model,
      messages: apiMessages,
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7,
    };
    
    // 添加工具定义
    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    
    return requestBody;
  }
  
  /**
   * 调用AI API
   */
  private async callAIAPI(requestBody: any): Promise<AIResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.headers || {})
    };
    
    let url: string;
    let transformedRequestBody: any;
    
    if (this.config.provider === 'gemini') {
      // Gemini API 使用不同的端点和请求格式
      headers['x-goog-api-key'] = this.config.apiKey;
      url = `${this.config.baseUrl.replace(/\/$/, '')}/models/${this.config.model}:generateContent`;
      
      // 转换请求格式为Gemini格式
      transformedRequestBody = this.transformToGeminiFormat(requestBody);
    } else {
      // OpenAI 或自定义提供商
      if (this.config.provider === 'openai') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      } else {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      url = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      transformedRequestBody = requestBody;
    }
    
    console.log('AI API Request:', {
      url,
      provider: this.config.provider,
      model: this.config.model,
      messagesCount: requestBody.messages?.length,
      toolsCount: requestBody.tools?.length || 0,
      headers: {
        ...headers,
        Authorization: headers.Authorization ? '[REDACTED]' : undefined,
        'x-goog-api-key': headers['x-goog-api-key'] ? '[REDACTED]' : undefined
      }
    });
    
    try {
      const response = await axios.post(url, transformedRequestBody, {
        headers,
        timeout: 60000, // 60秒超时
      });
      
      console.log('AI API Response:', {
        status: response.status,
        choicesCount: response.data.choices?.length || 0
      });
      
      return response.data;
    } catch (error: any) {
      console.error('AI API Error Details:', {
        url,
        provider: this.config.provider,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }
  
  /**
   * 转换请求格式为Gemini格式
   */
  private transformToGeminiFormat(requestBody: any): any {
    const contents = requestBody.messages.map((msg: any) => {
      if (msg.role === 'system') {
        // Gemini 通过 systemInstruction 处理 system message
        return null;
      } else if (msg.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: msg.content }]
        };
      } else if (msg.role === 'assistant') {
        return {
          role: 'model',
          parts: [{ text: msg.content }]
        };
      }
      return null;
    }).filter(Boolean);
    
    // 获取 system message
    const systemMessage = requestBody.messages.find((msg: any) => msg.role === 'system');
    
    const geminiRequest: any = {
      contents,
      generationConfig: {
        temperature: requestBody.temperature || 0.7,
        maxOutputTokens: requestBody.max_tokens || 2000,
      }
    };
    
    // 添加 system instruction
    if (systemMessage) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }
    
    // 添加工具定义到Gemini格式
    if (requestBody.tools && requestBody.tools.length > 0) {
      geminiRequest.tools = [{
        functionDeclarations: requestBody.tools.map((tool: any) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        }))
      }];
    }
    
    return geminiRequest;
  }
  
  /**
   * 解析AI响应
   */
  private parseAIResponse(response: AIResponse): ChatMessage {
    if (this.config.provider === 'gemini') {
      return this.parseGeminiResponse(response);
    } else {
      return this.parseOpenAIResponse(response);
    }
  }
  
  /**
   * 解析OpenAI格式响应
   */
  private parseOpenAIResponse(response: AIResponse): ChatMessage {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('AI响应格式错误：没有返回选择项');
    }
    
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: 'assistant',
      content: choice.message.content || '',
      timestamp: new Date().toISOString(),
    };
    
    // 解析工具调用
    if (choice.message.tool_calls) {
      message.toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
        timestamp: new Date().toISOString(),
      }));
    }
    
    return message;
  }
  
  /**
   * 解析Gemini格式响应
   */
  private parseGeminiResponse(response: any): ChatMessage {
    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('Gemini响应格式错误：没有返回候选项');
    }
    
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    
    // 处理各种类型的parts
    const parts = candidate.content.parts || [];
    const textParts: string[] = [];
    const functionCalls: any[] = [];
    
    parts.forEach((part: any) => {
      if (part.text) {
        textParts.push(part.text);
      } else if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    });
    
    message.content = textParts.join('') || '';
    
    // 处理工具调用
    if (functionCalls.length > 0) {
      message.toolCalls = functionCalls.map((fc, index) => ({
        id: `call_${Date.now()}_${index}`,
        name: fc.name,
        arguments: fc.args || {},
        timestamp: new Date().toISOString(),
      }));
    }
    
    return message;
  }
  
  /**
   * 获取MCP工具定义
   */
  private getMCPTools(): any[] {
    const workflows = readWorkflows();
    
    // 从本地存储读取选中的工具
    let selectedToolIds: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedMCPTools');
        if (saved) {
          selectedToolIds = JSON.parse(saved);
        }
      } catch (error) {
        console.warn('加载工具选择失败:', error);
      }
    }
    
    // 只返回选中的工具，如果没有选择则返回所有工具
    const filteredWorkflows = selectedToolIds.length > 0 
      ? workflows.filter(w => selectedToolIds.includes(w.id))
      : workflows;
    
    return filteredWorkflows.map(workflow => ({
      type: 'function',
      function: {
        name: this.getToolName(workflow.endpoint),
        description: `生成图片使用工作流: ${workflow.name}${workflow.description ? ` - ${workflow.description}` : ''}`,
        parameters: {
          type: 'object',
          properties: this.buildToolParameters(workflow),
          required: this.getRequiredParameters(workflow)
        }
      }
    }));
  }
  
  /**
   * 根据端点名称生成工具名称
   */
  private getToolName(endpoint: string): string {
    // 将 vertical-painting 转换为 generateVerticalPainting
    const pascalCase = endpoint
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    return `generate${pascalCase}`;
  }
  
  /**
   * 构建工具参数定义
   */
  private buildToolParameters(workflow: any): Record<string, any> {
    const properties: Record<string, any> = {};
    
    if (workflow.mappings) {
      workflow.mappings.forEach((mapping: any) => {
        const paramName = mapping.api_parameter || mapping.paramName;
        const paramType = mapping.parameter_type || mapping.type || 'string';
        
        properties[paramName] = {
          type: paramType === 'number' ? 'number' : paramType === 'boolean' ? 'boolean' : 'string',
          description: mapping.description || `${paramName} 参数`
        };
        
        // 添加默认值
        const defaultValue = mapping.default_value 
          ? JSON.parse(mapping.default_value) 
          : mapping.default;
        if (defaultValue !== undefined) {
          properties[paramName].default = defaultValue;
        }
      });
    }
    
    return properties;
  }
  
  /**
   * 获取必需参数列表
   */
  private getRequiredParameters(workflow: any): string[] {
    if (!workflow.mappings) return [];
    
    return workflow.mappings
      .filter((mapping: any) => mapping.required)
      .map((mapping: any) => mapping.api_parameter || mapping.paramName);
  }
}

/**
 * 根据配置创建AI服务实例
 */
export function createAIService(config: AIConfig): AIService {
  return new AIService(config);
}