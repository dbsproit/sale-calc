"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: string[];
  style?: CSSProperties;
}

// Substitui <input list="..."> + <datalist> nativo: o popup de sugestões do
// navegador às vezes renderiza fora do lugar (bug conhecido do Chromium em
// alguns layouts). Aqui o dropdown é nosso, então a posição é sempre previsível.
export function Autocomplete({ id, value, onChange, onBlur, options, style }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const needle = value.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase() !== needle && (!needle || o.toLowerCase().includes(needle))).slice(0, 30);

  return (
    <div className="autocomplete" ref={containerRef} style={style}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-menu">
          {filtered.map((opt) => (
            <div
              key={opt}
              className="autocomplete-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
