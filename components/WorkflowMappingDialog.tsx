import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';

interface WorkflowMappingDialogProps {
  open: boolean;
  workflow: any;
  onClose: () => void;
  onSave: (mappings: any[]) => void;
}

interface ParameterMapping {
  id: string;
  paramName: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  nodeId: string;
  field: string;
  description: string;
  required: boolean;
  default?: any;
  keywordEnabled?: boolean;
  keywordPosition?: 'prefix' | 'suffix';
  keywordTypes?: string[];
}

const WorkflowMappingDialog: React.FC<WorkflowMappingDialogProps> = ({
  open,
  workflow,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<ParameterMapping[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [expandedPanel, setExpandedPanel] = useState<string>('nodes');
  const [editingMapping, setEditingMapping] = useState<ParameterMapping | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (workflow?.mappings) {
      // 兼容数据库格式和旧格式
      setMappings(workflow.mappings.map((m: any, index: number) => ({
        id: m.id || `mapping-${index}`,
        paramName: m.paramName || m.api_parameter,
        type: m.type || m.parameter_type || 'string',
        nodeId: m.nodeId || m.node_id,
        field: m.field || m.field_name,
        description: m.description || '',
        required: m.required || false,
        default: m.default !== undefined ? m.default :
                (m.default_value ? JSON.parse(m.default_value) : undefined),
        // 关键词配置
        keywordEnabled: m.keyword_enabled || false,
        keywordPosition: m.keyword_position || 'prefix',
        keywordTypes: m.keyword_types ? JSON.parse(m.keyword_types) : [],
      })));
    } else {
      setMappings([]);
    }
  }, [workflow]);

  const getWorkflowNodes = () => {
    if (!workflow?.json) return {};
    return workflow.json;
  };

  const getNodeInputs = (nodeId: string) => {
    const nodes = getWorkflowNodes();
    const node = nodes[nodeId];
    if (!node || !node.inputs) return {};
    return node.inputs;
  };

  const getNodeFields = (nodeId: string) => {
    const inputs = getNodeInputs(nodeId);
    const fields: string[] = [];
    
    Object.keys(inputs).forEach(key => {
      const input = inputs[key];
      // 如果是基本类型值，可以作为可配置参数
      if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
        fields.push(key);
      }
    });
    
    return fields;
  };

  const detectFieldType = (nodeId: string, field: string): 'string' | 'number' | 'boolean' | 'array' => {
    const inputs = getNodeInputs(nodeId);
    const value = inputs[field];
    
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    return 'string';
  };

  const addMapping = () => {
    if (!selectedNodeId || !selectedField) return;

    const newMapping: ParameterMapping = {
      id: `mapping-${Date.now()}`,
      paramName: `${selectedNodeId}_${selectedField}`.replace(/\s+/g, '_').toLowerCase(),
      type: detectFieldType(selectedNodeId, selectedField),
      nodeId: selectedNodeId,
      field: selectedField,
      description: `${t('workflowMapping.parameterDescription')} ${selectedNodeId} ${selectedField}`,
      required: false,
      default: getNodeInputs(selectedNodeId)[selectedField],
    };

    setMappings(prev => [...prev, newMapping]);
    setSelectedNodeId('');
    setSelectedField('');
  };

  const updateMapping = (id: string, updates: Partial<ParameterMapping>) => {
    setMappings(prev => prev.map(mapping => 
      mapping.id === id ? { ...mapping, ...updates } : mapping
    ));
  };

  const deleteMapping = (id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const paramNames = new Set();

    mappings.forEach((mapping, index) => {
      if (!mapping.paramName.trim()) {
        errors.push(t('workflowMapping.validationErrors.parameterNameEmpty', { index: index + 1 }));
      } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(mapping.paramName)) {
        errors.push(t('workflowMapping.validationErrors.parameterNameInvalid', { paramName: mapping.paramName }));
      }

      if (paramNames.has(mapping.paramName)) {
        errors.push(t('workflowMapping.validationErrors.parameterNameDuplicate', { paramName: mapping.paramName }));
      }
      paramNames.add(mapping.paramName);

      if (!mapping.nodeId || !mapping.field) {
        errors.push(t('workflowMapping.validationErrors.nodeIdFieldEmpty', { index: index + 1 }));
      }
    });

    return errors;
  };

  const handleSave = async () => {
    setError(null);
    
    // 验证映射
    const errors = validateMappings();
    setValidationErrors(errors);

    if (errors.length > 0) {
      setError(t('workflowMapping.validationErrors.fixValidationErrors'));
      return;
    }

    setSaving(true);
    try {
      await onSave(mappings);
    } catch (err) {
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return; // 保存中不允许关闭
    
    setEditingMapping(null);
    setSelectedNodeId('');
    setSelectedField('');
    setExpandedPanel('nodes');
    setError(null);
    setValidationErrors([]);
    onClose();
  };

  const nodes = getWorkflowNodes();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { minHeight: '80vh' } }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{t('workflowMapping.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('workflowMapping.workflowLabel')}: {workflow?.name}
            </Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* 错误消息显示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {validationErrors.length > 0 && (
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                {validationErrors.map((err, index) => (
                  <Box component="li" key={index}>
                    {err}
                  </Box>
                ))}
              </Box>
            )}
          </Alert>
        )}
        <Grid container spacing={3}>
          {/* 左侧：节点浏览和字段选择 */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SettingsIcon sx={{ mr: 1 }} />
                  {t('workflowMapping.nodeBrowser')}
                </Typography>

                <Accordion 
                  expanded={expandedPanel === 'nodes'} 
                  onChange={() => setExpandedPanel(expandedPanel === 'nodes' ? '' : 'nodes')}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{t('workflowMapping.workflowNodes')} ({Object.keys(nodes).length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {Object.entries(nodes).map(([nodeId, node]: [string, any]) => (
                        <ListItemButton
                          key={nodeId}
                          selected={selectedNodeId === nodeId}
                          onClick={() => {
                            setSelectedNodeId(nodeId);
                            setSelectedField('');
                          }}
                          sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight="bold">
                                  {nodeId}
                                </Typography>
                                <Chip
                                  label={node.class_type || 'Unknown'}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={`${Object.keys(node.inputs || {}).length} ${t('forms.parameters')}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>

                {/* 字段选择 */}
                {selectedNodeId && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                      {t('workflowMapping.configurableFields')}
                    </Typography>

                    <FormControl fullWidth margin="normal">
                      <InputLabel>{t('workflowMapping.selectField')}</InputLabel>
                      <Select
                        value={selectedField}
                        onChange={(e) => setSelectedField(e.target.value)}
                        label={t('workflowMapping.selectField')}
                      >
                        {getNodeFields(selectedNodeId).map(field => {
                          const currentValue = getNodeInputs(selectedNodeId)[field];
                          return (
                            <MenuItem key={field} value={field}>
                              <Box>
                                <Typography variant="body2">
                                  {field}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  当前值: {JSON.stringify(currentValue)}
                                </Typography>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addMapping}
                      disabled={!selectedField}
                      sx={{ mt: 2 }}
                    >
                      {t('workflowMapping.addParameterMapping')}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 右侧：参数映射列表和编辑 */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    <LinkIcon sx={{ mr: 1 }} />
                    {t('workflowMapping.parameterMappings')} ({mappings.length})
                  </Typography>
                  
                  {mappings.length === 0 && (
                    <Chip 
                      label={t('workflowMapping.notConfigured')}
                      color="warning" 
                      variant="outlined" 
                      size="small"
                    />
                  )}
                </Box>

                {mappings.length === 0 ? (
                  <Alert severity="info">
                    {t('workflowMapping.noMappingsMessage')}
                  </Alert>
                ) : (
                  <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                    {mappings.map((mapping, index) => (
                      <Paper key={mapping.id} sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box flex={1}>
                            <Typography variant="h6" fontSize="1rem">
                              {mapping.paramName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {mapping.nodeId} → {mapping.field}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" gap={1}>
                            <Chip 
                              label={mapping.type} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                            />
                            {mapping.required && (
                              <Chip 
                                label="必需" 
                                size="small" 
                                color="error" 
                                variant="outlined" 
                              />
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteMapping(mapping.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('workflowMapping.parameterName')}
                              value={mapping.paramName}
                              onChange={(e) => updateMapping(mapping.id, { paramName: e.target.value })}
                              helperText={t('workflowMapping.helperTexts.parameterNameHelper')}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>{t('workflowMapping.dataType')}</InputLabel>
                              <Select
                                value={mapping.type}
                                onChange={(e) => updateMapping(mapping.id, { type: e.target.value as any })}
                                label={t('workflowMapping.dataType')}
                              >
                                <MenuItem value="string">{t('workflowMapping.dataTypes.string')}</MenuItem>
                                <MenuItem value="number">{t('workflowMapping.dataTypes.number')}</MenuItem>
                                <MenuItem value="boolean">{t('workflowMapping.dataTypes.boolean')}</MenuItem>
                                <MenuItem value="array">{t('workflowMapping.dataTypes.array')}</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('workflowMapping.parameterDescription')}
                              value={mapping.description}
                              onChange={(e) => updateMapping(mapping.id, { description: e.target.value })}
                              multiline
                              rows={2}
                              helperText={t('workflowMapping.helperTexts.parameterDescriptionHelper')}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('workflowMapping.defaultValue')}
                              value={mapping.default || ''}
                              onChange={(e) => {
                                let value: any = e.target.value;
                                if (mapping.type === 'number') {
                                  value = parseFloat(value) || 0;
                                } else if (mapping.type === 'boolean') {
                                  value = value === 'true';
                                }
                                updateMapping(mapping.id, { default: value });
                              }}
                              helperText={t('workflowMapping.helperTexts.defaultValueHelper')}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={mapping.required}
                                  onChange={(e) => updateMapping(mapping.id, { required: e.target.checked })}
                                />
                              }
                              label={t('workflowMapping.requiredParameter')}
                            />
                          </Grid>

                          {/* 关键词配置 - 仅对string类型参数显示 */}
                          {mapping.type === 'string' && (
                            <>
                              <Grid item xs={12}>
                                <Divider sx={{ my: 1 }}>
                                  <Chip label={t('workflowMapping.keywordConfiguration')} size="small" />
                                </Divider>
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={mapping.keywordEnabled || false}
                                      onChange={(e) => updateMapping(mapping.id, { keywordEnabled: e.target.checked })}
                                    />
                                  }
                                  label={t('workflowMapping.enableKeywordReference')}
                                />
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {t('workflowMapping.helperTexts.keywordReferenceHelper')}
                                </Typography>
                              </Grid>

                              {mapping.keywordEnabled && (
                                <>
                                  <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>{t('workflowMapping.keywordPosition')}</InputLabel>
                                      <Select
                                        value={mapping.keywordPosition || 'prefix'}
                                        onChange={(e) => updateMapping(mapping.id, { keywordPosition: e.target.value as 'prefix' | 'suffix' })}
                                        label={t('workflowMapping.keywordPosition')}
                                      >
                                        <MenuItem value="prefix">{t('workflowMapping.prefixInsert')}</MenuItem>
                                        <MenuItem value="suffix">{t('workflowMapping.suffixInsert')}</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>

                                  <Grid item xs={12}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>{t('workflowMapping.allowedKeywordTypes')}</InputLabel>
                                      <Select
                                        multiple
                                        value={mapping.keywordTypes || []}
                                        onChange={(e) => updateMapping(mapping.id, { keywordTypes: e.target.value as string[] })}
                                        label={t('workflowMapping.allowedKeywordTypes')}
                                        renderValue={(selected) => (
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {(selected as string[]).map((value) => (
                                              <Chip key={value} label={
                                                value === 'person' ? t('workflowMapping.person') :
                                                value === 'action' ? t('workflowMapping.action') :
                                                value === 'style' ? t('workflowMapping.style') : value
                                              } size="small" />
                                            ))}
                                          </Box>
                                        )}
                                      >
                                        <MenuItem value="person">{t('workflowMapping.person')}</MenuItem>
                                        <MenuItem value="action">{t('workflowMapping.action')}</MenuItem>
                                        <MenuItem value="style">{t('workflowMapping.style')}</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <Typography variant="caption" color="text.secondary">
                                      {t('workflowMapping.helperTexts.keywordTypesHelper')}
                                    </Typography>
                                  </Grid>
                                </>
                              )}
                            </>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* API 预览 */}
        {mappings.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon sx={{ mr: 1 }} />
                API 接口预览
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('workflowMapping.restApiExample')}:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.100', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`curl -X POST http://localhost:3000/api/generate/${workflow?.endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
${mappings.map(m => `    "${m.paramName}": ${JSON.stringify(m.default || (m.type === 'string' ? 'example' : m.type === 'number' ? 1 : m.type === 'boolean' ? true : []))}`).join(',\n')}
  }'`}
                    </pre>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('workflowMapping.mcpJsonRpcExample')}:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.100', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "jsonrpc": "2.0",
  "method": "generate${workflow?.endpoint?.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}",
  "params": {
${mappings.map(m => `    "${m.paramName}": ${JSON.stringify(m.default || (m.type === 'string' ? 'example' : m.type === 'number' ? 1 : m.type === 'boolean' ? true : []))}`).join(',\n')}
  },
  "id": 1
}`}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button 
          variant="contained" 
          startIcon={saving ? <RefreshIcon className="animate-spin" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={mappings.length === 0 || saving}
        >
          {saving ? t('workflowMapping.saving') : `${t('workflowMapping.saveMappings')} (${mappings.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowMappingDialog;