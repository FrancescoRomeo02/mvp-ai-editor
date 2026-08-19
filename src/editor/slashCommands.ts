export const slashItems = [
  { id: 'title', label: 'Title', hint: 'Main heading', example: 'Introduction', preview: 'heading' },
  { id: 'subtitle', label: 'Subtitle', hint: 'Paper section', example: 'Method', preview: 'subheading' },
  { id: 'heading3', label: 'Heading 3', hint: 'Subsection', example: 'Details', preview: 'subheading' },
  { id: 'paragraph', label: 'Paragraph', hint: 'Standard text', example: 'Start writing…', preview: 'paragraph' },
  { id: 'bullet', label: 'Bullet list', hint: 'List of items', example: 'First point', preview: 'bullet' },
  { id: 'ordered', label: 'Numbered list', hint: 'Ordered steps', example: 'First step', preview: 'ordered' },
  { id: 'todo', label: 'To-do', hint: 'Task list', example: 'Check data', preview: 'todo' },
  { id: 'quote', label: 'Quote', hint: 'Academic blockquote', example: 'A quotation', preview: 'quote' },
  { id: 'columns', label: 'Columns', hint: 'Two-column layout', example: 'Side-by-side text', preview: 'columns' },
  { id: 'callout', label: 'Callout', hint: 'Highlighted note', example: 'Important note', preview: 'callout' },
  { id: 'divider', label: 'Divider', hint: 'Horizontal rule', example: '────────', preview: 'divider' },
  { id: 'image', label: 'Image', hint: 'Figure from URL', example: 'Figure 1', preview: 'image' },
  { id: 'video', label: 'Video', hint: 'Embedded video', example: 'Demo video', preview: 'video' },
  { id: 'table', label: 'Table', hint: '2×2 table', example: 'Results', preview: 'table' },
  { id: 'code', label: 'Code', hint: 'Code snippet', example: 'print(1)', preview: 'code' },
  { id: 'attachment', label: 'Attachment', hint: 'File or material', example: 'data.csv', preview: 'attachment' },
  { id: 'formula', label: 'Formula', hint: 'LaTeX formula', example: 'E = mc²', preview: 'formula' },
  { id: 'toc', label: 'Table of contents', hint: 'Automatic outline', example: 'Paper sections', preview: 'toc' },
  { id: 'mention', label: 'Mention', hint: 'Link an author', example: '@Author', preview: 'mention' },
  { id: 'link', label: 'Internal link', hint: 'Link to a source', example: 'Jump to section', preview: 'link' },
] as const

export type SlashCommandId = (typeof slashItems)[number]['id']
