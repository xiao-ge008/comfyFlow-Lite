import { NextApiRequest, NextApiResponse } from 'next';
import { readWorkflows, initializeStore } from '@/lib/store';
import { injectParameters } from '@/lib/mapper';
import { getComfyUIClient } from '@/lib/comfy';

// 初始化存储
initializeStore();

// MCP JSON-RPC 请求类型
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number;
}

// MCP JSON-RPC 响应类型
interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
}

// 工具定义
const TOOLS = [
  {
    name: 'generateVerticalPainting',
    description: 'Generate vertical painting images using AI',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt for image generation'
        }
      },
      required: ['prompt']
    }
  }
];

// 主要的API处理器
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 处理GET请求 - 返回服务器信息
  if (req.method === 'GET') {
    return res.json({
      name: 'ComfyFlow MCP Server',
      version: '1.0.0',
      description: 'MCP server for ComfyUI image generation',
      tools: TOOLS
    });
  }

  // 只处理POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mcpRequest: MCPRequest = req.body;
    const { method, params, id } = mcpRequest;

    // 处理不同的MCP方法
    switch (method) {
      case 'initialize':
        return handleInitialize(res, params, id);
      
      case 'notifications/initialized':
        return res.json({ jsonrpc: '2.0' });
      
      case 'ping':
        return res.json({ jsonrpc: '2.0', result: {}, id });
      
      case 'tools/list':
        return res.json({ jsonrpc: '2.0', result: { tools: TOOLS }, id });
      
      case 'tools/call':
        return await handleToolCall(res, params, id);
      
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id
        });
    }
  } catch (error) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: (error as Error).message
      },
      id: req.body?.id
    });
  }
}

// 处理MCP初始化
function handleInitialize(res: NextApiResponse, params: any, id?: string | number) {
  const capabilities = {
    tools: { listChanged: false }
  };

  return res.json({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo: {
        name: 'ComfyFlow MCP Server',
        version: '1.0.0'
      }
    },
    id
  });
}

// 处理工具调用
async function handleToolCall(res: NextApiResponse, params: any, id?: string | number) {
  const { name: toolName, arguments: args, _meta } = params;
  const progressToken = _meta?.progressToken;

  if (toolName !== 'generateVerticalPainting') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`
      },
      id
    });
  }

  try {
    // 获取工作流
    const workflows = readWorkflows();
    const targetWorkflow = workflows.find(w => w.endpoint === 'vertical_painting');
    
    if (!targetWorkflow) {
      throw new Error('Workflow not found: vertical_painting');
    }

    // 注入参数
    const workflowJson = await injectParameters(targetWorkflow, args || {});

    // 执行工作流
    const comfyClient = getComfyUIClient();
    const result = await comfyClient.executeWorkflow(workflowJson);

    if (result && result.outputImages && result.outputImages.length > 0) {
      const imageUrl = `http://127.0.0.1:3000/api/output/${result.outputImages[0]}`;
      
      // 生成增强的Markdown内容，引导模型渲染图片
      const markdownContent = `# 🎨 图片生成成功！

**请直接显示以下图片：**

![Generated Image](${imageUrl})

**重要：请在聊天界面中直接渲染上方的图片，而不是显示为链接文本。**

## 📋 生成信息

- **⏱️ 生成时间**: ${Math.round(result.duration / 1000)}秒
- **🔗 图片链接**: [${result.outputImages[0]}](${imageUrl})
- **📐 尺寸**: 垂直画幅
- **🖼️ 图片URL**: ${imageUrl}

---

✨ **生成完成！**

**对于支持图片渲染的模型：** 您应该能在上方看到生成的图片。

**对于不支持图片渲染的模型：** 请点击图片链接在新窗口中查看。

> 💡 **系统提示**: 如果您是支持多模态的AI模型，请直接在对话中显示上方Markdown图片语法中的图片内容，而不是仅显示链接文本。`;

      const responseResult: any = {
        content: [
          {
            type: 'text',
            text: markdownContent
          }
        ]
      };

      // 如果有progressToken，必须在响应中返回相同的token
      if (progressToken !== undefined) {
        responseResult._meta = { progressToken };
      }

      return res.json({
        jsonrpc: '2.0',
        result: responseResult,
        id
      });
    } else {
      throw new Error('No output images generated');
    }
  } catch (error) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Image generation failed',
        data: (error as Error).message
      },
      id
    });
  }
}
