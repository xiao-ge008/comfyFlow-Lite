import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { Keyword } from '@/lib/types';

interface KeywordCreateDialogProps {
  open: boolean;
  keyword?: Keyword | null;
  onClose: () => void;
  onSave: (keyword: Omit<Keyword, 'id' | 'created_at' | 'updated_at'>) => void;
}

const KeywordCreateDialog: React.FC<KeywordCreateDialogProps> = ({
  open,
  keyword,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    kyeid: '',
    type: 'person' as 'person' | 'action' | 'style',
    keyword_en: '',
    keyword_cn: '',
    description: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!keyword;

  // 重置表单
  const resetForm = () => {
    if (keyword) {
      setFormData({
        kyeid: keyword.kyeid,
        type: keyword.type,
        keyword_en: keyword.keyword_en,
        keyword_cn: keyword.keyword_cn || '',
        description: keyword.description || '',
      });
      setTags(keyword.tags || []);
    } else {
      setFormData({
        kyeid: '',
        type: 'person',
        keyword_en: '',
        keyword_cn: '',
        description: '',
      });
      setTags([]);
    }
    setNewTag('');
    setErrors({});
  };

  // 当对话框打开或关键词变化时重置表单
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, keyword]);

  // 处理表单字段变化
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // 添加标签
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setNewTag('');
    }
  };

  // 删除标签
  const handleDeleteTag = (tagToDelete: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToDelete));
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.kyeid.trim()) {
      newErrors.kyeid = t('errors.keywordIdRequired');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.kyeid)) {
      newErrors.kyeid = t('errors.keywordIdInvalid');
    }

    if (!formData.keyword_en.trim()) {
      newErrors.keyword_en = t('errors.englishKeywordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const keywordData = {
      ...formData,
      keyword_cn: formData.keyword_cn || undefined,
      description: formData.description || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSave(keywordData);
  };

  // 处理关闭
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEdit ? t('keywordManagement.updateSuccess') : t('keywordManagement.addKeyword')}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 基本信息 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('labels.keywordId')}
              value={formData.kyeid}
              onChange={(e) => handleFieldChange('kyeid', e.target.value)}
              error={!!errors.kyeid}
              helperText={errors.kyeid || t('labels.keywordIdHelper')}
              required
              fullWidth
            />
            
            <FormControl fullWidth required>
              <InputLabel>类型</InputLabel>
              <Select
                value={formData.type}
                label={t('forms.type')}
                onChange={(e) => handleFieldChange('type', e.target.value)}
              >
                <MenuItem value="person">人物</MenuItem>
                <MenuItem value="action">动作</MenuItem>
                <MenuItem value="style">风格</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 关键词内容 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('labels.englishKeyword')}
              value={formData.keyword_en}
              onChange={(e) => handleFieldChange('keyword_en', e.target.value)}
              error={!!errors.keyword_en}
              helperText={errors.keyword_en || t('labels.englishKeywordHelper')}
              required
              fullWidth
            />
            
            <TextField
              label={t('labels.chineseKeyword')}
              value={formData.keyword_cn}
              onChange={(e) => handleFieldChange('keyword_cn', e.target.value)}
              helperText={t('labels.chineseKeywordHelper')}
              fullWidth
            />
          </Box>

          {/* 标签管理 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              标签
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder={t('labels.addTags')}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                添加
              </Button>
            </Box>
          </Box>

          {/* 描述 */}
          <TextField
            label={t('forms.description')}
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            helperText={t('labels.descriptionHelper')}
            multiline
            rows={3}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
        >
          {isEdit ? t('buttons.edit') : t('buttons.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeywordCreateDialog;
