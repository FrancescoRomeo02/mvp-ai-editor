type IconName = 'home' | 'folder-plus' | 'file-plus' | 'upload' | 'folder' | 'file' | 'edit' | 'trash' | 'chevron-down' | 'chevron-right' | 'arrow-left' | 'arrow-right' | 'download' | 'user'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5',
  'folder-plus': 'M3.5 6.5h6l1.5 2h9.5v9.75a1.75 1.75 0 0 1-1.75 1.75h-15A1.75 1.75 0 0 1 2 18.25V8.25A1.75 1.75 0 0 1 3.5 6.5ZM12 11v5M9.5 13.5h5',
  'file-plus': 'M6 2.75h7l5 5v13.5H6a2 2 0 0 1-2-2v-14.5a2 2 0 0 1 2-2ZM13 2.75v5h5M12 12v5M9.5 14.5h5',
  upload: 'M12 16V4M7.5 8.5 12 4l4.5 4.5M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3',
  folder: 'M3.5 6.5h6l1.5 2h9.5v9.75a1.75 1.75 0 0 1-1.75 1.75h-15A1.75 1.75 0 0 1 2 18.25V8.25A1.75 1.75 0 0 1 3.5 6.5Z',
  file: 'M6 2.75h7l5 5v13.5H6a2 2 0 0 1-2-2v-14.5a2 2 0 0 1 2-2ZM13 2.75v5h5',
  edit: 'M4 17.5V20h2.5L18.25 8.25l-2.5-2.5L4 17.5ZM14.5 7.25l2.5 2.5M12 20h8',
  trash: 'M4.5 6.5h15M10 10.5v5M14 10.5v5M7 6.5l.75 13h8.5L17 6.5M9 6.5V4h6v2.5',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-right': 'm9 6 6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  download: 'M12 4v12M7.5 11.5 12 16l4.5-4.5M4 19.5h16',
  user: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
