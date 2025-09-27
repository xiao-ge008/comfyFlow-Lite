import { NextApiRequest, NextApiResponse } from 'next';
import { getComfyUIClient } from '@/lib/comfy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, subfolder, type = 'output' } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    const comfyClient = getComfyUIClient();
    
    // 从 ComfyUI 获取图片
    const imageBuffer = await comfyClient.getImage(
      filename, 
      subfolder as string, 
      type as string
    );

    // 设置响应头
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // 返回图片数据
    return res.status(200).send(imageBuffer);
    
  } catch (error) {
    console.error('Failed to get output image:', error);
    
    // 如果是 404 错误，返回适当的状态码
    if ((error as any)?.response?.status === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to retrieve image',
      details: (error as Error).message
    });
  }
}