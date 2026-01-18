import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@remixicon/react"
import type { ParcelaResultado } from "@/types/parcela"
import { cn } from "@/lib/utils"

interface TabelaResultadosProps {
  parcelas: ParcelaResultado[]
}

function formatarData(dataISO: string): string {
  const dataLimpa = dataISO.split("T")[0]
  const [ano, mes, dia] = dataLimpa.split("-")
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor)
}

const colunas: ColumnDef<ParcelaResultado>[] = [
  {
    accessorKey: "tipo",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Tipo
        {column.getIsSorted() === "asc" ? (
          <RiArrowUpLine className="ml-1" />
        ) : column.getIsSorted() === "desc" ? (
          <RiArrowDownLine className="ml-1" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => {
      const tipo = row.getValue("tipo") as number
      return (
        <Badge variant={tipo === 0 ? "default" : "secondary"}>
          {tipo === 0 ? "Principal" : "Juros"}
        </Badge>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === "todos") return true
      return String(row.getValue(columnId)) === filterValue
    },
  },
  {
    accessorKey: "liquidada",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Liquidada
        {column.getIsSorted() === "asc" ? (
          <RiArrowUpLine className="ml-1" />
        ) : column.getIsSorted() === "desc" ? (
          <RiArrowDownLine className="ml-1" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => {
      const liquidada = row.original.liquidada
      return (
        <Badge variant={liquidada ? "default" : "secondary"}>
          {liquidada ? "Sim" : "Não"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "vencimento",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Vencimento
        {column.getIsSorted() === "asc" ? (
          <RiArrowUpLine className="ml-1" />
        ) : column.getIsSorted() === "desc" ? (
          <RiArrowDownLine className="ml-1" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => formatarData(row.getValue("vencimento")),
  },
  {
    accessorKey: "valorPrincipal",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Valor Principal
        {column.getIsSorted() === "asc" ? (
          <RiArrowUpLine className="ml-1" />
        ) : column.getIsSorted() === "desc" ? (
          <RiArrowDownLine className="ml-1" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => {
      if (row.original.tipo === 1) {
        return <span className="text-muted-foreground">-</span>
      }
      return formatarMoeda(row.getValue("valorPrincipal"))
    },
  },
  {
    accessorKey: "valorJuros",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Valor Juros
        {column.getIsSorted() === "asc" ? (
          <RiArrowUpLine className="ml-1" />
        ) : column.getIsSorted() === "desc" ? (
          <RiArrowDownLine className="ml-1" />
        ) : null}
      </Button>
    ),
    cell: ({ row }) => {
      if (row.original.tipo === 0) {
        return <span className="text-muted-foreground">-</span>
      }
      return formatarMoeda(row.getValue("valorJuros"))
    },
  },
]

export function TabelaResultados({ parcelas }: TabelaResultadosProps) {
  const [ordenacao, setOrdenacao] = useState<SortingState>([])
  const [filtros, setFiltros] = useState<ColumnFiltersState>([])

  const tabela = useReactTable({
    data: parcelas,
    columns: colunas,
    state: {
      sorting: ordenacao,
      columnFilters: filtros,
    },
    onSortingChange: setOrdenacao,
    onColumnFiltersChange: setFiltros,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const filtroTipo =
    (tabela.getColumn("tipo")?.getFilterValue() as string) ?? "todos"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
          <Select
            value={filtroTipo}
            onValueChange={(valor) =>
              tabela.getColumn("tipo")?.setFilterValue(valor)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="0">Principal</SelectItem>
              <SelectItem value="1">Juros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupoHeader) => (
              <TableRow key={grupoHeader.id}>
                {grupoHeader.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tabela.getRowModel().rows?.length ? (
              tabela.getRowModel().rows.map((linha) => (
                <TableRow
                  key={linha.id}
                  className={cn(linha.original.tipo === 1 && "bg-muted/40")}
                >
                  {linha.getVisibleCells().map((celula) => (
                    <TableCell key={celula.id}>
                      {flexRender(
                        celula.column.columnDef.cell,
                        celula.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={colunas.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {tabela.getState().pagination.pageIndex + 1} de{" "}
          {tabela.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => tabela.previousPage()}
            disabled={!tabela.getCanPreviousPage()}
          >
            <RiArrowLeftSLine />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => tabela.nextPage()}
            disabled={!tabela.getCanNextPage()}
          >
            <RiArrowRightSLine />
          </Button>
        </div>
      </div>
    </div>
  )
}
