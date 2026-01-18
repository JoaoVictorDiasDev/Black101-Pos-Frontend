import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormularioParcelas } from "@/components/FormularioParcelas"
import { TabelaResultados } from "@/components/TabelaResultados"
import type { ParcelaResultado } from "@/types/parcela"

export function App() {
  const [resultados, setResultados] = useState<ParcelaResultado[]>([])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cálculo de Juros Pós-Fixados</CardTitle>
            <CardDescription>
              Configure as parcelas e calcule os juros com base no CDI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormularioParcelas onResultados={setResultados} />

            {resultados.length > 0 && (
              <TabelaResultados parcelas={resultados} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
