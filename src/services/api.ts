import axios from "axios"
import type { CalculoRequest, CalculoResponse } from "@/types/parcela"

const api = axios.create({
  baseURL: "https://localhost:7018/api",
})

export async function calcularParcelas(
  request: CalculoRequest
): Promise<CalculoResponse> {
  const response = await api.post<CalculoResponse>(
    "/jurosPosFixados/calcular-parcelas",
    request
  )
  return response.data
}

export default api
