import type { Clue, Report } from '@/shared/types';
import { cn } from '@/lib/utils';

type StatusType = Report['status'] | Clue['status'];
type PriorityType = Clue['priority'];

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  priority?: PriorityType;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  submitted: {
    label: '已提交',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  processing: {
    label: '处理中',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  reviewing: {
    label: '审核中',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  verified: {
    label: '已核实',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  approved: {
    label: '已通过',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  closed: {
    label: '已关闭',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  rejected: {
    label: '已驳回',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  draft: {
    label: '草稿',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const priorityGradient: Record<PriorityType, string> = {
  low: '',
  medium: '',
  high: 'bg-gradient-to-r from-red-500 to-pink-500 p-[1.5px]',
  critical: 'bg-gradient-to-r from-red-600 to-orange-500 p-[1.5px]',
};

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function StatusBadge({ status, size = 'md', priority }: StatusBadgeProps) {
  const config = statusConfig[status];
  const hasGradient = priority === 'high' || priority === 'critical';

  if (hasGradient) {
    return (
      <span className={cn('inline-flex rounded-md', priorityGradient[priority])}>
        <span
          className={cn(
            'inline-flex items-center rounded-[5px] font-medium border bg-white',
            sizeClasses[size],
            'text-red-600 border-red-100'
          )}
        >
          {config.label}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium border',
        sizeClasses[size],
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
