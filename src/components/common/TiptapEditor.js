// Replaced with a clean, working implementation below
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Divider,
  Tooltip,
  IconButton,
  Popover,
  TextField,
  Button,
  Stack,
  alpha,
  useTheme,
  Slider,
  Typography,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  HorizontalRule,
  TableChart,
  Undo,
  Redo,
  FormatColorText,
  FormatColorFill,
  FormatIndentIncrease,
  FormatIndentDecrease,
  Add,
  ViewColumn,
  ViewAgenda,
  Delete,
  PhotoCamera,
  Circle,
  RadioButtonUnchecked,
  CheckBoxOutlineBlank,
  ShortText,
} from '@mui/icons-material';
import uploadsApi from '../../api/uploads';
import { devError } from '../../utils/devLogger';

const EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','👍','👎','👌','❤️','🔥','⭐','✅','❌','⚠️','🚀'];
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
];
const FONT_SIZES = [8,10,12,14,16,18,20,24,28,32,36,48,64,72];

// FIX 2: Expanded color palette with rich, distinct colors
const TEXT_COLORS = [
  '#000000', // Black
  '#434343', // Dark Gray
  '#666666', // Gray
  '#999999', // Medium Gray
  '#FFFFFF', // White
  '#FF0000', // Red
  '#FF6B6B', // Light Red
  '#FF8C00', // Dark Orange
  '#FFA500', // Orange
  '#FFD700', // Gold
  '#FFFF00', // Yellow
  '#ADFF2F', // Green Yellow
  '#00FF00', // Green
  '#32CD32', // Lime Green
  '#008000', // Dark Green
  '#00CED1', // Dark Turquoise
  '#00FFFF', // Cyan
  '#00BFFF', // Deep Sky Blue
  '#1E90FF', // Dodger Blue
  '#0000FF', // Blue
  '#0000CD', // Medium Blue
  '#4B0082', // Indigo
  '#8B00FF', // Violet
  '#9400D3', // Dark Violet
  '#FF00FF', // Magenta
  '#FF69B4', // Hot Pink
  '#FF1493', // Deep Pink
  '#FFC0CB', // Pink
  '#8B4513', // Saddle Brown
  '#A0522D', // Sienna
  '#D2691E', // Chocolate
  '#DEB887', // Burlywood
  '#F5DEB3', // Wheat
  '#808000', // Olive
  '#556B2F', // Dark Olive Green
];

const BG_COLORS = [
  '#000000', // Black
  '#434343', // Dark Gray
  '#808080', // Gray
  '#C0C0C0', // Silver
  '#FFFFFF', // White
  '#FF0000', // Red
  '#FFCCCC', // Light Red
  '#FF6600', // Orange
  '#FFE0B2', // Light Orange
  '#FFFF00', // Yellow
  '#FFFFE0', // Light Yellow
  '#00FF00', // Green
  '#C8E6C9', // Light Green
  '#008000', // Dark Green
  '#00FFFF', // Cyan
  '#B2EBF2', // Light Cyan
  '#0000FF', // Blue
  '#BBDEFB', // Light Blue
  '#000080', // Navy
  '#800080', // Purple
  '#E1BEE7', // Light Purple
  '#FF00FF', // Magenta
  '#FCE4EC', // Light Pink
  '#FF69B4', // Hot Pink
  '#8B4513', // Brown
  '#D7CCC8', // Light Brown
  '#FFD700', // Gold
  '#FFF9C4', // Light Gold
  '#FF6B6B', // Coral Red
  '#E8F5E9', // Mint
];

// FIX 3: Bullet list types configuration
const BULLET_LIST_TYPES = [
  { value: 'diamond', label: 'Diamond', symbol: '❖' },
  { value: 'hand', label: 'Hand Pointer', symbol: '☞' },
  { value: 'dash', label: 'Dash', symbol: '—' },
  { value: 'hollow-circle', label: 'Hollow Circle', symbol: '○' },
  { value: 'square', label: 'Square', symbol: '■' },
  { value: 'filled-circle', label: 'Filled Circle', symbol: '●' },
  { value: 'double-arrow', label: 'Double Arrow', symbol: '⇒' },
  { value: 'check', label: 'Check Mark', symbol: '✓' },
];

const BULLET_SYMBOL_TO_TYPE = {
  '❖': 'diamond',
  '◆': 'diamond',
  '☞': 'hand',
  '👉': 'hand',
  '—': 'dash',
  '-': 'dash',
  '○': 'hollow-circle',
  '◦': 'hollow-circle',
  '■': 'square',
  '▪': 'square',
  '●': 'filled-circle',
  '•': 'filled-circle',
  '⇒': 'double-arrow',
  '➜': 'double-arrow',
  '→': 'double-arrow',
  '✓': 'check',
  '✔': 'check',
};

const NumberedListExtension = Extension.create({
  name: 'numberedListType',
  addGlobalAttributes() {
    return [
      {
        types: ['orderedList'],
        attributes: {
          listType: {
            default: '1',
            parseHTML: (element) => {
              return element.getAttribute('data-list-type') || element.getAttribute('type') || '1';
            },
            renderHTML: (attributes) => {
              if (!attributes.listType || attributes.listType === '1') {
                return {};
              }
              return {
                'data-list-type': attributes.listType,
                type: attributes.listType,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setOrderedListType: (type) => ({ commands }) => {
        return commands.updateAttributes('orderedList', { listType: type });
      },
    };
  },
});

const BulletListTypeExtension = Extension.create({
  name: 'bulletListType',
  addOptions() {
    return {
      types: ['bulletList'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: ['bulletList'],
        attributes: {
          listType: {
            default: 'filled-circle',
            parseHTML: (element) => {
              return element.getAttribute('data-list-type') || 'filled-circle';
            },
            renderHTML: (attributes) => {
              if (!attributes.listType || attributes.listType === 'filled-circle') {
                return {};
              }
              return { 'data-list-type': attributes.listType };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setBulletListType: (type) => ({ commands, editor }) => {
        return commands.insertContent({
          type: 'bulletList',
          attrs: { listType: type },
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [] }] }],
        });
      },
      updateBulletListType: (type) => ({ commands, editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        let node = $from.node($from.depth);
        let pos = $from.before($from.depth);
        
        while (node && node.type.name !== 'bulletList') {
          if ($from.depth > 1) {
            pos = $from.before($from.depth - 1);
            node = $from.node($from.depth - 1);
          } else {
            return false;
          }
        }
        
        if (node && node.type.name === 'bulletList') {
          return commands.updateAttributes('bulletList', { listType: type });
        }
        return false;
      },
    };
  },
});

const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace('px', '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: String(fontSize) }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const TextBackgroundColor = Extension.create({
  name: 'textBackgroundColor',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }

              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextBackgroundColor:
        (backgroundColor) =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor }).run(),
      unsetTextBackgroundColor:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor: null }).removeEmptyTextStyle().run(),
    };
  },
});

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('data-width') || element.getAttribute('width') || '100%',
        renderHTML: attributes => ({
          'data-width': attributes.width || '100%',
          width: attributes.width || '100%',
          style: `width: ${attributes.width || '100%'}; max-width: 100%; height: auto; display: block;`,
        }),
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          const align = attributes.align || 'center';
          const baseStyle = `width: ${attributes.width || '100%'}; max-width: 100%; height: auto; display: block;`;

          if (align === 'left') {
            return {
              'data-align': 'left',
              style: `${baseStyle} margin: 0.75rem auto 0.75rem 0;`,
            };
          }

          if (align === 'right') {
            return {
              'data-align': 'right',
              style: `${baseStyle} margin: 0.75rem 0 0.75rem auto;`,
            };
          }

          return {
            'data-align': 'center',
            style: `${baseStyle} margin: 0.75rem auto;`,
          };
        },
      },
    };
  },
});

const ToolbarButton = React.memo(({ onClick, active=false, disabled=false, children, title }) => {
  const theme = useTheme();
  return (
    <Tooltip title={title} arrow>
      <Box component="span" sx={{ display: 'inline-block' }}>
        <IconButton size="small" onClick={onClick} color={active ? 'primary' : 'default'} disabled={disabled} sx={{ minWidth: 40, height: 40, borderRadius: 1, bgcolor: active ? alpha(theme.palette.primary.main,0.1) : 'transparent', '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main,0.2) : alpha(theme.palette.action.hover,0.5) } }}>
          {children}
        </IconButton>
      </Box>
    </Tooltip>
  );
});
ToolbarButton.displayName = 'ToolbarButton';

const ColorPicker = React.memo(({ colors, onSelect, columns = 10 }) => (
  <Box sx={{ p:2, display:'grid', gridTemplateColumns:`repeat(${columns},1fr)`, gap:0.5 }}>
    {colors.map(c => <Box key={c} onClick={() => onSelect(c)} sx={{ width:24, height:24, bgcolor:c, cursor:'pointer', border:'2px solid', borderColor: c==='#ffffff' ? 'grey.300' : 'transparent', '&:hover': { transform: 'scale(1.15)', boxShadow: 2 } }} />)}
  </Box>
));

// FIX 4: Sanitize and map pasted HTML/RTF formatting from Word/PDF
const sanitizePastedHTML = (html) => {
  if (!html) return html;
  
  // Create a temporary DOM element to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove Word-specific classes and styles that cause issues
  let cleaned = temp.innerHTML;
  
  // Remove MsoNormal and other Word-specific classes
  cleaned = cleaned.replace(/class="MsoNormal"/gi, '');
  cleaned = cleaned.replace(/class="MsoListParagraph"/gi, '');
  cleaned = cleaned.replace(/class="MsoListBullet"/gi, '');
  cleaned = cleaned.replace(/style="[^"]*mso-list[^"]*"/gi, '');
  
  // Fix common Word formatting issues
  cleaned = cleaned.replace(/<o:p>\s*<\/o:p>/gi, '');
  cleaned = cleaned.replace(/<!--\[if !supportLists\]-->[\s\S]*?<!--\[endif\]-->/gi, '');
  cleaned = cleaned.replace(/<span[^>]*style="[^"]*mso-list[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');

  // Strip aggressive inline sizing/family so pasted content becomes editable
  // normal document text instead of tiny imported fragments.
  cleaned = cleaned.replace(/\sstyle="([^"]*)"/gi, (_, styleValue) => {
    const filteredRules = styleValue
      .split(';')
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => {
        const lowerRule = rule.toLowerCase();
        return !(
          lowerRule.startsWith('font-size') ||
          lowerRule.startsWith('font-family') ||
          lowerRule.startsWith('line-height') ||
          lowerRule.startsWith('mso-') ||
          lowerRule.startsWith('tab-stops')
        );
      });

    return filteredRules.length > 0 ? ` style="${filteredRules.join('; ')}"` : '';
  });

  cleaned = cleaned.replace(/<(span|font)\b[^>]*>([\s\S]*?)<\/\1>/gi, '$2');
  cleaned = cleaned.replace(/<img[^>]*>/gi, '');

  return cleaned;
};

// FIX 5: Extract plain text from PDF paste instead of treating as image
const extractTextFromPDFPaste = (clipboardData) => {
  // Check for PDF data in clipboard
  const items = Array.from(clipboardData.items || []);
  
  // First, try to get text/plain or text/html (PDF text is often copied as HTML/text)
  const textData = clipboardData.getData('text/plain') || clipboardData.getData('text/html');
  if (textData && textData.trim().length > 0) {
    return { type: 'text', data: textData };
  }
  
  // Check for file application/pdf
  const pdfItem = items.find(item => item.type === 'application/pdf');
  if (pdfItem) {
    // PDF as file - we can't extract text from it directly in browser
    // Return null to indicate no text extraction possible
    return { type: 'file', data: null };
  }
  
  return null;
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const plainTextToHtml = (text) => {
  if (!text || !text.trim()) return '';

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();

  const blocks = normalized.split(/\n{2,}/).filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0) return '';

      const bulletMatch = lines.map((line) => line.match(/^([❖◆☞👉—\-○◦■▪●•⇒➜→✓✔])\s+(.*)$/));
      const isBulletList = bulletMatch.every(Boolean);
      if (isBulletList) {
        const listType = BULLET_SYMBOL_TO_TYPE[bulletMatch[0][1]] || 'filled-circle';
        const items = lines
          .map((line) => line.replace(/^([❖◆☞👉—\-○◦■▪●•⇒➜→✓✔])\s+/, ''))
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join('');
        return `<ul data-list-type="${listType}">${items}</ul>`;
      }

      const isNumberedList = lines.every((line) => /^(\d+\.|[a-zA-Z]\.|[ivxlcdmIVXLCDM]+\.)\s+/.test(line));
      if (isNumberedList) {
        const items = lines
          .map((line) => line.replace(/^(\d+\.|[a-zA-Z]\.|[ivxlcdmIVXLCDM]+\.)\s+/, ''))
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join('');
        return `<ol>${items}</ol>`;
      }

      return `<p>${lines.map((line) => escapeHtml(line)).join('<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('');
};

const resizeImageFile = (file, maxDimension = 1600, quality = 0.82) => (
  new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      resolve(file);
      return;
    }

    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        let { width, height } = image;
        const longestSide = Math.max(width, height);

        if (longestSide <= maxDimension) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        const scale = maxDimension / longestSide;
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              resolve(file);
              return;
            }

            const extension = outputType === 'image/png' ? 'png' : 'jpg';
            const nextName = file.name.replace(/\.[^.]+$/, '') + `.${extension}`;
            resolve(new File([blob], nextName, { type: outputType, lastModified: Date.now() }));
          },
          outputType,
          outputType === 'image/png' ? undefined : quality,
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load selected image.'));
    };

    image.src = objectUrl;
  })
);

const ImageResizer = ({ editor }) => {
  const [imageSize, setImageSize] = useState(100);
  const [imageAlign, setImageAlign] = useState('center');
  const [showControls, setShowControls] = useState(false);
  const [imagePosition, setImagePosition] = useState(null);
  const isInteractingRef = useRef(false);

  const keepToolbarOpen = useCallback((event) => {
    isInteractingRef.current = true;
    event.stopPropagation();
  }, []);

  const keepToolbarSurfaceOpen = useCallback(() => {
    isInteractingRef.current = true;
  }, []);

  const releaseToolbar = useCallback(() => {
    window.setTimeout(() => {
      isInteractingRef.current = false;
      if (!editor?.isActive('image') && imagePosition == null) {
        setShowControls(false);
      }
    }, 0);
  }, [editor, imagePosition]);

  const applyImageAttributes = useCallback((attributes) => {
    if (!editor || imagePosition == null) {
      return;
    }

    editor
      .chain()
      .focus()
      .setNodeSelection(imagePosition)
      .updateAttributes('image', attributes)
      .run();
  }, [editor, imagePosition]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (editor.isActive('image')) {
        const { width, align } = editor.getAttributes('image');
        setImagePosition(editor.state.selection.from);
        setImageSize(parseInt(width) || 100);
        setImageAlign(align || 'center');
        setShowControls(true);
      } else if (!isInteractingRef.current) {
        setImagePosition(null);
        setShowControls(false);
      }
    };
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
    };
  }, [editor]);

  if (!showControls) return null;
  return (
    <Paper
      onMouseDown={keepToolbarSurfaceOpen}
      onMouseUp={releaseToolbar}
      onMouseLeave={releaseToolbar}
      sx={{
        mx: 1,
        mt: 1,
        p: 1.25,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 'fit-content' }}>
        Image tools
      </Typography>
      <Typography variant="caption">Size:</Typography>
      <Slider
        size="small"
        value={imageSize}
        onMouseDown={keepToolbarOpen}
        onChange={(e,v)=>{
          const nextSize = Array.isArray(v) ? v[0] : v;
          setImageSize(nextSize);
          applyImageAttributes({ width:`${nextSize}%` });
        }}
        min={10}
        max={200}
        sx={{ width:100 }}
      />
      <TextField
        size="small"
        value={imageSize}
        onMouseDown={keepToolbarOpen}
        onFocus={keepToolbarSurfaceOpen}
        onChange={(event) => {
          const rawValue = event.target.value.replace(/[^0-9]/g, '');
          const nextSize = rawValue === '' ? '' : Math.min(200, Math.max(10, Number(rawValue)));
          setImageSize(nextSize === '' ? 10 : nextSize);
          if (rawValue !== '') {
            applyImageAttributes({ width: `${nextSize}%` });
          }
        }}
        inputProps={{
          min: 10,
          max: 200,
          style: { width: 54, textAlign: 'center' },
        }}
      />
      <Typography variant="caption">%</Typography>
      <Button
        size="small"
        variant={imageAlign === 'left' ? 'contained' : 'outlined'}
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageAlign('left');
          applyImageAttributes({ align: 'left' });
        }}
      >
        Left
      </Button>
      <Button
        size="small"
        variant={imageAlign === 'center' ? 'contained' : 'outlined'}
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageAlign('center');
          applyImageAttributes({ align: 'center' });
        }}
      >
        Center
      </Button>
      <Button
        size="small"
        variant={imageAlign === 'right' ? 'contained' : 'outlined'}
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageAlign('right');
          applyImageAttributes({ align: 'right' });
        }}
      >
        Right
      </Button>
      <Button
        size="small"
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageSize(35);
          applyImageAttributes({ width: '35%' });
        }}
      >
        Small
      </Button>
      <Button
        size="small"
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageSize(60);
          applyImageAttributes({ width: '60%' });
        }}
      >
        Medium
      </Button>
      <Button
        size="small"
        onMouseDown={keepToolbarOpen}
        onClick={() => {
          setImageSize(100);
          applyImageAttributes({ width: '100%' });
        }}
      >
        Full
      </Button>
      <Tooltip title="Remove Image"><IconButton size="small" onMouseDown={keepToolbarOpen} onClick={() => {
        if (imagePosition != null) {
          editor.chain().focus().setNodeSelection(imagePosition).deleteSelection().run();
        }
        setImagePosition(null);
        setShowControls(false);
      }} color="error"><Delete fontSize="small"/></IconButton></Tooltip>
    </Paper>
  );
};

const TiptapEditor = ({ value='', onChange, readOnly=false, height=400, fullHeight=false, placeholder='Start writing your content here...' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fileInputRef = useRef(null);
  const lastContentRef = useRef(value);
  const changeDebounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [textColorAnchorEl, setTextColorAnchorEl] = useState(null);
  const [backgroundColorAnchorEl, setBackgroundColorAnchorEl] = useState(null);
  const [tableAnchorEl, setTableAnchorEl] = useState(null);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [bulletListTypeAnchorEl, setBulletListTypeAnchorEl] = useState(null);
  const [numberedListTypeAnchorEl, setNumberedListTypeAnchorEl] = useState(null);
  const toolbarRef = useRef(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Measure toolbar height for sticky positioning
  useEffect(() => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setToolbarHeight(rect.height);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:{ levels:[1,2,3,4] },
        bulletList:{ keepMarks:true, keepAttributes:true },
        orderedList:{ keepMarks:true, keepAttributes:true },
        underline:false,
        link:false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextBackgroundColor,
      TextAlign.configure({ types:['heading','paragraph'] }),
      Link.configure({ openOnClick:false, HTMLAttributes:{ class:'tiptap-link' } }),
      ResizableImage.configure({ inline:true, allowBase64:true, HTMLAttributes:{ class:'tiptap-image' } }),
      Table.configure({ resizable:true }),
      TableRow,
      TableHeader,
      TableCell,
      BulletListTypeExtension,
      NumberedListExtension,
    ],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'tiptap-editor', 'data-placeholder': placeholder },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // FIX 5: Check for PDF paste and extract text
        const pdfResult = extractTextFromPDFPaste(clipboardData);
        if (pdfResult && pdfResult.type === 'text' && pdfResult.data) {
          event.preventDefault();
          const normalizedText = plainTextToHtml(pdfResult.data);
          editor.chain().focus().insertContent(normalizedText).run();
          return true;
        }

        // FIX 4: Handle Word/PDF paste with formatting preservation
        const htmlData = clipboardData.getData('text/html');
        const textData = clipboardData.getData('text/plain');
        const clipboardItems = Array.from(clipboardData.items || []);
        const imageItem = clipboardItems.find((item) => item.type?.startsWith('image/'));

        const looksLikeWordOrOfficePaste =
          /class="?Mso|mso-|supportLists|urn:schemas-microsoft-com/i.test(htmlData || '');

        if (looksLikeWordOrOfficePaste && textData && textData.trim().length > 0) {
          event.preventDefault();
          editor.chain().focus().insertContent(plainTextToHtml(textData)).run();
          return true;
        }

        // If there's HTML content, sanitize and insert it
        if (htmlData && htmlData.trim().length > 0) {
          event.preventDefault();
          const sanitizedContent = sanitizePastedHTML(htmlData);
          editor.chain().focus().insertContent(sanitizedContent).run();
          return true;
        }

        if (textData && textData.trim().length > 0) {
          event.preventDefault();
          editor.chain().focus().insertContent(plainTextToHtml(textData)).run();
          return true;
        }

        // If there's an image but no text, handle image upload
        if (imageItem && !textData?.trim()) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault();
            void uploadAndInsertImage(file);
            return true;
          }
        }

        // Default: let Tiptap handle the paste
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== lastContentRef.current) {
        lastContentRef.current = html;
        if (onChangeRef.current) {
          if (changeDebounceRef.current) clearTimeout(changeDebounceRef.current);
          changeDebounceRef.current = setTimeout(() => {
            onChangeRef.current?.(html);
            changeDebounceRef.current = null;
          }, 180);
        }
      }
    }
  });

  // Sync external value only when editor isn't focused to avoid clobbering while typing
  useEffect(() => {
    if (!editor) return;
    try {
      const current = editor.getHTML();
      if (value !== current && !editor.isFocused()) {
        editor.commands.setContent(value || '');
        lastContentRef.current = value || '';
      }
    } catch (e) {}
  }, [value, editor]);

  useEffect(() => { return () => { if (changeDebounceRef.current) clearTimeout(changeDebounceRef.current); }; }, []);

  const uploadAndInsertImage = useCallback(async (file) => {
    if (!file || !editor) {
      return false;
    }
    setIsUploadingImage(true);

    try {
      const resizedFile = await resizeImageFile(file);
      const response = await uploadsApi.uploadImage(resizedFile);
      const imageUrl = response?.data?.data;

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Image upload did not return a valid URL');
      }

      editor
        .chain()
        .focus()
        .setImage({ src: imageUrl, title: resizedFile.name, alt: resizedFile.name, width: '60%', align: 'center' })
        .run();
      return true;
    } catch (error) {
      devError('Failed to upload editor image:', error);
      return false;
    } finally {
      setIsUploadingImage(false);
    }
  }, [editor]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await uploadAndInsertImage(file);
    event.target.value = '';
  };

  const applyFontFamily = (fontFamily) => {
    if (!fontFamily) {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }

    editor.chain().focus().setFontFamily(fontFamily).run();
  };

  const applyFontSize = (fontSize) => {
    if (!fontSize) {
      editor.chain().focus().unsetFontSize().run();
      return;
    }

    editor.chain().focus().setFontSize(fontSize).run();
  };

  const applyTextColor = (color) => {
    editor.chain().focus().setColor(color).run();
    setTextColorAnchorEl(null);
  };

  const applyBackgroundColor = (color) => {
    editor.chain().focus().setTextBackgroundColor(color).run();
    setBackgroundColorAnchorEl(null);
  };

  const startFreshListBlock = useCallback(() => {
    if (!editor) {
      return false;
    }

    const { selection } = editor.state;
    if (!selection.empty) {
      return false;
    }

    const parent = selection.$from.parent;
    const listItemNode = selection.$from.node(selection.$from.depth - 1);
    const isInsideListItem = listItemNode?.type?.name === 'listItem';
    const isEmptyParagraph = parent.type.name === 'paragraph' && parent.content.size === 0;

    if (!isInsideListItem) {
      return false;
    }

    if (!isEmptyParagraph) {
      editor.chain().focus().splitListItem('listItem').run();
    }

    if (editor.can().liftListItem('listItem')) {
      editor.chain().focus().liftListItem('listItem').run();
      return true;
    }

    return false;
  }, [editor]);

  const applyBulletListType = (type) => {
    const inAnyList = editor.isActive('bulletList') || editor.isActive('orderedList');
    const shouldStartNewList = editor.state.selection.empty && inAnyList;

    if (shouldStartNewList) {
      startFreshListBlock();
    }

    if (editor.isActive('orderedList')) {
      editor.chain().focus().toggleOrderedList().run();
    }

    if (!editor.isActive('bulletList')) {
      editor.chain().focus().toggleBulletList().run();
    }

    editor.chain().focus().updateAttributes('bulletList', { listType: type }).run();
    setBulletListTypeAnchorEl(null);
  };

  const applyNumberedListType = (type) => {
    const inAnyList = editor.isActive('bulletList') || editor.isActive('orderedList');
    const shouldStartNewList = editor.state.selection.empty && inAnyList;

    if (shouldStartNewList) {
      startFreshListBlock();
    }

    if (editor.isActive('bulletList')) {
      editor.chain().focus().toggleBulletList().run();
    }

    if (!editor.isActive('orderedList')) {
      editor.chain().focus().toggleOrderedList().run();
    }

    editor.chain().focus().updateAttributes('orderedList', { listType: type }).run();
    setNumberedListTypeAnchorEl(null);
  };

  const insertTableWithShape = () => {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: Math.max(1, Number(tableRows) || 1),
        cols: Math.max(1, Number(tableColumns) || 1),
        withHeaderRow: true,
      })
      .run();
    setTableAnchorEl(null);
  };

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';
  const currentTextColor = editor.getAttributes('textStyle').color || '';
  const currentBackgroundColor =
    editor.getAttributes('textStyle').backgroundColor || '';
  const currentBulletListType =
    editor.getAttributes('bulletList')?.listType || 'filled-circle';
  const currentOrderedListType =
    editor.getAttributes('orderedList')?.listType || '1';
  const currentFontLabel =
    FONT_FAMILIES.find((font) => font.value === currentFontFamily)?.label || 'Default font';
  const editorViewportHeight = Math.max(height, 940);
  const editorPageMinHeight = Math.max(editorViewportHeight - 56, 1120);

  if (!editor) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: isDark ? 'grey.900' : 'background.paper',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: fullHeight ? '100%' : 'auto',
        boxShadow: isDark ? 3 : 1,
        borderColor: isDark ? 'grey.800' : 'divider',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display:'none' }}
        onChange={handleImageUpload}
      />

      {!readOnly && (
        <>
          {/* FIX 1: Make toolbar sticky - it stays at top while content scrolls */}
          <Box
            ref={toolbarRef}
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(23, 23, 23, 0.98)' : 'rgba(250, 250, 250, 0.98)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              alignItems: 'center',
              // Ensure toolbar stays visible when content scrolls
              '& + div': {
                // Second toolbar row
              },
            }}
          >
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><FormatBold fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><FormatItalic fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><FormatUnderlined fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike"><StrikethroughS fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <FormControl size="small" sx={{ minWidth:120 }}>
              <Select
                value={currentFontFamily}
                onChange={(event) => applyFontFamily(event.target.value)}
                displayEmpty
                size="small"
                renderValue={(selected) => {
                  if (!selected) {
                    return 'Font';
                  }

                  return FONT_FAMILIES.find((font) => font.value === selected)?.label || 'Font';
                }}
              >
                <MenuItem value="">Default Font</MenuItem>
                {FONT_FAMILIES.map(f => <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>{f.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth:80 }}>
              <Select
                value={currentFontSize}
                onChange={(event) => applyFontSize(event.target.value)}
                displayEmpty
                size="small"
                renderValue={(selected) => selected ? `${selected}px` : 'Size'}
              >
                <MenuItem value="">Default Size</MenuItem>
                {FONT_SIZES.map(s => <MenuItem key={s} value={String(s)}>{s}px</MenuItem>)}
              </Select>
            </FormControl>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <ToolbarButton onClick={(event)=>setTextColorAnchorEl(event.currentTarget)} title="Text Color"><FormatColorText fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={(event)=>setBackgroundColorAnchorEl(event.currentTarget)} title="BG Color"><FormatColorFill fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><FormatAlignLeft fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center"><FormatAlignCenter fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><FormatAlignRight fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><FormatAlignJustify fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            {/* FIX 3: Bullet list with type selector */}
            <Tooltip title="Bullet List" arrow>
              <Box component="span" sx={{ display: 'inline-block' }}>
                <IconButton 
                  size="small" 
                  onClick={(event) => setBulletListTypeAnchorEl(event.currentTarget)} 
                  color={editor.isActive('bulletList') ? 'primary' : 'default'}
                  sx={{ minWidth: 40, height: 40, borderRadius: 1, bgcolor: editor.isActive('bulletList') ? alpha(theme.palette.primary.main,0.1) : 'transparent' }}
                >
                  <FormatListBulleted fontSize="small"/>
                </IconButton>
              </Box>
            </Tooltip>
            {/* FIX 3: Numbered list with type selector */}
            <Tooltip title="Numbered List" arrow>
              <Box component="span" sx={{ display: 'inline-block' }}>
                <IconButton 
                  size="small" 
                  onClick={(event) => setNumberedListTypeAnchorEl(event.currentTarget)} 
                  color={editor.isActive('orderedList') ? 'primary' : 'default'}
                  sx={{ minWidth: 40, height: 40, borderRadius: 1, bgcolor: editor.isActive('orderedList') ? alpha(theme.palette.primary.main,0.1) : 'transparent' }}
                >
                  <FormatListNumbered fontSize="small"/>
                </IconButton>
              </Box>
            </Tooltip>
            <ToolbarButton onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')} title="Indent"><FormatIndentIncrease fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')} title="Outdent"><FormatIndentDecrease fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level:1 }).run()} active={editor.isActive('heading',{level:1})} title="H1"><Typography variant="caption" sx={{ fontWeight: 700 }}>H1</Typography></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level:2 }).run()} active={editor.isActive('heading',{level:2})} title="H2"><Typography variant="caption" sx={{ fontWeight: 700 }}>H2</Typography></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level:3 }).run()} active={editor.isActive('heading',{level:3})} title="H3"><Typography variant="caption" sx={{ fontWeight: 700 }}>H3</Typography></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level:4 }).run()} active={editor.isActive('heading',{level:4})} title="H4"><Typography variant="caption" sx={{ fontWeight: 700 }}>H4</Typography></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph"><Typography variant="caption" sx={{ fontWeight: 700 }}>P</Typography></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><FormatQuote fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code"><Code fontSize="small"/></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><HorizontalRule fontSize="small"/></ToolbarButton>
            <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
            <ToolbarButton onClick={(event) => setTableAnchorEl(event.currentTarget)} title="Insert Table"><TableChart fontSize="small"/></ToolbarButton>
            {editor.isActive('table') && (
              <>
                <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Above"><Add fontSize="small"/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row Below"><ViewAgenda fontSize="small"/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Column Left"><Add fontSize="small" sx={{ transform: 'rotate(90deg)' }}/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column Right"><ViewColumn fontSize="small"/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row"><Delete fontSize="small"/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column"><Delete fontSize="small" sx={{ transform: 'rotate(90deg)' }}/></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Delete fontSize="small" color="error"/></ToolbarButton>
              </>
            )}
            <ToolbarButton
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              disabled={isUploadingImage}
              title={isUploadingImage ? 'Uploading image...' : 'Upload Image'}
            >
              <PhotoCamera fontSize="small"/>
            </ToolbarButton>
          </Box>
          <Box
            sx={{
              position: 'sticky',
              top: toolbarHeight || 58,
              zIndex: 3,
              px: 1.25,
              py: 0.75,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(25,118,210,0.05)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Active style
            </Typography>
            <Box sx={{ px: 1, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="caption">{currentFontLabel}</Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="caption">{currentFontSize ? `${currentFontSize}px` : 'Default size'}</Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: currentTextColor || '#111111', border: '1px solid', borderColor: 'divider' }} />
              <Typography variant="caption">Text</Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: currentBackgroundColor || 'transparent', border: '1px solid', borderColor: 'divider' }} />
              <Typography variant="caption">Background</Typography>
            </Box>
            {(editor.isActive('orderedList') || editor.isActive('bulletList')) && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                List styles now start a fresh list block so previous bullets and numbering stay unchanged.
              </Typography>
            )}
            {editor.isActive('table') && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Table editing is active. Use the toolbar buttons to add or remove rows and columns around the selected cell.
              </Typography>
            )}
          </Box>
          <ImageResizer editor={editor} />
        </>
      )}

      <Popover
        open={Boolean(textColorAnchorEl)}
        anchorEl={textColorAnchorEl}
        onClose={() => setTextColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1} sx={{ p: 1.5, maxWidth: 320 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Text color
          </Typography>
          {/* FIX 2: Use expanded color palette */}
          <ColorPicker colors={TEXT_COLORS} onSelect={applyTextColor} columns={10} />
          <TextField
            size="small"
            label="Hex color"
            value={currentTextColor}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </Stack>
      </Popover>

      <Popover
        open={Boolean(backgroundColorAnchorEl)}
        anchorEl={backgroundColorAnchorEl}
        onClose={() => setBackgroundColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1} sx={{ p: 1.5, maxWidth: 320 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Background color
          </Typography>
          {/* FIX 2: Use expanded color palette */}
          <ColorPicker colors={BG_COLORS} onSelect={applyBackgroundColor} columns={10} />
          <TextField
            size="small"
            label="Hex color"
            value={currentBackgroundColor}
            onChange={(event) => editor.chain().focus().setTextBackgroundColor(event.target.value).run()}
          />
        </Stack>
      </Popover>

      {/* FIX 3: Bullet list type selector popover */}
      <Popover
        open={Boolean(bulletListTypeAnchorEl)}
        anchorEl={bulletListTypeAnchorEl}
        onClose={() => setBulletListTypeAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={0.5} sx={{ p: 1, minWidth: 180 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5 }}>
            Bullet style
          </Typography>
          {BULLET_LIST_TYPES.map((type) => (
            <Button
              key={type.value}
              fullWidth
              variant={currentBulletListType === type.value ? 'contained' : 'text'}
              onClick={() => applyBulletListType(type.value)}
              sx={{ justifyContent: 'flex-start', gap: 1.25 }}
            >
              <Typography
                component="span"
                sx={{ minWidth: 22, textAlign: 'center', fontSize: '1rem', fontWeight: 700 }}
              >
                {type.symbol}
              </Typography>
              {type.label}
            </Button>
          ))}
        </Stack>
      </Popover>

      {/* FIX 3: Numbered list type selector popover */}
      <Popover
        open={Boolean(numberedListTypeAnchorEl)}
        anchorEl={numberedListTypeAnchorEl}
        onClose={() => setNumberedListTypeAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={0.5} sx={{ p: 1, minWidth: 180 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5 }}>
            Numbering style
          </Typography>
          {[
            ['1', '1, 2, 3... (Default)'],
            ['a', 'a, b, c... (Lowercase letters)'],
            ['A', 'A, B, C... (Uppercase letters)'],
            ['i', 'i, ii, iii... (Lowercase Roman)'],
            ['I', 'I, II, III... (Uppercase Roman)'],
          ].map(([type, label]) => (
            <Button
              key={type}
              fullWidth
              variant={currentOrderedListType === type ? 'contained' : 'text'}
              onClick={() => applyNumberedListType(type)}
              sx={{ justifyContent: 'flex-start' }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Popover>

      <Popover
        open={Boolean(tableAnchorEl)}
        anchorEl={tableAnchorEl}
        onClose={() => setTableAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1.5} sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Create table
          </Typography>
          <TextField
            size="small"
            type="number"
            label="Rows"
            value={tableRows}
            onChange={(event) => setTableRows(event.target.value)}
            inputProps={{ min: 1, max: 20 }}
          />
          <TextField
            size="small"
            type="number"
            label="Columns"
            value={tableColumns}
            onChange={(event) => setTableColumns(event.target.value)}
            inputProps={{ min: 1, max: 20 }}
          />
          <Button variant="contained" onClick={insertTableWithShape}>
            OK
          </Button>
        </Stack>
      </Popover>

      <Box
        sx={{
          p: 2.5,
          bgcolor: isDark ? 'grey.900' : 'background.paper',
          borderRadius: 2,
          flex: fullHeight ? '1 1 auto' : '0 0 auto',
          minHeight: fullHeight ? 0 : editorViewportHeight,
          maxHeight: fullHeight ? 'none' : editorViewportHeight,
          overflowY: 'auto',
        }}
      >
        {isUploadingImage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Uploading image...
          </Typography>
        )}
        <EditorContent editor={editor} />
      </Box>

      <style>{`
        .tiptap-editor {
          width: min(100%, 920px);
          min-height: ${fullHeight ? '100%' : `${editorPageMinHeight}px`};
          margin: 0 auto;
          outline:none;
          line-height:1.7;
          font-size:16px;
          background: ${isDark? '#181a1b' : '#fff'};
          color: ${isDark? '#e0e0e0' : '#222'};
          border-radius: 12px;
          border: 1px solid ${isDark ? '#2f2f2f' : '#d9dde5'};
          box-shadow: ${isDark ? '0 16px 42px rgba(0,0,0,0.38)' : '0 18px 46px rgba(15,23,42,0.10)'};
          padding: 48px 56px 56px;
          box-sizing: border-box;
          padding-bottom: 2rem;
        }
        .tiptap-editor p { margin:0 0 1em 0 }
        .tiptap-editor ul,
        .tiptap-editor ol {
          margin: 0 0 1em 0;
          padding-left: 1.75em;
        }
        .tiptap-editor li > p {
          margin: 0.15em 0;
        }
        .tiptap-editor img, .tiptap-editor .tiptap-image {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.75rem 0;
          border-radius: 8px;
          cursor: pointer;
        }
        .tiptap-editor img.ProseMirror-selectednode, .tiptap-editor .tiptap-image.ProseMirror-selectednode {
          outline: 3px solid ${isDark ? '#60a5fa' : '#2563eb'};
          box-shadow: 0 0 0 6px ${isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(37, 99, 235, 0.12)'};
        }
        .tiptap-editor pre { background: ${isDark? '#232323' : '#f5f5f5'}; color: ${isDark? '#e0e0e0' : '#222'}; padding:1em; border-radius:4px }
        .tiptap-editor code { background: ${isDark? '#232323' : '#f5f5f5'}; padding:0.2em 0.4em; border-radius:3px }
        .tiptap-editor th { background: ${isDark? '#232323' : '#f5f5f5'}; color: ${isDark? '#e0e0e0' : '#222'} }
        .tiptap-editor td, .tiptap-editor th { border:1px solid ${isDark? '#444' : '#ddd'}; padding:0.5em }
        .tiptap-editor:empty:before { content: attr(data-placeholder); color: ${isDark? '#888' : '#999'} }

        .tiptap-editor ul[data-list-type] {
          list-style: none;
          padding-left: 1.9em;
        }
        .tiptap-editor ul[data-list-type] > li {
          position: relative;
        }
        .tiptap-editor ul[data-list-type] > li::before {
          margin-left: -1.5em;
          margin-right: 0.5em;
          display: inline-block;
          width: 1.2em;
          font-weight: 700;
        }
        .tiptap-editor ul[data-list-type="diamond"] > li::before { content: "❖"; }
        .tiptap-editor ul[data-list-type="hand"] > li::before { content: "☞"; }
        .tiptap-editor ul[data-list-type="dash"] > li::before { content: "—"; }
        .tiptap-editor ul[data-list-type="hollow-circle"] > li::before { content: "○"; }
        .tiptap-editor ul[data-list-type="square"] > li::before { content: "■"; }
        .tiptap-editor ul[data-list-type="filled-circle"] > li::before { content: "●"; }
        .tiptap-editor ul[data-list-type="double-arrow"] > li::before { content: "⇒"; }
        .tiptap-editor ul[data-list-type="check"] > li::before { content: "✓"; }

        .tiptap-editor ol[data-list-type="1"],
        .tiptap-editor ol:not([data-list-type]) { list-style-type: decimal; }
        .tiptap-editor ol[data-list-type="a"] { list-style-type: lower-alpha; }
        .tiptap-editor ol[data-list-type="A"] { list-style-type: upper-alpha; }
        .tiptap-editor ol[data-list-type="i"] { list-style-type: lower-roman; }
        .tiptap-editor ol[data-list-type="I"] { list-style-type: upper-roman; }
      `}</style>
    </Paper>
  );
};

const areEqual = (prevProps, nextProps) => (
  prevProps.value === nextProps.value &&
  prevProps.readOnly === nextProps.readOnly &&
  prevProps.height === nextProps.height &&
  prevProps.placeholder === nextProps.placeholder
);

export default React.memo(TiptapEditor, areEqual);
