# ComfyFlow-Lite API 调用文档

ComfyFlow-Lite 提供两种主要的调用方式：**REST API** 和 **MCP (Model Context Protocol)**。本文档介绍如何使用这两种方式调用您配置的工作流。

## 📋 获取可用工作流

在调用之前，您需要了解系统中配置了哪些工作流：

```bash
# 获取所有工作流列表
curl http://127.0.0.1:3000/api/workflows
```

响应示例：
```json
{
  "success": true,
  "data": [
    {
      "id": "workflow-id",
      "name": "工作流名称",
      "endpoint": "your_endpoint_name",
      "description": "工作流描述",
      "enabled": true,
      "mappings": [
        {
          "api_parameter": "prompt",
          "description": "参数描述",
          "parameter_type": "string",
          "required": true,
          "default_value": "默认值"
        }
      ]
    }
  ]
}
```

## 🌐 REST API 调用

### GET 方法调用（URL 参数）

```bash
# 基本调用（默认返回图片，支持缓存）
curl "http://127.0.0.1:3000/api/generate/{endpoint}?param1=value1&param2=value2"

# 返回JSON格式数据（支持缓存）
curl "http://127.0.0.1:3000/api/generate/{endpoint}?param1=value1&format=json"

# 强制重新生成（跳过缓存）
curl "http://127.0.0.1:3000/api/generate/{endpoint}?param1=value1&force_regenerate=true"

# 强制重新生成并返回JSON
curl "http://127.0.0.1:3000/api/generate/{endpoint}?param1=value1&format=json&force_regenerate=true"

# 启用流式传输
curl "http://127.0.0.1:3000/api/generate/{endpoint}?param1=value1&stream=true"
```

### POST 方法调用（JSON 请求体）

```bash
# 默认返回JSON格式
curl -X POST http://127.0.0.1:3000/api/generate/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{
    "param1": "value1",
    "param2": "value2",
    "force_regenerate": false,
    "stream": false,
    "format": "json"
  }'

# 直接返回图片（重定向到图片URL）
curl -X POST http://127.0.0.1:3000/api/generate/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{
    "param1": "value1",
    "format": "image"
  }'
```

```json
{
  "success": true,
  "data": {
    "url": "/api/output/generated_image_123.png",
    "duration": 9,
    "cached": false,
    "generated_timestamp": "2025-09-14T10:47:46.459Z"
  }
}
```

#### `format=image`（默认GET方式）
直接返回图片文件（HTTP 302重定向到图片URL），适合在浏览器中直接显示或嵌入到HTML中：

```html
<!-- 直接在HTML中使用 -->
<img src="http://127.0.0.1:3000/api/generate/endpoint?prompt=cute%20cat" alt="Generated Image" />
```

#### 错误响应（所有格式）
```json
{
  "success": false,
  "error": "错误描述"
}
```

### 参数说明

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `{endpoint}` | string | 工作流的端点名称（从工作流列表获取） | - |
| `format` | string | 返回格式：`json`（JSON数据）或 `image`（直接返回图片） | GET: `image`, POST: `json` |
| `force_regenerate` | boolean | 是否强制重新生成（忽略缓存） | `false` |
| `stream` | boolean | 是否启用流式传输 | `false` |
| 其他参数 | 各种类型 | 根据工作流的参数映射配置 | - |

## 🏷️ 关键词功能

ComfyFlow-Lite 支持关键词管理功能，可以通过预定义的关键词库来确保AI生成图片的人物、风格、动作等元素的一致性。

### 关键词参数使用

当工作流配置了关键词引用时，您可以在API调用中使用 `key` 参数或特定的 `*_key` 参数：

```bash
# 使用通用key参数
curl -X POST http://127.0.0.1:3000/api/generate/your_endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful scene",
    "key": "girl001"
  }'

# 使用特定的key参数（如果工作流支持多个关键词引用）
curl -X POST http://127.0.0.1:3000/api/generate/your_endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "positive_prompt": "a beautiful scene",
    "negative_prompt": "low quality",
    "positive_key": "girl001",
    "style_key": "anime001"
  }'
```

### 关键词管理

通过Web界面的"关键词管理"标签页，您可以：

- **新增关键词**：手动创建关键词条目
- **CSV批量导入**：批量导入关键词数据
- **分类管理**：按人物、动作、风格等类型组织关键词
- **搜索筛选**：快速查找特定关键词

### CSV导入格式

```csv
kyeid,type,keyword_en,keyword_cn,tags,description
girl001,person,beautiful girl,美丽女孩,portrait;beauty,美丽的女性角色
action001,action,running,跑步,movement;sport,跑步动作
style001,style,anime style,动漫风格,art;cartoon,日式动漫绘画风格
```

### 返回格式说明

#### `format=json`（默认POST方式）
返回完整的JSON响应，包含图片URL和元数据：

## 🤖 MCP (Model Context Protocol) 调用

### 客户端配置

**Claude Desktop 配置示例：**
```json
{
  "mcpServers": {
    "comfyflow-lite": {
      "command": "node",
      "args": ["-e", "require('http').createServer((req,res)=>{require('child_process').spawn('curl',['-X','POST','http://127.0.0.1:3000/api/mcp','-H','Content-Type: application/json','-d',JSON.stringify({method:req.url.includes('tools/list')?'tools/list':'tools/call',params:req.url.includes('tools/call')?JSON.parse(req.body):{}})]).stdout.pipe(res)}).listen(0)"],
      "env": {}
    }
  }
}
```

**HTTP MCP 服务器地址：**
```
http://127.0.0.1:3000/api/mcp
```

### MCP 协议调用

#### 1. 初始化连接

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "your-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

#### 2. 获取工具列表

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

#### 3. 调用工具

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "generate{EndpointName}",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    },
    "_meta": {
      "progressToken": 123
    }
  },
  "id": 3
}
```

### MCP 响应格式

**工具列表响应：**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "generate{EndpointName}",
        "description": "工具描述",
        "inputSchema": {
          "type": "object",
          "properties": {
            "param1": {
              "type": "string",
              "description": "参数描述"
            }
          },
          "required": ["param1"]
        }
      }
    ]
  },
  "id": 2
}
```

**工具调用响应：**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "# 🎨 图片生成成功！\n\n**请直接显示以下图片：**\n\n![Generated Image](http://127.0.0.1:3000/api/output/image.png)\n\n## 📋 生成信息\n\n- **⏱️ 生成时间**: 9秒\n- **🔗 图片链接**: [image.png](http://127.0.0.1:3000/api/output/image.png)"
      }
    ],
    "_meta": {
      "progressToken": 123
    }
  },
  "id": 3
}
```

## 💡 使用技巧

### 1. 参数编码
URL 参数需要进行 URL 编码：
```bash
# 空格编码为 %20
curl "http://127.0.0.1:3000/api/generate/endpoint?prompt=cute%20girl"
```

### 2. 缓存机制
- **GET和POST都支持缓存**：系统会根据参数自动缓存结果
- **智能缓存匹配**：相同参数的请求会返回缓存的结果（无论GET还是POST）
- **强制重新生成**：使用 `force_regenerate=true` 可以跳过缓存强制重新生成
- **缓存标识**：JSON响应中的 `cached: true/false` 字段表示是否来自缓存

### 3. 错误处理
常见错误码：
- `400`: 参数错误
- `404`: 工作流不存在
- `405`: 方法不允许
- `500`: 服务器内部错误

### 4. 图片访问
生成的图片可以通过返回的 URL 直接访问：
```bash
curl http://127.0.0.1:3000/api/output/generated_image.png
```

## 🔧 开发示例

### JavaScript 示例

```javascript
// GET方法调用（支持缓存）
async function generateImageGET(endpoint, params, useCache = true) {
  const searchParams = new URLSearchParams(params);
  if (!useCache) {
    searchParams.set('force_regenerate', 'true');
  }
  searchParams.set('format', 'json'); // 获取JSON数据

  const response = await fetch(`http://127.0.0.1:3000/api/generate/${endpoint}?${searchParams}`);
  const result = await response.json();

  if (result.success) {
    console.log(`图片生成成功 (缓存: ${result.data.cached}):`, result.data.url);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// POST方法调用
async function generateImagePOST(endpoint, params, useCache = true) {
  const body = { ...params };
  if (!useCache) {
    body.force_regenerate = true;
  }

  const response = await fetch(`http://127.0.0.1:3000/api/generate/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (result.success) {
    console.log(`图片生成成功 (缓存: ${result.data.cached}):`, result.data.url);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// 缓存测试示例
async function testCache() {
  const params = { prompt: 'cute cat' };

  // 第一次调用 - 应该生成新图片
  console.log('第一次调用...');
  const result1 = await generateImageGET('vertical_painting', params);
  console.log('缓存状态:', result1.cached); // false

  // 第二次调用 - 应该返回缓存
  console.log('第二次调用...');
  const result2 = await generateImageGET('vertical_painting', params);
  console.log('缓存状态:', result2.cached); // true

  // 强制重新生成
  console.log('强制重新生成...');
  const result3 = await generateImageGET('vertical_painting', params, false);
  console.log('缓存状态:', result3.cached); // false
}

// 直接显示图片（GET方法默认行为）
function showImageDirect(endpoint, params) {
  const searchParams = new URLSearchParams(params);
  const img = document.createElement('img');
  img.src = `http://127.0.0.1:3000/api/generate/${endpoint}?${searchParams}`;
  img.alt = 'Generated Image';
  img.style.maxWidth = '100%';
  document.body.appendChild(img);
}
```

### Python 示例

```python
import requests

def generate_image(endpoint, params):
    url = f"http://127.0.0.1:3000/api/generate/{endpoint}"
    response = requests.post(url, json=params)
    
    result = response.json()
    if result['success']:
        print(f"图片生成成功: {result['data']['url']}")
        return result['data']
    else:
        raise Exception(result['error'])

# 使用示例
try:
    data = generate_image('your_endpoint', {'prompt': 'your prompt'})
    print(data)
except Exception as e:
    print(f"错误: {e}")
```

---

## 📞 支持

如需更多帮助，请查看：
- 工作流配置：访问 `http://127.0.0.1:3000/workflow-admin`
- 系统状态：访问 `http://127.0.0.1:3000`
- API 测试：使用内置的 API 测试工具
