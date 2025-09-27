import { NextApiRequest, NextApiResponse } from 'next';
import { getComfyUIClient } from '@/lib/comfy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path: pathArray } = req.query;
  
  if (!pathArray || !Array.isArray(pathArray)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const filename = pathArray[pathArray.length - 1];
  const subfolder = pathArray.length > 1 ? pathArray.slice(0, -1).join('/') : undefined;

  try {
    const comfyClient = getComfyUIClient();
    const imageBuffer = await comfyClient.getImage(filename, subfolder);

    // 设置适当的 Content-Type
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'image/png'; // 默认
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'png':
      default:
        contentType = 'image/png';
        break;
    }

    // 设置缓存头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存 24 小时
    res.setHeader('Content-Length', imageBuffer.length);

    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
}