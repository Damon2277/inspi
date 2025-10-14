// Component prop types

import { ReactNode, CSSProperties, MouseEventHandler, ChangeEventHandler } from 'react';

import { User, Work, Comment, KnowledgeGraph, Notification, Activity } from './index';

// Layout components
export interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  fullWidth?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items?: Array<{
    label: string;
    icon?: ReactNode;
    href?: string;
    active?: boolean;
    badge?: string | number;
  }>;
}

// Common UI components
export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export interface InputProps {
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  icon?: ReactNode;
  className?: string;
  name?: string;
  id?: string;
}

export interface TextareaProps {
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  name?: string;
  id?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  className?: string;
}

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: Array<{
    label: string;
    value?: string;
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    divider?: boolean;
  }>;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export interface TabsProps {
  tabs: Array<{
    key: string;
    label: string;
    content: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tab: string) => void;
  variant?: 'default' | 'pills' | 'underlined';
  className?: string;
}

// Work-related components
export interface WorkCardProps {
  work: Work;
  showAuthor?: boolean;
  showStats?: boolean;
  showActions?: boolean;
  onClick?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}

export interface WorkEditorProps {
  work?: Work;
  onSave: (work: Partial<Work>) => Promise<void>;
  onCancel: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
  className?: string;
}

export interface WorkPreviewProps {
  work: Work;
  showComments?: boolean;
  showRelated?: boolean;
  className?: string;
}

// User-related components
export interface UserAvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface UserCardProps {
  user: User;
  showStats?: boolean;
  showActions?: boolean;
  onFollow?: () => void;
  onMessage?: () => void;
  className?: string;
}

export interface ProfileFormProps {
  user: User;
  onSave: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

// Comment components
export interface CommentListProps {
  comments: Comment[];
  workId: string;
  onReply?: (commentId: string, content: string) => void;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  currentUser?: User;
  className?: string;
}

export interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  parentId?: string;
  autoFocus?: boolean;
  className?: string;
}

// Graph components
export interface GraphViewerProps {
  graph: KnowledgeGraph;
  editable?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onUpdate?: (graph: KnowledgeGraph) => void;
  height?: number | string;
  className?: string;
}

export interface GraphNodeProps {
  node: any;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

// Notification components
export interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  className?: string;
}

// Activity components
export interface ActivityCardProps {
  activity: Activity;
  showParticipants?: boolean;
  showRewards?: boolean;
  onJoin?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export interface LeaderboardProps {
  entries: Array<{
    rank: number;
    user: User;
    score: number;
    change?: number;
  }>;
  currentUserId?: string;
  showStats?: boolean;
  className?: string;
}

// Form components
export interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
}

export interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  showButton?: boolean;
  className?: string;
}

export interface FilterBarProps {
  filters: Array<{
    key: string;
    label: string;
    type: 'select' | 'checkbox' | 'radio' | 'range';
    options?: Array<{ label: string; value: any }>;
    value?: any;
  }>;
  onChange: (filters: Record<string, any>) => void;
  onReset?: () => void;
  className?: string;
}

// Navigation components
export interface BreadcrumbsProps {
  items: Array<{
    label: string;
    href?: string;
    icon?: ReactNode;
  }>;
  separator?: ReactNode;
  className?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisible?: number;
  className?: string;
}

// Media components
export interface ImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  lazy?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number | string;
  height?: number | string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}
