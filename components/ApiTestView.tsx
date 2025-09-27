import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Backdrop,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';

const ApiTestView: React.FC = () => {
  const { t } = useTranslation();

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testMethod, setTestMethod] = useState<'rest' | 'mcp'>('rest');
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const handleWorkflowChange = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    setSelectedWorkflow(workflow);
    console.log('Selected workflow:', workflow);
    
    // 初始化参数
    if (workflow?.mappings) {
      const params: Record<string, any> = {};
      workflow.mappings.forEach((mapping: any) => {
        console.log('Processing mapping:', mapping);
        // 兼容旧新格式
        const paramName = mapping.paramName || mapping.api_parameter;
        const type = mapping.type || mapping.parameter_type || 'string';
        let defaultValue = mapping.default !== undefined ? 
          mapping.default : 
          undefined;
        
        // 解析 default_value JSON 字符串，处理可能的解析错误
        if (defaultValue === undefined && mapping.default_value) {
          try {
            defaultValue = JSON.parse(mapping.default_value);
          } catch (e) {
            // 如果 JSON 解析失败，可能是格式问题，尝试直接使用字符串值
            console.warn(`Failed to parse default_value for ${paramName}:`, e);
            if (mapping.default_value.startsWith('"') && mapping.default_value.endsWith('"')) {
              // 去掉首尾的双引号
              defaultValue = mapping.default_value.slice(1, -1);
            } else {
              defaultValue = mapping.default_value;
            }
          }
        }
        
        if (defaultValue !== undefined) {
          params[paramName] = defaultValue;
        } else if (type === 'string') {
          params[paramName] = '';
        } else if (type === 'number') {
          params[paramName] = 0;
        } else if (type === 'boolean') {
          params[paramName] = false;
        }
        
        console.log(`Parameter ${paramName} (${type}): ${params[paramName]}`);
      });
      console.log('Final test params:', params);
      setTestParams(params);
    }
    
    setResponse(null);
    setError('');
  };

  const handleParamChange = (paramName: string, value: any) => {
    setTestParams(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleTest = async () => {
    if (!selectedWorkflow) return;

    setLoading(true);
    setError('');
    setResponse(null);
    
    console.log('Starting API test...', {
      endpoint: selectedWorkflow.endpoint,
      method: testMethod,
      params: testParams,
      force_regenerate: forceRegenerate
    });

    try {
      let apiResponse;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      if (testMethod === 'rest') {
        // REST API 测试
        const requestBody = {
          ...testParams,
          force_regenerate: forceRegenerate
        };
        console.log(`Calling REST API: /api/generate/${selectedWorkflow.endpoint}`, requestBody);
        apiResponse = await fetch(`/api/generate/${selectedWorkflow.endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } else {
        // MCP API 测试
        const mcpParams = {
          ...testParams,
          force_regenerate: forceRegenerate
        };
        const mcpRequest = {
          jsonrpc: '2.0',
          method: `generate${selectedWorkflow.endpoint.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`,
          params: mcpParams,
          id: Date.now(),
        };
        
        console.log('Calling MCP API:', mcpRequest);
        apiResponse = await fetch('/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mcpRequest),
          signal: controller.signal,
        });
      }
      
      clearTimeout(timeoutId);
      console.log('API Response received:', apiResponse.status, apiResponse.statusText);

      if (!apiResponse.ok) {
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }

      const result = await apiResponse.json();
      console.log('API Result:', result);
      
      setResponse({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        data: result,
      });

    } catch (error) {
      console.error('API Test Error:', error);
      const err = error as any;
      if (err?.name === 'AbortError') {
        setError(t('errors.requestTimeout'));
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        setError(t('errors.networkError'));
      } else {
        setError((err?.message as string) || t('errors.unknownError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCurlCommand = () => {
    if (!selectedWorkflow) return '';

    if (testMethod === 'rest') {
      const requestBody = {
        ...testParams,
        force_regenerate: forceRegenerate
      };
      return `curl -X POST http://localhost:3000/api/generate/${selectedWorkflow.endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody, null, 2)}'`;
    } else {
      const mcpParams = {
        ...testParams,
        force_regenerate: forceRegenerate
      };
      const mcpRequest = {
        jsonrpc: '2.0',
        method: `generate${selectedWorkflow.endpoint.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`,
        params: mcpParams,
        id: 1,
      };
      
      return `curl -X POST http://localhost:3000/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(mcpRequest, null, 2)}'`;
    }
  };

  return (
    <Container maxWidth="xl">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {t('apiTest.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('apiTest.description')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 左侧：测试配置 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('apiTest.testConfiguration')}
              </Typography>

              {/* 工作流选择 */}
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('apiTest.selectWorkflow')}</InputLabel>
                <Select
                  value={selectedWorkflow?.id || ''}
                  onChange={(e) => handleWorkflowChange(e.target.value)}
                  label={t('apiTest.selectWorkflow')}
                >
                  {workflows.map((workflow) => (
                    <MenuItem key={workflow.id} value={workflow.id}>
                      {workflow.name} ({workflow.endpoint})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* API 方法选择 */}
              <FormControl fullWidth margin="normal">
                <InputLabel>API 类型</InputLabel>
                <Select
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value as 'rest' | 'mcp')}
                  label={t('labels.apiType')}
                >
                  <MenuItem value="rest">
                    <ApiIcon fontSize="small" sx={{ mr: 1 }} />
                    REST API
                  </MenuItem>
                  <MenuItem value="mcp">
                    <CodeIcon fontSize="small" sx={{ mr: 1 }} />
                    MCP JSON-RPC
                  </MenuItem>
                </Select>
              </FormControl>

              {/* 缓存控制选项 */}
              <FormControl fullWidth margin="normal">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">
                    {t('apiTest.cacheControl')}:
                  </Typography>
                  <Select
                    value={forceRegenerate ? 'force' : 'cache'}
                    onChange={(e) => setForceRegenerate(e.target.value === 'force')}
                    size="small"
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="cache">
                      {t('apiTest.useCache')}
                    </MenuItem>
                    <MenuItem value="force">
                      {t('apiTest.forceRegenerate')}
                    </MenuItem>
                  </Select>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                  {forceRegenerate
                    ? t('apiTest.forceRegenerateEnabled')
                    : t('apiTest.forceRegenerateDisabled')
                  }
                </Typography>
              </FormControl>

              {/* 参数配置 */}
              {selectedWorkflow?.mappings && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    {t('apiTest.parameterConfiguration')}
                  </Typography>
                  
                  {selectedWorkflow.mappings.map((mapping: any, index: number) => {
                    // 兼容旧新格式的参数名
                    const paramName = mapping.paramName || mapping.api_parameter || `param-${index}`;
                    const type = mapping.type || mapping.parameter_type || 'string';
                    const description = mapping.description || '';
                    const required = mapping.required || false;
                    // 关键词配置
                    const keywordEnabled = mapping.keywordEnabled || mapping.keyword_enabled || false;
                    const keywordPosition = mapping.keywordPosition || mapping.keyword_position || 'prefix';
                    
                    return (
                    <Box key={`${paramName}-${index}`} mb={2}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2">
                          {paramName}
                        </Typography>
                        <Chip
                          label={type}
                          size="small"
                          variant="outlined"
                        />
                        {required && (
                          <Chip
                            label={t('labels.required')}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                        {keywordEnabled && (
                          <Chip
                            label={`${t('keywords.keyword')}(${keywordPosition === 'prefix' ? t('labels.prefixInsert') : t('labels.suffixInsert')})`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {type === 'boolean' ? (
                        <FormControl fullWidth>
                          <Select
                            value={testParams[paramName]?.toString() || 'false'}
                            onChange={(e) => handleParamChange(paramName, e.target.value === 'true')}
                          >
                            <MenuItem value="true">true</MenuItem>
                            <MenuItem value="false">false</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          type={type === 'number' ? 'number' : 'text'}
                          value={testParams[paramName] || ''}
                          onChange={(e) => {
                            const value = type === 'number' 
                              ? parseFloat(e.target.value) || 0
                              : e.target.value;
                            handleParamChange(paramName, value);
                          }}
                          helperText={description}
                        />
                      )}

                      {/* 关键词输入 - 仅对启用关键词的string类型参数显示 */}
                      {type === 'string' && keywordEnabled && (
                        <Box
                          mt={1}
                          p={2}
                          sx={{
                            backgroundColor: '#f8f9ff',
                            border: '1px solid #e3f2fd',
                            borderRadius: 1
                          }}
                        >
                          <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
                            🔑 {t('labels.keywordBinding')} ({keywordPosition === 'prefix' ? t('labels.prefixInsert') : t('labels.suffixInsert')})
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            label={`${paramName} ${t('labels.keywordKey')}`}
                            value={testParams[`${paramName}_key`] || ''}
                            onChange={(e) => handleParamChange(`${paramName}_key`, e.target.value)}
                            helperText={t('labels.keywordKeyHelper')}
                            placeholder={t('labels.keywordKeyPlaceholder')}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'white'
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                    );
                  })}
                </Box>
              )}

              {/* 测试按钮 */}
              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
                  onClick={handleTest}
                  disabled={!selectedWorkflow || loading}
                >
                  {loading ? t('apiTest.testing') : t('apiTest.executeTest')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：结果和代码示例 */}
        <Grid item xs={12} md={6}>
          {/* cURL 命令 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('apiTest.curlCommand')}
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: 'grey.100', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {generateCurlCommand()}
                </pre>
              </Paper>
            </CardContent>
          </Card>

          {/* 响应结果 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('apiTest.response')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {response && (
                <Box>
                  <Box mb={2}>
                    <Chip
                      label={`${response.status} ${response.statusText}`}
                      color={response.status < 300 ? 'success' : 'error'}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    {t('apiTest.responseData')}:
                  </Typography>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      maxHeight: 400,
                      overflow: 'auto',
                    }}
                  >
                    <JsonView
                      src={response.data}
                      theme="default"
                      collapsed={false}
                    />
                  </Box>

                  {/* 如果有生成的图片URL，显示预览 */}
                  {response.data?.data?.url && (
                    <Box mt={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">
                          {t('apiTest.generatedImage')}:
                        </Typography>
                        <IconButton 
                          size="small"
                          onClick={() => setFullscreenImage(`http://localhost:3000${response.data.data.url}`)}
                          title={t('labels.fullscreenPreview')}
                        >
                          <FullscreenIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box 
                        sx={{ 
                          position: 'relative',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 }
                        }}
                        onClick={() => setFullscreenImage(`http://localhost:3000${response.data.data.url}`)}
                      >
                        <img
                          src={`http://localhost:3000${response.data.data.url}`}
                          alt="Generated"
                          style={{
                            width: '100%',
                            maxHeight: 300,
                            border: '1px solid #ddd',
                            borderRadius: 4,
                            objectFit: 'contain',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: 1,
                            p: 0.5,
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          {t('apiTest.clickFullscreenPreview')}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {!response && !error && !loading && (
                <Typography color="text.secondary">
                  {t('apiTest.selectWorkflowToTest')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 全屏图片预览对话框 */}
      <Dialog
        open={!!fullscreenImage}
        onClose={() => setFullscreenImage(null)}
        maxWidth={false}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
          }
        }}
      >
        <DialogActions sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
          <IconButton 
            onClick={() => setFullscreenImage(null)}
            sx={{ color: 'white', m: 1 }}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </DialogActions>
        
        <DialogContent 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 0,
            backgroundColor: 'transparent'
          }}
        >
          {fullscreenImage && (
            <Box 
              sx={{ 
                position: 'relative',
                width: '100%',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setFullscreenImage(null)}
            >
              <img
                src={fullscreenImage}
                alt="Fullscreen preview"
                style={{
                  maxWidth: '95vw',
                  maxHeight: '95vh',
                  objectFit: 'contain',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setFullscreenImage(null);
                }}
                onError={(e) => {
                  console.error('Image load error:', e);
                  setFullscreenImage(null);
                }}
              />
              
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute',
                  bottom: 20,
                  color: 'white',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  px: 2,
                  py: 1,
                  borderRadius: 1
                }}
              >
                {t('apiTest.clickAnywhereToClose')}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
    </Container>
  );
};

export default ApiTestView;