import React from 'react';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  numericCols: boolean[];
}

export type ContentBlock = TextBlock | TableBlock;

function splitCells(line: string): string[] {
  // Remove leading/trailing pipes, split by pipe, trim each cell
  return line
    .replace(/^\|+/, '')
    .replace(/\|+$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitCells(line);
  // A separator row has cells that only contain dashes, colons, and spaces
  return cells.length > 0 && cells.every((cell) => /^[\-:\s]+$/.test(cell) && cell.replace(/[:\s]/g, '').length >= 1);
}

function looksLikeTableRow(line: string): boolean {
  const trimmed = line.trim();
  // Must start with | and have at least 2 pipes total
  if (!trimmed.startsWith('|')) return false;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  if (pipeCount < 2) return false;
  // Should not be a separator row
  if (isSeparatorRow(trimmed)) return false;
  return true;
}

function looksLikeSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  return isSeparatorRow(trimmed);
}

export function parseMarkdownContent(raw: string): ContentBlock[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: ContentBlock[] = [];
  let textLines: string[] = [];
  let i = 0;

  const flushText = () => {
    if (textLines.length > 0) {
      const content = textLines.join('\n').trim();
      if (content) {
        blocks.push({ type: 'text', content });
      }
      textLines = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts a table block
    if (looksLikeTableRow(line)) {
      // Collect table rows
      const tableRows: string[] = [];
      let j = i;

      while (j < lines.length && (looksLikeTableRow(lines[j]) || looksLikeSeparatorRow(lines[j]))) {
        tableRows.push(lines[j]);
        j++;
      }

      // Parse table structure
      if (tableRows.length >= 2) {
        // First row is header (must not be a separator)
        let headerIdx = 0;
        let sepIdx = -1;

        // Find the header and separator
        for (let k = 0; k < tableRows.length; k++) {
          if (looksLikeSeparatorRow(tableRows[k])) {
            sepIdx = k;
            break;
          }
        }

        // If we found a separator, header is the row before it
        if (sepIdx > 0) {
          headerIdx = sepIdx - 1;
        } else if (sepIdx === 0) {
          // Separator is the first row, use the first row as header anyway
          headerIdx = 0;
        }

        const headers = splitCells(tableRows[headerIdx]);

        // Data rows are everything after the separator (or after header if no separator)
        const dataStartIdx = sepIdx >= 0 ? sepIdx + 1 : headerIdx + 1;
        const dataRows = tableRows
          .slice(dataStartIdx)
          .filter((row) => !looksLikeSeparatorRow(row))
          .map((row) => splitCells(row));

        // Ensure all rows have the same number of columns as headers
        const normalizedRows = dataRows.map((row) => {
          while (row.length < headers.length) row.push('');
          return row.slice(0, headers.length);
        });

        // Detect numeric columns
        const numericCols = headers.map((_, colIdx) => {
          const values = normalizedRows.map((row) => row[colIdx] ?? '');
          // Column is numeric if most values look like numbers
          const numericCount = values.filter((v) => /^[\$€£¥]?[\d,.]+%?$/.test(v.trim()) || /^\d+(\.\d+)?$/.test(v.trim())).length;
          return values.length > 0 && numericCount >= values.length * 0.5;
        });

        if (headers.length > 0 && normalizedRows.length > 0) {
          flushText();
          blocks.push({
            type: 'table',
            headers,
            rows: normalizedRows,
            numericCols,
          });
          i = j;
          continue;
        }
      }

      // If table parsing failed, treat as text
      textLines.push(line);
      i++;
      continue;
    }

    // Regular text line
    textLines.push(line);
    i++;
  }

  flushText();
  return blocks;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Handle **bold** text
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      React.createElement('strong', { key: `b-${keyIdx++}`, className: 'font-bold text-text-primary' }, match[1])
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function renderContentBlocks(
  blocks: ContentBlock[],
  tableKeyPrefix: string = 'tbl',
): React.ReactNode[] {
  return blocks.map((block, blockIdx) => {
    if (block.type === 'table') {
      return renderTable(block, `${tableKeyPrefix}-${blockIdx}`);
    }
    // Text block - render paragraphs
    const paragraphs = block.content.split('\n\n');
    return paragraphs.map((para, pIdx) => {
      const trimmed = para.trim();
      if (!trimmed) return null;

      // Check for headings
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        if (level === 2) {
          return React.createElement(
            'h2',
            {
              key: `h2-${blockIdx}-${pIdx}`,
              className:
                'text-[14px] font-black text-text-primary uppercase tracking-[0.15em] mt-6 mb-3 pb-2 border-b border-primary/10 flex items-center gap-2',
            },
            React.createElement('span', { className: 'w-1 h-4 bg-primary rounded-full' }),
            renderInlineFormatting(text)
          );
        }
        return React.createElement(
          'h3',
          {
            key: `h3-${blockIdx}-${pIdx}`,
            className: 'text-[12px] font-bold text-text-primary uppercase tracking-[0.1em] mt-4 mb-2',
          },
          renderInlineFormatting(text)
        );
      }

      // Check for bullet lists
      const listLines = trimmed.split('\n').filter((l) => /^\s*[-*]\s+/.test(l));
      if (listLines.length > 1) {
        return React.createElement(
          'ul',
          {
            key: `ul-${blockIdx}-${pIdx}`,
            className: 'list-none pl-0 mb-3 space-y-1.5 text-text-secondary',
          },
          listLines.map((item, liIdx) => {
            const text = item.replace(/^\s*[-*]\s+/, '');
            return React.createElement(
              'li',
              { key: `li-${liIdx}`, className: 'flex items-start gap-2 text-[13px]' },
              React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0' }),
              React.createElement('span', null, renderInlineFormatting(text))
            );
          })
        );
      }

      // Regular paragraph
      return React.createElement(
        'p',
        {
          key: `p-${blockIdx}-${pIdx}`,
          className: 'mb-3 text-text-secondary leading-[1.7] text-[13px]',
        },
        renderInlineFormatting(trimmed)
      );
    });
  });
}

function renderTable(table: TableBlock, key: string): React.ReactNode {
  return React.createElement(
    'div',
    {
      key,
      className: 'overflow-x-auto my-5 rounded-xl border border-[rgba(29,212,180,0.2)]',
      style: { background: '#0c1220' },
    },
    React.createElement(
      'table',
      { className: 'w-full border-collapse text-[12px]' },
      // Header
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          table.headers.map((header, hIdx) =>
            React.createElement(
              'th',
              {
                key: `th-${hIdx}`,
                className: `px-4 py-3 ${table.numericCols[hIdx] ? 'text-right' : 'text-left'} font-black uppercase tracking-[0.12em] text-[10px] whitespace-nowrap`,
                style: {
                  color: '#1dd4b4',
                  borderBottom: '2px solid rgba(29, 212, 180, 0.2)',
                  borderRight: hIdx < table.headers.length - 1 ? '1px solid rgba(29, 212, 180, 0.12)' : 'none',
                  background: 'rgba(29, 212, 180, 0.1)',
                  padding: '12px 16px',
                },
              },
              renderInlineFormatting(header)
            )
          )
        )
      ),
      // Body
      React.createElement(
        'tbody',
        null,
        table.rows.map((row, rIdx) =>
          React.createElement(
            'tr',
            {
              key: `tr-${rIdx}`,
              style: {
                background: rIdx % 2 === 1 ? 'rgba(255,255,255,0.03)' : 'transparent',
              },
              className: 'hover:bg-primary/[0.04] transition-colors duration-150',
            },
            row.map((cell, cIdx) =>
              React.createElement(
                'td',
                {
                  key: `td-${cIdx}`,
                  className: `${table.numericCols[cIdx] ? 'text-right font-mono' : 'text-left'} text-[12px]`,
                  style: {
                    padding: '12px 16px',
                    borderBottom: rIdx < table.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderRight: cIdx < row.length - 1 ? '1px solid rgba(29,212,180,0.08)' : 'none',
                    color: '#94a3b8',
                    fontWeight: 500,
                  },
                },
                renderInlineFormatting(cell)
              )
            )
          )
        )
      )
    )
  );
}
