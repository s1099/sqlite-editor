import * as React from "react"
import { createPortal } from "react-dom"
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onCellUpdate?: (rowData: Record<string, unknown>, columnKey: string, newValue: string | null) => void
}

interface EditingCell {
  rowId: string
  colKey: string
  rowData: Record<string, unknown>
}

function FloatingCellEditor({
  anchorRect,
  value,
  onChange,
  onSave,
  onCancel,
  onSetNull,
}: {
  anchorRect: DOMRect
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  onSetNull: () => void
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }, [])

  // Auto-grow textarea height to fit content
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
  }, [value])

  React.useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onSave()
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [onSave])

  const minWidth = 280
  const panelWidth = Math.max(anchorRect.width, minWidth)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const estimatedHeight = 148

  let left = anchorRect.left
  if (left + panelWidth > viewportWidth - 8) {
    left = Math.max(8, viewportWidth - panelWidth - 8)
  }

  let top = anchorRect.bottom + 2
  if (top + estimatedHeight > viewportHeight - 8) {
    top = Math.max(8, anchorRect.top - estimatedHeight - 2)
  }

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top, left, width: panelWidth, zIndex: 9999 }}
      className="bg-popover border rounded-lg shadow-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onSave()
          }
          if (e.key === "Escape") {
            e.preventDefault()
            onCancel()
          }
        }}
        rows={1}
        className="w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm font-mono outline-none min-h-[38px] max-h-[240px] overflow-y-auto"
      />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t bg-muted/40">
        <button
          onClick={onSetNull}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
        >
          Set NULL
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            Cancel
            <kbd className="text-[10px] bg-muted border rounded px-1 font-sans leading-tight">Esc</kbd>
          </button>
          <button
            onClick={onSave}
            className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            Save
            <kbd className="text-[10px] bg-primary-foreground/20 border border-primary-foreground/30 rounded px-1 font-sans leading-tight">Ctrl+Enter</kbd>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onCellUpdate,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  })
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null)


  const commitEdit = React.useCallback(() => {
    if (!editingCell) return
    onCellUpdate?.(editingCell.rowData, editingCell.colKey, editValue === "" ? null : editValue)
    setEditingCell(null)
    setAnchorRect(null)
  }, [editingCell, editValue, onCellUpdate])

  const cancelEdit = () => {
    setEditingCell(null)
    setAnchorRect(null)
  }

  const setNullEdit = () => {
    if (!editingCell) return
    onCellUpdate?.(editingCell.rowData, editingCell.colKey, null)
    setEditingCell(null)
    setAnchorRect(null)
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  const isEditingAny = editingCell !== null

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search all columns…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Floating cell editor */}
      {isEditingAny && anchorRect && (
        <FloatingCellEditor
          anchorRect={anchorRect}
          value={editValue}
          onChange={setEditValue}
          onSave={commitEdit}
          onCancel={cancelEdit}
          onSetNull={setNullEdit}
        />
      )}

      {/* Table */}
      <div className="rounded-md border overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                {/* Row number header */}
                <TableHead className="w-12 text-center text-xs text-muted-foreground font-normal select-none border-r">
                  #
                </TableHead>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap select-none",
                        header.column.getCanSort() && "cursor-pointer"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-xs uppercase tracking-wide">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground">
                              {isSorted === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : isSorted === "desc" ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className="group"
                >
                  {/* Row number */}
                  <TableCell className="text-center text-xs text-muted-foreground font-mono border-r w-12 group-hover:bg-muted/30">
                    {pageIndex * pageSize + i + 1}
                  </TableCell>
                  {row.getVisibleCells().map((cell) => {
                    const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === cell.column.id
                    const rawValue = cell.getValue()
                    const isBlob = rawValue instanceof Uint8Array
                    const isEditable = onCellUpdate && !isBlob

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "font-mono text-sm max-w-xs",
                          isEditable && "cursor-text",
                          isEditing && "ring-1 ring-inset ring-primary bg-primary/5",
                        )}
                        onDoubleClick={(e) => {
                          if (!isEditable) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          setAnchorRect(rect)
                          setEditingCell({
                            rowId: row.id,
                            colKey: cell.column.id,
                            rowData: row.original as Record<string, unknown>,
                          })
                          setEditValue(rawValue === null || rawValue === undefined ? "" : String(rawValue))
                        }}
                      >
                        <span className={cn("block truncate", isEditable && "w-full")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                  {globalFilter ? `No results matching "${globalFilter}".` : "This table is empty."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>
            {totalRows === 0
              ? "No rows"
              : `${from}–${to} of ${totalRows.toLocaleString()} rows`}
          </span>
          {globalFilter && data.length !== totalRows && (
            <span className="text-xs text-primary">(filtered from {data.length.toLocaleString()})</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 200].map((size) => (
                  <SelectItem key={size} value={`${size}`} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 tabular-nums">
              {table.getPageCount() === 0 ? "—" : `${pageIndex + 1} / ${table.getPageCount()}`}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
