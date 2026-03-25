// Replaced with a clean, working implementation below
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
  InsertEmoticon,
  Link as LinkIcon,
  LinkOff,
  TableChart,
  Title,
  Undo,
  Redo,
  FormatColorText,
  FormatColorFill,
  BorderLeft,
  BorderRight,
  BorderTop,
  BorderBottom,
  BorderVertical,
  BorderHorizontal,
  Delete,
  PhotoCamera,
  Close,
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
const COLORS = ['#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff','#ff0000','#00ff00','#0000ff'];

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

const ColorPicker = React.memo(({ colors, onSelect }) => (
  <Box sx={{ p:2, display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:0.5 }}>
    {colors.map(c => <Box key={c} onClick={() => onSelect(c)} sx={{ width:24, height:24, bgcolor:c, cursor:'pointer', border:'2px solid', borderColor: c==='#ffffff' ? 'grey.300' : 'transparent' }} />)}
  </Box>
));

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSize, setImageSize] = useState(100);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (editor.isActive('image')) {
        const { src, width } = editor.getAttributes('image');
        setSelectedImage(src);
        setImageSize(parseInt(width) || 100);
        setShowControls(true);
      } else setShowControls(false);
    };
    editor.on('selectionUpdate', handler);
    return () => editor.off('selectionUpdate', handler);
  }, [editor]);

  if (!showControls) return null;
  return (
    <Paper sx={{ position:'absolute', bottom:'100%', left:0, p:1, display:'flex', gap:1, alignItems:'center', bgcolor:'background.paper', boxShadow:2, borderRadius:1, zIndex:1000 }}>
      <Typography variant="caption">Size:</Typography>
      <Slider size="small" value={imageSize} onChange={(e,v)=>{ setImageSize(v); editor.chain().focus().setImage({ width:`${v}%` }).run(); }} min={10} max={200} sx={{ width:100 }} />
      <Typography variant="caption">{imageSize}%</Typography>
      <Tooltip title="Remove Image"><IconButton size="small" onClick={() => { editor.chain().focus().deleteSelection().run(); setShowControls(false); }} color="error"><Delete fontSize="small"/></IconButton></Tooltip>
    </Paper>
  );
};

const TiptapEditor = ({ value='', onChange, readOnly=false, height=400, placeholder='Start writing your content here...' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fileInputRef = useRef(null);
  const lastContentRef = useRef(value);
  const changeDebounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [ StarterKit.configure({ heading:{ levels:[1,2,3] }, bulletList:{ keepMarks:true, keepAttributes:true }, orderedList:{ keepMarks:true, keepAttributes:true }, underline:false, link:false }), Underline, TextStyle, Color, FontFamily, TextAlign.configure({ types:['heading','paragraph'] }), Link.configure({ openOnClick:false, HTMLAttributes:{ class:'tiptap-link' } }), ResizableImage.configure({ inline:true, allowBase64:true, HTMLAttributes:{ class:'tiptap-image' } }), Table.configure({ resizable:true }), TableRow, TableHeader, TableCell ],
    content: value,
    editable: !readOnly,
    editorProps: { attributes: { class: 'tiptap-editor', 'data-placeholder': placeholder } },
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

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
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
        .setImage({ src: imageUrl, title: resizedFile.name, alt: resizedFile.name, width: '60%' })
        .run();
    } catch (error) {
      devError('Failed to upload editor image:', error);
    } finally {
      event.target.value = '';
      setIsUploadingImage(false);
    }
  };

  if (!editor) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius:2, overflow:'hidden', bgcolor: isDark ? 'grey.900' : 'background.paper', position:'relative', boxShadow: isDark ? 3 : 1, borderColor: isDark ? 'grey.800' : 'divider' }}>
      {editor && <ImageResizer editor={editor} />}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display:'none' }}
        onChange={handleImageUpload}
      />

      {!readOnly && (
        <Box sx={{ p:1, borderBottom:1, borderColor:'divider', bgcolor: isDark ? 'grey.900' : 'grey.50', display:'flex', flexWrap:'wrap', gap:0.5, alignItems:'center' }}>
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><FormatBold fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><FormatItalic fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><FormatUnderlined fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike"><StrikethroughS fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <FormControl size="small" sx={{ minWidth:120 }}>
            <Select value={''} onChange={()=>{}} displayEmpty size="small" renderValue={()=>'Font'}>
              <MenuItem value="" disabled>Font Family</MenuItem>
              {FONT_FAMILIES.map(f => <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>{f.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth:80 }}>
            <Select value={''} onChange={()=>{}} displayEmpty size="small" renderValue={()=>'Size'}>
              <MenuItem value="" disabled>Font Size</MenuItem>
              {FONT_SIZES.map(s => <MenuItem key={s} value={s}>{s}px</MenuItem>)}
            </Select>
          </FormControl>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={(e)=>{}} title="Text Color"><FormatColorText fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={(e)=>{}} title="BG Color"><FormatColorFill fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><FormatAlignLeft fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center"><FormatAlignCenter fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><FormatAlignRight fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><FormatAlignJustify fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet"><FormatListBulleted fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered"><FormatListNumbered fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level:1 }).run()} active={editor.isActive('heading',{level:1})} title="H1"><Title fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><FormatQuote fontSize="small"/></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code"><Code fontSize="small"/></ToolbarButton>
          <Divider orientation="vertical" flexItem sx={{ mx:1 }} />
          <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows:3, cols:3, withHeaderRow:true }).run()} title="Table"><TableChart fontSize="small"/></ToolbarButton>
          <ToolbarButton
            onClick={() => !isUploadingImage && fileInputRef.current?.click()}
            disabled={isUploadingImage}
            title={isUploadingImage ? 'Uploading image...' : 'Upload Image'}
          >
            <PhotoCamera fontSize="small"/>
          </ToolbarButton>
        </Box>
      )}

      <Box sx={{ p:2, bgcolor: isDark ? 'grey.900' : 'background.paper', borderRadius:2 }}>
        {isUploadingImage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Uploading image...
          </Typography>
        )}
        <EditorContent editor={editor} />
      </Box>

      <style>{`
        .tiptap-editor { min-height: ${height-120}px; outline:none; line-height:1.6; font-size:16px; background: ${isDark? '#181a1b' : '#fff'}; color: ${isDark? '#e0e0e0' : '#222'}; border-radius:8px; }
        .tiptap-editor p { margin:0 0 1em 0 }
        .tiptap-editor img, .tiptap-editor .tiptap-image {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.75rem 0;
          border-radius: 8px;
        }
        .tiptap-editor pre { background: ${isDark? '#232323' : '#f5f5f5'}; color: ${isDark? '#e0e0e0' : '#222'}; padding:1em; border-radius:4px }
        .tiptap-editor code { background: ${isDark? '#232323' : '#f5f5f5'}; padding:0.2em 0.4em; border-radius:3px }
        .tiptap-editor th { background: ${isDark? '#232323' : '#f5f5f5'}; color: ${isDark? '#e0e0e0' : '#222'} }
        .tiptap-editor td, .tiptap-editor th { border:1px solid ${isDark? '#444' : '#ddd'}; padding:0.5em }
        .tiptap-editor:empty:before { content: attr(data-placeholder); color: ${isDark? '#888' : '#999'} }
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
