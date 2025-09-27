import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface KeywordImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (csvData: string) => void;
}

const KeywordImportDialog: React.FC<KeywordImportDialogProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const { t } = useTranslation();
  const [csvData, setCsvData] = useState('');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置状态
  const resetState = () => {
    setCsvData('');
    setPreviewData([]);
    setShowPreview(false);
    setError(null);
  };

  // 处理文件上传
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(t('keywordImport.pleaseSelectCsvFile'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      parseCSVPreview(content);
      setError(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // 解析CSV预览
  const parseCSVPreview = (content: string) => {
    try {
      const lines = content.trim().split('\n');
      const parsed = lines.slice(0, 6).map(line => 
        line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      );
      setPreviewData(parsed);
      setShowPreview(true);
    } catch (err) {
      setError(t('keywordImport.csvParseError'));
    }
  };

  // 处理手动输入
  const handleTextChange = (value: string) => {
    setCsvData(value);
    if (value.trim()) {
      parseCSVPreview(value);
    } else {
      setPreviewData([]);
      setShowPreview(false);
    }
    setError(null);
  };

  // 处理导入
  const handleImport = () => {
    if (!csvData.trim()) {
      setError(t('keywordImport.pleaseInputOrUploadCsv'));
      return;
    }

    onImport(csvData);
  };

  // 处理关闭
  const handleClose = () => {
    resetState();
    onClose();
  };

  // CSV模板
  const csvTemplate = `kyeid,type,keyword_en,keyword_cn,tags,description
girl001,person,beautiful girl,美丽女孩,portrait;beauty,美丽的女性角色
action001,action,running,跑步,movement;sport,跑步动作
style001,style,anime style,动漫风格,art;cartoon,日式动漫绘画风格`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {t('keywordImport.csvBatchImport')}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 说明 */}
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              <strong>{t('keywordImport.csvFormatRequirements')}：</strong>
            </Typography>
            <Typography variant="body2" component="div">
              {t('keywordImport.formatDescription')}
            </Typography>
          </Alert>

          {/* 文件上传区域 */}
          <Paper
            {...getRootProps()}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? t('keywordImport.dropFileHere') : t('keywordImport.dragOrClickToSelect')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('keywordImport.supportsCsvFormat')}
            </Typography>
          </Paper>

          {/* 手动输入 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('keywordImport.orManualInput')}：
            </Typography>
            <TextField
              multiline
              rows={8}
              fullWidth
              placeholder={csvTemplate}
              value={csvData}
              onChange={(e) => handleTextChange(e.target.value)}
              variant="outlined"
            />
          </Box>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* 预览 */}
          {previewData.length > 0 && (
            <Box>
              <Button
                startIcon={showPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowPreview(!showPreview)}
                sx={{ mb: 1 }}
              >
                {t('keywordImport.dataPreview', { count: previewData.length - 1 })}
              </Button>
              
              <Collapse in={showPreview}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {previewData[0]?.map((header, index) => (
                          <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {cell || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {previewData.length > 6 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('keywordImport.showingFirst5Rows')}
                  </Typography>
                )}
              </Collapse>
            </Box>
          )}

          {/* CSV模板下载 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('keywordImport.csvTemplateExample')}：
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {csvTemplate}
              </Typography>
            </Paper>
            <Button
              size="small"
              onClick={() => {
                const blob = new Blob([csvTemplate], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'keyword_template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              sx={{ mt: 1 }}
            >
              {t('keywordImport.downloadTemplate')}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {t('buttons.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!csvData.trim()}
        >
          开始导入
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeywordImportDialog;
