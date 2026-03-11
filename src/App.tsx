import { useEffect, useRef, useState } from 'react'
import type { Database } from 'sql.js'
import type { ColumnDef } from "@tanstack/react-table"
import { getSql, createDb } from './lib/db'
import { DataTable } from './components/data-table'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Database as DatabaseIcon,
  Loader2,
  AlertCircle,
  Table as TableIcon,
  Search,
  X,
  UploadCloud,
} from 'lucide-react'

interface TableMeta {
  name: string
  rowCount: number
  columnCount: number
}

interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  pk: boolean
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic text-xs">NULL</span>
  }
  if (value instanceof Uint8Array) {
    return <span className="text-muted-foreground italic text-xs">BLOB ({value.byteLength} bytes)</span>
  }
  const str = String(value)
  return <span title={str}>{str}</span>
}

function App() {
  const [db, setDb] = useState<Database | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [fileSize, setFileSize] = useState<number>(0)
  const [tables, setTables] = useState<TableMeta[]>([])
  const [activeTable, setActiveTable] = useState<string>("")
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<ColumnDef<Record<string, unknown>>[]>([])
  const [columnInfos, setColumnInfos] = useState<ColumnInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSqlLoading, setIsSqlLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSql()
      .then(() => setIsSqlLoading(false))
      .catch(() => {
        setError("Failed to initialize SQL engine. Please refresh.")
        setIsSqlLoading(false)
      })
  }, [])

  const loadDatabase = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setTables([])
    setActiveTable("")
    setData([])

    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      const newDb = createDb(uint8)

      const result = newDb.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )

      const tableNames: string[] = result.length > 0
        ? (result[0].values.flat() as string[])
        : []

      const tableMetas: TableMeta[] = tableNames.map((name) => {
        const countResult = newDb.exec(`SELECT COUNT(*) FROM "${name}"`)
        const rowCount = countResult.length > 0 ? Number(countResult[0].values[0][0]) : 0

        const colResult = newDb.exec(`PRAGMA table_info("${name}")`)
        const columnCount = colResult.length > 0 ? colResult[0].values.length : 0

        return { name, rowCount, columnCount }
      })

      setDb(newDb)
      setFileName(file.name)
      setFileSize(file.size)
      setTables(tableMetas)
      if (tableNames.length > 0) setActiveTable(tableNames[0])
    } catch {
      setError("Invalid or corrupt SQLite file.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadDatabase(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadDatabase(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClose = () => {
    db?.close()
    setDb(null)
    setFileName("")
    setFileSize(0)
    setTables([])
    setActiveTable("")
    setData([])
    setColumns([])
    setColumnInfos([])
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  useEffect(() => {
    if (!db || !activeTable) return

    try {
      // Get column metadata
      const colResult = db.exec(`PRAGMA table_info("${activeTable}")`)
      const infos: ColumnInfo[] = colResult.length > 0
        ? colResult[0].values.map((row) => ({
            name: row[1] as string,
            type: (row[2] as string) || "TEXT",
            notNull: Boolean(row[3]),
            pk: Boolean(row[5]),
          }))
        : []
      setColumnInfos(infos)

      const result = db.exec(`SELECT * FROM "${activeTable}"`)

      if (result.length > 0) {
        const { columns: dbColumns, values } = result[0]

        const tableColumns: ColumnDef<Record<string, unknown>>[] = dbColumns.map((col) => ({
          accessorKey: col,
          header: col,
          cell: (info) => <CellValue value={info.getValue()} />,
          enableSorting: true,
        }))
        setColumns(tableColumns)

        const tableData = values.map((row) => {
          const obj: Record<string, unknown> = {}
          dbColumns.forEach((col, i) => { obj[col] = row[i] })
          return obj
        })
        setData(tableData)
      } else {
        if (infos.length > 0) {
          const tableColumns: ColumnDef<Record<string, unknown>>[] = infos.map(({ name }) => ({
            accessorKey: name,
            header: name,
            enableSorting: true,
          }))
          setColumns(tableColumns)
        }
        setData([])
      }
    } catch {
      setError(`Failed to query table "${activeTable}".`)
    }
  }, [db, activeTable])

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  )

  const activeTableMeta = tables.find((t) => t.name === activeTable)

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isSqlLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Initializing SQL engine…</span>
      </div>
    )
  }

  // Upload / landing screen
  if (!db) {
    return (
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <header className="flex items-center gap-2.5 border-b px-6 py-3 shrink-0">
          <DatabaseIcon className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">SQLite Viewer</span>
        </header>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Open a database</h1>
              <p className="text-sm text-muted-foreground">
                Supports <code className="text-xs bg-muted px-1 py-0.5 rounded">.sqlite</code>,{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">.db</code>,{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">.sqlite3</code> files
              </p>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <UploadCloud className={cn("h-8 w-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isLoading ? "Loading…" : isDragging ? "Drop to open" : "Drop file or click to browse"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sqlite,.db,.sqlite3"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main viewer
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top header */}
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <DatabaseIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">{fileName}</span>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {formatBytes(fileSize)}
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
          <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Close</span>
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex flex-col w-52 border-r shrink-0 bg-sidebar overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filter tables…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-6 h-7 text-xs"
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            {filteredTables.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                {tableSearch ? "No tables match" : "No tables found"}
              </p>
            ) : (
              filteredTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => setActiveTable(table.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group",
                    activeTable === table.name
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <TableIcon className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    activeTable === table.name ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="truncate text-xs font-medium flex-1">{table.name}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                    {table.rowCount.toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {activeTable ? (
            <>
              {/* Table header bar */}
              <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h2 className="text-sm font-semibold truncate">{activeTable}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge label={`${(activeTableMeta?.rowCount ?? data.length).toLocaleString()} rows`} />
                    {columnInfos.length > 0 && (
                      <Badge label={`${columnInfos.length} cols`} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {columnInfos.filter(c => c.pk).map(c => (
                    <span key={c.name} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-mono">
                      PK: {c.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Column type hints */}
              {columnInfos.length > 0 && (
                <div className="flex gap-2 px-4 py-1.5 border-b bg-muted/30 overflow-x-auto shrink-0">
                  {columnInfos.map((col) => (
                    <span
                      key={col.name}
                      className="inline-flex items-center gap-1 text-[10px] whitespace-nowrap text-muted-foreground"
                      title={`${col.name}: ${col.type}${col.notNull ? " NOT NULL" : ""}${col.pk ? " PRIMARY KEY" : ""}`}
                    >
                      <span className="font-mono font-medium text-foreground/70">{col.name}</span>
                      <span className="bg-muted border rounded px-1 font-mono">{col.type || "TEXT"}</span>
                      {col.pk && <span className="text-amber-600">PK</span>}
                      {col.notNull && !col.pk && <span className="text-rose-500">NN</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* DataTable */}
              <div className="flex-1 min-h-0 overflow-hidden p-4">
                <DataTable columns={columns} data={data} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a table from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
      {label}
    </span>
  )
}

export default App
