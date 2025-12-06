'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { currencySymbolMap } from '@/lib/utils/currency';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IExpense } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
// The native browser Image constructor is used for OCR preprocessing; Next.js Image is imported as NextImage.
import NextImage from 'next/image';
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
  Snackbar,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';


interface LineItem {
  id: number;
  description: string;
  amount: number;
  categoryId?: number;
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
  const [placeName, setPlaceName] = useState('');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [newItem, setNewItem] = useState<{ description: string; amount: string }>({ description: '', amount: '' });
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<number | ''>('');

  // Snackbar State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());



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

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

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
      showSnackbar('Failed to open camera.', 'error');
    }
  };

  const performOcr = async () => {
    if (!image) return;

    setLoadingOcr(true);
    setOcrProgress(0);

    // Helper to convert a data URL to a Blob
    const dataURLtoBlob = (dataurl: string): Blob => {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };

    try {
      // Load Scribe from public directory to bypass build issues
      // @ts-ignore
      const ScribeModule = await import(/* webpackIgnore: true */ '/scribe/scribe.js');
      const Scribe = ScribeModule.default;
      // Initialize Scribe (load language data, workers)
      await Scribe.init();

      // Initialize Scribe with optimized parameters for speed
      await Scribe.init({ ocrParams: { workerCount: 2, lang: 'eng' } });

      // Convert the base64 image to a Blob for Scribe OCR
      const imageBlob = dataURLtoBlob(image as string);

      // Preprocess: downscale image to improve speed and accuracy
      const preprocess = async (blob: Blob): Promise<Blob> => {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = (e) => rej(e);
          i.src = URL.createObjectURL(blob);
        });
        const maxWidth = 1024;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), 'image/jpeg', 0.8));
      };

      const processedBlob = await preprocess(imageBlob);
      const imageFile = new File([processedBlob], 'capture.jpg', { type: processedBlob.type });

      // Use extractText which robustly handles File objects
      const text = await Scribe.extractText([imageFile]);

      setOcrResult(text);
      extractLineItems(text);
    } catch (error) {
      console.error('OCR failed:', error);
      showSnackbar('OCR failed. Please try again.', 'error');
    } finally {
      setLoadingOcr(false);
    }
  };

  const extractMerchantName = (text: string): string => {
    const lines = text.split('\n').filter(l => l.trim()).map(l => l.trim());
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (
        line.length > 3 &&
        line.length < 50 &&
        !/^(receipt|invoice|tax|vat|date|time|till|cashier|server|table|\d)/i.test(line) &&
        !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)
      ) {
        return line;
      }
    }
    return '';
  };

  const extractLineItems = async (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const extracted: LineItem[] = [];
    let itemId = 0;

    const merchantName = extractMerchantName(text);
    if (merchantName && !placeName) {
      setPlaceName(merchantName);
    }

    const currencySymbols = Object.values(currencySymbolMap).join('');
    // Updated regex to handle suffixes (e.g. 'A') and trailing chars (e.g. '_')
    // Captures: 1=Description, 2=Amount (clean number part)
    // Matches standard amounts like R7.99 or 7.99, optionally followed by single char and then garbage
    const itemRegex = new RegExp(`(.+?)\\s+([${currencySymbols}]?\\s?\\d{1,3}(?:[,\\s]\\d{3})*(?:\\.\\d{1,2})?)[A-Z]?\\s*.*$`, 'i');
    const totalRegex = /(?:^|\s)(sub)?total|balance.*due|amount.*due|grand.*total/i;

    for (const line of lines) {
      if (totalRegex.test(line)) continue;
      const match = line.match(itemRegex);
      if (match) {
        const description = match[1].trim();
        const amountStr = match[2].replace(/[^0-9.,]/g, '');
        const cleanAmount = amountStr.replace(/[\s,]/g, '');
        const amount = parseFloat(cleanAmount);
        if (isNaN(amount) || amount <= 0) continue;
        // Default category to 'Other'
        const otherCategory = categories?.find(c => c.name === 'Other');
        const suggestedCategoryId = otherCategory?.id || categories?.[0]?.id;

        extracted.push({
          id: itemId++,
          description,
          amount,
          categoryId: suggestedCategoryId,
        });
      }
    }

    if (extracted.length === 0) {
      const slipTotalRegex = new RegExp(`(?:total|amount.*due|balance):?\\s*([${currencySymbols}]?\\s?\\d{1,3}(?:[,\\s]\\d{3})*(?:\\.\\d{1,2})?)`, 'i');
      for (const line of lines) {
        const match = line.match(slipTotalRegex);
        if (match) {
          const amountStr = match[1].replace(/[^0-9.,]/g, '');
          const cleanAmount = amountStr.replace(/[\s,]/g, '');
          const amount = parseFloat(cleanAmount);
          if (isNaN(amount) || amount <= 0) continue;
          extracted.push({
            id: itemId++,
            description: 'Total',
            amount,
          });
          break;
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

  const handleAddNewItem = () => {
    const amountNum = parseFloat(newItem.amount);
    if (!newItem.description || isNaN(amountNum) || amountNum <= 0) {
      showSnackbar('Please enter a valid description and amount for the new item.', 'warning');
      return;
    }

    setLineItems((prevItems) => [
      ...prevItems,
      {
        id: Math.max(0, ...prevItems.map(item => item.id)) + 1,
        description: newItem.description,
        amount: amountNum,
      },
    ]);
    setNewItem({ description: '', amount: '' });
  };

  const saveExpenses = async () => {
    if (lineItems.length === 0 || !currentUser?.id) {
      showSnackbar(!currentUser?.id ? 'Please select a user in settings.' : 'No line items to save.', 'warning');
      return;
    }

    const newExpenses: IExpense[] = lineItems.map((item) => ({
      description: item.description,
      amount: Number(item.amount),
      categoryId: item.categoryId || categories?.[0]?.id || 0,
      paymentMethodId: Number(defaultPaymentMethodId) || paymentMethods?.[0]?.id || 0,
      date: new Date(),
      userId: currentUser.id!,
      receiptImage: base64Image || undefined,
      place: placeName || undefined,
    }));

    try {
      await db.expenses.bulkAdd(newExpenses);
      showSnackbar('Expenses saved successfully!', 'success');
      // Delay navigation slightly to let user see success message
      setTimeout(() => {
        setImage(null);
        setBase64Image(null);
        setLineItems([]);
        setPlaceName('');
        router.push('/summary');
      }, 1000);
    } catch (error) {
      console.error('Failed to save expenses:', error);
      showSnackbar('Failed to save expenses.', 'error');
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
            variant="standard"
            onChange={(e) => setPlaceName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            Upload or Scan Receipt
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleCameraScan}
              startIcon={<CameraAltIcon />}
              sx={{ flex: 1, minHeight: '56px' }}
            >
              Scan with Camera
            </Button>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <input {...getInputProps()} />
              <Typography variant="body2">Drop image or click to upload</Typography>
              <CloudUploadIcon sx={{ mt: '8px', color: 'grey' }} />
            </Box>
          </Box>
          {image && (
            <Box sx={{ mt: 2, position: 'relative', width: '100%', height: 256 }}>
              <NextImage src={image} alt="Receipt Preview" layout="fill" objectFit="contain" />
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255, 255, 255, 0.7)' }}
                onClick={() => { setImage(null); setBase64Image(null); setLineItems([]); }}
              >
                <CancelRoundedIcon />
              </IconButton>
            </Box>
          )}
          <Button
            onClick={performOcr}
            disabled={!image || loadingOcr}
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            {loadingOcr ? `Processing... ${Math.round(ocrProgress * 100)}%` : 'Scan Receipt'}
          </Button>
          {loadingOcr && <LinearProgress variant="determinate" value={ocrProgress * 100} sx={{ mt: 1 }} />}

          {ocrResult && (
            <Button onClick={() => setShowRawOcr(!showRawOcr)} fullWidth variant="outlined" sx={{ mt: 2 }}>
              {showRawOcr ? 'Hide Raw OCR Result' : 'Show Raw OCR Result'}
            </Button>
          )}
        </Paper>

        {ocrResult && showRawOcr && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>OCR Result (Raw Text)</Typography>
            <TextField value={ocrResult} InputProps={{ readOnly: true }} multiline rows={10} fullWidth variant="outlined" />
          </Paper>
        )}

        {lineItems.length > 0 && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Extracted Line Items (Editable)</Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth variant="standard">
                <InputLabel>Payment Method (Applied to all items)</InputLabel>
                <Select
                  value={defaultPaymentMethodId}
                  onChange={(e) => setDefaultPaymentMethodId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  {paymentMethods?.map((pm) => (
                    <MenuItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Desktop Table View */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Category</TableCell>
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
                            variant="standard"
                          >
                            <MenuItem value="" disabled>Select Category</MenuItem>
                            {categories?.map((cat) => <MenuItem key={cat.id} value={cat.id!.toString()}>{cat.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>

                      <TableCell>
                        <IconButton onClick={() => handleRemoveLineItem(item.id)} aria-label="delete" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
              {lineItems.map((item) => (
                <Paper key={item.id} elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Item #{item.id + 1}</Typography>
                    <IconButton onClick={() => handleRemoveLineItem(item.id)} size="small" color="error"><DeleteIcon /></IconButton>
                  </Box>
                  <TextField fullWidth label="Description" variant="standard" size="small" value={item.description} onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)} sx={{ mb: 2 }} />
                  <TextField fullWidth label="Amount" variant="standard" type="number" size="small" value={item.amount} onChange={(e) => handleLineItemChange(item.id, 'amount', e.target.value)} sx={{ mb: 2 }} />
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <Select
                      value={item.categoryId?.toString() || ''}
                      onChange={(e: SelectChangeEvent) => handleLineItemChange(item.id, 'categoryId', parseInt(e.target.value))}
                      displayEmpty
                      variant="standard"
                    >
                      <MenuItem value="" disabled>Select Category</MenuItem>
                      {categories?.map((cat) => <MenuItem key={cat.id} value={cat.id!.toString()}>{cat.name}</MenuItem>)}
                    </Select>
                  </FormControl>

                </Paper>
              ))}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'flex-end' }}>
              <TextField
                label="New Item Description"
                variant="standard"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                label="Amount"
                variant="standard"
                type="number"
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                sx={{ width: { xs: '100%', sm: 150 } }}
              />
              <Button onClick={handleAddNewItem} variant="contained" sx={{ height: { xs: '48px', sm: '36px' }, minWidth: 120 }}>
                Add Item
              </Button>
            </Box>

            <Button
              onClick={saveExpenses}
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Save Expenses
            </Button>
          </Paper>
        )}
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}