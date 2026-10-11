import React from "react";

interface FormattedContentProps {
  content: string;
  className?: string;
}

/**
 * Parsea e interpreta tokens inline:
 * - **negrita**
 * - *cursiva*
 * - <u>subrayado</u>
 * - [enlace](url)
 */
function renderInline(text: string): React.ReactNode {
  // Regex para capturar tokens de formato inline
  const tokenRegex = /(\*\*.*?\*\*|\*[^*]+?\*|<u>.*?<\/u>|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Negrita: **texto**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Cursiva: *texto*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={i} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Subrayado: <u>texto</u>
    if (part.startsWith("<u>") && part.endsWith("</u>") && part.length >= 7) {
      return (
        <span
          key={i}
          className="underline decoration-[#FDB827]/80 underline-offset-2 font-medium text-slate-100"
        >
          {part.slice(3, -4)}
        </span>
      );
    }

    // Enlace: [texto](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FDB827] hover:underline hover:text-[#FDB827]/80 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Texto plano
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Renderizador sabermétrico de contenido enriquecido para la NotiCueva:
 * Soporta párrafos, subtítulos (###), viñetas (•, -), citas (>), líneas divisorias (---),
 * negritas, cursivas, subrayados y enlaces.
 */
export function FormattedContent({ content, className = "" }: FormattedContentProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentListItems: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length > 0) {
      const items = [...currentListItems];
      currentListItems = [];
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="space-y-1.5 my-2.5 pl-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300 leading-relaxed"
            >
              <span className="text-[#FDB827] font-bold text-sm shrink-0 leading-tight">
                •
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Viñetas: líneas que inician con '• ', '- ', o '* '
    if (
      trimmed.startsWith("• ") ||
      trimmed.startsWith("- ") ||
      (trimmed.startsWith("* ") && !trimmed.endsWith("*"))
    ) {
      const cleanItem = trimmed.replace(/^([•\-\*]\s*)/, "");
      currentListItems.push(cleanItem);
      continue;
    }

    // Si no es elemento de lista, vaciar lista acumulada
    flushList(i);

    // Salto de párrafo / línea vacía
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Subtítulo / Encabezado: líneas que inician con '#'
    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h3
          key={`h-${i}`}
          className="text-sm sm:text-base font-bold text-[#FDB827] mt-3.5 mb-1.5 tracking-wide flex items-center space-x-1.5"
        >
          <span>{renderInline(headingText)}</span>
        </h3>
      );
      continue;
    }

    // Cita / Declaración textual: líneas que inician con '>'
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed.replace(/^>\s*/, "");
      elements.push(
        <blockquote
          key={`q-${i}`}
          className="border-l-2 border-[#FDB827] bg-[#002D62]/20 pl-3 py-1.5 my-2.5 rounded-r-lg italic text-slate-200 text-xs sm:text-sm shadow-sm"
        >
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Línea divisoria
    if (trimmed === "---" || trimmed === "***") {
      elements.push(<hr key={`hr-${i}`} className="border-[#1E2B4D] my-3" />);
      continue;
    }

    // Párrafo normal
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-slate-300 leading-relaxed"
      >
        {renderInline(rawLine)}
      </p>
    );
  }

  // Vaciar lista final si quedó alguna abierta
  flushList(lines.length);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
