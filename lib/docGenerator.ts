import { Workflow, ParameterMapping } from './types';

/**
 * 生成API接口文档
 */
export function generateApiDoc(workflow: Workflow): string {
  const { name, endpoint, description, mappings = [] } = workflow;
  
  // 基础信息
  const doc = `# ${name} API接口文档

## 接口概述
- **接口名称**: ${name}
- **接口描述**: ${description || '暂无描述'}
- **请求方法**: POST
- **请求URL**: \`http://your-domain.com/api/mcp/${endpoint}\`
- **Content-Type**: application/json

## 请求参数

${generateParametersTable(mappings)}

## 请求示例

\`\`\`json
${generateRequestExample(mappings)}
\`\`\`

## 响应示例

### 成功响应
\`\`\`json
{
  "success": true,
  "data": {
    "outputImages": ["generated_image_001.png", "generated_image_002.png"],
    "executionTime": "3.2s",
    "timestamp": "${new Date().toISOString()}"
  },
  "message": "工作流执行成功"
}
\`\`\`

### 错误响应
\`\`\`json
{
  "success": false,
  "error": "参数验证失败: 缺少必填参数 'prompt'",
  "code": "VALIDATION_ERROR"
}
\`\`\`

## 错误码说明

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| WORKFLOW_NOT_FOUND | 404 | 指定的工作流不存在 |
| EXECUTION_ERROR | 500 | 工作流执行过程中发生错误 |
| TIMEOUT_ERROR | 408 | 工作流执行超时 |

## 使用说明

1. **认证**: 目前接口无需认证，生产环境建议添加API Key验证
2. **限流**: 建议实施适当的请求频率限制
3. **超时**: 工作流执行可能需要较长时间，建议设置合适的超时时间
4. **图片获取**: 返回的图片文件名可通过 \`/api/output/{filename}\` 接口获取

## 集成示例

### JavaScript (Fetch)
\`\`\`javascript
const response = await fetch('http://your-domain.com/api/mcp/${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${generateRequestExample(mappings, 2)})
});

const result = await response.json();
if (result.success) {
  console.log('生成的图片:', result.data.outputImages);
} else {
  console.error('错误:', result.error);
}
\`\`\`

### Python (requests)
\`\`\`python
import requests

url = 'http://your-domain.com/api/mcp/${endpoint}'
data = ${generatePythonRequestExample(mappings)}

response = requests.post(url, json=data)
result = response.json()

if result['success']:
    print('生成的图片:', result['data']['outputImages'])
else:
    print('错误:', result['error'])
\`\`\`

### cURL
\`\`\`bash
curl -X POST http://your-domain.com/api/mcp/${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${generateRequestExample(mappings).replace(/'/g, "\\'")}'
\`\`\`

---
*文档生成时间: ${new Date().toLocaleString('zh-CN')}*
*工作流版本: ${workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleString('zh-CN') : '未知'}*`;

  return doc;
}

/**
 * 生成参数表格
 */
function generateParametersTable(mappings: ParameterMapping[]): string {
  if (mappings.length === 0) {
    return '该接口无需参数。';
  }

  const header = '| 参数名 | 类型 | 必填 | 默认值 | 描述 |\n|--------|------|------|--------|------|';
  
  const rows = mappings.map(mapping => {
    const paramName = mapping.api_parameter;
    const type = getTypeDisplayName(mapping.parameter_type);
    const required = mapping.required ? '是' : '否';
    const defaultValue = mapping.default_value ? `\`${mapping.default_value}\`` : '-';
    const description = mapping.description || '暂无描述';
    
    return `| ${paramName} | ${type} | ${required} | ${defaultValue} | ${description} |`;
  });

  return header + '\n' + rows.join('\n');
}

/**
 * 生成请求示例
 */
function generateRequestExample(mappings: ParameterMapping[], indent: number = 0): string {
  if (mappings.length === 0) {
    return '{}';
  }

  const example: Record<string, any> = {};
  
  mappings.forEach(mapping => {
    const paramName = mapping.api_parameter;
    const type = mapping.parameter_type;
    const defaultValue = mapping.default_value;
    
    example[paramName] = generateExampleValue(type, defaultValue, paramName);
  });

  return JSON.stringify(example, null, indent || 2);
}

/**
 * 生成Python请求示例
 */
function generatePythonRequestExample(mappings: ParameterMapping[]): string {
  if (mappings.length === 0) {
    return '{}';
  }

  const example: Record<string, any> = {};
  
  mappings.forEach(mapping => {
    const paramName = mapping.api_parameter;
    const type = mapping.parameter_type;
    const defaultValue = mapping.default_value;
    
    example[paramName] = generateExampleValue(type, defaultValue, paramName);
  });

  // 转换为Python字典格式
  return JSON.stringify(example, null, 4).replace(/"/g, "'");
}

/**
 * 根据类型生成示例值
 */
function generateExampleValue(type: string, defaultValue?: string, paramName?: string): any {
  if (defaultValue) {
    try {
      return JSON.parse(defaultValue);
    } catch {
      return defaultValue;
    }
  }

  switch (type) {
    case 'string':
      if (paramName?.toLowerCase().includes('prompt')) {
        return '一个美丽的风景画，高质量，4K分辨率';
      }
      if (paramName?.toLowerCase().includes('style')) {
        return 'realistic';
      }
      return 'example_value';
    
    case 'number':
      if (paramName?.toLowerCase().includes('width')) return 1024;
      if (paramName?.toLowerCase().includes('height')) return 1024;
      if (paramName?.toLowerCase().includes('steps')) return 20;
      if (paramName?.toLowerCase().includes('cfg') || paramName?.toLowerCase().includes('scale')) return 7.5;
      return 1;
    
    case 'boolean':
      return true;
    
    case 'array':
      return ['item1', 'item2'];
    
    default:
      return 'example_value';
  }
}

/**
 * 获取类型显示名称
 */
function getTypeDisplayName(type: string): string {
  switch (type) {
    case 'string': return 'String';
    case 'number': return 'Number';
    case 'boolean': return 'Boolean';
    case 'array': return 'Array';
    default: return 'String';
  }
}
