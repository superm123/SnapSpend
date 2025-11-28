'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { currencySymbolMap } from '@/lib/utils/currency';
import { createWorker } from 'tesseract.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IExpense } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import Image from 'next/image';
import { Camera, CameraResultType } from '@capacitor/camera';
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
import { Upload, XCircle, Loader2, Camera as CameraIcon, Trash2 } from 'lucide-react';

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
  const [placeName, setPlaceName] = useState(''); // New state for place name

  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray()); // Get all expenses for category suggestion

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

  const handleCameraScan = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
      });
      if (photo.dataUrl) {
        setImage(photo.dataUrl);
        setBase64Image(photo.dataUrl);
        setOcrResult('');
        setLineItems([]);
      }
    } catch (error) {
      console.error('Camera failed:', error);
      alert('Failed to open camera.');
    }
  };

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

  const extractLineItems = async (text: string) => { // Make async to await db queries
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const extracted: LineItem[] = [];
    let itemId = 0;

    // Create a regex that matches any of the currency symbols
    const currencySymbols = Object.values(currencySymbolMap).join('');
    const itemRegex = new RegExp(`(.*?)\\s+([${currencySymbols}]?\\s?\\d+\\.\\d{2})$`, 'i');
    const totalRegex = /Total|Balance Due|Amount Due/i;

    for (const line of lines) { // Use for...of for async/await
      if (totalRegex.test(line)) continue;
      const match = line.match(itemRegex);
      if (match) {
        const description = match[1].trim();
        const amount = parseFloat(match[2].replace(/[^0-9.]/g, ''));
        let suggestedCategoryId: number | undefined;

        // Category suggestion logic
        if (allExpenses) {
          const matchingExpense = allExpenses.find(
            (exp) => exp.description.toLowerCase() === description.toLowerCase()
          );
          if (matchingExpense) {
            suggestedCategoryId = matchingExpense.categoryId;
          }
        }

        extracted.push({
          id: itemId++,
          description,
          amount,
          categoryId: suggestedCategoryId, // Assign suggested category
        });
      }
    }

    // Fallback for slips with no line items but a total
    if (extracted.length === 0) {
      const slipTotalRegex = new RegExp(`(?:Total|Amount Due|Balance):?\\s*([${currencySymbols}]?\\s?\\d+\\.\\d{2})`, 'i');
      for (const line of lines) {
        const match = line.match(slipTotalRegex);
        if (match) {
          const amount = parseFloat(match[1].replace(/[^0-9.]/g, ''));
          extracted.push({
            id: itemId++,
            description: 'Total',
            amount,
          });
          break; // Stop after finding the first total
        }
      }
    }

    setLineItems(extracted);
  };

  const handleLineItemChange = (id: number, field: keyof LineItem, value: string | number | undefined) => {
    setLineItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveLineItem = (id: number) => {
    setLineItems((prevItems) => prevItems.filter((item) => item.id !== id));
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
      place: placeName || undefined, // Add place name to the expense
    }));

    try {
      await db.expenses.bulkAdd(newExpenses);
      alert('Expenses saved successfully!');
      setImage(null);
      setBase64Image(null);
      setOcrResult('');
      setLineItems([]);
      setPlaceName(''); // Clear place name after saving
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
            Place Name
          </Typography>
          <TextField
            fullWidth
            label="Where did you make this purchase?"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            Upload or Scan Receipt
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
                variant="outlined"
                onClick={handleCameraScan}
                startIcon={<CameraIcon />}
                sx={{ flex: 1 }}
            >
                Scan with Camera
            </Button>
            <Box
                {...getRootProps()}
                sx={{
                border: '2px dashed grey',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'transparent',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
                }}
            >
                <input {...getInputProps()} />
                <Typography variant="body2">Drop image or click to upload</Typography>
                <Upload size={24} style={{ marginTop: '8px', color: 'grey' }} />
            </Box>
          </Box>
          {image && (
            <Box sx={{ mt: 2, position: 'relative', width: '100%', height: 256 }}>
              <Image src={image} alt="Receipt Preview" layout="fill" objectFit="contain" />
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
                    <TableCell>Actions</TableCell>
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
                      <TableCell>
                        <IconButton onClick={() => handleRemoveLineItem(item.id)} aria-label="delete">
                          <Trash2 />
                        </IconButton>
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