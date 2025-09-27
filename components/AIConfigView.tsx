import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Grid,
  Divider,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  SmartToy as BotIcon,
  Settings as SettingsIcon,
  Build as ToolIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AIConfig } from '../lib/types';
import { Toaster, toast } from 'react-hot-toast';

interface AIConfigViewProps {}

const AIConfigView: React.FC<AIConfigViewProps> = () => {
  const { t } = useTranslation();

  const theme = useTheme();
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<Partial<AIConfig>>({
    provider: 'openai',
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: true,
    maxTokens: 2000,
    temperature: 0.7,
  });

  // 显示/隐藏API密钥
  const [showApiKeys, setShowApiKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-config?action=list');
      const data = await response.json();
      
      if (data.success) {
        setConfigs(data.configs || []);
      } else {
        setError(t('errors.loadAIConfigFailed') + ': ' + data.error);
        setConfigs([]);
      }
    } catch (error) {
      setError(t('errors.loadAIConfigError') + ': ' + (error as Error).message);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingConfig(null);
    setFormData({
      provider: 'openai',
      name: '',
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: true,
      maxTokens: 2000,
      temperature: 0.7,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (config: AIConfig) => {
    setEditingConfig(config);
    setFormData({ ...config });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setFormData({
      provider: 'openai',
      name: '',
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: true,
      maxTokens: 2000,
      temperature: 0.7,
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.baseUrl || !formData.apiKey || !formData.model) {
      toast.error(t('errors.pleaseCompleteAllFields'));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          config: {
            ...formData,
            id: editingConfig?.id || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingConfig ? t('errors.aiConfigUpdateSuccess') : t('errors.aiConfigCreateSuccess'));
        closeDialog();
        loadConfigs();
      } else {
        toast.error(t('errors.saveFailed') + ': ' + data.error);
      }
    } catch (error) {
      toast.error(t('errors.saveError') + ': ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm(t('errors.confirmDeleteAIConfig'))) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          configId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('errors.aiConfigDeleteSuccess'));
        loadConfigs();
      } else {
        toast.error(t('errors.deleteFailed') + ': ' + data.error);
      }
    } catch (error) {
      toast.error(t('errors.deleteError') + ': ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleApiKeyVisibility = (configId: string) => {
    const newShowKeys = new Set(showApiKeys);
    if (newShowKeys.has(configId)) {
      newShowKeys.delete(configId);
    } else {
      newShowKeys.add(configId);
    }
    setShowApiKeys(newShowKeys);
  };

  const maskApiKey = (apiKey: string) => {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'gemini':
        return '💎';
      default:
        return '⚡';
    }
  };

  const getDefaultBaseUrl = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      default:
        return '';
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BotIcon sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h5">{t('settings.aiConfig')}</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              disabled={loading}
            >
              {t('buttons.create')}
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            管理AI提供商配置，支持OpenAI、Gemini和自定义API服务
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 配置列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            配置列表 ({configs?.length || 0})
          </Typography>

          {!configs || configs.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <BotIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                还没有AI配置
              </Typography>
              <Typography variant="body2" color="text.secondary">
                点击&quot;添加配置&quot;创建第一个AI配置
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('tableHeaders.name')}</TableCell>
                    <TableCell>{t('tableHeaders.provider')}</TableCell>
                    <TableCell>{t('tableHeaders.model')}</TableCell>
                    <TableCell>{t('tableHeaders.apiKey')}</TableCell>
                    <TableCell>{t('tableHeaders.status')}</TableCell>
                    <TableCell align="right">{t('tableHeaders.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs?.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: 8 }}>
                            {getProviderIcon(config.provider)}
                          </span>
                          <Typography variant="body2" fontWeight="medium">
                            {config.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={config.provider.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {config.model}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              mr: 1,
                              minWidth: 100,
                            }}
                          >
                            {showApiKeys.has(config.id!) 
                              ? config.apiKey 
                              : maskApiKey(config.apiKey)
                            }
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => toggleApiKeyVisibility(config.id!)}
                          >
                            {showApiKeys.has(config.id!) ? (
                              <VisibilityOffIcon fontSize="small" />
                            ) : (
                              <ViewIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={config.enabled ? t('labels.enabled') : t('labels.disabled')}
                          color={config.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(config)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(config.id!)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConfig ? t('settings.aiConfig') : t('workflows.createWorkflow')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>提供商</InputLabel>
                <Select
                  value={formData.provider || 'openai'}
                  onChange={(e) => {
                    const provider = e.target.value as AIConfig['provider'];
                    setFormData({
                      ...formData,
                      provider,
                      baseUrl: getDefaultBaseUrl(provider) || formData.baseUrl,
                    });
                  }}
                  label={t('labels.provider')}
                >
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="gemini">Google Gemini</MenuItem>
                  <MenuItem value="custom">自定义</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('labels.configName')}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('labels.configNamePlaceholder')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('labels.apiBaseUrl')}
                value={formData.baseUrl || ''}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder={t('labels.apiBaseUrlPlaceholder')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('labels.apiKey')}
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={t('labels.apiKeyPlaceholder')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('labels.modelName')}
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder={t('labels.modelNamePlaceholder')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled || false}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label={t('labels.enableConfig')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                高级设置
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('labels.maxTokens')}
                type="number"
                value={formData.maxTokens || 2000}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 32000 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('labels.temperature')}
                type="number"
                value={formData.temperature || 0.7}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                helperText={t('labels.temperatureHelper')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('buttons.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? t('messages.loading') : t('buttons.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Toaster position="top-right" />
    </Box>
  );
};

export default AIConfigView;