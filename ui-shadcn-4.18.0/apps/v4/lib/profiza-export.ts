import type { Professional } from "./profiza-data"

export function exportProfessionalsCSV(professionals: Professional[]) {
  const BOM = "\uFEFF"
  const headers = ["Nome", "WhatsApp", "Email", "Categoria", "Bairros", "Status", "Leads", "Última Atividade"]
  
  const statusLabels: Record<string, string> = {
    ativo: "Ativo",
    teste_gratis: "Teste grátis",
    inativo: "Inativo",
  }

  const rows = professionals.map((p) => [
    p.nome,
    p.whatsapp,
    p.email || "",
    p.categoria,
    p.bairros.join("; "),
    statusLabels[p.status] || p.status,
    p.leadsSemana.toString(),
    new Date(p.ultimaAtividade).toLocaleDateString("pt-BR"),
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n")

  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `profissionais-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
