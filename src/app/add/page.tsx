'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, IExpense } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Container,
  Stack,
  SelectChangeEvent,
  Snackbar,
  Alert,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export default function AddExpensePage() {
  const router = useRouter();
  const categories = useLiveQuery(() => db.categories.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const { currentUser } = useStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [date, setDate] = useState<Date | null>(new Date());

  // Snackbar State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser.id!.toString());
    }
  }, [currentUser]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !description ||
      !amount ||
      !selectedCategory ||
      !selectedPaymentMethod ||
      !selectedUser ||
      !date
    ) {
      showSnackbar('Please fill all fields', 'warning');
      return;
    }

    const newExpense: IExpense = {
      description,
      amount: parseFloat(amount),
      categoryId: parseInt(selectedCategory),
      paymentMethodId: parseInt(selectedPaymentMethod),
      date: date,
      userId: parseInt(selectedUser),
    };

    try {
      await db.expenses.add(newExpense);
      showSnackbar('Expense added successfully!', 'success');
      // Clear form
      setDescription('');
      setAmount('');
      setSelectedCategory('');
      setSelectedPaymentMethod('');
      setDate(new Date());
      // Delay navigation slightly
      setTimeout(() => {
        router.push('/summary');
      }, 1000);
    } catch (error) {
      console.error('Failed to add expense:', error);
      showSnackbar('Failed to add expense.', 'error');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
          <Stack spacing={3}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Add New Expense
            </Typography>
            <TextField
              id="description"
              label="Description"
              placeholder="e.g., Weekly groceries, Dinner with friends"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              multiline
              rows={3}
              fullWidth
              variant="standard"
              sx={{ mb: 3 }}
            />
            <TextField
              id="amount"
              label="Amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputProps={{ step: "0.01", min: "0" }}
              fullWidth
              variant="standard"
              sx={{ mb: 3 }}
            />
            <FormControl fullWidth>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                id="category"
                value={selectedCategory}
                label="Category"
                variant="standard"
                onChange={(e: SelectChangeEvent) => setSelectedCategory(e.target.value as string)}
                required
              >
                {categories?.map((category) => (
                  <MenuItem key={category.id} value={category.id!.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="paymentMethod-label">Payment Method</InputLabel>
              <Select
                labelId="paymentMethod-label"
                id="paymentMethod"
                value={selectedPaymentMethod}
                label="Payment Method"
                variant="standard"
                onChange={(e: SelectChangeEvent) => setSelectedPaymentMethod(e.target.value as string)}
                required
              >
                {paymentMethods?.map((method) => (
                  <MenuItem key={method.id} value={method.id!.toString()}>
                    {method.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="user-label">Added By</InputLabel>
              <Select
                labelId="user-label"
                id="addedBy"
                value={selectedUser}
                label="Added By"
                variant="standard"
                onChange={(e: SelectChangeEvent) => setSelectedUser(e.target.value as string)}
                required
              >
                {users?.map((user) => (
                  <MenuItem key={user.id} value={user.id!.toString()}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="Date"
              value={date}
              onChange={(newDate) => setDate(newDate)}
              slotProps={{ textField: { variant: 'standard', fullWidth: true, sx: { mb: 3 } } }}
              sx={{ width: '100%' }}
            />
            <Button type="submit" variant="contained" size="large" fullWidth>
              Add Expense
            </Button>
          </Stack>
        </Box>
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}