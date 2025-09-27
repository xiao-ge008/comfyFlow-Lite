import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

interface LanguageSwitcherProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
}

export default function LanguageSwitcher({ 
  variant = 'outlined', 
  size = 'small' 
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // 确保组件在客户端挂载后才显示动态内容
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  // 防止水合错误：在服务端和客户端未挂载时都显示默认值
  const currentLanguage = mounted ? i18n.language : 'en';
  const displayLanguage = languages.find(lang => lang.code === currentLanguage) || languages[1];

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl size={size} variant={variant}>
        <Select
          value={currentLanguage}
          onChange={handleLanguageChange}
          displayEmpty
          sx={{
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
          renderValue={(selected) => {
            const currentLang = languages.find(lang => lang.code === selected) || languages[1];
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LanguageIcon fontSize="small" />
                <Typography variant="body2">
                  {currentLang.flag} {currentLang.name}
                </Typography>
              </Box>
            );
          }}
        >
          {languages.map((language) => (
            <MenuItem key={language.code} value={language.code}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  {language.flag} {language.name}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
