import { Clock, MapPin, MessageSquare, AlertTriangle, Flame } from 'lucide-react';
import type { Clue } from '@/shared/types';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';

interface ClueCardProps {
  clue: Clue;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}

const sourceConfig: Record<string, { label: string; className: string }> = {
  news: { label: '新闻', className: 'bg-blue-100 text-blue-700' },
  video: { label: '视频', className: 'bg-orange-100 text-orange-700' },
  forum: { label: '论坛', className: 'bg-purple-100 text-purple-700' },
  hotline: { label: '热线', className: 'bg-green-100 text-green-700' },
};

const sensitiveLabels: Record<number, string> = {
  1: '一级',
  2: '二级',
  3: '三级',
  4: '四级',
};

function getHeatLevel(heat: number) {
  if (heat < 60) return { color: 'from-green-400 to-green-500', bg: 'bg-green-500', text: 'text-green-700' };
  if (heat < 80) return { color: 'from-orange-400 to-orange-500', bg: 'bg-orange-500', text: 'text-orange-700' };
  return { color: 'from-red-500 to-red-600', bg: 'bg-red-500', text: 'text-red-700' };
}

function getHeatBorder(heat: number) {
  if (heat < 60) return 'before:from-green-400/30 before:to-green-500/30';
  if (heat < 80) return 'before:from-orange-400/40 before:to-orange-500/40';
  return 'before:from-red-500/50 before:to-red-600/50';
}

export default function ClueCard({ clue, selected, onToggle, onClick }: ClueCardProps) {
  const source = sourceConfig[clue.source] || { label: clue.source, className: 'bg-gray-100 text-gray-700' };
  const heatLevel = getHeatLevel(clue.heat);
  const heatPercent = Math.min(clue.heat, 100);
  const isSensitive = clue.sensitiveLevel >= 3;
  const isHighPriority = clue.priority === 'high' || clue.priority === 'critical';

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group rounded-xl bg-white cursor-pointer transition-all duration-200',
        'overflow-hidden hover:shadow-lg hover:-translate-y-0.5',
        selected ? 'ring-2 ring-blue-500 shadow-md' : 'shadow-sm',
        isHighPriority && 'before:absolute before:inset-0 before:p-[2px] before:rounded-xl before:bg-gradient-to-r before:pointer-events-none before:z-10',
        isHighPriority && getHeatBorder(clue.heat)
      )}
    >
      <div className={cn('relative z-0 p-4', isHighPriority && 'm-[2px] rounded-[10px] bg-white')}>
        <div className="flex items-start gap-3">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="mt-1 flex-shrink-0"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer',
                'focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                selected && 'bg-blue-600'
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3
                className={cn(
                  'font-semibold text-gray-900 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors',
                  isSensitive && 'px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-700'
                )}
              >
                {clue.title}
              </h3>
              <StatusBadge status={clue.status} size="sm" priority={clue.priority} />
            </div>

            <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
              {clue.description}
            </p>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', source.className)}>
                {source.label}
              </span>
              {clue.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Flame className={cn('w-3.5 h-3.5', heatLevel.text)} />
                  <span className={cn('text-xs font-semibold', heatLevel.text)}>
                    热度 {clue.heat}
                  </span>
                </div>
                {isSensitive && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">敏感{sensitiveLabels[clue.sensitiveLevel]}</span>
                  </div>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', heatLevel.color)}
                  style={{ width: `${heatPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {clue.reportedAt.slice(5, 16)}
                </span>
                {clue.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {clue.location}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-gray-500">
                <MessageSquare className="w-3 h-3" />
                评论
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
