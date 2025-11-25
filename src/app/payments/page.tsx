'use client';

import React, { useEffect, useState } from 'react';
import { db, IPaymentMethod } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Trash2, Edit2 } from 'lucide-react';

export default function PaymentMethodsPage() {
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<IPaymentMethod | null>(null);

  const handleAddPaymentMethod = async () => {
    if (newPaymentMethodName.trim()) {
      await db.paymentMethods.add({ name: newPaymentMethodName.trim() });
      setNewPaymentMethodName('');
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    await db.paymentMethods.delete(id);
  };

  const handleEditPaymentMethod = (paymentMethod: IPaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setNewPaymentMethodName(paymentMethod.name);
  };

  const handleUpdatePaymentMethod = async () => {
    if (editingPaymentMethod && newPaymentMethodName.trim()) {
      await db.paymentMethods.update(editingPaymentMethod.id!, { name: newPaymentMethodName.trim() });
      setEditingPaymentMethod(null);
      setNewPaymentMethodName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingPaymentMethod(null);
    setNewPaymentMethodName('');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Methods</h1>

      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder={editingPaymentMethod ? 'Edit payment method name' : 'New payment method name'}
          value={newPaymentMethodName}
          onChange={(e) => setNewPaymentMethodName(e.target.value)}
          className="flex-grow"
        />
        {editingPaymentMethod ? (
          <>
            <Button onClick={handleUpdatePaymentMethod}>Update Payment Method</Button>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button onClick={handleAddPaymentMethod}>Add Payment Method</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentMethods?.map((paymentMethod) => (
            <TableRow key={paymentMethod.id}>
              <TableCell className="font-medium">{paymentMethod.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEditPaymentMethod(paymentMethod)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeletePaymentMethod(paymentMethod.id!)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}