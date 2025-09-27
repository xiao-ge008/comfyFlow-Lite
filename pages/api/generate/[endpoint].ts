import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { getWorkflowByEndpoint, initializeStore } from '@/lib/store';
import { injectParameters } from '@/lib/mapper';
import { getComfyUIClient } from '@/lib/comfy';
import { 
  ApiResponse, 
  GenerationResponse, 
  GenerationProgress 
} from '@/lib/types';
import {
  SSEWriter,
  detectStreamType,
  StreamType,
  createStreamWriter,
  ProgressEvent,
  sendProgressEvent
} from '@/lib/streaming';

// 初始化存储
initializeStore();

// 存储进度信息的内存缓存
const progressCache = new Map<string, GenerationProgress>();

// 存储生成结果的缓存，基于参数哈希
const resultCache = new Map<string, GenerationResponse>();

// 生成参数哈希的辅助函数
function generateParamsHash(endpoint: string, params: Record<string, any>): string {
  const normalizedParams = JSON.stringify(params, Object.keys(params).sort());
  return `${endpoint}_${Buffer.from(normalizedParams).toString('base64')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {

  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Stream-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { endpoint } = req.query;
  if (!endpoint || Array.isArray(endpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid endpoint'
    });
  }

  try {
    // 查找工作流
    const workflow = getWorkflowByEndpoint(endpoint);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: `Workflow '${endpoint}' not found`
      });
    }

    // 验证认证（如果配置了）
    const authToken = process.env.AUTH_TOKEN;
    if (authToken) {
      const providedToken = req.headers.authorization?.replace('Bearer ', '');
      if (providedToken !== authToken) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
    }

    // 获取参数 - 支持GET和POST方法
    let workflowParams: Record<string, any> = {};
    let force_regenerate = false;
    let stream = false;
    let format = 'json'; // 默认返回格式

    if (req.method === 'GET') {
      // GET方法：从URL参数获取
      const { endpoint: _, force_regenerate: forceRegen, stream: streamParam, format: formatParam, ...queryParams } = req.query;
      workflowParams = queryParams;
      force_regenerate = forceRegen === 'true';
      stream = streamParam === 'true';
      format = (formatParam as string) || 'image'; // GET默认返回图片
    } else {
      // POST方法：从请求体获取
      const { force_regenerate: forceRegen, stream: streamParam, format: formatParam, ...bodyParams } = req.body || {};
      workflowParams = bodyParams;
      force_regenerate = forceRegen === true;
      stream = streamParam === true;
      format = formatParam || 'json'; // POST默认返回JSON
    }

    const shouldRegenerate = force_regenerate === true;
    const requestId = `${endpoint}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Detect if streaming is requested
    const streamType = detectStreamType(req.headers);
    const isStreaming = stream === true || req.headers['accept']?.includes('text/event-stream');
    
    // 检查缓存（除非强制重新生成）
    if (!shouldRegenerate) {
      const paramsHash = generateParamsHash(endpoint, workflowParams);
      const cachedResult = resultCache.get(paramsHash);

      if (cachedResult) {

        // 根据format参数返回不同格式
        if (format === 'image') {
          // 直接重定向到图片URL
          const imageUrl = `http://127.0.0.1:3000${cachedResult.url}`;
          return res.redirect(302, imageUrl);
        } else {
          // 返回JSON格式
          return res.status(200).json({
            success: true,
            data: {
              ...cachedResult,
              cached: true,
              cache_timestamp: new Date().toISOString()
            }
          });
        }
      }
    }

    try {
      // 注入参数到工作流
      const workflowJson = await injectParameters(workflow, workflowParams);
      
      // 如果是强制重新生成，或者没有缓存，添加随机种子以避免ComfyUI的内部缓存
      if (shouldRegenerate || !resultCache.has(generateParamsHash(endpoint, workflowParams))) {
        // 对于KSampler节点，添加随机种子
        Object.keys(workflowJson).forEach(nodeId => {
          const node = workflowJson[nodeId];
          if (node.class_type === 'KSampler' && node.inputs) {
            const randomSeed = Math.floor(Math.random() * 1000000000);
            node.inputs.seed = randomSeed;
          }
          // 也可以为SaveImage节点添加时间戳
          if (node.class_type === 'SaveImage' && node.inputs) {
            const timestamp = Date.now();
            if (node.inputs.filename_prefix) {
              node.inputs.filename_prefix = `${node.inputs.filename_prefix}_${timestamp}`;
            } else {
              node.inputs.filename_prefix = `ComfyUI_${timestamp}`;
            }
          }
        });
      }

      // 通过队列执行工作流（限流，防止并发冲突）
      const { default: comfyQueue } = await import('@/lib/comfyQueue');

      const startTime = Date.now();

      // If streaming, set up SSE response
      if (isStreaming) {
        const writer = createStreamWriter(res, streamType);
        
        try {
          // Send initial event
          sendProgressEvent(writer, {
            type: 'progress',
            progress: 0,
            stage: 'Starting generation...',
            timestamp: Date.now()
          });

          const result = await comfyQueue.enqueue(
            workflowJson,
            requestId,
            (progress: GenerationProgress) => {
              progressCache.set(progress.taskId, progress);
              
              // Send progress through SSE
              sendProgressEvent(writer, {
                type: 'progress',
                progress: progress.progress || 0,
                stage: progress.stage,
                timestamp: Date.now()
              });
            }
          );

          const duration = Date.now() - startTime;

          if (result.outputImages.length > 0) {
            const firstImage = result.outputImages[0];
            const imageUrl = `/api/output/${firstImage}`;

            // Send final result
            sendProgressEvent(writer, {
              type: 'result',
              data: {
                url: imageUrl,
                duration: Math.round(duration / 1000),
                images: result.outputImages.map(img => `/api/output/${img}`),
                cached: false,
                generated_timestamp: new Date().toISOString()
              },
              timestamp: Date.now()
            });

            // Send complete event
            sendProgressEvent(writer, {
              type: 'complete',
              timestamp: Date.now()
            });
          } else {
            sendProgressEvent(writer, {
              type: 'error',
              error: 'No output images generated',
              timestamp: Date.now()
            });
          }

          // Close the stream
          if (writer instanceof SSEWriter) {
            writer.close();
          } else {
            (writer as any).close();
          }
        } catch (error) {
          console.error(`[${requestId}] Streaming generation error:`, error);
          
          sendProgressEvent(writer, {
            type: 'error',
            error: (error as Error).message,
            timestamp: Date.now()
          });
          
          if (writer instanceof SSEWriter) {
            writer.close();
          } else {
            (writer as any).close();
          }
        }
        
        return; // Exit early for streaming response
      }

      // Non-streaming execution
      const result = await comfyQueue.enqueue(
        workflowJson,
        requestId,
        (progress: GenerationProgress) => {
          progressCache.set(progress.taskId, progress);
        }
      );

      const duration = Date.now() - startTime;

      // 处理输出图片
      if (result.outputImages.length > 0) {
        // 目前返回第一张图片的URL
        const firstImage = result.outputImages[0];
        const imageUrl = `/api/output/${firstImage}`;

        const response: GenerationResponse = {
          url: imageUrl,
          duration: Math.round(duration / 1000), // 转换为秒
        };
        
        // 存储结果到缓存（仅当不是强制重新生成时）
        if (!shouldRegenerate) {
          const paramsHash = generateParamsHash(endpoint, workflowParams);
          resultCache.set(paramsHash, response);
        }

        // 根据format参数返回不同格式
        if (format === 'image') {
          // 直接重定向到图片URL
          const imageUrl = `http://127.0.0.1:3000${response.url}`;
          return res.redirect(302, imageUrl);
        } else {
          // 返回JSON格式
          return res.status(200).json({
            success: true,
            data: {
              ...response,
              cached: false,
              generated_timestamp: new Date().toISOString()
            }
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          error: 'No output images generated'
        });
      }

    } catch (error) {
      console.error(`[${requestId}] Generation error:`, error);
      return res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// 导出配置，增加请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};