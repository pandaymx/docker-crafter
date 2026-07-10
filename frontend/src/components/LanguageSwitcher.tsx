import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

const LANGUAGES = [
  { code: "zh", name: "简体中文", supported: true },
  { code: "en", name: "English", supported: true },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Globe className="w-4 h-4" />
        {currentLang.code.toUpperCase()}
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                if (lang.supported) {
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem("docker-crafter-lang", lang.code);
                  setIsOpen(false);
                }
              }}
              className={cn("w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition-colors", {
                "text-cyan-400": lang.code === i18n.language,
                "text-slate-300": lang.code !== i18n.language,
              })}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
