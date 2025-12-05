'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';
import { db, ICategory, IPaymentMethod, IExpense, IUser } from '@/lib/db'; // Import db and interfaces
import { useLiveQuery } from 'dexie-react-hooks'; // Import useLiveQuery
import { useStore } from '@/lib/store'; // Import useStore
import { format, parse } from 'date-fns'; // For date handling

// Dynamically import pdfjs-dist with ssr: false
const pdfjsLibPromise = import('pdfjs-dist');

// Define a basic interface for a bank transaction
interface Transaction {
    id: string; // Added for unique key in editable table
    date: string; // "DD/MM/YYYY" or "DD MMM YYYY"
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    categoryId?: number; // Added for user selection
    paymentMethodId?: number; // Added for user selection
}

// Function to parse the raw text into structured transactions
const parseBankStatement = (text: string): Transaction[] => {
    const transactions: Transaction[] = [];

    // Regex to capture common transaction patterns
    // This is a basic example and will need significant refinement for real-world statements.
    // It looks for a date, then some description, then an amount.
    // Date: DD/MM/YYYY or DD MMM YYYY
    // Amount: R 1,234.56 or 1234.56 or -123.45 (assuming negative for debit)
    // Adjusted regex to be more robust for various amount formats and surrounding text
    const transactionRegex = /(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2,4})\s+([\w\s.,'/-]+?)\s+([-+]?\s*R?\s*\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)/gi;


    let match;
    let idCounter = 0;
    while ((match = transactionRegex.exec(text)) !== null) {
        const dateStr = match[1];
        let description = match[2].trim();
        const amountStr = match[3].replace(/[R\s,]/g, '').trim(); // Remove currency symbols, spaces, commas

        let amount = parseFloat(amountStr);
        let type: 'debit' | 'credit' = 'credit';

        if (amount < 0 || amountStr.startsWith('-')) {
            type = 'debit';
            amount = Math.abs(amount);
        }

        description = description.replace(/\s+\d+(\.\d{2})?$/, '').trim();

        transactions.push({
            id: `temp-${idCounter++}`,
            date: dateStr,
            description: description,
            amount: amount,
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
    const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');


    // Fetch categories, payment methods, and current user
    const categories = useLiveQuery(() => db.categories.toArray(), []) as ICategory[] | undefined;
    const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []) as IPaymentMethod[] | undefined;
    const { currentUser } = useStore(); // Get current user from Zustand store

    // Set up the worker source for pdf.js-dist on client-side
    useEffect(() => {
        pdfjsLibPromise.then(pdfjsLib => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
        });
    }, []);

    // For Capacitor Status Bar styling
    useEffect(() => {
        if (theme === 'dark') {
            StatusBar.setStyle({ style: Style.Light });
        } else {
            StatusBar.setStyle({ style: Style.Dark });
        }
    }, [theme]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        if (!file) return;

        setError('');
        setPdfText('');
        setLoading(true);
        setParsedTransactions([]);
        setImportStatus('idle');
        setImportMessage('');

        try {
            const pdfjsLib = await pdfjsLibPromise; // Await the dynamic import
            const arrayBuffer = await file.arrayBuffer();
            const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let extractedFullText = '';
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                extractedFullText += textContent.items.map((item: any) => item.str).join(' ');
                extractedFullText += '\n\n';
            }

            const cleanedText = extractedFullText.trim();
            setPdfText(cleanedText);

            const parsed = parseBankStatement(cleanedText);
            setParsedTransactions(parsed);

        } catch (err) {
            console.error('Error extracting PDF text:', err);
            setError('Failed to extract text from PDF. Please ensure it\'s a valid PDF file.');
            setPdfText('');
            setParsedTransactions([]);
        } finally {
            setLoading(false);
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
        if (!currentUser?.id) {
            setImportStatus('error');
            setImportMessage('No current user found. Cannot import transactions.');
            return;
        }

        if (parsedTransactions.length === 0) {
            setImportStatus('error');
            setImportMessage('No transactions to import.');
            return;
        }

        const expensesToSave: IExpense[] = [];
        for (const transaction of parsedTransactions) {
            // Basic validation
            if (!transaction.date || !transaction.description || transaction.amount === undefined || transaction.amount === null || !transaction.categoryId || !transaction.paymentMethodId) {
                setImportStatus('error');
                setImportMessage(`Missing data for transaction: ${transaction.description || 'Unknown'}. Please fill all fields.`);
                return;
            }

            // Date conversion
            let parsedDate: Date;
            try {
                // Try to parse with common formats
                parsedDate = parse(transaction.date, 'dd/MM/yyyy', new Date());
                if (isNaN(parsedDate.getTime())) {
                    parsedDate = parse(transaction.date, 'dd MMM yyyy', new Date());
                }
                if (isNaN(parsedDate.getTime())) {
                    throw new Error('Invalid date format');
                }
            } catch (e) {
                setImportStatus('error');
                setImportMessage(`Invalid date format for transaction: ${transaction.date}.`);
                return;
            }


            expensesToSave.push({
                description: transaction.description,
                amount: transaction.type === 'debit' ? -transaction.amount : transaction.amount,
                categoryId: transaction.categoryId,
                paymentMethodId: transaction.paymentMethodId,
                userId: currentUser.id,
                date: parsedDate,
                // receiptImage and place are optional
            });
        }

        try {
            await db.expenses.bulkAdd(expensesToSave);
            setImportStatus('success');
            setImportMessage(`Successfully imported ${expensesToSave.length} transactions.`);
            setParsedTransactions([]); // Clear transactions after successful import
            setPdfText(''); // Clear raw text
        } catch (e) {
            console.error('Error saving transactions to Dexie.js:', e);
            setImportStatus('error');
            setImportMessage('Failed to import transactions. Please check console for details.');
        }
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
                    />
                    <label htmlFor="pdf-upload-button">
                        <Button variant="contained" component="span" fullWidth>
                            Upload PDF Statement
                        </Button>
                    </label>

                    {loading && <Typography sx={{ mt: 2 }} color="text.secondary">Extracting text from PDF, please wait...</Typography>}
                    {error && <Typography sx={{ mt: 2 }} color="error">{error}</Typography>}

                    {importStatus === 'success' && <Typography sx={{ mt: 2 }} color="success.main">{importMessage}</Typography>}
                    {importStatus === 'error' && <Typography sx={{ mt: 2 }} color="error">{importMessage}</Typography>}
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
                                            <TableRow key={transaction.id}>
                                                <TableCell component="th" scope="row">
                                                    <TextField
                                                        value={transaction.date}
                                                        onChange={(e) => handleTransactionChange(transaction.id, 'date', e.target.value)}
                                                        fullWidth
                                                        variant="standard"
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
                            <Button onClick={handleImportAll} variant="contained" color="primary">
                                Import All Transactions
                            </Button>
                        </Box>
                    </Paper>
                )}
            </Box>
        </Container>
    );
};

export default BankStatementImportPage;
