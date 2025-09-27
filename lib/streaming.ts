import { NextApiResponse } from 'next';

/**
 * Server-Sent Events (SSE) helper class
 */
export class SSEWriter {
  private res: NextApiResponse;
  private isClosed: boolean = false;

  constructor(res: NextApiResponse) {
    this.res = res;
    this.setupHeaders();
  }

  private setupHeaders() {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    this.res.setHeader('Access-Control-Allow-Origin', '*');
  }

  /**
   * Send an SSE event
   */
  sendEvent(event: string, data: any, id?: string) {
    if (this.isClosed) return;

    try {
      if (id) {
        this.res.write(`id: ${id}\n`);
      }
      if (event) {
        this.res.write(`event: ${event}\n`);
      }
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const lines = dataString.split('\n');
      
      for (const line of lines) {
        this.res.write(`data: ${line}\n`);
      }
      
      this.res.write('\n');
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.close();
    }
  }

  /**
   * Send a comment (keep-alive)
   */
  sendComment(comment: string) {
    if (this.isClosed) return;
    
    try {
      this.res.write(`: ${comment}\n\n`);
    } catch (error) {
      console.error('Error sending SSE comment:', error);
      this.close();
    }
  }

  /**
   * Send a ping to keep connection alive
   */
  ping() {
    this.sendComment('ping');
  }

  /**
   * Close the SSE connection
   */
  close() {
    if (this.isClosed) return;
    
    this.isClosed = true;
    try {
      this.sendEvent('close', { message: 'Stream closed' });
      this.res.end();
    } catch (error) {
      console.error('Error closing SSE connection:', error);
    }
  }

  /**
   * Check if connection is closed
   */
  get closed() {
    return this.isClosed;
  }
}

/**
 * Chunked JSON streaming helper
 */
export class ChunkedJSONWriter {
  private res: NextApiResponse;
  private isClosed: boolean = false;
  private delimiter: string = '\n';

  constructor(res: NextApiResponse, delimiter: string = '\n') {
    this.res = res;
    this.delimiter = delimiter;
    this.setupHeaders();
  }

  private setupHeaders() {
    this.res.setHeader('Content-Type', 'application/x-ndjson');
    this.res.setHeader('Transfer-Encoding', 'chunked');
    this.res.setHeader('X-Content-Type-Options', 'nosniff');
    this.res.setHeader('Access-Control-Allow-Origin', '*');
  }

  /**
   * Write a JSON chunk
   */
  writeChunk(data: any) {
    if (this.isClosed) return;

    try {
      const chunk = JSON.stringify(data) + this.delimiter;
      this.res.write(chunk);
    } catch (error) {
      console.error('Error writing chunk:', error);
      this.close();
    }
  }

  /**
   * Close the stream
   */
  close() {
    if (this.isClosed) return;
    
    this.isClosed = true;
    try {
      this.res.end();
    } catch (error) {
      console.error('Error closing chunked stream:', error);
    }
  }

  /**
   * Check if connection is closed
   */
  get closed() {
    return this.isClosed;
  }
}

/**
 * Stream type enumeration
 */
export enum StreamType {
  SSE = 'sse',
  NDJSON = 'ndjson',
  CHUNKED = 'chunked'
}

/**
 * Detect preferred stream type from request headers
 */
export function detectStreamType(headers: any): StreamType {
  const accept = headers['accept'] || '';
  
  if (accept.includes('text/event-stream')) {
    return StreamType.SSE;
  }
  
  if (accept.includes('application/x-ndjson')) {
    return StreamType.NDJSON;
  }
  
  // Check for custom headers
  if (headers['x-stream-type'] === 'sse') {
    return StreamType.SSE;
  }
  
  if (headers['x-mcp-stream'] === 'true') {
    return StreamType.CHUNKED;
  }
  
  // Default to SSE for browser compatibility
  return StreamType.SSE;
}

/**
 * Create appropriate stream writer based on type
 */
export function createStreamWriter(res: NextApiResponse, type: StreamType) {
  switch (type) {
    case StreamType.SSE:
      return new SSEWriter(res);
    case StreamType.NDJSON:
    case StreamType.CHUNKED:
      return new ChunkedJSONWriter(res);
    default:
      return new SSEWriter(res);
  }
}

/**
 * Progress event data structure
 */
export interface ProgressEvent {
  type: 'progress' | 'result' | 'error' | 'complete';
  progress?: number;
  stage?: string;
  data?: any;
  error?: string;
  timestamp: number;
}

/**
 * Send progress event through appropriate stream
 */
export function sendProgressEvent(
  writer: SSEWriter | ChunkedJSONWriter,
  event: ProgressEvent
) {
  if (writer instanceof SSEWriter) {
    writer.sendEvent(event.type, event);
  } else {
    writer.writeChunk(event);
  }
}