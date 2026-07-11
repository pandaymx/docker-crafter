import { ChevronDown, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { GlassPanel } from './ui/GlassPanel';

const LANGUAGES = [
  { code: 'zh', name: '简体中文', supported: true },
  { code: 'en', name: 'English', supported: true },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs font-mono text-slate-400 transition-all duration-300 hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"
      >
        <Globe className="w-4 h-4" />
        {currentLang.code.toUpperCase()}
        <ChevronDown
          className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && (
        <GlassPanel className="absolute right-0 mt-2 w-32 z-50 p-0 overflow-hidden border-cyan-500/40 ring-1 ring-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.45)] backdrop-blur bg-slate-950/60">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.supported) {
                    i18n.changeLanguage(lang.code);
                    localStorage.setItem('docker-crafter-lang', lang.code);
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-all duration-300 relative',
                  isSelected
                    ? 'text-cyan-300 bg-cyan-500/10 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] border-l-2 border-cyan-400'
                    : 'text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] border-l-2 border-transparent',
                )}
              >
                {lang.name}
              </button>
            );
          })}
        </GlassPanel>
      )}
    </div>
  );
}
