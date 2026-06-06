import path from 'path';
import zlib from 'zlib';
import pdfParse from 'pdf-parse';
import { ApiError } from '../middleware/errorHandler';

interface ResumeFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface ParsedResumeDocument {
  text: string;
  fileType: 'pdf' | 'docx';
  warnings: string[];
}

interface ZipEntry {
  name: string;
  method: number;
  data: Buffer;
}

class ResumeParserService {
  async parse(file: ResumeFileInput): Promise<ParsedResumeDocument> {
    const extension = path.extname(file.originalname).toLowerCase();

    if (file.mimetype === 'application/pdf' || extension === '.pdf') {
      return {
        text: await this.parsePdf(file.buffer),
        fileType: 'pdf',
        warnings: [],
      };
    }

    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.docx'
    ) {
      return this.parseDocx(file.buffer);
    }

    throw ApiError.badRequest('Unsupported resume format. Upload a PDF or DOCX file.');
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdfParse(buffer);
      return this.assertReadableText(pdfData.text, 'PDF');
    } catch (error) {
      throw ApiError.badRequest(
        error instanceof Error
          ? `Unable to read PDF resume: ${error.message}`
          : 'Unable to read PDF resume.'
      );
    }
  }

  private parseDocx(buffer: Buffer): ParsedResumeDocument {
    try {
      const entries = this.readZipEntries(buffer);
      const xmlNames = [
        'word/document.xml',
        ...entries
          .map((entry) => entry.name)
          .filter((name) => /^word\/(header|footer)\d+\.xml$/i.test(name)),
      ];

      const xmlText = xmlNames
        .map((name) => entries.find((entry) => entry.name === name))
        .filter((entry): entry is ZipEntry => Boolean(entry))
        .map((entry) => this.inflateZipEntry(entry).toString('utf8'))
        .map((xml) => this.docxXmlToText(xml))
        .join('\n');

      return {
        text: this.assertReadableText(xmlText, 'DOCX'),
        fileType: 'docx',
        warnings: [],
      };
    } catch (error) {
      throw ApiError.badRequest(
        error instanceof Error
          ? `Unable to read DOCX resume: ${error.message}`
          : 'Unable to read DOCX resume.'
      );
    }
  }

  private readZipEntries(buffer: Buffer): ZipEntry[] {
    const endOfCentralDirectory = this.findEndOfCentralDirectory(buffer);
    if (endOfCentralDirectory < 0) {
      throw new Error('Invalid DOCX archive.');
    }

    const totalEntries = buffer.readUInt16LE(endOfCentralDirectory + 10);
    const centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirectory + 16);
    const entries: ZipEntry[] = [];
    let offset = centralDirectoryOffset;

    for (let index = 0; index < totalEntries; index += 1) {
      this.ensureReadable(buffer, offset, 46);
      if (buffer.readUInt32LE(offset) !== 0x02014b50) {
        break;
      }

      const method = buffer.readUInt16LE(offset + 10);
      const compressedSize = buffer.readUInt32LE(offset + 20);
      const fileNameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const localHeaderOffset = buffer.readUInt32LE(offset + 42);
      const nameStart = offset + 46;
      const nameEnd = nameStart + fileNameLength;
      this.ensureReadable(buffer, nameStart, fileNameLength);

      const name = buffer.slice(nameStart, nameEnd).toString('utf8');
      const data = this.readLocalFileData(buffer, localHeaderOffset, compressedSize);

      entries.push({ name, method, data });
      offset = nameEnd + extraLength + commentLength;
    }

    return entries;
  }

  private readLocalFileData(buffer: Buffer, localHeaderOffset: number, compressedSize: number): Buffer {
    this.ensureReadable(buffer, localHeaderOffset, 30);
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error('Invalid DOCX local file header.');
    }

    const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength;
    this.ensureReadable(buffer, dataOffset, compressedSize);

    return buffer.slice(dataOffset, dataOffset + compressedSize);
  }

  private inflateZipEntry(entry: ZipEntry): Buffer {
    if (entry.method === 0) {
      return entry.data;
    }

    if (entry.method === 8) {
      return zlib.inflateRawSync(entry.data);
    }

    throw new Error(`Unsupported DOCX compression method ${entry.method}.`);
  }

  private findEndOfCentralDirectory(buffer: Buffer): number {
    const minOffset = Math.max(0, buffer.length - 65558);
    for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
      if (buffer.readUInt32LE(offset) === 0x06054b50) {
        return offset;
      }
    }
    return -1;
  }

  private docxXmlToText(xml: string): string {
    return this.normalizeText(
      xml
        .replace(/<w:tab\s*\/>/gi, ' ')
        .replace(/<w:br\s*\/>/gi, '\n')
        .replace(/<\/w:p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    );
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private assertReadableText(text: string, label: string): string {
    const normalized = this.normalizeText(text);
    if (normalized.replace(/\s/g, '').length < 40) {
      throw new Error(`${label} does not contain enough readable text to analyze.`);
    }
    return normalized;
  }

  private ensureReadable(buffer: Buffer, offset: number, length: number): void {
    if (offset < 0 || length < 0 || offset + length > buffer.length) {
      throw new Error('Malformed DOCX archive.');
    }
  }
}

export const resumeParserService = new ResumeParserService();
