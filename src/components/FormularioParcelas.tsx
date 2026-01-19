import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiAddLine, RiDeleteBinLine, RiSettings3Line } from "@remixicon/react"
import type {
  ParcelaFormulario,
  ParcelaResultado,
  TipoParcela,
} from "@/types/parcela"
import { calcularParcelas } from "@/services/api"
import { cn } from "@/lib/utils"

interface FormularioParcelasProps {
  onResultados: (resultados: ParcelaResultado[]) => void
}

function criarParcelaVazia(): ParcelaFormulario {
  return {
    tipo: 0,
    valorPrincipal: "",
    vencimento: "",
    liquidada: false,
  }
}

function formatarMoeda(valor: string | number): string {
  if (valor === "" || valor === null || valor === undefined) return ""
  const numero = typeof valor === "string" ? parseFloat(valor) : valor
  if (isNaN(numero)) return ""
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero)
}

function parsearMoedaDigitada(valorDigitado: string): string {
  const digitos = valorDigitado.replace(/\D/g, "")
  if (!digitos) return ""
  const centavos = parseInt(digitos, 10)
  return (centavos / 100).toFixed(2)
}

function formatarPercentual(valor: number): string {
  return (valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 4,
  })
}

function parsearPercentual(valorDigitado: string): number {
  const limpo = valorDigitado.replace(/[^\d,.-]/g, "").replace(",", ".")
  const numero = parseFloat(limpo)
  if (isNaN(numero)) return 0
  return numero / 100
}

function normalizarDataDigitada(valorDigitado: string): string {
  const digitos = valorDigitado.replace(/\D/g, "").slice(0, 8)
  const dia = digitos.slice(0, 2)
  const mes = digitos.slice(2, 4)
  const ano = digitos.slice(4, 8)

  if (digitos.length <= 2) return dia
  if (digitos.length <= 4) return `${dia}/${mes}`
  return `${dia}/${mes}/${ano}`
}

function parsearDataBR(valor: string): { iso: string; display: string } | null {
  const match = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const dia = parseInt(match[1], 10)
  const mes = parseInt(match[2], 10)
  const ano = parseInt(match[3], 10)

  if (mes < 1 || mes > 12) return null
  const maxDia = new Date(ano, mes, 0).getDate()
  if (dia < 1 || dia > maxDia) return null

  const diaStr = String(dia).padStart(2, "0")
  const mesStr = String(mes).padStart(2, "0")
  return {
    iso: `${ano}-${mesStr}-${diaStr}`,
    display: `${diaStr}/${mesStr}/${ano}`,
  }
}

function criarDataLocal(valorISO: string): Date {
  const [ano, mes, dia] = valorISO.split("-").map((parte) => parseInt(parte, 10))
  return new Date(ano, mes - 1, dia)
}

function adicionarMeses(dataBase: Date, meses: number): Date {
  const anoBase = dataBase.getFullYear()
  const mesBase = dataBase.getMonth()
  const diaBase = dataBase.getDate()
  const mesAlvo = mesBase + meses
  const anoAlvo = anoBase + Math.floor(mesAlvo / 12)
  const mesNormalizado = ((mesAlvo % 12) + 12) % 12
  const ultimoDia = new Date(anoAlvo, mesNormalizado + 1, 0).getDate()
  const diaAlvo = Math.min(diaBase, ultimoDia)
  return new Date(anoAlvo, mesNormalizado, diaAlvo)
}

function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0")
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

export function FormularioParcelas({ onResultados }: FormularioParcelasProps) {
  const [aberto, setAberto] = useState(false)
  const [parcelas, setParcelas] = useState<ParcelaFormulario[]>([
    criarParcelaVazia(),
  ])
  const [percentualCdi, setPercentualCdi] = useState(0.149)
  const [percentualCdiDisplay, setPercentualCdiDisplay] = useState("14,9")
  const [spreadAnual, setSpreadAnual] = useState(0.0)
  const [spreadAnualDisplay, setSpreadAnualDisplay] = useState("0")
  const [dataInicial, setDataInicial] = useState("01/01/2026")
  const [dataReferencia, setDataReferencia] = useState("15/04/2026")
  const [totalParcelas, setTotalParcelas] = useState(12)
  const [intervaloJuros, setIntervaloJuros] = useState(1)
  const [intervaloPrincipal, setIntervaloPrincipal] = useState(6)
  const [carenciaJuros, setCarenciaJuros] = useState(0)
  const [carenciaPrincipal, setCarenciaPrincipal] = useState(0)
  const [valorPrincipalGerado, setValorPrincipalGerado] = useState("")
  const [primeiroVencimento, setPrimeiroVencimento] = useState("01/01/2026")
  const [carregando, setCarregando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  function adicionarParcela() {
    setParcelas([...parcelas, criarParcelaVazia()])
  }

  function removerParcela(indice: number) {
    if (parcelas.length > 1) {
      setParcelas(parcelas.filter((_, i) => i !== indice))
    }
  }

  function atualizarParcela(
    indice: number,
    campo: keyof ParcelaFormulario,
    valor: string | number | boolean
  ) {
    setParcelas(
      parcelas.map((parcela, i) =>
        i === indice ? { ...parcela, [campo]: valor } : parcela
      )
    )
  }

  function gerarParcelas() {
    const novosErros: Record<string, string> = {}
    const total = Math.floor(totalParcelas)
    const intervaloJurosNormalizado = Math.floor(intervaloJuros)
    const intervaloPrincipalNormalizado = Math.floor(intervaloPrincipal)
    const carenciaJurosNormalizada = Math.floor(carenciaJuros)
    const carenciaPrincipalNormalizada = Math.floor(carenciaPrincipal)
    const valorPrincipalNumero = parseFloat(valorPrincipalGerado)

    if (!Number.isFinite(total) || total < 1) {
      novosErros.gerador_total = "Quantidade total deve ser um número >= 1"
    }
    if (
      !Number.isFinite(intervaloJurosNormalizado) ||
      intervaloJurosNormalizado < 1
    ) {
      novosErros.gerador_intervalo_juros =
        "Intervalo de juros deve ser um número >= 1"
    }
    if (
      !Number.isFinite(intervaloPrincipalNormalizado) ||
      intervaloPrincipalNormalizado < 1
    ) {
      novosErros.gerador_intervalo_principal =
        "Intervalo de principal deve ser um número >= 1"
    }
    if (
      !Number.isFinite(carenciaJurosNormalizada) ||
      carenciaJurosNormalizada < 0
    ) {
      novosErros.gerador_carencia_juros =
        "Carência de juros deve ser um número >= 0"
    }
    if (
      !Number.isFinite(carenciaPrincipalNormalizada) ||
      carenciaPrincipalNormalizada < 0
    ) {
      novosErros.gerador_carencia_principal =
        "Carência de principal deve ser um número >= 0"
    }
    if (
      valorPrincipalGerado &&
      (isNaN(valorPrincipalNumero) || valorPrincipalNumero < 0)
    ) {
      novosErros.gerador_valor_principal =
        "Valor principal deve ser um número >= 0"
    }

    const dataBase = parsearDataBR(primeiroVencimento)
    if (!dataBase) {
      novosErros.gerador_data_base =
        "Primeiro vencimento deve estar em dd/mm/aaaa"
    }

    if (Object.keys(novosErros).length > 0) {
      setErros((prev) => ({ ...prev, ...novosErros }))
      return
    }

    const baseDate = criarDataLocal(dataBase!.iso)
    const valorPrincipalBase = valorPrincipalGerado ? valorPrincipalGerado : "0"
    const parcelasGeradas: ParcelaFormulario[] = []
    let mesIndex = 0

    while (parcelasGeradas.length < total) {
      const vencimento = formatarDataBR(adicionarMeses(baseDate, mesIndex))

      if (
        mesIndex >= carenciaPrincipalNormalizada &&
        (mesIndex - carenciaPrincipalNormalizada) %
          intervaloPrincipalNormalizado ===
          0
      ) {
        parcelasGeradas.push({
          tipo: 0,
          valorPrincipal: valorPrincipalBase,
          vencimento,
          liquidada: false,
        })
      }

      if (
        parcelasGeradas.length < total &&
        mesIndex >= carenciaJurosNormalizada &&
        (mesIndex - carenciaJurosNormalizada) % intervaloJurosNormalizado === 0
      ) {
        parcelasGeradas.push({
          tipo: 1,
          valorPrincipal: "0",
          vencimento,
          liquidada: false,
        })
      }

      mesIndex += 1
    }

    setParcelas(parcelasGeradas)
    setErros((prev) => {
      const {
        gerador_total,
        gerador_intervalo_juros,
        gerador_intervalo_principal,
        gerador_carencia_juros,
        gerador_carencia_principal,
        gerador_valor_principal,
        gerador_data_base,
        ...rest
      } = prev
      return rest
    })
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {}

    if (isNaN(percentualCdi) || percentualCdi < 0) {
      novosErros.percentualCdi = "Percentual CDI deve ser um número >= 0"
    }

    if (isNaN(spreadAnual) || spreadAnual < 0) {
      novosErros.spreadAnual = "Spread anual deve ser um número >= 0"
    }

    if (!dataInicial) {
      novosErros.dataInicial = "Data inicial é obrigatória"
    } else if (!parsearDataBR(dataInicial)) {
      novosErros.dataInicial = "Data inicial deve estar em dd/mm/aaaa"
    }

    if (!dataReferencia) {
      novosErros.dataReferencia = "Data de referência é obrigatória"
    } else if (!parsearDataBR(dataReferencia)) {
      novosErros.dataReferencia = "Data de referência deve estar em dd/mm/aaaa"
    }

    if (parcelas.length === 0) {
      novosErros.parcelas = "Adicione pelo menos uma parcela"
    }

    parcelas.forEach((parcela, indice) => {
      if (!parcela.vencimento) {
        novosErros[`parcela_${indice}_vencimento`] = "Vencimento é obrigatório"
      } else if (!parsearDataBR(parcela.vencimento)) {
        novosErros[`parcela_${indice}_vencimento`] =
          "Vencimento deve estar em dd/mm/aaaa"
      }
      const valorNumero = parseFloat(parcela.valorPrincipal)
      if (isNaN(valorNumero) || valorNumero < 0) {
        novosErros[`parcela_${indice}_valor`] =
          "Valor deve ser um número >= 0"
      }
    })

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function enviar() {
    if (!validar()) return

    setCarregando(true)
    try {
      const dataInicialISO = parsearDataBR(dataInicial)?.iso ?? dataInicial
      const dataReferenciaISO = parsearDataBR(dataReferencia)?.iso ?? dataReferencia

      const resposta = await calcularParcelas({
        percentualCdi,
        spreadAnual,
        dataInicial: dataInicialISO,
        dataReferencia: dataReferenciaISO,
        parcelas: parcelas.map((p) => ({
          tipo: p.tipo,
          valorPrincipal: parseFloat(p.valorPrincipal),
          vencimento: parsearDataBR(p.vencimento)?.iso ?? p.vencimento,
          liquidada: p.liquidada,
        })),
      })
      onResultados(resposta.parcelas)
      setAberto(false)
    } catch (erro) {
      setErros({ geral: "Erro ao calcular parcelas. Verifique a conexão." })
      console.error("Erro ao calcular parcelas:", erro)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <RiSettings3Line data-icon="inline-start" />
          Configurar Parcelas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Parcelas</DialogTitle>
          <DialogDescription>
            Configure os parâmetros e adicione as parcelas para cálculo de juros
            pós-fixados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {erros.geral && (
            <p className="text-sm text-destructive">{erros.geral}</p>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="percentualCdi">Percentual CDI</Label>
              <div className="relative">
                <Input
                  id="percentualCdi"
                  type="text"
                  inputMode="decimal"
                  value={percentualCdiDisplay}
                  onChange={(e) => setPercentualCdiDisplay(e.target.value)}
                  onBlur={(e) => {
                    const valor = parsearPercentual(e.target.value)
                    setPercentualCdi(valor)
                    setPercentualCdiDisplay(formatarPercentual(valor))
                  }}
                  aria-invalid={!!erros.percentualCdi}
                  className="pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">%</span>
              </div>
              {erros.percentualCdi && (
                <p className="text-xs text-destructive">{erros.percentualCdi}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="spreadAnual">Spread Anual</Label>
              <div className="relative">
                <Input
                  id="spreadAnual"
                  type="text"
                  inputMode="decimal"
                  value={spreadAnualDisplay}
                  onChange={(e) => setSpreadAnualDisplay(e.target.value)}
                  onBlur={(e) => {
                    const valor = parsearPercentual(e.target.value)
                    setSpreadAnual(valor)
                    setSpreadAnualDisplay(formatarPercentual(valor))
                  }}
                  aria-invalid={!!erros.spreadAnual}
                  className="pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">%</span>
              </div>
              {erros.spreadAnual && (
                <p className="text-xs text-destructive">{erros.spreadAnual}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dataInicial">Data Inicial</Label>
              <Input
                id="dataInicial"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={dataInicial}
                onChange={(e) =>
                  setDataInicial(normalizarDataDigitada(e.target.value))
                }
                onBlur={(e) => {
                  const data = parsearDataBR(e.target.value)
                  if (data) setDataInicial(data.display)
                }}
                aria-invalid={!!erros.dataInicial}
              />
              {erros.dataInicial && (
                <p className="text-xs text-destructive">{erros.dataInicial}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataReferencia">Data de Referência</Label>
              <Input
                id="dataReferencia"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={dataReferencia}
                onChange={(e) =>
                  setDataReferencia(normalizarDataDigitada(e.target.value))
                }
                onBlur={(e) => {
                  const data = parsearDataBR(e.target.value)
                  if (data) setDataReferencia(data.display)
                }}
                aria-invalid={!!erros.dataReferencia}
              />
              {erros.dataReferencia && (
                <p className="text-xs text-destructive">
                  {erros.dataReferencia}
                </p>
              )}
            </div>
          </div>

          <details className="rounded-lg border bg-muted/30 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
              <span>Gerador automático</span>
              <span className="text-xs text-muted-foreground">
                Clique para expandir
              </span>
            </summary>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Gera parcelas a partir do primeiro vencimento.
              </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="totalParcelas">Total de parcelas</Label>
                <Input
                  id="totalParcelas"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={totalParcelas}
                  onChange={(e) => setTotalParcelas(Number(e.target.value))}
                  aria-invalid={!!erros.gerador_total}
                />
                {erros.gerador_total && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_total}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="intervaloJuros">Juros a cada (meses)</Label>
                <Input
                  id="intervaloJuros"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={intervaloJuros}
                  onChange={(e) => setIntervaloJuros(Number(e.target.value))}
                  aria-invalid={!!erros.gerador_intervalo_juros}
                />
                {erros.gerador_intervalo_juros && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_intervalo_juros}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="intervaloPrincipal">
                  Principal a cada (meses)
                </Label>
                <Input
                  id="intervaloPrincipal"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={intervaloPrincipal}
                  onChange={(e) => setIntervaloPrincipal(Number(e.target.value))}
                  aria-invalid={!!erros.gerador_intervalo_principal}
                />
                {erros.gerador_intervalo_principal && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_intervalo_principal}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="carenciaJuros">Carência juros (meses)</Label>
                <Input
                  id="carenciaJuros"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={carenciaJuros}
                  onChange={(e) => setCarenciaJuros(Number(e.target.value))}
                  aria-invalid={!!erros.gerador_carencia_juros}
                />
                {erros.gerador_carencia_juros && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_carencia_juros}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="carenciaPrincipal">
                  Carência principal (meses)
                </Label>
                <Input
                  id="carenciaPrincipal"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={carenciaPrincipal}
                  onChange={(e) => setCarenciaPrincipal(Number(e.target.value))}
                  aria-invalid={!!erros.gerador_carencia_principal}
                />
                {erros.gerador_carencia_principal && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_carencia_principal}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="primeiroVencimento">
                  Primeiro vencimento
                </Label>
                <Input
                  id="primeiroVencimento"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={primeiroVencimento}
                  onChange={(e) =>
                    setPrimeiroVencimento(
                      normalizarDataDigitada(e.target.value)
                    )
                  }
                  onBlur={(e) => {
                    const data = parsearDataBR(e.target.value)
                    if (data) setPrimeiroVencimento(data.display)
                  }}
                  aria-invalid={!!erros.gerador_data_base}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorPrincipalGerado">
                  Valor do principal
                </Label>
                <Input
                  id="valorPrincipalGerado"
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={
                    valorPrincipalGerado
                      ? formatarMoeda(valorPrincipalGerado)
                      : ""
                  }
                  onChange={(e) =>
                    setValorPrincipalGerado(parsearMoedaDigitada(e.target.value))
                  }
                  aria-invalid={!!erros.gerador_valor_principal}
                />
                {erros.gerador_valor_principal && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_valor_principal}
                  </p>
                )}
              </div>
            </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={gerarParcelas}
                >
                  Gerar parcelas
                </Button>
                {erros.gerador_data_base && (
                  <p className="text-xs text-destructive">
                    {erros.gerador_data_base}
                  </p>
                )}
              </div>
            </div>
          </details>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Parcelas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarParcela}
              >
                <RiAddLine data-icon="inline-start" />
                Adicionar Parcela
              </Button>
            </div>

            {erros.parcelas && (
              <p className="text-xs text-destructive">{erros.parcelas}</p>
            )}

            <div className="space-y-4">
              {parcelas.map((parcela, indice) => (
                <div
                  key={indice}
                  className={cn(
                    "grid grid-cols-1 gap-3 items-end rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto_auto_auto]",
                    parcela.tipo === 1 &&
                      "bg-muted/40 border-l-4 border-l-muted-foreground/40"
                  )}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vencimento</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={parcela.vencimento}
                      onChange={(e) =>
                        atualizarParcela(
                          indice,
                          "vencimento",
                          normalizarDataDigitada(e.target.value)
                        )
                      }
                      onBlur={(e) => {
                        const data = parsearDataBR(e.target.value)
                        if (data) {
                          atualizarParcela(indice, "vencimento", data.display)
                        }
                      }}
                      aria-invalid={!!erros[`parcela_${indice}_vencimento`]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Principal</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={
                        parcela.tipo === 1
                          ? "-"
                          : parcela.valorPrincipal
                            ? formatarMoeda(parcela.valorPrincipal)
                            : ""
                      }
                      onChange={(e) => {
                        if (parcela.tipo !== 1) {
                          const valorParseado = parsearMoedaDigitada(
                            e.target.value
                          )
                          atualizarParcela(
                            indice,
                            "valorPrincipal",
                            valorParseado
                          )
                        }
                      }}
                      readOnly={parcela.tipo === 1}
                      aria-invalid={!!erros[`parcela_${indice}_valor`]}
                      className={parcela.tipo === 1 ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={String(parcela.tipo)}
                      onValueChange={(valor) => {
                        const novoTipo = parseInt(valor, 10) as TipoParcela
                        setParcelas((prev) =>
                          prev.map((item, i) =>
                            i === indice
                              ? {
                                  ...item,
                                  tipo: novoTipo,
                                  valorPrincipal:
                                    novoTipo === 1 ? "0" : item.valorPrincipal,
                                }
                              : item
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Principal</SelectItem>
                        <SelectItem value="1">Juros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Liquidada</Label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={parcela.liquidada}
                      onClick={() =>
                        atualizarParcela(indice, "liquidada", !parcela.liquidada)
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                        parcela.liquidada
                          ? "border-emerald-600 bg-emerald-600/80"
                          : "border-border bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                          parcela.liquidada ? "translate-x-5" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removerParcela(indice)}
                    disabled={parcelas.length === 1}
                  >
                    <RiDeleteBinLine />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={enviar} disabled={carregando}>
            {carregando ? "Calculando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
