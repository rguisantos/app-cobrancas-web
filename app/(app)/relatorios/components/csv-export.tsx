export function exportarCSV(dados: any[], colunas: { key: string; label: string }[], nomeArquivo: string) {
  const header = colunas.map(c => c.label).join(',') + '\n'
  const rows = dados.map(row =>
    colunas.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return ''
      if (typeof val === 'number') return val.toFixed(2)
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  ).join('\n')

  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.csv`)
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportarXLSX(dados: any[], colunas: { key: string; label: string }[], nomeArquivo: string) {
  const { exportToXLSX } = await import('@/lib/export-utils')
  await exportToXLSX(dados, colunas, `${nomeArquivo}_${new Date().toISOString().split('T')[0]}`)
}
