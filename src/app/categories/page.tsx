'use client';

import React, { useEffect, useState } from 'react';
import { db, ICategory } from '../../lib/db';
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

export default function CategoriesPage() {
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await db.categories.add({ name: newCategoryName.trim() });
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    await db.categories.delete(id);
  };

  const handleEditCategory = (category: ICategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };

  const handleUpdateCategory = async () => {
    if (editingCategory && newCategoryName.trim()) {
      await db.categories.update(editingCategory.id!, { name: newCategoryName.trim() });
      setEditingCategory(null);
      setNewCategoryName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Categories</h1>

      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder={editingCategory ? 'Edit category name' : 'New category name'}
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-grow"
        />
        {editingCategory ? (
          <>
            <Button onClick={handleUpdateCategory}>Update Category</Button>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button onClick={handleAddCategory}>Add Category</Button>
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
          {categories?.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id!)}>
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