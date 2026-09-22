'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from './Select';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  /**
   * Prende a coluna na borda esquerda durante a rolagem horizontal. Numa
   * tabela larga, sem isso a pessoa rola ate o CPM e ja nao sabe de qual
   * anuncio e a linha.
   */
  sticky?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  defaultSortKey?: string;
  defaultSortDesc?: boolean;
}

export function DataTable<T>({ data, columns, defaultSortKey, defaultSortDesc = true }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDesc, setSortDesc] = useState<boolean>(defaultSortDesc);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true); // default to descending on new sort
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const valA = col.accessor(a);
      const valB = col.accessor(b);
      
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, sortKey, sortDesc, columns]);

  const totalPages = Math.ceil(sortedData.length / Number(pageSize));
  
  const paginatedData = useMemo(() => {
    const start = (page - 1) * Number(pageSize);
    return sortedData.slice(start, start + Number(pageSize));
  }, [sortedData, page, pageSize]);

  // Handle page out of bounds when filtering or resizing page
  if (page > totalPages && totalPages > 0) {
    setPage(totalPages);
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="overflow-x-auto bg-[#1E1E1E] rounded-xl shadow-sm border border-[#333]">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-[#242424] border-b border-[#333]">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className={cn(
                    "px-6 py-4 font-medium whitespace-nowrap",
                    col.align === 'right' && "text-right",
                    col.align === 'center' && "text-center",
                    col.sticky && "sticky left-0 z-20 bg-[#242424]",
                    col.sortable !== false && "cursor-pointer hover:text-white transition-colors"
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className={cn(
                    "flex items-center gap-1",
                    col.align === 'right' && "justify-end",
                    col.align === 'center' && "justify-center"
                  )}>
                    {col.header}
                    {col.sortable !== false && (
                      <span className="text-gray-500">
                        {sortKey === col.key ? (
                          sortDesc ? <ChevronDown size={14} className="text-blue-500" /> : <ChevronUp size={14} className="text-blue-500" />
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  Nenhum dado encontrado.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={i} className="group border-b border-[#333] hover:bg-[#2a2a2a] transition-colors last:border-0">
                  {columns.map(col => {
                    const rawVal = col.accessor(row);
                    return (
                      <td 
                        key={col.key} 
                        className={cn(
                          "px-6 py-4",
                          col.align === 'right' && "text-right",
                          col.align === 'center' && "text-center",
                          // A celula presa precisa de fundo proprio, senao o
                          // resto da tabela passa por baixo dela; o hover vem
                          // do group para a linha continuar acendendo inteira.
                          col.sticky && "sticky left-0 z-10 bg-[#1E1E1E] transition-colors group-hover:bg-[#2a2a2a]"
                        )}
                      >
                        {col.render ? col.render(rawVal, row) : rawVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <div className="w-20">
            <Select 
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPage(1); }}
              options={[
                { label: '10', value: '10' },
                { label: '20', value: '20' },
                { label: '50', value: '50' },
                { label: '100', value: '100' },
              ]}
            />
          </div>
          <span>por página</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>
            Página {totalPages > 0 ? page : 0} de {totalPages} ({data.length} registros)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || totalPages === 0}
              className="p-1 rounded bg-[#242424] border border-[#333] disabled:opacity-50 hover:bg-[#333] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1 rounded bg-[#242424] border border-[#333] disabled:opacity-50 hover:bg-[#333] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
