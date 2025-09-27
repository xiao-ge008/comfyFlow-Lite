import { NextApiRequest, NextApiResponse } from 'next';
import { 
  readWorkflows, 
  createWorkflow, 
  updateWorkflow, 
  deleteWorkflow, 
  getWorkflow,
  initializeStore
} from '@/lib/store';
import { extractMappableFields, validateMappings } from '@/lib/mapper';
import { ApiResponse } from '@/lib/types';

// 初始化存储
initializeStore();

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // 设置响应头以支持UTF-8编码
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
}

// 获取工作流列表或单个工作流
async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id, extract_fields } = req.query;

  if (id) {
    // 获取单个工作流
    const workflow = getWorkflow(id as string);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    let responseData: any = workflow;

    // 如果需要提取可映射字段
    if (extract_fields === 'true') {
      const mappableFields = extractMappableFields(workflow.json);
      responseData = {
        ...workflow,
        mappableFields
      };
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } else {
    // 获取所有工作流
    const workflows = readWorkflows();
    return res.status(200).json({
      success: true,
      data: workflows
    });
  }
}

// 创建工作流
async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { name, endpoint, description, json, mappings = [] } = req.body;

  // 验证必填字段
  if (!name || !endpoint || !json) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, endpoint, json'
    });
  }

  // 验证端点名称格式
  if (!/^[a-z0-9_-]+$/.test(endpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Endpoint must contain only lowercase letters, numbers, underscores, and hyphens'
    });
  }

  // 验证映射配置
  if (mappings.length > 0) {
    // 转换前端映射数据结构为验证函数期望的格式
    const mappingsForValidation = mappings
      .filter((mapping: any) => mapping && mapping.paramName && mapping.nodeId && mapping.field)
      .map((mapping: any) => ({
        paramName: mapping.paramName,
        nodeId: mapping.nodeId,
        fieldPath: mapping.field,
        type: mapping.type || 'string',
        default: mapping.default
      }));

    if (mappingsForValidation.length > 0) {
      const validationErrors = validateMappings(json, mappingsForValidation);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Mapping validation failed: ${validationErrors.join(', ')}`
        });
      }
    }
  }

  try {
    const workflow = createWorkflow({
      name,
      endpoint,
      description,
      json,
      mappings
    });

    return res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    return res.status(409).json({
      success: false,
      error: (error as Error).message
    });
  }
}

// 更新工作流
async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const queryId = req.query.id as string;
  const bodyId = req.body.id as string;
  const id = queryId || bodyId;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Workflow ID is required (in query or body)'
    });
  }

  const { name, endpoint, description, json, mappings } = req.body;

  // 如果更新了端点名称，验证格式
  if (endpoint && !/^[a-z0-9_-]+$/.test(endpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Endpoint must contain only lowercase letters, numbers, underscores, and hyphens'
    });
  }

  // 如果更新了映射配置，验证
  if (mappings && json) {
    // 转换前端映射数据结构为验证函数期望的格式
    const mappingsForValidation = mappings
      .filter((mapping: any) => mapping && mapping.paramName && mapping.nodeId && mapping.field)
      .map((mapping: any) => ({
        paramName: mapping.paramName,
        nodeId: mapping.nodeId,
        fieldPath: mapping.field,
        type: mapping.type || 'string',
        default: mapping.default
      }));

    if (mappingsForValidation.length > 0) {
      const validationErrors = validateMappings(json, mappingsForValidation);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Mapping validation failed: ${validationErrors.join(', ')}`
        });
      }
    }
  }

  try {
    const workflow = updateWorkflow(id as string, {
      name,
      endpoint,
      description,
      json,
      mappings
    });

    return res.status(200).json({
      success: true,
      data: workflow,
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: (error as Error).message
      });
    }
    return res.status(409).json({
      success: false,
      error: (error as Error).message
    });
  }
}

// 删除工作流
async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id } = req.query;

  console.log(`[API] 收到删除工作流请求: ${id}`);

  if (!id) {
    console.log('[API] 删除请求缺少工作流ID');
    return res.status(400).json({
      success: false,
      error: 'Workflow ID is required'
    });
  }

  try {
    console.log(`[API] 开始删除工作流: ${id}`);
    const success = deleteWorkflow(id as string);

    if (!success) {
      console.log(`[API] 工作流删除失败: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Workflow not found or deletion failed'
      });
    }

    console.log(`[API] 工作流删除成功: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error(`[API] 删除工作流时发生错误 (${id}):`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during deletion'
    });
  }
}