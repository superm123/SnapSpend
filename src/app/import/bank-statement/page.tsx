'use client';

import React, { useState, useEffect } from 'react';
import {
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Paper,
    Box,
    Typography,
    Container,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';
import { db, ICategory, IPaymentMethod, IExpense } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '@/lib/store';
import { format, parse, isValid } from 'date-fns';
import { createWorker } from 'tesseract.js';



interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    categoryId?: number;
    paymentMethodId?: number;
}

const parseBankStatement = (text: string): Transaction[] => {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');
    let idCounter = 0;
    const currentYear = new Date().getFullYear();

    const parseAmount = (str: string) => {
        const cleaned = str.replace(/[R\s,]/g, '');
        return parseFloat(cleaned);
    };



    // Filter keywords that indicate non-transaction lines
    const excludePatterns = [
        /\b(salary|net\s+amount|gross\s+amount|tax\s+amount|vat|total|subtotal|balance\s+brought|balance\s+forward|opening\s+balance|closing\s+balance|previous\s+balance|current\s+balance|amount\s+due|payment\s+due|minimum\s+payment)\b/i,
        /^(total|subtotal|balance|summary|statement)/i,
    ];

    for (const line of lines) {
        if (!line.trim()) continue;

        const shouldExclude = excludePatterns.some(pattern => pattern.test(line));
        if (shouldExclude) continue;

        const amountRegex = /[-+]?\s*R?\s*\d{1,3}(?:[\s,]\d{3})*\.\d{2}/g;
        const amountMatches = [...line.matchAll(amountRegex)];

        if (amountMatches.length === 0) continue;

        const amountMatch = amountMatches[0];
        const amountStr = amountMatch[0];

        // Extended date regex to capture "10 01" style dates too
        const dateRegex = /(\d{1,2}[./\-\s]\d{1,2}[./\-\s]\d{2,4})|(\d{1,2}[./\-\s]\d{1,2})|(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s?\d{0,4})/i;
        const dateMatch = line.match(dateRegex);

        let dateStr = '';
        if (dateMatch) {
            dateStr = dateMatch[0];
        } else {
            // Fallback to today's date if valid amount found but no date
            dateStr = format(new Date(), 'dd/MM/yyyy');
        }

        const amount = parseAmount(amountStr);
        let residual = line.replace(amountStr, '');
        if (dateMatch) {
            residual = residual.replace(dateMatch[0], '');
        }

        let description = residual.replace(/[^\w\s\-\/]/g, '').replace(/\s+/g, ' ').trim();

        if (description.length < 2) {
            continue;
        }

        const type = amount < 0 ? 'debit' : 'credit';

        transactions.push({
            id: `temp-${idCounter++}`,
            date: dateStr, // Keep original extracted date string for smarter parsing later
            description: description,
            amount: Math.abs(amount),
            type: type,
        });
    }

    return transactions;
};

const BankStatementImportPage = () => {
    const { theme } = useTheme();
    const [pdfText, setPdfText] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
    const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    const categories = useLiveQuery(() => db.categories.toArray(), []) as ICategory[] | undefined;
    const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []) as IPaymentMethod[] | undefined;
    const { currentUser } = useStore();

    useEffect(() => {
        const initPdfJs = async () => {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
            } catch (error) {
                console.error('Failed to load PDF.js:', error);
            }
        };
        initPdfJs();
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            StatusBar.setStyle({ style: Style.Light });
        } else {
            StatusBar.setStyle({ style: Style.Dark });
        }
    }, [theme]);

    const performOcrOnPdf = async (pdfDocument: any): Promise<string> => {
        setLoadingMessage('Initializing OCR engine...');
        const worker = await createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    setOcrProgress(m.progress);
                }
            }
        });

        let fullOcrText = '';

        try {
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                setLoadingMessage(`Processing Page ${i} of ${pdfDocument.numPages} with OCR...`);
                setOcrProgress(0);

                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                    const { data: { text } } = await worker.recognize(canvas);
                    fullOcrText += text + '\n\n';
                }
            }
        } finally {
            await worker.terminate();
        }

        return fullOcrText;
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        if (!file) return;

        setError('');
        setPdfText('');
        setLoading(true);
        setLoadingMessage('Reading PDF...');
        setParsedTransactions([]);
        setOcrProgress(0);

        try {
            const pdfjsLib = await import('pdfjs-dist');
            const arrayBuffer = await file.arrayBuffer();
            const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let extractedFullText = '';
            setLoadingMessage('Extracting text layer...');

            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                extractedFullText += textContent.items.map((item: any) => item.str).join(' ');
                extractedFullText += '\n\n';
            }

            let cleanedText = extractedFullText.trim();
            // Try parsing standard text
            let parsed = parseBankStatement(cleanedText);

            // If text layer extraction yielded no transactions (bad text layer or scanned), try OCR
            if (parsed.length === 0) {
                console.log('Text layer yielded 0 transactions. Switching to OCR...');
                setLoadingMessage('Standard extraction failed. initializing OCR...');
                cleanedText = await performOcrOnPdf(pdfDocument);
                parsed = parseBankStatement(cleanedText);
            }

            setPdfText(cleanedText);
            setLoadingMessage('Parsing transactions...');

            // Set default category and payment method for all transactions
            const defaultCategoryId = categories?.find(cat => cat.name === 'Other')?.id;
            const defaultPaymentMethodId = paymentMethods?.find(pm => pm.name === 'Cash')?.id;

            const transactionsWithDefaults = parsed.map(transaction => ({
                ...transaction,
                categoryId: transaction.categoryId || defaultCategoryId,
                paymentMethodId: transaction.paymentMethodId || defaultPaymentMethodId,
            }));

            setParsedTransactions(transactionsWithDefaults);

            if (parsed.length === 0) {
                setError('No transactions found. The format might not be supported or OCR quality was low.');
            }

        } catch (err) {
            console.error('Error extracting PDF text:', err);
            setError('Failed to extract text from PDF. Please ensure it\'s a valid PDF file.');
            setPdfText('');
            setParsedTransactions([]);
        } finally {
            setLoading(false);
            setLoadingMessage('');
            setOcrProgress(0);
        }
    };

    const handleTransactionChange = (id: string, field: keyof Transaction, value: any) => {
        setParsedTransactions(prevTransactions =>
            prevTransactions.map(transaction =>
                transaction.id === id ? { ...transaction, [field]: value } : transaction
            )
        );
    };

    const handleDeleteTransaction = (id: string) => {
        setParsedTransactions(prevTransactions => prevTransactions.filter(t => t.id !== id));
    };

    const handleImportAll = async () => {
        try {
            if (!currentUser?.id) {
                setSnackbarMessage('No user selected. Please select a user in settings.');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }

            if (parsedTransactions.length === 0) {
                setSnackbarMessage('No transactions to import.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                return;
            }

            setLoading(true);
            setLoadingMessage('Importing transactions...');
            setHighlightedTransactionId(null);

            const expensesToSave: IExpense[] = [];
            const skippedTransactions: Array<{ id: string, reason: string }> = [];
            const currentYear = new Date().getFullYear();

            for (let i = 0; i < parsedTransactions.length; i++) {
                const transaction = parsedTransactions[i];
                const progress = (i + 1) / parsedTransactions.length;
                setOcrProgress(progress);

                if (!transaction.categoryId || !transaction.paymentMethodId) {
                    console.warn(`Skipping transaction "${transaction.description}" - missing category or payment method`);
                    skippedTransactions.push({
                        id: transaction.id,
                        reason: 'missing category or payment method'
                    });
                    continue;
                }

                let parsedDate: Date | null = null;

                // Try multiple date formats including partial dates via Regex and date-fns
                // We'll normalize the string first if possible
                let dateToTestRaw = transaction.date.trim();

                const dateFormats = [
                    'd/M/yyyy',
                    'dd/MM/yyyy',
                    'd/M/yy',
                    'dd MMM yyyy',
                    'd MMM yyyy',
                    'dd/MM/yy',
                    'M/d/yyyy',
                    'MM/dd/yyyy',
                    'd M yyyy',      // For "10 01 2025"
                    'dd MM yyyy',    // For "10 01 2025"
                    'd M',           // For "10 01" (partial)
                    'dd MM',         // For "10 01" (partial)
                ];

                for (const format of dateFormats) {
                    try {
                        let dateToTest = dateToTestRaw;

                        // If format is partial (no year), append current year
                        if (format === 'd M' || format === 'dd MM') {
                            dateToTest = `${dateToTest} ${currentYear}`;
                        }

                        // If appending year above, we need to match the format we parse against
                        const parseFormat = (format === 'd M' || format === 'dd MM') ? `${format} yyyy` : format;

                        const testDate = parse(dateToTest, parseFormat, new Date());

                        if (isValid(testDate)) {
                            const day = testDate.getDate();
                            const month = testDate.getMonth() + 1;
                            const year = testDate.getFullYear();

                            // Validate: day 1-31, month 1-12, year reasonable (e.g., 2000-2100)
                            if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900 && year < 2100) {
                                parsedDate = testDate;
                                break;
                            }
                        }
                    } catch (e) {
                        // Try next format
                    }
                }

                if (!parsedDate) {
                    console.warn(`Skipping transaction "${transaction.description}" - invalid date: ${transaction.date}`);
                    skippedTransactions.push({
                        id: transaction.id,
                        reason: `invalid date: ${transaction.date}`
                    });
                    continue;
                }

                expensesToSave.push({
                    description: transaction.description,
                    amount: transaction.type === 'debit' ? -transaction.amount : transaction.amount,
                    categoryId: transaction.categoryId,
                    paymentMethodId: transaction.paymentMethodId,
                    userId: currentUser.id,
                    date: parsedDate,
                });
            }

            if (expensesToSave.length === 0) {
                setSnackbarMessage('No valid transactions to import. All transactions were skipped due to missing or invalid data.');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);

                if (skippedTransactions.length > 0) {
                    setHighlightedTransactionId(skippedTransactions[0].id);
                }
                return;
            }

            await db.expenses.bulkAdd(expensesToSave);

            let message = `Successfully imported ${expensesToSave.length} transaction${expensesToSave.length > 1 ? 's' : ''}!`;
            let severity: 'success' | 'warning' = 'success';

            if (skippedTransactions.length > 0) {
                message = `Imported ${expensesToSave.length} transactions. Skipped ${skippedTransactions.length} due to invalid data.`;
                severity = 'warning';
                setHighlightedTransactionId(skippedTransactions[0].id);
            }

            setSnackbarMessage(message);
            setSnackbarSeverity(severity);
            setSnackbarOpen(true);

            // Only clear if all were imported successfully, otherwise keep them for user to fix
            if (skippedTransactions.length === 0) {
                setParsedTransactions([]);
                setPdfText('');
            } else {
                const skippedIds = new Set(skippedTransactions.map(t => t.id));
                setParsedTransactions(prev => prev.filter(t => skippedIds.has(t.id)));
            }

        } catch (error) {
            console.error('Import error:', error);
            setSnackbarMessage(`Import failed: ${error}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
            setLoadingMessage('');
            setOcrProgress(0);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const defaultCategoryId = categories?.find(cat => cat.name === 'Other')?.id;
    const defaultPaymentMethodId = paymentMethods?.find(pm => pm.name === 'Cash')?.id;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Import Bank Statement (PDF)
                </Typography>

                <Paper sx={{ p: 2, mb: 4 }}>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="pdf-upload-button"
                        disabled={loading}
                    />
                    <label htmlFor="pdf-upload-button">
                        <Button variant="contained" component="span" fullWidth disabled={loading}>
                            {loading ? loadingMessage : 'Upload PDF Statement'}
                        </Button>
                    </label>

                    {loading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress variant="determinate" value={ocrProgress * 100} />
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                {loadingMessage} {ocrProgress > 0 ? `(${Math.round(ocrProgress * 100)}%)` : ''}
                            </Typography>
                        </Box>
                    )}

                    {error && <Typography sx={{ mt: 2 }} color="error">{error}</Typography>}
                </Paper>

                {pdfText && (
                    <Paper sx={{ p: 2, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>Raw Extracted Text:</Typography>
                        <TextField
                            value={pdfText}
                            multiline
                            rows={10}
                            fullWidth
                            variant="outlined"
                            InputProps={{ readOnly: true }}
                            sx={{ mb: 2 }}
                        />

                        <Typography variant="h6" gutterBottom>Parsed Transactions ({parsedTransactions.length}):</Typography>
                        {parsedTransactions.length > 0 ? (
                            <TableContainer component={Paper}>
                                <Table sx={{ minWidth: 650 }} aria-label="parsed transactions table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell>Payment Method</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parsedTransactions.map((transaction) => (
                                            <TableRow
                                                key={transaction.id}
                                                sx={{
                                                    backgroundColor: highlightedTransactionId === transaction.id ? 'error.light' : 'inherit',
                                                    transition: 'background-color 0.3s'
                                                }}
                                            >
                                                <TableCell component="th" scope="row">
                                                    <TextField
                                                        value={transaction.date}
                                                        onChange={(e) => handleTransactionChange(transaction.id, 'date', e.target.value)}
                                                        fullWidth
                                                        variant="standard"
                                                        error={highlightedTransactionId === transaction.id}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        value={transaction.description}
                                                        onChange={(e) => handleTransactionChange(transaction.id, 'description', e.target.value)}
                                                        fullWidth
                                                        variant="standard"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        type="number"
                                                        value={transaction.amount}
                                                        onChange={(e) => handleTransactionChange(transaction.id, 'amount', parseFloat(e.target.value))}
                                                        fullWidth
                                                        variant="standard"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        value={transaction.type}
                                                        onChange={(e) => handleTransactionChange(transaction.id, 'type', e.target.value as 'debit' | 'credit')}
                                                        fullWidth
                                                        variant="standard"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormControl fullWidth variant="standard">
                                                        <InputLabel>Category</InputLabel>
                                                        <Select
                                                            value={transaction.categoryId?.toString() || (defaultCategoryId ? defaultCategoryId.toString() : '')}
                                                            onChange={(e: SelectChangeEvent) => handleTransactionChange(transaction.id, 'categoryId', parseInt(e.target.value))}
                                                            label="Category"
                                                        >
                                                            <MenuItem value="">
                                                                <em>None</em>
                                                            </MenuItem>
                                                            {categories?.map((category) => (
                                                                <MenuItem key={category.id} value={category.id!.toString()}>
                                                                    {category.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>
                                                <TableCell>
                                                    <FormControl fullWidth variant="standard">
                                                        <InputLabel>Payment Method</InputLabel>
                                                        <Select
                                                            value={transaction.paymentMethodId?.toString() || (defaultPaymentMethodId ? defaultPaymentMethodId.toString() : '')}
                                                            onChange={(e: SelectChangeEvent) => handleTransactionChange(transaction.id, 'paymentMethodId', parseInt(e.target.value))}
                                                            label="Payment Method"
                                                        >
                                                            <MenuItem value="">
                                                                <em>None</em>
                                                            </MenuItem>
                                                            {paymentMethods?.map((pm) => (
                                                                <MenuItem key={pm.id} value={pm.id!.toString()}>
                                                                    {pm.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="Remove Transaction">
                                                        <IconButton onClick={() => handleDeleteTransaction(transaction.id)} color="error">
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            !loading && !error && pdfText && <Typography sx={{ mt: 2 }} color="text.secondary">No transactions parsed from the document. Please check the format or try another file.</Typography>
                        )}
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                onClick={handleImportAll}
                                variant="contained"
                                color="primary"
                                disabled={loading || parsedTransactions.length === 0}
                            >
                                {loading ? 'Importing...' : 'Import All Transactions'}
                            </Button>
                        </Box>
                    </Paper>
                )}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default BankStatementImportPage;
