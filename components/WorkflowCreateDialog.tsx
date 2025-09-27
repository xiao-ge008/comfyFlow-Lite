import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Paper,
  Typography,
  Alert,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';

interface WorkflowCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editWorkflow?: any; // 编辑模式时传入的工作流数据
}

const WorkflowCreateDialog: React.FC<WorkflowCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  editWorkflow,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    description: '',
  });
  const [workflowJson, setWorkflowJson] = useState<any>(null);
  const [jsonError, setJsonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  // 编辑模式初始化
  useEffect(() => {
    if (editWorkflow && open) {
      setIsEditMode(true);
      setFormData({
        name: editWorkflow.name || '',
        endpoint: editWorkflow.endpoint || '',
        description: editWorkflow.description || '',
      });
      setWorkflowJson(editWorkflow.json || null);
      setJsonError('');
      setErrors({});
    } else if (open) {
      setIsEditMode(false);
      setFormData({ name: '', endpoint: '', description: '' });
      setWorkflowJson(null);
      setJsonError('');
      setErrors({});
    }
  }, [editWorkflow, open]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const json = JSON.parse(content);
            setWorkflowJson(json);
            setJsonError('');
          } catch (error) {
            setJsonError(t('errors.invalidJsonFile'));
            setWorkflowJson(null);
          }
        };
        reader.readAsText(file);
      }
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // 自动生成端点名称
    if (field === 'name' && !formData.endpoint) {
      const endpoint = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, endpoint }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('errors.workflowNameRequired');
    }

    if (!formData.endpoint.trim()) {
      newErrors.endpoint = t('errors.endpointRequired');
    } else if (!/^[a-z0-9_-]+$/.test(formData.endpoint)) {
      newErrors.endpoint = t('errors.endpointInvalid');
    }

    if (!workflowJson) {
      newErrors.json = t('errors.workflowJsonRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditMode ? `/api/workflows` : '/api/workflows';
      const method = isEditMode ? 'PUT' : 'POST';
      const body = isEditMode 
        ? {
            id: editWorkflow.id,
            name: formData.name,
            endpoint: formData.endpoint,
            description: formData.description,
            json: workflowJson,
            mappings: editWorkflow.mappings || [], // 保持现有映射
          }
        : {
            name: formData.name,
            endpoint: formData.endpoint,
            description: formData.description,
            json: workflowJson,
            mappings: [], // 初始为空，稍后在映射页面配置
          };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json();
        setJsonError(errorData.error || t('errors.createFailed'));
      }
    } catch (error) {
      setJsonError(t('errors.networkErrorRetry'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', endpoint: '', description: '' });
    setWorkflowJson(null);
    setJsonError('');
    setErrors({});
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {isEditMode ? t('workflows.editWorkflow') : t('workflows.createWorkflow')}
          <Button
            onClick={handleClose}
            color="inherit"
            size="small"
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* 基本信息 */}
          <Grid item xs={12} md={6}>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                基本信息
              </Typography>
              
              <TextField
                fullWidth
                label={t('labels.workflowName')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label={t('labels.apiEndpointName')}
                value={formData.endpoint}
                onChange={(e) => handleInputChange('endpoint', e.target.value)}
                error={!!errors.endpoint}
                helperText={errors.endpoint || t('labels.endpointHelper')}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label={t('forms.description')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                margin="normal"
                multiline
                rows={3}
                helperText={t('labels.descriptionHelper')}
              />
            </Box>
          </Grid>

          {/* 文件上传 */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {t('workflowManagement.workflowFile')}
            </Typography>
            
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                backgroundColor: isDragActive ? 'action.hover' : 'background.default',
                cursor: 'pointer',
                textAlign: 'center',
                mb: 2,
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {isDragActive
                  ? t('labels.releaseToUpload')
                  : t('labels.dragDropOrClick')}
              </Typography>
            </Paper>

            {errors.json && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.json}
              </Alert>
            )}

            {jsonError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {jsonError}
              </Alert>
            )}

            {workflowJson && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('workflowManagement.workflowJsonLoaded', { count: Object.keys(workflowJson).length })}
              </Alert>
            )}
          </Grid>

          {/* JSON 预览 */}
          {workflowJson && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                JSON 预览
              </Typography>
              <Box 
                sx={{ 
                  maxHeight: 300, 
                  overflow: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <JsonView 
                  src={workflowJson}
                  theme="default"
                  collapsed={2}
                />
              </Box>
            </Grid>
          )}
        </Grid>

        {submitting && (
          <Box mt={2}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" mt={1}>
              {t('workflowManagement.creatingWorkflow')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={submitting}>
          取消
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={submitting || !workflowJson}
        >
          {submitting 
            ? (isEditMode ? t('labels.saving') : t('labels.creating'))
            : (isEditMode ? t('labels.saveChanges') : t('labels.createWorkflow'))
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowCreateDialog;