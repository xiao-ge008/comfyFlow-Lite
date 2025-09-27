#!/usr/bin/env node

/**
 * CLI工具：快速调用 MCP 或 REST 接口
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), '.data', 'workflows.json');

function readWorkflows() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading workflows:', error.message);
    return [];
  }
}

function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function makeRequest(method, path, data, callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        callback(null, result, res.statusCode);
      } catch (error) {
        callback(error, body, res.statusCode);
      }
    });
  });

  req.on('error', callback);
  req.write(data);
  req.end();
}

function callREST(endpoint, params, callback) {
  const path = `/api/generate/${endpoint}`;
  const data = JSON.stringify(params);
  
  makeRequest('POST', path, data, callback);
}

function callMCP(methodName, params, callback) {
  const path = '/api/mcp';
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: methodName,
    params,
    id: Date.now()
  });
  
  makeRequest('POST', path, data, callback);
}

function callMCPStream(methodName, params, callback) {
  const http = require('http');
  
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: methodName,
    params,
    id: Date.now()
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'X-MCP-Stream': 'true'
    }
  };

  const req = http.request(options, (res) => {
    let buffer = '';
    
    res.on('data', (chunk) => {
      buffer += chunk;
      
      // 处理流式数据（每行一个JSON）
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            callback(null, message, res.statusCode, true); // true表示流式数据
          } catch (error) {
            console.error('Parse stream data error:', error.message);
          }
        }
      });
    });

    res.on('end', () => {
      callback(null, null, res.statusCode, false); // 流结束
    });
  });

  req.on('error', callback);
  req.write(data);
  req.end();
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
console.log('🚀 ComfyFlow-Lite CLI 调用工具\n');
    console.log('用法:');
    console.log('  npm run cli:call <endpoint> <params>');
    console.log('  npm run cli:call <endpoint> <params> --mcp');
    console.log('  npm run cli:call <endpoint> <params> --mcp --stream');
    console.log('');
    console.log('示例:');
    console.log('  npm run cli:call avatar \'{"positive":"cute cat"}\'');
    console.log('  npm run cli:call avatar \'{"positive":"cute cat"}\' --mcp');
    console.log('  npm run cli:call avatar \'{"positive":"cute cat"}\' --mcp --stream');
    console.log('');
    console.log('💡 使用 npm run cli:list 查看所有可用端点');
    return;
  }

const endpoint = args[0];
  const paramsStr = args[1];
  const useMCP = args.includes('--mcp');
  const useStream = args.includes('--stream');
  
  let params;
  try {
    params = JSON.parse(paramsStr);
  } catch (error) {
    console.error('❌ 参数 JSON 格式错误:', error.message);
    return;
  }

  // 验证端点是否存在
  const workflows = readWorkflows();
  const workflow = workflows.find(w => w.endpoint === endpoint);
  
  if (!workflow) {
    console.error('❌ 端点不存在:', endpoint);
    console.log('💡 使用 npm run cli:list 查看所有可用端点');
    return;
  }

console.log(`🚀 调用 ${workflow.name} (${endpoint})`);
  console.log(`📝 参数:`, params);
  let methodDesc = useMCP ? 'MCP' : 'REST';
  if (useMCP && useStream) methodDesc += ' (流式)';
  console.log(`🔧 方式: ${methodDesc}`);
  console.log('⏳ 执行中...\n');

  const startTime = Date.now();
  let hasResult = false;

  const callback = (error, result, statusCode, isStreaming) => {
    if (error) {
      console.error('❌ 请求失败:', error.message);
      return;
    }

    if (isStreaming === true && result) {
      // 流式数据
      const duration = Date.now() - startTime;
      console.log(`[⏱️ ${duration}ms] ${result.type.toUpperCase()}: ${JSON.stringify(result.data)}`);
      
      if (result.type === 'result') {
        hasResult = true;
        if (result.data.content?.[0]?.data) {
          console.log(`\n🖼️  生成的图片: http://localhost:3000${result.data.content[0].data}`);
        }
      }
    } else if (isStreaming === false) {
      // 流结束
      const duration = Date.now() - startTime;
      console.log(`\n✅ 流式完成，总耗时: ${duration}ms`);
      if (!hasResult) {
        console.log('⚠️  未收到结果数据');
      }
    } else {
      // 普通响应
      const duration = Date.now() - startTime;
      console.log(`⏱️  耗时: ${duration}ms`);
      console.log(`📊 状态码: ${statusCode}`);
      console.log('📋 响应:');
      console.log(JSON.stringify(result, null, 2));

      if (result.success && result.data?.url) {
        console.log(`\n🖼️  生成的图片: http://localhost:3000${result.data.url}`);
      } else if (result.result?.content?.[0]?.data) {
        console.log(`\n🖼️  生成的图片: http://localhost:3000${result.result.content[0].data}`);
      }
    }
  };

  if (useMCP) {
    const methodName = `generate${toPascalCase(endpoint)}`;
    if (useStream) {
      callMCPStream(methodName, params, callback);
    } else {
      callMCP(methodName, params, callback);
    }
  } else {
    if (useStream) {
      console.log('⚠️  REST 接口不支持流式调用，自动回退到普通模式');
    }
    callREST(endpoint, params, callback);
  }
}

main();