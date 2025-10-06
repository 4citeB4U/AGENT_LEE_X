/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: fileParser.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\utils\fileParser.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

declare const pdfjsLib: any;
declare const mammoth: any;
declare const XLSX: any;
declare const JSZip: any;

interface ParsedFile {
    content: string;
    base64?: string;
    mimeType?: string;
}

export const parseFile = (file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        const getBase64 = (): Promise<string> => {
             return new Promise((resolveBase64) => {
                const b64Reader = new FileReader();
                b64Reader.onloadend = () => {
                    const url = b64Reader.result as string;
                    const [, base64Data] = url.split(',');
                    resolveBase64(base64Data);
                };
                b64Reader.readAsDataURL(file);
             });
        }
        
        // Handle Images and Videos for Media Analyzer
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            getBase64().then(base64 => {
                 resolve({
                    content: `File: ${file.name}\nSize: ${file.size} bytes`,
                    base64: base64,
                    mimeType: file.type,
                });
            });
            return;
        }

        // Handle PDF
        if (file.type === 'application/pdf') {
            reader.onload = async (event) => {
                try {
                    const loadingTask = pdfjsLib.getDocument(new Uint8Array(event.target?.result as ArrayBuffer));
                    const pdf = await loadingTask.promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        text += textContent.items.map((item: any) => item.str).join(' ');
                    }
                    resolve({ content: text });
                } catch (err) {
                    reject(new Error('Failed to parse PDF file.'));
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        // Handle DOCX
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
             reader.onload = async (event) => {
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer: event.target?.result });
                    resolve({ content: result.value });
                } catch (err) {
                    reject(new Error('Failed to parse DOCX file.'));
                }
             };
             reader.readAsArrayBuffer(file);
             return;
        }

        // Handle XLSX
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
             reader.onload = async (event) => {
                try {
                    const workbook = XLSX.read(event.target?.result, { type: 'array' });
                    let text = '';
                    workbook.SheetNames.forEach((sheetName: string) => {
                        const worksheet = workbook.Sheets[sheetName];
                        text += XLSX.utils.sheet_to_csv(worksheet);
                    });
                    resolve({ content: text });
                } catch (err) {
                    reject(new Error('Failed to parse XLSX file.'));
                }
             };
             reader.readAsArrayBuffer(file);
             return;
        }
        
        // Handle ZIP
        if (file.type === 'application/zip') {
             reader.onload = async (event) => {
                try {
                    const zip = await JSZip.loadAsync(event.target?.result);
                    let content = `Archive contents of ${file.name}:\n\n`;
                    const fileList: string[] = [];
                    zip.forEach((relativePath) => {
                        fileList.push(`- ${relativePath}`);
                    });
                    content += fileList.join('\n');
                    resolve({ content });
                } catch (err) {
                     reject(new Error('Failed to read ZIP archive.'));
                }
             };
             reader.readAsArrayBuffer(file);
             return;
        }

        // Handle Text-based files
        if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.match(/\.(js|ts|py|java|c|cpp|php|css|scss|jsx|tsx|html|xml|md)$/)) {
            reader.onload = (event) => {
                resolve({ content: event.target?.result as string });
            };
            reader.readAsText(file);
            return;
        }

        // Fallback for binary/unsupported files
        resolve({
            content: `File Name: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes.\n\nThis file type cannot be read in the browser.`
        });
    });
};
