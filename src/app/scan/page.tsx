'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IExpense } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
// import Image from 'next/image';
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
  IconButton,
  Box,
  Typography,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  SelectChangeEvent,
} from '@mui/material';
import { Upload, XCircle, Loader2 } from 'lucide-react';

interface LineItem {
  id: number;
  description: string;
  amount: number;
  categoryId?: number;
  paymentMethodId?: number;
}

export default function ScanPage() {
  const router = useRouter();
  const { currentUser } = useStore();

  const [image, setImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  // Tesseract Worker
  const [worker, setWorker] = useState<Tesseract.Worker | null>(null);

  useEffect(() => {
    const initializeWorker = async () => {
      const workerInstance = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(m.progress);
          }
        },
      });
      setWorker(workerInstance);
    };
    initializeWorker();
    return () => {
      worker?.terminate();
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        setBase64Image(result);
        setOcrResult('');
        setLineItems([]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  const performOcr = async () => {
    if (!worker || !image) return;

    setLoadingOcr(true);
    setOcrProgress(0);

    try {
      const { data: { text } } = await worker.recognize(image);
      setOcrResult(text);
      extractLineItems(text);
    } catch (error) {
      console.error('OCR failed:', error);
      alert('OCR failed. Please try again.');
    } finally {
      setLoadingOcr(false);
    }
  };

  const extractLineItems = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const extracted: LineItem[] = [];
    let itemId = 0;
    const itemRegex = /(.*?)\s+([$€£]?\s?\d+\.\d{2})$/i;
    const totalRegex = /Total|Balance Due|Amount Due/i;

    lines.forEach((line) => {
      if (totalRegex.test(line)) return;
      const match = line.match(itemRegex);
      if (match) {
        extracted.push({
          id: itemId++,
          description: match[1].trim(),
          amount: parseFloat(match[2].replace(/[^0-9.]/g, '')),
        });
      }
    });
    setLineItems(extracted);
  };

  const handleLineItemChange = (id: number, field: keyof LineItem, value: string | number | undefined) => {
    setLineItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const saveExpenses = async () => {
    if (lineItems.length === 0 || !currentUser?.id) {
        alert(!currentUser?.id ? 'Please select a user in settings.' : 'No line items to save.');
        return;
    }

    const newExpenses: IExpense[] = lineItems.map((item) => ({
      description: item.description,
      amount: Number(item.amount),
      categoryId: item.categoryId || categories?.[0]?.id || 0,
      paymentMethodId: item.paymentMethodId || paymentMethods?.[0]?.id || 0,
      date: new Date(),
      userId: currentUser.id!,
      receiptImage: base64Image || undefined,
    }));

    try {
      await db.expenses.bulkAdd(newExpenses);
      alert('Expenses saved successfully!');
      setImage(null);
      setBase64Image(null);
      setOcrResult('');
      setLineItems([]);
      router.push('/summary');
    } catch (error) {
      console.error('Failed to save expenses:', error);
      alert('Failed to save expenses.');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Receipt Scanner
        </Typography>

        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Upload Receipt Image
          </Typography>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed grey',
              borderRadius: 1,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
            }}
          >
            <input {...getInputProps()} />
            <Typography>Drag 'n' drop a receipt image here, or click to select files</Typography>
            <Upload style={{ margin: '16px auto 0', color: 'grey' }} />
          </Box>
          {image && (
            <Box sx={{ mt: 2, position: 'relative', width: '100%', height: 256 }}>
            <img src={image} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255, 255, 255, 0.7)' }}
                onClick={() => { setImage(null); setBase64Image(null); setOcrResult(''); setLineItems([]); }}
              >
                <XCircle />
              </IconButton>
            </Box>
          )}
          <Button onClick={performOcr} disabled={!image || loadingOcr} fullWidth variant="contained" sx={{ mt: 2 }}>
            {loadingOcr ? `Processing... ${Math.round(ocrProgress * 100)}%` : 'Scan Receipt'}
          </Button>
          {loadingOcr && <LinearProgress variant="determinate" value={ocrProgress * 100} sx={{ mt: 1 }} />}
        </Paper>

        {ocrResult && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>OCR Result (Raw Text)</Typography>
            <TextField value={ocrResult} InputProps={{ readOnly: true }} multiline rows={10} fullWidth variant="outlined" />
          </Paper>
        )}

        {lineItems.length > 0 && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Extracted Line Items (Editable)</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Payment Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><TextField fullWidth variant="standard" value={item.description} onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)} /></TableCell>
                      <TableCell><TextField fullWidth variant="standard" type="number" value={item.amount} onChange={(e) => handleLineItemChange(item.id, 'amount', e.target.value)} /></TableCell>
                      <TableCell>
                        <FormControl fullWidth>
                          <Select
                            value={item.categoryId?.toString() || ''}
                            onChange={(e: SelectChangeEvent) => handleLineItemChange(item.id, 'categoryId', parseInt(e.target.value))}
                            displayEmpty
                          >
                            <MenuItem value="" disabled>Select Category</MenuItem>
                            {categories?.map((cat) => <MenuItem key={cat.id} value={cat.id!.toString()}>{cat.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth>
                          <Select
                            value={item.paymentMethodId?.toString() || ''}
                            onChange={(e: SelectChangeEvent) => handleLineItemChange(item.id, 'paymentMethodId', parseInt(e.target.value))}
                            displayEmpty
                          >
                             <MenuItem value="" disabled>Select Method</MenuItem>
                            {paymentMethods?.map((pm) => <MenuItem key={pm.id} value={pm.id!.toString()}>{pm.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button onClick={saveExpenses} fullWidth variant="contained" sx={{ mt: 2 }}>
              Save Expenses
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
}