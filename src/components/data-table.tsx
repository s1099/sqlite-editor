import * as React from "react"
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
  const editInputRef = React.useRef<HTMLInputElement>(null)

  const commitEdit = (rowData: Record<string, unknown>, colKey: string) => {
    onCellUpdate?.(rowData, colKey, editValue === "" ? null : editValue)
    setEditingCell(null)
  }

  const cancelEdit = () => setEditingCell(null)

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
                          isEditable && "group/cell relative",
                        )}
                        onDoubleClick={() => {
                          if (!isEditable) return
                          setEditingCell({ rowId: row.id, colKey: cell.column.id })
                          setEditValue(rawValue === null || rawValue === undefined ? "" : String(rawValue))
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                commitEdit(row.original as Record<string, unknown>, cell.column.id)
                              }
                              if (e.key === "Escape") cancelEdit()
                            }}
                            onBlur={() => commitEdit(row.original as Record<string, unknown>, cell.column.id)}
                            className="w-full min-w-12 bg-transparent border-0 border-b-2 border-primary outline-none text-sm font-mono py-0 px-0"
                          />
                        ) : (
                          <span className={cn("block truncate", isEditable && "w-full")}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        )}
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
