import { Workflow, Mapping, GenerationRequest, ComfyUIWorkflow, ParameterMappingExtended } from './types';
import { getKeywordByKyeid } from './keywordService';

/**
 * 将外部参数注入到 ComfyUI 工作流 JSON 中
 */
export async function injectParameters(
  workflow: Workflow,
  params: GenerationRequest
): Promise<ComfyUIWorkflow> {
  // 深拷贝原始工作流
  const workflowJson = JSON.parse(JSON.stringify(workflow.json));

  // 应用每个映射
  const mappings = workflow.mappings || [];
  for (const mapping of mappings) {
    // 兼容旧的Mapping和新的ParameterMapping格式
    const paramName = (mapping as any).paramName || (mapping as any).api_parameter;
    const nodeId = (mapping as any).nodeId || (mapping as any).node_id;
    const fieldPath = (mapping as any).fieldPath || (mapping as any).field_name;
    const type = (mapping as any).type || (mapping as any).parameter_type || 'string';
    const defaultValue = (mapping as any).default !== undefined ? 
      (mapping as any).default : 
      ((mapping as any).default_value ? JSON.parse((mapping as any).default_value) : undefined);
    
    // 获取参数值
    let value = params[paramName];

    // 如果参数未提供，使用默认值
    if (value === undefined || value === null) {
      if (defaultValue !== undefined) {
        value = defaultValue;
      } else if (mapping.required) {
        throw new Error(`Required parameter '${paramName}' is missing`);
      } else {
        continue; // 跳过可选参数
      }
    }

    // 处理关键词注入（仅对string类型参数）
    if (type === 'string' && (mapping as any).keyword_enabled) {
      value = await resolveKeywords(value, mapping as ParameterMappingExtended, params);
    }

    // 类型转换
    value = convertValue(value, type);

    // 应用到工作流
    console.log(`INJECT: "${value}" -> [${nodeId}].${fieldPath}`);
    setValueByPath(workflowJson, nodeId, fieldPath, value);
  }

  // 验证注入结果
  if (workflowJson['9'] && workflowJson['9'].inputs) {
    console.log(`VERIFY: Node 9 text = "${workflowJson['9'].inputs.text}"`);
  }

  return workflowJson;
}

/**
 * 解析关键词并注入到文本参数中
 */
async function resolveKeywords(
  originalValue: string,
  mapping: ParameterMappingExtended,
  params: GenerationRequest
): Promise<string> {
  let result = originalValue;

  // 查找所有可能的key参数
  const keyParams = Object.keys(params).filter(key => key.endsWith('_key') || key === 'key');

  for (const keyParam of keyParams) {
    const keyValue = params[keyParam];
    if (!keyValue) continue;

    try {
      // 查询关键词
      const keyword = getKeywordByKyeid(keyValue);
      if (!keyword) {
        console.warn(`Keyword not found for key: ${keyValue}`);
        continue;
      }

      // 检查类型筛选
      if (mapping.keyword_types && mapping.keyword_types.length > 0) {
        const allowedTypes = typeof mapping.keyword_types === 'string'
          ? JSON.parse(mapping.keyword_types)
          : mapping.keyword_types;
        if (!allowedTypes.includes(keyword.type)) {
          console.warn(`Keyword type ${keyword.type} not allowed for parameter ${mapping.api_parameter}`);
          continue;
        }
      }

      // 使用英文关键词
      const keywordText = keyword.keyword_en;

      // 根据位置配置注入关键词
      if (mapping.keyword_position === 'suffix') {
        result = result ? `${result} ${keywordText}` : keywordText;
      } else {
        // 默认为prefix
        result = result ? `${keywordText} ${result}` : keywordText;
      }

      console.log(`Keyword injected: ${keyValue} -> "${keywordText}" at ${mapping.keyword_position}`);
    } catch (error) {
      console.error(`Error resolving keyword ${keyValue}:`, error);
    }
  }

  return result;
}

/**
 * 根据路径获取值
 */
function getValueByPath(
  workflowJson: ComfyUIWorkflow,
  nodeId: string,
  fieldPath: string
): any {
  try {
    if (!workflowJson[nodeId]) {
      return undefined;
    }

    const node = workflowJson[nodeId];
    const pathParts = fieldPath.split('.');

    let current: any = node;
    for (const part of pathParts) {
      if (/^\d+$/.test(part)) {
        const index = parseInt(part);
        if (!Array.isArray(current) || index >= current.length) {
          return undefined;
        }
        current = current[index];
      } else {
        if (!current || typeof current !== 'object' || !(part in current)) {
          return undefined;
        }
        current = current[part];
      }
    }

    return current;
  } catch (error) {
    return undefined;
  }
}

/**
 * 根据路径设置值
 */
function setValueByPath(
  workflowJson: ComfyUIWorkflow,
  nodeId: string,
  fieldPath: string,
  value: any
): void {
  // 检查节点是否存在
  if (!workflowJson[nodeId]) {
    throw new Error(`Node '${nodeId}' not found in workflow`);
  }

  const node = workflowJson[nodeId];
  const pathParts = fieldPath.split('.');

  // 导航到目标位置
  let current: any = node;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    
    // 处理数组索引
    if (/^\d+$/.test(part)) {
      const index = parseInt(part);
      if (!Array.isArray(current)) {
        throw new Error(`Expected array at path '${pathParts.slice(0, i + 1).join('.')}'`);
      }
      current = current[index];
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // 设置最终值
  const finalPart = pathParts[pathParts.length - 1];
  if (/^\d+$/.test(finalPart)) {
    const index = parseInt(finalPart);
    if (!Array.isArray(current)) {
      throw new Error(`Expected array at final path '${fieldPath}'`);
    }
    current[index] = value;
  } else {
    current[finalPart] = value;
  }
}

/**
 * 值类型转换
 */
function convertValue(value: any, type: 'string' | 'number' | 'boolean'): any {
  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Cannot convert '${value}' to number`);
      }
      return num;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      return Boolean(value);
    default:
      return value;
  }
}

/**
 * 从 ComfyUI 工作流中提取可映射的节点和字段
 */
export function extractMappableFields(workflowJson: ComfyUIWorkflow): Array<{
  nodeId: string;
  nodeType: string;
  field: string;
  fieldPath: string;
  currentValue: any;
  suggestedType: 'string' | 'number' | 'boolean';
}> {
  const mappableFields: Array<{
    nodeId: string;
    nodeType: string;
    field: string;
    fieldPath: string;
    currentValue: any;
    suggestedType: 'string' | 'number' | 'boolean';
  }> = [];

  // 遍历所有节点
  for (const [nodeId, node] of Object.entries(workflowJson)) {
    const nodeType = node.class_type;

    // 检查 inputs
    if (node.inputs) {
      for (const [inputKey, inputValue] of Object.entries(node.inputs)) {
        // 跳过数组类型的输入（通常是其他节点的引用）
        if (Array.isArray(inputValue)) continue;
        
        const fieldPath = `inputs.${inputKey}`;
        mappableFields.push({
          nodeId,
          nodeType,
          field: `${nodeType}.${inputKey}`,
          fieldPath,
          currentValue: inputValue,
          suggestedType: inferType(inputValue),
        });
      }
    }

    // 检查 widgets_values
    if (node.widgets_values && Array.isArray(node.widgets_values)) {
      node.widgets_values.forEach((value, index) => {
        const fieldPath = `widgets_values.${index}`;
        mappableFields.push({
          nodeId,
          nodeType,
          field: `${nodeType}.widget_${index}`,
          fieldPath,
          currentValue: value,
          suggestedType: inferType(value),
        });
      });
    }
  }

  return mappableFields;
}

/**
 * 推断值的类型
 */
function inferType(value: any): 'string' | 'number' | 'boolean' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

/**
 * 验证映射配置
 */
export function validateMappings(workflowJson: ComfyUIWorkflow, mappings: Mapping[]): string[] {
  const errors: string[] = [];

  for (const mapping of mappings) {
    const { paramName, nodeId, fieldPath } = mapping;

    // 检查节点是否存在
    if (!workflowJson[nodeId]) {
      errors.push(`Node '${nodeId}' not found for parameter '${paramName}'`);
      continue;
    }

    // 检查字段路径是否有效
    try {
      const pathParts = fieldPath.split('.');
      let current: any = workflowJson[nodeId];
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (/^\d+$/.test(part)) {
          const index = parseInt(part);
          if (!Array.isArray(current)) {
            throw new Error(`Expected array at path '${pathParts.slice(0, i + 1).join('.')}'`);
          }
          if (index >= current.length) {
            throw new Error(`Array index ${index} out of bounds`);
          }
          current = current[index];
        } else {
          if (!current || typeof current !== 'object' || !(part in current)) {
            throw new Error(`Field '${part}' not found`);
          }
          current = current[part];
        }
      }
    } catch (error) {
      errors.push(`Invalid field path '${fieldPath}' for parameter '${paramName}': ${(error as Error).message}`);
    }
  }

  return errors;
}