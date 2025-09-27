import axios from 'axios';
import WebSocket from 'ws';
import { 
  ComfyUIWorkflow, 
  ComfyUIQueueResponse, 
  ComfyUIProgressMessage,
  GenerationProgress 
} from './types';

export class ComfyUIClient {
  private baseUrl: string;
  private clientId: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
    this.clientId = this.generateClientId();
    
    // 设置进程监听器限制，避免EventEmitter内存泄漏警告
    if (typeof process !== 'undefined' && process.setMaxListeners) {
      process.setMaxListeners(50);
    }
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/system_stats`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('ComfyUI connection test failed:', error);
      return false;
    }
  }

  /**
   * 清理队列中的旧任务（如果需要）
   */
  async clearQueue(): Promise<void> {
    try {
      // 获取当前队列状态
      const queueResponse = await axios.get(`${this.baseUrl}/queue`);
      const queueData = queueResponse.data;
      
      if (queueData.queue_running && queueData.queue_running.length > 0) {
        // 清理正在运行的队列
        await axios.post(`${this.baseUrl}/queue`, {
          clear: true
        });
      }
    } catch (error) {
      const err = error as any;
      console.warn('Failed to clear queue:', err?.message || err);
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/system_stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * 获取队列信息
   */
  async getQueue(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/queue`);
      return response.data;
    } catch (error) {
      console.error('Failed to get queue info:', error);
      throw error;
    }
  }

  /**
   * 提交工作流到队列
   */
  async queuePrompt(workflow: ComfyUIWorkflow): Promise<ComfyUIQueueResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/prompt`, {
        prompt: workflow,
        client_id: this.clientId,
      });

      if (response.data.error) {
        throw new Error(`ComfyUI error: ${JSON.stringify(response.data.error)}`);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to queue prompt:', error);
      throw error;
    }
  }

  /**
   * 获取生成的图片
   */
  async getImage(filename: string, subfolder?: string, type: string = 'output'): Promise<Buffer> {
    try {
      const params = new URLSearchParams({
        filename,
        type,
      });

      if (subfolder) {
        params.append('subfolder', subfolder);
      }

      const response = await axios.get(`${this.baseUrl}/view?${params}`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Failed to get image:', error);
      throw error;
    }
  }

  /**
   * 获取历史记录
   */
  async getHistory(promptId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/history/${promptId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get history:', error);
      throw error;
    }
  }

  /**
   * 监听工作流执行进度
   */
  async listenProgress(
    promptId: string,
    onProgress: (progress: GenerationProgress) => void,
    onComplete: (result: any) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${this.clientId}`;
      const ws = new WebSocket(wsUrl);

      let isComplete = false;
      let isResolved = false;
      let timeout: NodeJS.Timeout | null = null;
      let statusCheckInterval: NodeJS.Timeout | null = null;
      
      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
        }
        // 更彻底的清理WebSocket事件监听器
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Normal closure');
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // 对于正在连接的WebSocket，我们需要等待它打开后再关闭
          ws.once('open', () => ws.close(1000, 'Normal closure'));
        }
      };
      
      const safeResolve = (result?: any) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(result);
        }
      };
      
      const safeReject = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };
      
      // 设置超时处理和状态检查
      let statusCheckCount = 0;
      statusCheckInterval = setInterval(async () => {
        statusCheckCount++;
        if (isComplete || isResolved) {
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
          return;
        }
        
        // 每30秒检查一次队列状态
        try {
          const queueResponse = await this.getQueue();
          
          // 检查我们的任务是否还在队列中
          const queueRunning = queueResponse.queue_running || [];
          const queuePending = queueResponse.queue_pending || [];
          
          const ourTask = queueRunning.find((task: any) => task[1] === promptId) || 
                         queuePending.find((task: any) => task[1] === promptId);
          
          if (!ourTask) {
            // 任务不在队列中，可能已完成，检查历史记录
            try {
              const history = await this.getHistory(promptId);
              if (history && history[promptId]) {
                if (!isResolved) {
                  isComplete = true;
                  onComplete(history);
                  safeResolve();
                }
              }
            } catch (historyError) {
              // History check failed, continue waiting
            }
          } else {
            // Task still in queue, continue waiting
          }
        } catch (error) {
          console.error(`[${promptId}] Status check failed:`, (error as Error).message);
        }
      }, 30000); // 每30秒检查一次
      
      timeout = setTimeout(() => {
        if (!isComplete && !isResolved) {
          console.error(`WebSocket timeout for prompt ${promptId}`);
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
          const error = new Error('Timeout waiting for completion');
          onError(error.message);
          safeReject(error);
        }
      }, 300000); // 5分钟超时

      ws.on('open', () => {
        // WebSocket connected
      });

      ws.on('message', async (data: Buffer) => {
        try {
          // 检查数据是否为有效的文本/JSON
          const dataStr = data.toString('utf8');
          
          // 如果数据包含非打印字符或不是以 { 开头，可能是二进制数据，跳过
          if (!dataStr.trim().startsWith('{') || /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(dataStr)) {
            // console.log(`[${promptId}] Skipping non-JSON WebSocket message (likely binary or compressed data)`);
            return;
          }

          const message: ComfyUIProgressMessage = JSON.parse(dataStr);

          // 更详细的调试信息 - 暂时关闭以减少日志噪音
          // console.log(`[${promptId}] Received WebSocket message:`, {
          //   type: message.type,
          //   prompt_id: message.data?.prompt_id,
          //   node: message.data?.node,
          //   expected_prompt_id: promptId,
          //   client_id: this.clientId
          // });
          
          // 先检查是否包含我们关心的 prompt_id
          if (message.data && message.data.prompt_id === promptId) {
            // 这是我们的任务消息，继续处理 - 暂时关闭详细日志
            // console.log(`[${promptId}] Processing task message:`, {
            //   type: message.type,
            //   prompt_id: message.data.prompt_id,
            //   node: message.data.node
            // });
          } else {
            // 检查是否是重要的系统消息
            const importantTypes = ['executing', 'progress', 'executed', 'execution_start', 'execution_cached'];
            if (!importantTypes.includes(message.type)) {
              // 跳过不相关的消息
              return;
            }
            
            // 重要消息但不是我们的 prompt_id
            if (!message.data || message.data.prompt_id !== promptId) {
              return;
            }
          }

          switch (message.type) {
            case 'executing':
              if (message.data.node === null) {
                // 执行完成
                if (!isComplete && !isResolved) {
                  isComplete = true;

                  try {
                    const history = await this.getHistory(promptId);
                    onComplete(history);
                    safeResolve();
                  } catch (error) {
                    console.error(`Failed to get history for prompt ${promptId}:`, error);
                    onError(`Failed to get result: ${(error as Error).message}`);
                    safeReject(error as Error);
                  }
                }
              } else {
                onProgress({
                  taskId: promptId,
                  progress: 0,
                  stage: `Executing node: ${message.data.node}`,
                });
              }
              break;

            case 'progress':
              const progress = message.data.value && message.data.max 
                ? (message.data.value / message.data.max) * 100 
                : 0;
              
              onProgress({
                taskId: promptId,
                progress,
                stage: `Processing... (${message.data.value}/${message.data.max})`,
              });
              break;

            case 'executed':
              onProgress({
                taskId: promptId,
                progress: 100,
                stage: 'Completed',
              });
              break;
          }
        } catch (error) {
          const err = error as Error;
          console.error(`[${promptId}] Error processing WebSocket message:`, {
            error: err.message,
            dataLength: data.length,
            dataPreview: data.toString('utf8', 0, Math.min(50, data.length)),
          });
          
          // JSON 解析错误不应该导致整个任务失败，只是记录日志
          // 仅在网络或其他严重错误时才触发任务失败
          if (err.message.includes('WebSocket') || err.message.includes('Connection')) {
            if (!isResolved) {
              onError(`WebSocket connection error: ${err.message}`);
              safeReject(err);
            }
          }
          // JSON 解析错误不影响任务执行，继续等待后续消息
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for prompt ${promptId}:`, error);
        onError(error.message);
        safeReject(error);
      });

      ws.on('close', (code, reason) => {
        if (!isComplete && !isResolved) {
          // 如果WebSocket意外关闭且任务未完成，这是一个错误
          const error = new Error(`WebSocket closed unexpectedly: ${code} ${reason}`);
          onError(error.message);
          safeReject(error);
        } else if (isComplete) {
          // 正常完成后的关闭
          safeResolve();
        }
      });
    });
  }

  /**
   * 执行工作流并等待完成
   */
  async executeWorkflow(
    workflow: ComfyUIWorkflow,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<{ outputImages: string[]; duration: number }> {
    const startTime = Date.now();
    
    // 为每次执行生成新的客户端ID，确保请求独立性
    this.clientId = this.generateClientId();

    try {
      // 提交到队列
      const queueResponse = await this.queuePrompt(workflow);
      const promptId = queueResponse.prompt_id;

      // 监听进度
      const result = await new Promise<any>((resolve, reject) => {
        this.listenProgress(
          promptId,
          onProgress || (() => {}),
          resolve,
          (error) => {
            console.error(`Progress listening failed for prompt ${promptId}:`, error);
            reject(new Error(error));
          }
        ).catch(reject); // 确保listenProgress的Promise拒绝也被捕获
      });

      // 提取输出图片
      const outputImages: string[] = [];
      if (result[promptId] && result[promptId].outputs) {
        const outputs = result[promptId].outputs;
        
        for (const nodeId in outputs) {
          const nodeOutput = outputs[nodeId];
          if (nodeOutput.images) {
            for (const image of nodeOutput.images) {
              outputImages.push(image.filename);
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      return { outputImages, duration };
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }
}

// 默认客户端实例
let defaultClient: ComfyUIClient | null = null;

export function getComfyUIClient(): ComfyUIClient {
  // 每次都创建新的客户端实例，避免WebSocket连接复用导致的内存泄漏
  const baseUrl = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
  return new ComfyUIClient(baseUrl);
}
