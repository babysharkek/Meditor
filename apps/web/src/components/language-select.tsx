import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/utils/ui";
import { motion } from "motion/react";
import ReactCountryFlag from "react-country-flag";

export interface Language {
  code: string;
  name: string;
  flag?: string;
}

interface LanguageSelectProps {
  selectedCountry: string;
  onSelect: (country: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  languages: Language[];
}

function FlagPreloader({ languages }: { languages: Language[] }) {
  return (
    <div className="pointer-events-none absolute -top-[9999px] left-0">
      {languages.map((language) => (
        <ReactCountryFlag
          key={language.code}
          countryCode={language.code}
          svg
          style={{ width: "1.05rem", height: "1.05rem" }}
        />
      ))}
    </div>
  );
}

export function LanguageSelect({
  selectedCountry,
  onSelect,
  containerRef,
  languages,
}: LanguageSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const collapsedHeight = "2.5rem";
  const expandHeight = "12rem";
  const buttonRef = useRef<HTMLButtonElement>(null);

  const expand = () => {
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 600);
    setExpanded(true);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsClosing(true);
        setTimeout(() => setIsClosing(false), 600);
        setExpanded(false);
        buttonRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expanded]);

  const selectedLanguage = languages.find(
    (lang) => lang.code === selectedCountry,
  );

  const handleSelect = ({
    code,
    e,
  }: {
    code: string;
    e: React.MouseEvent<HTMLButtonElement>;
  }) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(code);
    setExpanded(false);
  };

  return (
    <div className="relative h-9 w-full">
      <FlagPreloader languages={languages} />
      <motion.button
        type="button"
        className={cn(
          "absolute z-10 flex h-full w-full cursor-pointer flex-col items-start justify-between overflow-hidden rounded-lg px-3",
          "!bg-foreground/10 text-foreground py-0 backdrop-blur-md",
          "focus:border-ring focus:ring-ring/50 transition-[color,box-shadow] focus:ring-[1px]",
        )}
        initial={{
          height: collapsedHeight,
          scale: 1,
        }}
        animate={{
          height: expanded ? expandHeight : collapsedHeight,
          scale: isTapping ? [1, 0.985, 1] : 1,
        }}
        transition={{
          height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
          scale: { duration: 0.6, ease: "easeOut" },
        }}
        onClick={expand}
        ref={buttonRef}
      >
        {!expanded ? (
          <div
            className="flex w-full items-center justify-between"
            style={{
              height: collapsedHeight,
            }}
          >
            <div className="flex items-center gap-2">
              {selectedCountry === "auto" ? (
                <Globe className="!size-[1.05rem]" />
              ) : (
                <ReactCountryFlag
                  countryCode={selectedCountry}
                  svg
                  style={{ width: "1.05rem", height: "1.05rem" }}
                />
              )}
              <span className="pt-[0.05rem]">
                {selectedCountry === "auto" ? "Auto" : selectedLanguage?.name}
              </span>
            </div>
          </div>
        ) : (
          <div className="scrollbar-hidden my-2.5 flex w-full flex-col gap-2 overflow-y-auto">
            <LanguageButton
              language={{ code: "auto", name: "Auto" }}
              onSelect={handleSelect}
              selectedCountry={selectedCountry}
            />
            {languages.map((language) => (
              <LanguageButton
                key={language.code}
                language={language}
                onSelect={handleSelect}
                selectedCountry={selectedCountry}
              />
            ))}
          </div>
        )}
      </motion.button>

      <motion.div
        className="pointer-events-none absolute top-1/2 right-3 z-20 mt-0.5 -translate-y-1/2"
        initial={{ opacity: 1 }}
        animate={{ opacity: expanded ? 0 : 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <ChevronDown className="text-muted-foreground size-4" />
      </motion.div>
    </div>
  );
}

function LanguageButton({
  language,
  onSelect,
  selectedCountry,
}: {
  language: Language;
  onSelect: ({
    code,
    e,
  }: {
    code: string;
    e: React.MouseEvent<HTMLButtonElement>;
  }) => void;
  selectedCountry: string;
}) {
  return (
    <button
      type="button"
      className="text-foreground hover:text-foreground/75 flex cursor-pointer items-center gap-2"
      onClick={(e) => onSelect({ code: language.code, e })}
    >
      {language.code === "auto" ? (
        <Globe className="!size-[1.0rem]" />
      ) : (
        <ReactCountryFlag
          countryCode={language.code}
          svg
          style={{ width: "1.05rem", height: "1.05rem" }}
        />
      )}
      <span className="pt-[0.05rem]">{language.name}</span>
    </button>
  );
}
