'use client';

import React, { useState, useEffect } from 'react';
import { PDFExtract } from 'pdf.js-extract';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';
import { db, ICategory, IPaymentMethod, IExpense, IUser } from '@/lib/db'; // Import db and interfaces
import { useLiveQuery } from 'dexie-react-hooks'; // Import useLiveQuery
import { useStore } from '@/lib/store'; // Import useStore
import { format, parse } from 'date-fns'; // For date handling

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Import shadcn/ui select components

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
            const arrayBuffer = await file.arrayBuffer();
            const pdfExtract = new PDFExtract();
            const data = await pdfExtract.extractBuffer(arrayBuffer);

            let extractedFullText = '';
            data.pages.forEach(page => {
                page.content.forEach(item => {
                    extractedFullText += item.str + ' ';
                });
                extractedFullText += '\n\n';
            });

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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Import Bank Statement (PDF)</h1>
            <Input type="file" accept=".pdf" onChange={handleFileChange} className="mb-4" />

            {loading && <p className="text-gray-600">Extracting text from PDF, please wait...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {importStatus === 'success' && <p className="text-green-500">{importMessage}</p>}
            {importStatus === 'error' && <p className="text-red-500">{importMessage}</p>}


            {pdfText && (
                <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-2">Raw Extracted Text:</h2>
                    <pre className="whitespace-pre-wrap max-h-52 overflow-y-auto border rounded p-2 text-sm bg-gray-50 dark:bg-gray-800 mb-4">
                        {pdfText}
                    </pre>

                    <h2 className="text-xl font-semibold mb-2">Parsed Transactions ({parsedTransactions.length}):</h2>
                    {parsedTransactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {parsedTransactions.map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <Input
                                                    value={transaction.date}
                                                    onChange={(e) => handleTransactionChange(transaction.id, 'date', e.target.value)}
                                                    className="w-full"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <Input
                                                    value={transaction.description}
                                                    onChange={(e) => handleTransactionChange(transaction.id, 'description', e.target.value)}
                                                    className="w-full"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                                                <Input
                                                    type="number"
                                                    value={transaction.amount}
                                                    onChange={(e) => handleTransactionChange(transaction.id, 'amount', parseFloat(e.target.value))}
                                                    className="w-full text-right"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <Input
                                                    value={transaction.type}
                                                    onChange={(e) => handleTransactionChange(transaction.id, 'type', e.target.value as 'debit' | 'credit')}
                                                    className="w-full"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <Select
                                                    onValueChange={(value) => handleTransactionChange(transaction.id, 'categoryId', parseInt(value))}
                                                    value={transaction.categoryId?.toString() || defaultCategoryId?.toString()}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select Category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories?.map((category) => (
                                                            <SelectItem key={category.id} value={category.id!.toString()}>
                                                                {category.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <Select
                                                    onValueChange={(value) => handleTransactionChange(transaction.id, 'paymentMethodId', parseInt(value))}
                                                    value={transaction.paymentMethodId?.toString() || defaultPaymentMethodId?.toString()}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select Payment Method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods?.map((pm) => (
                                                            <SelectItem key={pm.id} value={pm.id!.toString()}>
                                                                {pm.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={handleImportAll} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                    Import All
                                </Button>
                            </div>
                        </div>
                    ) : (
                        !loading && !error && pdfText && <p className="text-gray-600">No transactions parsed from the document. Please check the format or try another file.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default BankStatementImportPage;

