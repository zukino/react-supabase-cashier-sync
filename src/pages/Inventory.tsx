import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useIncreaseStock, useDecreaseStock } from "@/hooks";
import { Product } from "@/types/database";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductSchema, CreateProductRequest } from "@/types/database";

export const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<"increase" | "decrease">("increase");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: products, isLoading, refetch } = useProducts({
    limit: 1000,
  });

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const increaseStockMutation = useIncreaseStock();
  const decreaseStockMutation = useDecreaseStock();

  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    setValue: setAddValue,
    formState: { errors: addErrors },
  } = useForm<CreateProductRequest>({
    resolver: zodResolver(ProductSchema.omit({ id: true, created_at: true, updated_at: true, synced_at: true })),
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
    setValue: setEditValue,
  } = useForm<CreateProductRequest>({
    resolver: zodResolver(ProductSchema.omit({ id: true, created_at: true, updated_at: true, synced_at: true })),
  });

  // Filter products based on search
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle create product
  const handleCreateProduct = async (data: CreateProductRequest) => {
    try {
      await createProductMutation.mutateAsync(data);
      resetAdd();
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to create product:", error);
    }
  };

  // Handle update product
  const handleUpdateProduct = async (data: CreateProductRequest) => {
    if (!selectedProduct?.id) return;

    try {
      await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        updates: data,
      });
      resetEdit();
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!selectedProduct?.id) return;

    try {
      if (stockAction === "increase") {
        await increaseStockMutation.mutateAsync({
          productId: selectedProduct.id,
          quantity: stockQuantity,
        });
      } else {
        await decreaseStockMutation.mutateAsync({
          productId: selectedProduct.id,
          quantity: stockQuantity,
        });
      }

      setStockQuantity(1);
      setIsStockDialogOpen(false);
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      console.error("Failed to adjust stock:", error);
    }
  };

  // Open edit dialog with product data
  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditValue("name", product.name);
    setEditValue("description", product.description || "");
    setEditValue("barcode", product.barcode || "");
    setEditValue("price", product.price);
    setEditValue("stock", product.stock);
    setEditValue("category", product.category || "");
    setIsEditDialogOpen(true);
  };

  // Open stock dialog
  const openStockDialog = (product: Product, action: "increase" | "decrease") => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockQuantity(1);
    setIsStockDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  // Get stock status
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock < 10) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  // Get low stock products
  const lowStockProducts = filteredProducts.filter(p => p.stock < 10 && p.stock > 0);
  const outOfStockProducts = filteredProducts.filter(p => p.stock === 0);

  const categories = [...new Set(products?.map(p => p.category).filter(Boolean) || [])];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Inventory Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Unavailable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span>Loading products...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category && (
                              <Badge variant="outline">{product.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell className="font-medium">{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.barcode || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStockDialog(product, "increase")}
                              >
                                <TrendingUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStockDialog(product, "decrease")}
                                disabled={product.stock === 0}
                              >
                                <TrendingDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit(handleCreateProduct)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...registerAdd("name")}
                placeholder="Enter product name"
              />
              {addErrors.name && (
                <p className="text-sm text-red-600">{addErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...registerAdd("description")}
                placeholder="Enter product description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setAddValue("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category!}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ New Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...registerAdd("price", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {addErrors.price && (
                  <p className="text-sm text-red-600">{addErrors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  {...registerAdd("stock", { valueAsNumber: true })}
                  placeholder="0"
                />
                {addErrors.stock && (
                  <p className="text-sm text-red-600">{addErrors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                {...registerAdd("barcode")}
                placeholder="Enter barcode (optional)"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? "Creating..." : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit(handleUpdateProduct)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                {...registerEdit("name")}
                placeholder="Enter product name"
              />
              {editErrors.name && (
                <p className="text-sm text-red-600">{editErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...registerEdit("description")}
                placeholder="Enter product description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                {...registerEdit("category")}
                placeholder="Enter category"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...registerEdit("price", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {editErrors.price && (
                  <p className="text-sm text-red-600">{editErrors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  {...registerEdit("stock", { valueAsNumber: true })}
                  placeholder="0"
                />
                {editErrors.stock && (
                  <p className="text-sm text-red-600">{editErrors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-barcode">Barcode</Label>
              <Input
                id="edit-barcode"
                {...registerEdit("barcode")}
                placeholder="Enter barcode (optional)"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAction === "increase" ? "Increase Stock" : "Decrease Stock"}
            </DialogTitle>
            <DialogDescription>
              {stockAction === "increase"
                ? "Add stock to this product."
                : "Remove stock from this product."}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">{selectedProduct.name}</h4>
                <p className="text-sm text-muted-foreground">Current stock: {selectedProduct.stock}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-quantity">Quantity</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  max={stockAction === "decrease" ? selectedProduct.stock : undefined}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStockAdjustment}
                  disabled={increaseStockMutation.isPending || decreaseStockMutation.isPending}
                >
                  {increaseStockMutation.isPending || decreaseStockMutation.isPending
                    ? "Processing..."
                    : stockAction === "increase"
                    ? `Add ${stockQuantity} to Stock`
                    : `Remove ${stockQuantity} from Stock`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Implement delete functionality
                setDeleteDialogOpen(false);
                setSelectedProduct(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};