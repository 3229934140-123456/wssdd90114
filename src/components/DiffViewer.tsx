import { useMemo } from 'react';
import { diff, type DiffItem } from '@/utils/diff';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

function renderDiff(items: DiffItem[], side: 'old' | 'new') {
  return items.map((item, idx) => {
    const isAdded = item.type === 'added';
    const isRemoved = item.type === 'removed';

    let className = '';
    if (side === 'old') {
      if (isRemoved) className = 'bg-red-100 text-red-800 line-through decoration-red-400';
    } else {
      if (isAdded) className = 'bg-green-100 text-green-800';
    }

    if (side === 'old' && isAdded) return null;
    if (side === 'new' && isRemoved) return null;

    return (
      <span
        key={idx}
        className={cn(
          'whitespace-pre-wrap break-words',
          className,
          (isAdded || isRemoved) && 'rounded-sm px-0.5 py-0.5'
        )}
      >
        {item.text}
      </span>
    );
  });
}

function getStats(oldText: string, newText: string) {
  const oldLines = oldText ? oldText.split('\n').length : 0;
  const newLines = newText ? newText.split('\n').length : 0;
  return {
    oldLines,
    newLines,
    lineDiff: newLines - oldLines,
    charDiff: (newText?.length || 0) - (oldText?.length || 0),
  };
}

export default function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const diffResult = useMemo(() => diff(oldText || '', newText || ''), [oldText, newText]);
  const stats = useMemo(() => getStats(oldText || '', newText || ''), [oldText, newText]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">版本对比</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
            删除
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
            新增
          </span>
          <span className="text-gray-400">|</span>
          <span>
            行数: <span className="font-medium text-gray-700">{stats.oldLines}</span>
            <span className="mx-1">→</span>
            <span className="font-medium text-gray-700">{stats.newLines}</span>
            <span className={cn('ml-1', stats.lineDiff > 0 ? 'text-green-600' : stats.lineDiff < 0 ? 'text-red-600' : 'text-gray-500')}>
              ({stats.lineDiff > 0 ? '+' : ''}{stats.lineDiff})
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div>
          <div className="px-4 py-2 bg-red-50/50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-medium text-gray-700">旧版本</span>
            </div>
            <span className="text-xs text-gray-500">{(oldText || '').length} 字符</span>
          </div>
          <div className="p-4 min-h-[200px] max-h-[500px] overflow-auto font-mono text-sm leading-relaxed text-gray-700 bg-red-50/20">
            {oldText ? (
              <div className="whitespace-pre-wrap">{renderDiff(diffResult, 'old')}</div>
            ) : (
              <div className="text-gray-400 italic">无内容</div>
            )}
          </div>
        </div>

        <div>
          <div className="px-4 py-2 bg-green-50/50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-700">新版本</span>
            </div>
            <span className="text-xs text-gray-500">
              {(newText || '').length} 字符
              <span className={cn('ml-1', stats.charDiff > 0 ? 'text-green-600' : stats.charDiff < 0 ? 'text-red-600' : 'text-gray-400')}>
                ({stats.charDiff > 0 ? '+' : ''}{stats.charDiff})
              </span>
            </span>
          </div>
          <div className="p-4 min-h-[200px] max-h-[500px] overflow-auto font-mono text-sm leading-relaxed text-gray-700 bg-green-50/20">
            {newText ? (
              <div className="whitespace-pre-wrap">{renderDiff(diffResult, 'new')}</div>
            ) : (
              <div className="text-gray-400 italic">无内容</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
