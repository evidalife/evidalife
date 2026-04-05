'use client';

import { useRef, useState } from 'react';

/* ─── Props ──────────────────────────────────────────────────────────────────── */

interface Props {
  /** Ref to the controlled textarea */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Current value of the textarea (for controlled insert) */
  value: string;
  /** Callback when the value changes */
  onChange: (value: string) => void;
  /** Show the 📷 Photo button (inserts ![photo:N]) */
  showPhoto?: boolean;
  /** Show the 🔗 Link button (inserts [text](url)) */
  showLink?: boolean;
  /** Show the 🍽 Recipe button (inserts ::recipe[slug]) */
  showRecipe?: boolean;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
  showPhoto = true,
  showLink = true,
  showRecipe = false,
}: Props) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const linkTextRef = useRef<HTMLInputElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const recipeSlugRef = useRef<HTMLInputElement>(null);

  const insert = (before: string, after = '', defaultText = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || defaultText;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cur = s + before.length + sel.length + after.length;
      ta.setSelectionRange(cur, cur);
    });
  };

  const handleInsertLink = () => {
    const text = linkTextRef.current?.value?.trim() || 'Link';
    const url = linkUrlRef.current?.value?.trim() || '/';
    insert(`[${text}](${url})`);
    setShowLinkDialog(false);
  };

  const handleInsertRecipe = () => {
    const slug = recipeSlugRef.current?.value?.trim();
    if (slug) insert(`::recipe[${slug}]`);
    setShowRecipeDialog(false);
  };

  /* ── Buttons ───────────────────────────────────────────────────────────── */

  const baseBtns: { label: string; title: string; fn: () => void }[] = [
    { label: 'B',       title: 'Bold',          fn: () => insert('**', '**', 'bold') },
    { label: 'I',       title: 'Italic',        fn: () => insert('*', '*', 'italic') },
    { label: '## H',    title: 'Heading',       fn: () => insert('\n## ', '', 'Heading') },
    { label: '– List',  title: 'Bullet list',   fn: () => insert('\n- ', '', 'Item') },
    { label: '1. Num',  title: 'Numbered list', fn: () => insert('\n1. ', '', 'Item') },
    { label: '> Quote', title: 'Blockquote',    fn: () => insert('\n> ', '', 'Quote') },
    { label: '---',     title: 'Divider',       fn: () => insert('\n\n---\n\n') },
  ];

  const btnCls = 'rounded px-1.5 py-0.5 text-[11px] font-medium text-[#1c2a2b]/60 hover:bg-[#0e393d]/8 hover:text-[#0e393d] transition select-none';
  const btnActiveCls = 'rounded px-1.5 py-0.5 text-[11px] font-medium bg-[#0e393d]/10 text-[#0e393d] transition select-none';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-[#0e393d]/8 bg-[#fafaf8] rounded-t-lg">
        {baseBtns.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
            className={btnCls}
          >
            {b.label}
          </button>
        ))}

        {/* Separator */}
        {(showLink || showPhoto || showRecipe) && (
          <span className="w-px h-4 bg-[#0e393d]/12 mx-0.5" />
        )}

        {showLink && (
          <button
            type="button"
            title="Insert link"
            onMouseDown={(e) => { e.preventDefault(); setShowLinkDialog(!showLinkDialog); setShowRecipeDialog(false); }}
            className={showLinkDialog ? btnActiveCls : btnCls}
          >
            🔗 Link
          </button>
        )}

        {showPhoto && (
          <button
            type="button"
            title="Insert photo reference"
            onMouseDown={(e) => {
              e.preventDefault();
              const matches = value.match(/!\[photo:\d+\]/g);
              const n = (matches ? matches.length : 0) + 1;
              insert(`\n![photo:${n}]\n`);
            }}
            className={btnCls}
          >
            📷 Photo
          </button>
        )}

        {showRecipe && (
          <button
            type="button"
            title="Embed recipe card"
            onMouseDown={(e) => { e.preventDefault(); setShowRecipeDialog(!showRecipeDialog); setShowLinkDialog(false); }}
            className={showRecipeDialog ? btnActiveCls : btnCls}
          >
            🍽 Recipe
          </button>
        )}
      </div>

      {/* Link dialog */}
      {showLinkDialog && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-xl border border-[#0e393d]/15 shadow-lg p-3 flex items-end gap-2">
          <div>
            <label className="block text-[10px] font-medium text-[#1c2a2b]/50 mb-0.5">Text</label>
            <input
              ref={linkTextRef}
              type="text"
              placeholder="Link text"
              defaultValue=""
              className="w-32 px-2 py-1 rounded border border-[#0e393d]/15 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#1c2a2b]/50 mb-0.5">URL</label>
            <input
              ref={linkUrlRef}
              type="text"
              placeholder="/recipes/slug or https://..."
              defaultValue=""
              className="w-52 px-2 py-1 rounded border border-[#0e393d]/15 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
            />
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }}
            className="px-2.5 py-1 rounded bg-[#0e393d] text-white text-xs font-medium hover:bg-[#0e393d]/85 transition"
          >
            Insert
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowLinkDialog(false); }}
            className="px-2 py-1 rounded text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]/70 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Recipe embed dialog */}
      {showRecipeDialog && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-xl border border-[#0e393d]/15 shadow-lg p-3 flex items-end gap-2">
          <div>
            <label className="block text-[10px] font-medium text-[#1c2a2b]/50 mb-0.5">Recipe slug</label>
            <input
              ref={recipeSlugRef}
              type="text"
              placeholder="e.g. anti-entzuendungs-life-smoothie"
              defaultValue=""
              className="w-64 px-2 py-1 rounded border border-[#0e393d]/15 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleInsertRecipe()}
            />
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleInsertRecipe(); }}
            className="px-2.5 py-1 rounded bg-[#0e393d] text-white text-xs font-medium hover:bg-[#0e393d]/85 transition"
          >
            Insert
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowRecipeDialog(false); }}
            className="px-2 py-1 rounded text-xs text-[#1c2a2b]/40 hover:text-[#1c2a2b]/70 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
