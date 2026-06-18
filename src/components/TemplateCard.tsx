import { FileText, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type TemplateType = 'daily' | 'urgent' | 'topic';

interface TemplateCardProps {
  type: TemplateType;
  selected: boolean;
  onClick: () => void;
}

const templateConfig: Record<TemplateType, {
  icon: typeof FileText;
  title: string;
  description: string;
  scenario: string;
  iconBg: string;
  iconColor: string;
  borderActive: string;
  bgActive: string;
}> = {
  daily: {
    icon: FileText,
    title: '日报模板',
    description: '每日常规舆情汇总',
    scenario: '适用场景：每日舆情通报',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderActive: 'border-blue-500',
    bgActive: 'bg-blue-50/80',
  },
  urgent: {
    icon: AlertTriangle,
    title: '突发快报',
    description: '突发事件紧急专报',
    scenario: '适用场景：突发事件1小时内上报',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderActive: 'border-red-500',
    bgActive: 'bg-red-50/80',
  },
  topic: {
    icon: Target,
    title: '专题跟踪',
    description: '重点事件深度追踪',
    scenario: '适用场景：持续关注专题',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderActive: 'border-purple-500',
    bgActive: 'bg-purple-50/80',
  },
};

export default function TemplateCard({ type, selected, onClick }: TemplateCardProps) {
  const config = templateConfig[type];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-xl border-2 p-5 transition-all duration-300 card-hover',
        'bg-white shadow-sm',
        selected
          ? `${config.borderActive} ${config.bgActive} shadow-md ring-2 ring-offset-1 ${config.borderActive.replace('border-', 'ring-').replace('-500', '-200')}`
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
            config.iconBg
          )}
        >
          <Icon className={cn('h-6 w-6', config.iconColor)} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-lg font-semibold mb-1',
            selected ? config.iconColor : 'text-gray-800'
          )}>
            {config.title}
          </h3>
          <p className="text-sm text-gray-500 mb-2">{config.description}</p>
          <p className="text-xs text-gray-400">{config.scenario}</p>
        </div>
        {selected && (
          <div className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            config.iconBg,
            config.iconColor
          )}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
