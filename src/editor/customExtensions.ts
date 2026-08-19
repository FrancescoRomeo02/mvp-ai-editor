import { Node, mergeAttributes } from '@tiptap/core'

const blockContent = 'block+'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: blockContent,
  defining: true,
  addAttributes: () => ({ tone: { default: 'note' } }),
  parseHTML: () => [{ tag: 'aside[data-callout]' }],
  renderHTML: ({ HTMLAttributes }) => ['aside', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'callout' }), 0],
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column+',
  defining: true,
  parseHTML: () => [{ tag: 'section[data-columns]' }],
  renderHTML: ({ HTMLAttributes }) => ['section', mergeAttributes(HTMLAttributes, { 'data-columns': '', class: 'columns' }), 0],
})

export const Column = Node.create({
  name: 'column',
  group: 'block',
  content: blockContent,
  defining: true,
  parseHTML: () => [{ tag: 'div[data-column]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-column': '', class: 'column' }), 0],
})

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  addAttributes: () => ({
    href: { default: '' },
    filename: { default: 'Attachment' },
    mime: { default: 'application/octet-stream' },
  }),
  parseHTML: () => [{ tag: 'a[data-attachment]' }],
  renderHTML: ({ HTMLAttributes }) => ['a', mergeAttributes(HTMLAttributes, { 'data-attachment': '', class: 'attachment', href: HTMLAttributes.href }), HTMLAttributes.filename],
})

export const TableOfContents = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  parseHTML: () => [{ tag: 'nav[data-table-of-contents]' }],
  renderHTML: () => ['nav', { 'data-table-of-contents': '', 'aria-label': 'Automatic table of contents', class: 'table-of-contents' }, ['strong', 'Table of contents']],
})
