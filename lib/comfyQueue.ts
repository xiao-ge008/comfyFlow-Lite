import { ComfyUIClient, getComfyUIClient } from './comfy';
import { ComfyUIWorkflow, GenerationProgress } from './types';

interface QueueItem {
  id: string;
  requestId: string; // for logging correlation
  workflow: ComfyUIWorkflow;
  onProgress?: (progress: GenerationProgress) => void;
  resolve: (value: { outputImages: string[]; duration: number }) => void;
  reject: (reason?: any) => void;
  enqueuedAt: number;
}

/**
 * 一个简单的限流队列，确保与 ComfyUI 的交互不会并发过高，默认并发为 1。
 * 避免 WebSocket 消息串台、连接被 ComfyUI 端断开（Broken pipe）等问题。
 */
class ComfyQueueManager {
  private static instance: ComfyQueueManager;
  private queue: QueueItem[] = [];
  private active = 0;
  private concurrency: number;
  private processing = false;

  private constructor(concurrency?: number) {
    const envConcurrency = parseInt(process.env.COMFY_MAX_CONCURRENCY || '', 10);
    this.concurrency = Number.isFinite(envConcurrency) && envConcurrency > 0
      ? envConcurrency
      : (concurrency || 1);
  }

  static getInstance(concurrency?: number) {
    if (!this.instance) {
      this.instance = new ComfyQueueManager(concurrency);
    }
    return this.instance;
  }

  setConcurrency(n: number) {
    if (Number.isFinite(n) && n > 0) {
      this.concurrency = Math.floor(n);
      this.drain();
    }
  }

  enqueue(workflow: ComfyUIWorkflow, requestId: string, onProgress?: (p: GenerationProgress) => void) {
    return new Promise<{ outputImages: string[]; duration: number }>((resolve, reject) => {
      const item: QueueItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        requestId,
        workflow,
        onProgress,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };
      this.queue.push(item);
      this.drain();
    });
  }

  private async runItem(item: QueueItem) {
    const comfyClient: ComfyUIClient = getComfyUIClient();

    // 在每次真正执行前测试连接，避免长时间等待后失败
    const isConnected = await comfyClient.testConnection();
    if (!isConnected) {
      throw new Error('ComfyUI service is not available');
    }

    // 真正执行
    return await comfyClient.executeWorkflow(item.workflow, (p) => {
      try {
        item.onProgress?.(p);
      } catch (_) {
        // 避免回调异常影响流程
      }
    });
  }

  private drain() {
    if (this.processing) return;
    this.processing = true;

    const loop = async () => {
      while (this.active < this.concurrency && this.queue.length > 0) {
        const item = this.queue.shift()!;
        this.active += 1;

        const startedAt = Date.now();

        // 包一层超时保护，防止意外卡死
        const timeoutMs = parseInt(process.env.COMFY_TASK_TIMEOUT_MS || '600000', 10); // 默认10分钟
        const timeoutPromise = new Promise<never>((_, rej) => {
          const t = setTimeout(() => {
            clearTimeout(t);
            rej(new Error('Task timeout'));
          }, timeoutMs);
        });

        Promise.race([
          this.runItem(item),
          timeoutPromise,
        ])
          .then((result) => {
            item.resolve(result as { outputImages: string[]; duration: number });
          })
          .catch((err) => {
            console.error(`[Queue] xx fail item ${item.id} (req=${item.requestId}):`, err?.message || err);
            item.reject(err);
          })
          .finally(() => {
            this.active -= 1;
            setImmediate(() => this.drain());
          });
      }

      this.processing = false;
    };

    setImmediate(loop);
  }
}

const comfyQueue = ComfyQueueManager.getInstance();
export default comfyQueue;
export { ComfyQueueManager };
