import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Description as DocIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { Workflow } from '@/lib/types';
import { generateApiDoc } from '@/lib/docGenerator';

interface ApiDocDialogProps {
  open: boolean;
  workflow: Workflow | null;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { t } = useTranslation();
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`api-doc-tabpanel-${index}`}
      aria-labelledby={`api-doc-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ApiDocDialog: React.FC<ApiDocDialogProps> = ({
  open,
  workflow,
  onClose,
}) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCopyToClipboard = async () => {
    if (!workflow) return;

    try {
      const docContent = generateApiDoc(workflow);
      await navigator.clipboard.writeText(docContent);
      setCopySuccess(true);
    } catch (error) {
      console.error(t('errors.copyFailed'), error);
      setCopyError(true);
    }
  };

  const handleCloseCopyAlert = () => {
    setCopySuccess(false);
    setCopyError(false);
  };

  if (!workflow) return null;

  const docContent = generateApiDoc(workflow);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <DocIcon color="primary" />
              <Typography variant="h6">
                API接口文档 - {workflow.name}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<DocIcon />} 
              label={t('labels.preview')} 
              id="api-doc-tab-0"
              aria-controls="api-doc-tabpanel-0"
            />
            <Tab 
              icon={<CodeIcon />} 
              label={t('labels.markdownSource')} 
              id="api-doc-tab-1"
              aria-controls="api-doc-tabpanel-1"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  backgroundColor: '#fafafa',
                  '& h1': { 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    mb: 2,
                    color: 'primary.main'
                  },
                  '& h2': { 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold', 
                    mt: 3, 
                    mb: 1,
                    color: 'text.primary'
                  },
                  '& h3': { 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold', 
                    mt: 2, 
                    mb: 1 
                  },
                  '& pre': {
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '12px',
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                  },
                  '& code': {
                    backgroundColor: '#f5f5f5',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.875rem',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    mt: 1,
                    mb: 2
                  },
                  '& th, & td': {
                    border: '1px solid #ddd',
                    padding: '8px 12px',
                    textAlign: 'left'
                  },
                  '& th': {
                    backgroundColor: '#f8f9fa',
                    fontWeight: 'bold'
                  }
                }}
              >
                <div dangerouslySetInnerHTML={{ 
                  __html: formatMarkdownToHtml(docContent) 
                }} />
              </Paper>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  fontSize: '0.875rem',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {docContent}
              </pre>
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} variant="outlined">
            关闭
          </Button>
          <Button
            onClick={handleCopyToClipboard}
            variant="contained"
            startIcon={<CopyIcon />}
          >
            复制文档
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleCloseCopyAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseCopyAlert} severity="success">
          文档已复制到剪贴板！
        </Alert>
      </Snackbar>

      <Snackbar
        open={copyError}
        autoHideDuration={3000}
        onClose={handleCloseCopyAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseCopyAlert} severity="error">
          复制失败，请手动复制文档内容
        </Alert>
      </Snackbar>
    </>
  );
};

/**
 * 简单的Markdown到HTML转换（基础版本）
 */
function formatMarkdownToHtml(markdown: string): string {
  return markdown
    // 标题
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 表格（简单处理）
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim());
      const isHeader = match.includes('---');
      if (isHeader) return '<tr>' + cells.map(() => '<th></th>').join('') + '</tr>';
      return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>';
    })
    // 换行
    .replace(/\n/g, '<br>');
}

export default ApiDocDialog;
