import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatColorText,
  FormatColorFill,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatListBulleted,
  FormatListNumbered,
  FormatSize,
  Image,
  TableChart,
  EmojiEmotions,
  Clear,
  FormatQuote,
  Title,
  Code,
  Check,
  CloudUpload,
  FormatIndentIncrease,
  FormatIndentDecrease,
  HorizontalRule,
  FontDownload,
} from '@mui/icons-material';
import { HexColorPicker } from 'react-colorful';

// LINKS AND IMAGE UPLOAD COMPLETELY REMOVED - Only paste works

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start writing your content here...",
  height = 400,
  readOnly = false
}) => {
  const editorRef = useRef(null);
  
  // State
  const [editorContent, setEditorContent] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    formatBlock: 'div',
  });
  
  // Popover anchors
  const [colorAnchorEl, setColorAnchorEl] = useState(null);
  const [bgColorAnchorEl, setBgColorAnchorEl] = useState(null);
  const [fontFamilyAnchorEl, setFontFamilyAnchorEl] = useState(null);
  const [fontSizeAnchorEl, setFontSizeAnchorEl] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  
  // Dialog states
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  
  // Form states
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState('3'); // HTML font size (1-7)

  // Font options
  const fonts = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  ];

  // Font sizes (HTML sizes 1-7)
  const fontSizes = [
    { label: 'Smallest', value: '1', px: '10px' },
    { label: 'Small', value: '2', px: '12px' },
    { label: 'Normal', value: '3', px: '14px' },
    { label: 'Medium', value: '4', px: '16px' },
    { label: 'Large', value: '5', px: '18px' },
    { label: 'Larger', value: '6', px: '24px' },
    { label: 'Largest', value: '7', px: '32px' },
  ];

  // Emojis
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '👍', '👎', '👌', '❤️', '🔥', '⭐', '✅', '❌', '⚠️', '🚀',
  ];

  // Initialize editor with value
  useEffect(() => {
    if (value && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      setEditorContent(value);
    }
  }, [value]);

  // Update active formats when selection changes
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        formatBlock: document.queryCommandValue('formatBlock') || 'div',
      });
    } catch (e) {
      // Silently fail
    }
  }, []);

  // Handle editor changes
  const handleChange = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setEditorContent(content);
    onChange(content);
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  // Handle selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [updateActiveFormats]);

  // Handle paste for images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          const url = URL.createObjectURL(file);
          
          // Insert image directly
          document.execCommand('insertHTML', false, `<img src="${url}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 4px;" />`);
          handleChange();
          break;
        }
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('paste', handlePaste);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('paste', handlePaste);
      }
    };
  }, [handleChange]);

  // Execute command
  const execCommand = useCallback((command, value = null) => {
    if (!editorRef.current) return;
    
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleChange();
  }, [handleChange]);

  // Handle format button click
  const handleFormat = useCallback((command, value = null) => {
    execCommand(command, value);
  }, [execCommand]);

  // Handle font family - SIMPLE: uses execCommand which works properly
  const handleFontFamily = useCallback((family) => {
    setFontFamily(family);
    execCommand('fontName', family);
    setFontFamilyAnchorEl(null);
  }, [execCommand]);

  // Handle font size - SIMPLE: uses execCommand which works properly
  const handleFontSize = useCallback((size) => {
    setFontSize(size);
    execCommand('fontSize', size);
    setFontSizeAnchorEl(null);
  }, [execCommand]);

  // Handle text color
  const handleTextColor = useCallback((color) => {
    setTextColor(color);
    execCommand('foreColor', color);
  }, [execCommand]);

  // Handle background color
  const handleBgColor = useCallback((color) => {
    setBgColor(color);
    execCommand('backColor', color);
  }, [execCommand]);

  // Insert table
  const handleInsertTable = useCallback(() => {
    let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #ddd;">';
    tableHtml += '<tbody>';
    
    for (let i = 0; i < tableRows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        tableHtml += '<td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    
    tableHtml += '</tbody></table>';
    
    execCommand('insertHTML', tableHtml);
    setTableDialogOpen(false);
  }, [tableRows, tableCols, execCommand]);

  // Insert emoji
  const handleInsertEmoji = useCallback((emoji) => {
    execCommand('insertText', emoji);
    setEmojiAnchorEl(null);
  }, [execCommand]);

  // Handle blockquote toggle
  const handleBlockquote = useCallback(() => {
    const currentBlock = activeFormats.formatBlock;
    if (currentBlock === 'blockquote') {
      execCommand('formatBlock', 'div');
    } else {
      execCommand('formatBlock', 'blockquote');
    }
  }, [activeFormats.formatBlock, execCommand]);

  // Handle code block toggle
  const handleCodeBlock = useCallback(() => {
    const currentBlock = activeFormats.formatBlock;
    if (currentBlock === 'pre') {
      execCommand('formatBlock', 'div');
    } else {
      execCommand('formatBlock', 'pre');
    }
  }, [activeFormats.formatBlock, execCommand]);

  // Toolbar
  const Toolbar = (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 0.5, 
      p: 1, 
      borderBottom: 1, 
      borderColor: 'divider',
      bgcolor: 'grey.50',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Text Styles */}
      <Tooltip title="Bold">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('bold')}
          color={activeFormats.bold ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.bold ? 'primary.light' : 'transparent',
          }}
        >
          <FormatBold fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Italic">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('italic')}
          color={activeFormats.italic ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.italic ? 'primary.light' : 'transparent',
          }}
        >
          <FormatItalic fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Underline">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('underline')}
          color={activeFormats.underline ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.underline ? 'primary.light' : 'transparent',
          }}
        >
          <FormatUnderlined fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Strikethrough">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('strikeThrough')}
          color={activeFormats.strikethrough ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.strikethrough ? 'primary.light' : 'transparent',
          }}
        >
          <FormatStrikethrough fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Font Family */}
      <Tooltip title="Font Family">
        <IconButton 
          size="small" 
          onClick={(e) => setFontFamilyAnchorEl(e.currentTarget)}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <FontDownload fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(fontFamilyAnchorEl)}
        anchorEl={fontFamilyAnchorEl}
        onClose={() => setFontFamilyAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Paper sx={{ p: 1, minWidth: 200 }}>
          {fonts.map((font) => (
            <MenuItem 
              key={font.value} 
              onClick={() => handleFontFamily(font.value)}
              sx={{ fontFamily: font.value }}
            >
              {font.label}
            </MenuItem>
          ))}
        </Paper>
      </Popover>
      
      {/* Font Size */}
      <Tooltip title="Font Size">
        <IconButton 
          size="small" 
          onClick={(e) => setFontSizeAnchorEl(e.currentTarget)}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <FormatSize fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(fontSizeAnchorEl)}
        anchorEl={fontSizeAnchorEl}
        onClose={() => setFontSizeAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Paper sx={{ p: 1, minWidth: 100 }}>
          {fontSizes.map((size) => (
            <MenuItem 
              key={size.value} 
              onClick={() => handleFontSize(size.value)}
            >
              <Box sx={{ fontSize: size.px }}>{size.label}</Box>
            </MenuItem>
          ))}
        </Paper>
      </Popover>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Text Color */}
      <Tooltip title="Text Color">
        <IconButton 
          size="small" 
          onClick={(e) => setColorAnchorEl(e.currentTarget)}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            color: textColor,
          }}
        >
          <FormatColorText fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(colorAnchorEl)}
        anchorEl={colorAnchorEl}
        onClose={() => setColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Paper sx={{ p: 2, width: 250 }}>
          <HexColorPicker color={textColor} onChange={handleTextColor} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              fullWidth
              size="small" 
              variant="contained"
              onClick={() => setColorAnchorEl(null)}
            >
              Done
            </Button>
            <Button 
              size="small"
              variant="outlined"
              onClick={() => handleTextColor('#000000')}
            >
              Reset
            </Button>
          </Box>
        </Paper>
      </Popover>
      
      {/* Background Color */}
      <Tooltip title="Background Color">
        <IconButton 
          size="small" 
          onClick={(e) => setBgColorAnchorEl(e.currentTarget)}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: bgColor,
          }}
        >
          <FormatColorFill fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(bgColorAnchorEl)}
        anchorEl={bgColorAnchorEl}
        onClose={() => setBgColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Paper sx={{ p: 2, width: 250 }}>
          <HexColorPicker color={bgColor} onChange={handleBgColor} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              fullWidth
              size="small" 
              variant="contained"
              onClick={() => setBgColorAnchorEl(null)}
            >
              Done
            </Button>
            <Button 
              size="small"
              variant="outlined"
              onClick={() => handleBgColor('#ffffff')}
            >
              Reset
            </Button>
          </Box>
        </Paper>
      </Popover>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Alignment */}
      <Tooltip title="Align Left">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('justifyLeft')}
          color={activeFormats.justifyLeft ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.justifyLeft ? 'primary.light' : 'transparent',
          }}
        >
          <FormatAlignLeft fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Align Center">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('justifyCenter')}
          color={activeFormats.justifyCenter ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.justifyCenter ? 'primary.light' : 'transparent',
          }}
        >
          <FormatAlignCenter fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Align Right">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('justifyRight')}
          color={activeFormats.justifyRight ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.justifyRight ? 'primary.light' : 'transparent',
          }}
        >
          <FormatAlignRight fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Justify">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('justifyFull')}
          color={activeFormats.justifyFull ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.justifyFull ? 'primary.light' : 'transparent',
          }}
        >
          <FormatAlignJustify fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Lists */}
      <Tooltip title="Bullet List">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('insertUnorderedList')}
          color={activeFormats.insertUnorderedList ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.insertUnorderedList ? 'primary.light' : 'transparent',
          }}
        >
          <FormatListBulleted fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Numbered List">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('insertOrderedList')}
          color={activeFormats.insertOrderedList ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.insertOrderedList ? 'primary.light' : 'transparent',
          }}
        >
          <FormatListNumbered fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Indent">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('indent')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <FormatIndentIncrease fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Outdent">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('outdent')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <FormatIndentDecrease fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Headings */}
      <Tooltip title="Heading 1">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('formatBlock', '<h1>')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <Title fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Heading 2">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('formatBlock', '<h2>')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <Title fontSize="small" sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Heading 3">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('formatBlock', '<h3>')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <Title fontSize="small" sx={{ fontSize: '0.8rem' }} />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Insert (No Link, No Image Upload) */}
      <Tooltip title="Insert Table">
        <IconButton 
          size="small" 
          onClick={() => setTableDialogOpen(true)}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <TableChart fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Insert Emoji">
        <IconButton 
          size="small" 
          onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <EmojiEmotions fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 300, maxHeight: 200, overflow: 'auto' }}>
          <Grid container spacing={1}>
            {emojis.map((emoji, index) => (
              <Grid item key={index}>
                <IconButton
                  size="small"
                  onClick={() => handleInsertEmoji(emoji)}
                  sx={{ fontSize: '24px' }}
                >
                  {emoji}
                </IconButton>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Popover>
      
      <Tooltip title="Horizontal Line">
        <IconButton 
          size="small" 
          onClick={() => handleFormat('insertHorizontalRule')}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <HorizontalRule fontSize="small" />
        </IconButton>
      </Tooltip>
      
      {/* Blockquote - Toggle */}
      <Tooltip title="Blockquote">
        <IconButton 
          size="small" 
          onClick={handleBlockquote}
          color={activeFormats.formatBlock === 'blockquote' ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.formatBlock === 'blockquote' ? 'primary.light' : 'transparent',
          }}
        >
          <FormatQuote fontSize="small" />
        </IconButton>
      </Tooltip>
      
      {/* Code Block - Toggle */}
      <Tooltip title="Code Block">
        <IconButton 
          size="small" 
          onClick={handleCodeBlock}
          color={activeFormats.formatBlock === 'pre' ? 'primary' : 'default'}
          sx={{ 
            minWidth: '40px', 
            minHeight: '40px',
            bgcolor: activeFormats.formatBlock === 'pre' ? 'primary.light' : 'transparent',
          }}
        >
          <Code fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      
      {/* Clear Formatting */}
      <Tooltip title="Clear Formatting">
        <IconButton 
          size="small" 
          onClick={() => {
            document.execCommand('removeFormat', false);
            handleChange();
          }}
          sx={{ minWidth: '40px', minHeight: '40px' }}
        >
          <Clear fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <Box sx={{ 
      border: 1, 
      borderColor: 'divider', 
      borderRadius: 1,
      overflow: 'hidden',
      bgcolor: 'background.paper',
    }}>
      {!readOnly && Toolbar}
      
      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleChange}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        suppressContentEditableWarning={true}
        sx={{
          minHeight: height,
          maxHeight: 600,
          overflowY: 'auto',
          p: 2,
          outline: 'none',
          fontFamily: fontFamily,
          fontSize: (() => {
            const sizeMap = { '1': '10px', '2': '12px', '3': '14px', '4': '16px', '5': '18px', '6': '24px', '7': '32px' };
            return sizeMap[fontSize] || '14px';
          })(),
          lineHeight: 1.6,
          bgcolor: 'background.paper',
          cursor: 'text',
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: 'text.disabled',
            pointerEvents: 'none',
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            margin: '10px 0',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: '10px 0',
            '& td, & th': {
              border: '1px solid #ddd',
              padding: '8px',
            },
          },
          '& pre': {
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '14px',
          },
          '& blockquote': {
            borderLeft: '4px solid #1976d2',
            margin: '12px 0',
            paddingLeft: '16px',
            color: '#555',
            fontStyle: 'italic',
            backgroundColor: '#f9f9f9',
            padding: '12px',
            borderRadius: '0 4px 4px 0',
          },
          '& h1': { fontSize: '32px', margin: '20px 0 10px', fontWeight: 'bold' },
          '& h2': { fontSize: '28px', margin: '18px 0 9px', fontWeight: 'bold' },
          '& h3': { fontSize: '24px', margin: '16px 0 8px', fontWeight: 'bold' },
          '& a': {
            color: '#1976d2',
            textDecoration: 'underline',
            cursor: 'pointer',
          },
          '& ul, & ol': {
            margin: '12px 0',
            paddingLeft: '24px',
          },
        }}
      />

      {/* Table Dialog */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Insert Table</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Rows"
                  type="number"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Columns"
                  type="number"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInsertTable} variant="contained">
            Insert Table
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RichTextEditor;