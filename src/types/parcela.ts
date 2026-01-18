export type TipoParcela = 0 | 1 // 0 = Principal, 1 = Juros

export interface Parcela {
  tipo: TipoParcela
  valorPrincipal: number
  vencimento: string
  liquidada: boolean
}

export interface ParcelaFormulario {
  tipo: TipoParcela
  valorPrincipal: string
  vencimento: string
  liquidada: boolean
}

export interface ParcelaResultado {
  tipo: TipoParcela
  valorPrincipal: number
  valorJuros: number
  vencimento: string
  liquidada: boolean
}

export interface CalculoRequest {
  percentualCdi: number
  spreadAnual: number
  dataInicial: string
  dataReferencia: string
  parcelas: Parcela[]
}

export interface CalculoResponse {
  parcelas: ParcelaResultado[]
}
