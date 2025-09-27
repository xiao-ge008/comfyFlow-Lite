import { v4 as uuidv4 } from 'uuid';
import { Workflow, ParameterMapping, Mapping } from './types';
import getDatabase from './database';
import Database from 'better-sqlite3';
import { safeExecute } from './build-utils';

// 数据库操作工具函数
function convertDbRowToWorkflow(row: any): Workflow {
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    description: row.description,
    json: JSON.parse(row.json),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function convertParameterMappingToMapping(mapping: ParameterMapping): Mapping {
  return {
    paramName: mapping.api_parameter,
    nodeId: mapping.node_id,
    fieldPath: mapping.field_name,
    type: mapping.parameter_type as 'string' | 'number' | 'boolean',
    default: mapping.default_value ? JSON.parse(mapping.default_value) : undefined,
    required: mapping.required,
    description: mapping.description,
  };
}

function convertMappingToParameterMapping(workflowId: string, mapping: Mapping): Omit<ParameterMapping, 'id' | 'created_at' | 'updated_at'> {
  return {
    workflow_id: workflowId,
    api_parameter: mapping.paramName,
    node_id: mapping.nodeId,
    field_name: mapping.fieldPath,
    description: mapping.description,
    parameter_type: mapping.type,
    default_value: mapping.default !== undefined ? JSON.stringify(mapping.default) : undefined,
    required: mapping.required || false,
  };
}

// 读取工作流列表
export function readWorkflows(): Workflow[] {
  return safeExecute(() => {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM workflows 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all();
    
    const workflows = rows.map(convertDbRowToWorkflow);
    
    // 为每个工作流加载参数映射
    for (const workflow of workflows) {
      workflow.mappings = getWorkflowMappings(workflow.id);
    }
    
    return workflows;
  }, [], 'Skipping workflow reading during build phase');
}

// 获取工作流的参数映射
function getWorkflowMappings(workflowId: string): ParameterMapping[] {
  return safeExecute(() => {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM parameter_mappings
      WHERE workflow_id = ?
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(workflowId) as any[];

    // 转换数据库字段名为前端期望的格式
    return rows.map(row => ({
      ...row,
      // 添加驼峰命名的字段以兼容前端
      keywordEnabled: row.keyword_enabled || false,
      keywordPosition: row.keyword_position || 'prefix',
      keywordTypes: row.keyword_types ? JSON.parse(row.keyword_types) : []
    })) as ParameterMapping[];
  }, [], 'Skipping parameter mappings reading during build phase');
}

// 写入工作流列表（数据库不再需要此函数）
// 保留以保持兼容性
export function writeWorkflows(workflows: Workflow[]): void {
  console.warn('writeWorkflows is deprecated. Use individual create/update/delete operations instead.');
}

// 获取单个工作流
export function getWorkflow(id: string): Workflow | null {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) {
      return null;
    }
    
    const workflow = convertDbRowToWorkflow(row);
    workflow.mappings = getWorkflowMappings(workflow.id);
    
    return workflow;
  } catch (error) {
    console.error('Error getting workflow from database:', error);
    return null;
  }
}

// 根据端点名称获取工作流
export function getWorkflowByEndpoint(endpoint: string): Workflow | null {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare('SELECT * FROM workflows WHERE endpoint = ?');
    const row = stmt.get(endpoint);
    
    if (!row) {
      return null;
    }
    
    const workflow = convertDbRowToWorkflow(row);
    workflow.mappings = getWorkflowMappings(workflow.id);
    
    return workflow;
  } catch (error) {
    console.error('Error getting workflow by endpoint from database:', error);
    return null;
  }
}

// 创建工作流
export function createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow {
  const db = getDatabase();
  
  // 检查端点名称是否已存在
  const existingStmt = db.prepare('SELECT id FROM workflows WHERE endpoint = ?');
  if (existingStmt.get(data.endpoint)) {
    throw new Error(`Endpoint '${data.endpoint}' already exists`);
  }

  const workflowId = uuidv4();
  const now = new Date().toISOString();
  
  try {
    // 开启事务
    const transaction = db.transaction(() => {
      // 插入工作流
      const insertWorkflowStmt = db.prepare(`
        INSERT INTO workflows (id, name, endpoint, description, json, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertWorkflowStmt.run(
        workflowId,
        data.name,
        data.endpoint,
        data.description || null,
        JSON.stringify(data.json),
        data.enabled !== false ? 1 : 0, // 默认启用，转为整数
        now,
        now
      );
      
      // 如果有mappings，插入参数映射
      if (data.mappings && data.mappings.length > 0) {
        const insertMappingStmt = db.prepare(`
          INSERT INTO parameter_mappings (id, workflow_id, api_parameter, node_id, field_name, description, parameter_type, default_value, required, keyword_enabled, keyword_position, keyword_types, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const mapping of data.mappings) {
          // 统一转换格式，兼容旧新格式
          const paramMapping = {
            workflow_id: workflowId,
            api_parameter: (mapping as any).paramName || (mapping as any).api_parameter,
            node_id: (mapping as any).nodeId || (mapping as any).node_id,
            field_name: (mapping as any).field || (mapping as any).fieldPath || (mapping as any).field_name,
            description: (mapping as any).description || '',
            parameter_type: (mapping as any).type || (mapping as any).parameter_type || 'string',
            default_value: (mapping as any).default !== undefined ?
              JSON.stringify((mapping as any).default) :
              ((mapping as any).default_value || null),
            required: (mapping as any).required || false,
            // 关键词配置
            keyword_enabled: (mapping as any).keywordEnabled || false,
            keyword_position: (mapping as any).keywordPosition || 'prefix',
            keyword_types: (mapping as any).keywordTypes && (mapping as any).keywordTypes.length > 0 ?
              JSON.stringify((mapping as any).keywordTypes) : null,
          };
          
          // 验证必填字段
          if (!paramMapping.api_parameter || !paramMapping.node_id || !paramMapping.field_name) {
            console.error('Invalid mapping data:', mapping);
            continue;
          }
          insertMappingStmt.run(
            uuidv4(),
            paramMapping.workflow_id,
            paramMapping.api_parameter,
            paramMapping.node_id,
            paramMapping.field_name,
            paramMapping.description || null,
            paramMapping.parameter_type,
            paramMapping.default_value || null,
            paramMapping.required ? 1 : 0,
            paramMapping.keyword_enabled ? 1 : 0,
            paramMapping.keyword_position,
            paramMapping.keyword_types,
            now,
            now
          );
        }
      }
    });
    
    transaction();
    
    // 返回创建的工作流
    return getWorkflow(workflowId)!;
    
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw new Error('Failed to create workflow');
  }
}

// 更新工作流
export function updateWorkflow(id: string, data: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Workflow {
  const db = getDatabase();
  
  // 检查工作流是否存在
  const existingWorkflow = getWorkflow(id);
  if (!existingWorkflow) {
    throw new Error(`Workflow with id '${id}' not found`);
  }

  // 检查端点名称是否已被其他工作流使用
  if (data.endpoint) {
    const existingStmt = db.prepare('SELECT id FROM workflows WHERE endpoint = ? AND id != ?');
    if (existingStmt.get(data.endpoint, id)) {
      throw new Error(`Endpoint '${data.endpoint}' already exists`);
    }
  }

  try {
    // 开启事务
    const transaction = db.transaction(() => {
      // 更新工作流基本信息
      const updateFields = [];
      const values = [];
      
      if (data.name !== undefined) {
        updateFields.push('name = ?');
        values.push(data.name);
      }
      if (data.endpoint !== undefined) {
        updateFields.push('endpoint = ?');
        values.push(data.endpoint);
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        values.push(data.description);
      }
      if (data.json !== undefined) {
        updateFields.push('json = ?');
        values.push(JSON.stringify(data.json));
      }
      if (data.enabled !== undefined) {
        updateFields.push('enabled = ?');
        values.push(data.enabled ? 1 : 0);
      }
      
      // 始终更新 updated_at
      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      if (updateFields.length > 1) { // > 1 因为始终有 updated_at
        const updateStmt = db.prepare(`
          UPDATE workflows 
          SET ${updateFields.join(', ')} 
          WHERE id = ?
        `);
        updateStmt.run(...values, id);
      }
      
      // 如果有mappings更新，先删除旧的，再插入新的
      if (data.mappings !== undefined) {
        // 删除旧的映射
        const deleteMappingsStmt = db.prepare('DELETE FROM parameter_mappings WHERE workflow_id = ?');
        deleteMappingsStmt.run(id);
        
        // 插入新的映射
        if (data.mappings.length > 0) {
          const insertMappingStmt = db.prepare(`
            INSERT INTO parameter_mappings (id, workflow_id, api_parameter, node_id, field_name, description, parameter_type, default_value, required, keyword_enabled, keyword_position, keyword_types, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const now = new Date().toISOString();
          for (const mapping of data.mappings) {
            // 统一转换格式，兼容旧新格式
            const paramMapping = {
              workflow_id: id,
              api_parameter: (mapping as any).paramName || (mapping as any).api_parameter,
              node_id: (mapping as any).nodeId || (mapping as any).node_id,
              field_name: (mapping as any).field || (mapping as any).fieldPath || (mapping as any).field_name,
              description: (mapping as any).description || '',
              parameter_type: (mapping as any).type || (mapping as any).parameter_type || 'string',
              default_value: (mapping as any).default !== undefined ?
                JSON.stringify((mapping as any).default) :
                ((mapping as any).default_value || null),
              required: (mapping as any).required || false,
              // 关键词配置
              keyword_enabled: (mapping as any).keywordEnabled || false,
              keyword_position: (mapping as any).keywordPosition || 'prefix',
              keyword_types: (mapping as any).keywordTypes && (mapping as any).keywordTypes.length > 0 ?
                JSON.stringify((mapping as any).keywordTypes) : null,
            };
            
            // 验证必填字段
            if (!paramMapping.api_parameter || !paramMapping.node_id || !paramMapping.field_name) {
              console.error('Invalid mapping data:', mapping);
              continue;
            }
            insertMappingStmt.run(
              uuidv4(),
              paramMapping.workflow_id,
              paramMapping.api_parameter,
              paramMapping.node_id,
              paramMapping.field_name,
              paramMapping.description || null,
              paramMapping.parameter_type,
              paramMapping.default_value || null,
              paramMapping.required ? 1 : 0,
              paramMapping.keyword_enabled ? 1 : 0,
              paramMapping.keyword_position,
              paramMapping.keyword_types,
              now,
              now
            );
          }
        }
      }
    });
    
    transaction();
    
    // 返回更新后的工作流
    return getWorkflow(id)!;
    
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw new Error('Failed to update workflow');
  }
}

// 删除工作流
export function deleteWorkflow(id: string): boolean {
  const db = getDatabase();

  try {
    console.log(`[deleteWorkflow] 开始删除工作流: ${id}`);

    // 首先检查工作流是否存在
    const checkStmt = db.prepare('SELECT id, name FROM workflows WHERE id = ?');
    const existingWorkflow = checkStmt.get(id) as { id: string; name: string } | undefined;

    if (!existingWorkflow) {
      console.log(`[deleteWorkflow] 工作流不存在: ${id}`);
      return false;
    }

    console.log(`[deleteWorkflow] 找到工作流: ${existingWorkflow.name} (${id})`);

    // 检查相关的参数映射数量
    const countMappingsStmt = db.prepare('SELECT COUNT(*) as count FROM parameter_mappings WHERE workflow_id = ?');
    const mappingCount = countMappingsStmt.get(id) as { count: number };
    console.log(`[deleteWorkflow] 找到 ${mappingCount.count} 个相关的参数映射`);

    // 使用事务确保数据一致性
    const transaction = db.transaction(() => {
      // 由于外键约束设置了 ON DELETE CASCADE，删除 workflow 时会自动删除相关的 parameter_mappings
      const deleteStmt = db.prepare('DELETE FROM workflows WHERE id = ?');
      const result = deleteStmt.run(id);

      console.log(`[deleteWorkflow] 删除结果: ${result.changes} 行受影响`);

      // 验证参数映射是否也被删除
      const remainingMappings = countMappingsStmt.get(id) as { count: number };
      console.log(`[deleteWorkflow] 删除后剩余参数映射: ${remainingMappings.count} 个`);

      return result.changes > 0;
    });

    const success = transaction();
    console.log(`[deleteWorkflow] 删除操作${success ? '成功' : '失败'}: ${id}`);

    return success;

  } catch (error) {
    console.error(`[deleteWorkflow] 删除工作流时发生错误 (${id}):`, error);
    return false;
  }
}

// 获取所有端点
export function getAllEndpoints(): string[] {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare('SELECT endpoint FROM workflows ORDER BY endpoint');
    const rows = stmt.all();
    return rows.map((row: any) => row.endpoint);
  } catch (error) {
    console.error('Error getting all endpoints:', error);
    return [];
  }
}

// 数据库初始化
export function initializeStore() {
  // 仅初始化数据库连接，表结构由 database/index.ts 负责
  getDatabase();
  console.log('Store initialized with database backend');
}

// 新增: 获取所有启用的工作流
export function getEnabledWorkflows(): Workflow[] {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM workflows 
      WHERE enabled = 1
      ORDER BY created_at DESC
    `);
    const rows = stmt.all();
    
    const workflows = rows.map(convertDbRowToWorkflow);
    
    // 为每个工作流加载参数映射
    for (const workflow of workflows) {
      workflow.mappings = getWorkflowMappings(workflow.id);
    }
    
    return workflows;
  } catch (error) {
    console.error('Error reading enabled workflows from database:', error);
    return [];
  }
}
