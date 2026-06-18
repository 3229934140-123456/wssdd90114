import { useRef, useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionEditorProps {
  sectionId: string;
  title: string;
  content: string;
  onContentChange: (id: string, content: string) => void;
  onMarkSensitive?: (text: string, level: number) => void;
}

interface SensitiveHighlight {
  text: string;
  level: number;
}

export default function SectionEditor({
  sectionId,
  title,
  content,
  onContentChange,
  onMarkSensitive,
}: SectionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sensitiveHighlights, setSensitiveHighlights] = useState<SensitiveHighlight[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = renderWithHighlights(content, sensitiveHighlights);
    }
  }, [content]);

  const renderWithHighlights = (text: string, highlights: SensitiveHighlight[]): string => {
    if (highlights.length === 0) return text;
    let result = text;
    highlights.forEach(({ text: highlightText, level }) => {
      const bgColor = level >= 3 ? 'bg-orange-200' : 'bg-yellow-200';
      const regex = new RegExp(`(${highlightText})`, 'g');
      result = result.replace(
        regex,
        `<span class="${bgColor} px-0.5 rounded text-gray-900 font-medium" data-level="${level}">$1</span>`
      );
    });
    return result;
  };

  const handleInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      onContentChange(sectionId, text);
    }
  };

  const handleAIRewrite = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && editorRef.current) {
      const mockRewritten = selectedText + '（AI优化版）';
      const newContent = content.replace(selectedText, mockRewritten);
      onContentChange(sectionId, newContent);
    } else if (content.trim()) {
      const mockRewritten = content + '\n\n[内容已通过AI润色优化]';
      onContentChange(sectionId, mockRewritten);
    }
  };

  const handleMarkSensitive = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      const level = selectedText.length > 10 ? 3 : 2;
      const newHighlight: SensitiveHighlight = { text: selectedText, level };
      setSensitiveHighlights((prev) => {
        const exists = prev.some((h) => h.text === selectedText);
        if (exists) return prev;
        return [...prev, newHighlight];
      });
      onMarkSensitive?.(selectedText, level);

      if (editorRef.current) {
        const allHighlights = [...sensitiveHighlights, newHighlight];
        const currentText = editorRef.current.innerText;
        editorRef.current.innerHTML = renderWithHighlights(currentText, allHighlights);
      }
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      onContentChange(sectionId, '');
      setSensitiveHighlights([]);
    }
  };

  const wordCount = content.length;
  const charCount = content.replace(/\s/g, '').length;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white transition-all duration-200 overflow-hidden',
        isFocused ? 'border-gov-deepblue ring-2 ring-gov-deepblue/10 shadow-md' : 'border-gray-200 shadow-sm'
      )}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-gov-deepblue" />
          {title}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAIRewrite}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200"
          >
            <Sparkles className="h-4 w-4 group-hover:animate-pulse" />
            AI重写
          </button>
          <button
            type="button"
            onClick={handleMarkSensitive}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors duration-200"
          >
            <AlertTriangle className="h-4 w-4" />
            敏感标记
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={handleClear}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
          >
            <Trash2 className="h-4 w-4" />
            清空
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={`请输入${title}内容...`}
        className="editor-content min-h-[180px] max-h-[480px] overflow-y-auto px-5 py-4
          text-gray-700 text-base leading-relaxed outline-none font-song
          focus:bg-white"
      />

      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>
            总字数：<span className="text-gray-600 font-medium">{wordCount}</span>
          </span>
          <span>
            字符数：<span className="text-gray-600 font-medium">{charCount}</span>
          </span>
          {sensitiveHighlights.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              敏感标记：<span className="font-medium">{sensitiveHighlights.length}</span>处
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {wordCount < 50 && content.trim() && (
            <span className="text-amber-500">内容偏短，建议补充详情</span>
          )}
          {wordCount > 2000 && (
            <span className="text-red-500">内容过长，建议精简</span>
          )}
        </div>
      </div>
    </div>
  );
}
