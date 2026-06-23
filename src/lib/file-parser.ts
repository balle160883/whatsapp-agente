import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

/**
 * Parses file buffer based on the file type (extension or MIME) and returns extracted text.
 */
export async function parseFile(buffer: Buffer, fileType: string): Promise<string> {
  const mime = fileType.toLowerCase()

  // 1. PDF
  if (mime === 'pdf' || mime === 'application/pdf') {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const textResult = await parser.getText()
      await parser.destroy()
      return textResult.text || ''
    } catch (e: unknown) {
      console.error('Error parsing PDF:', e)
      const errMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Error al analizar el archivo PDF: ${errMessage}`)
    }
  }

  // 2. Word (DOCX / DOC)
  if (
    mime === 'docx' ||
    mime === 'doc' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    } catch (e: unknown) {
      console.error('Error parsing Word document:', e)
      const errMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Error al analizar el archivo de Word: ${errMessage}`)
    }
  }

  // 3. Excel (XLSX / XLS)
  if (
    mime === 'xlsx' ||
    mime === 'xls' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        if (csv.trim()) {
          text += `Hoja: ${sheetName}\n${csv}\n\n`
        }
      }
      return text
    } catch (e: unknown) {
      console.error('Error parsing Excel document:', e)
      const errMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Error al analizar el archivo de Excel: ${errMessage}`)
    }
  }

  throw new Error(`Tipo de archivo no soportado: ${fileType}`)
}
