import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  DollarSign,
  User,
  PauseCircle,
  PlayCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Percent,
  Clock,
} from 'lucide-react';
import { CartItem, Product, Customer, Category, Sale } from '../types/index.ts';
import { apiRequest, formatRupiah } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ThermalReceipt } from '../components/receipt/ThermalReceipt.tsx';
import { SupervisorPinModal } from '../components/common/SupervisorPinModal.tsx';

export const PosView: React.FC = () => {
  const { user, activeShift, refreshActiveShift, storeSettings } = useAuth();

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-umum');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'tunai' | 'transfer' | 'qris' | 'debit' | 'kredit'>('tunai');
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [heldCarts, setHeldCarts] = useState<any[]>([]);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState<string>('100000');

  // Supervisor PIN Modal
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess: (pin: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Play audio tones using AudioContext
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 beep
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const playSuccess = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } catch {}
  };

  // Fetch initial data
  const fetchData = async () => {
    const [pRes, cRes, custRes] = await Promise.all([
      apiRequest('/products?status=active'),
      apiRequest('/masters/categories'),
      apiRequest('/customers'),
    ]);

    if (pRes.success) setProducts(pRes.products || []);
    if (cRes.success) setCategories(cRes.categories || []);
    if (custRes.success) setCustomers(custRes.customers || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: focus search/barcode
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // F8: open checkout payment
      if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        handleOpenPayment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Barcode / Search Enter Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    // 1. Exact match Barcode
    let matched = products.find((p) => p.barcode === query);
    // 2. Exact match SKU
    if (!matched) matched = products.find((p) => p.sku.toLowerCase() === query);
    // 3. Partial match Name
    if (!matched) matched = products.find((p) => p.name.toLowerCase().includes(query));

    if (matched) {
      addToCart(matched);
      setSearchQuery('');
      playBeep();
    } else {
      alert(`Produk dengan barcode / kode '${searchQuery}' tidak ditemukan.`);
    }
  };

  // Add product to cart with automatic wholesale check
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`Stok produk '${product.name}' sedang kosong.`);
      return;
    }

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.productId === product.id);

      if (existingIdx > -1) {
        const item = prevCart[existingIdx];
        const newQty = item.qty + 1;

        if (newQty > product.stock) {
          alert(`Stok tersisa hanya ${product.stock} unit.`);
          return prevCart;
        }

        // Check wholesale pricing tier
        let unitPrice = product.sellingPrice;
        let isWholesale = false;
        if (product.minWholesaleQty > 0 && newQty >= product.minWholesaleQty && product.wholesalePrice > 0) {
          unitPrice = product.wholesalePrice;
          isWholesale = true;
        }

        const updated = [...prevCart];
        updated[existingIdx] = {
          ...item,
          qty: newQty,
          unitPrice,
          isWholesaleApplied: isWholesale,
          subtotal: newQty * unitPrice - item.discountAmount,
        };
        return updated;
      } else {
        const initialQty = 1;
        let unitPrice = product.sellingPrice;
        let isWholesale = false;
        if (product.minWholesaleQty > 0 && initialQty >= product.minWholesaleQty && product.wholesalePrice > 0) {
          unitPrice = product.wholesalePrice;
          isWholesale = true;
        }

        return [
          ...prevCart,
          {
            productId: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            unitCode: product.unitCode,
            qty: initialQty,
            unitPrice,
            originalPrice: product.sellingPrice,
            isWholesaleApplied: isWholesale,
            discountAmount: 0,
            subtotal: initialQty * unitPrice,
            stock: product.stock,
          },
        ];
      }
    });

    playBeep();
  };

  // Update item quantity
  const updateQty = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) {
            alert(`Stok tersisa hanya ${item.stock} unit.`);
            return item;
          }

          const prod = products.find((p) => p.id === productId);
          let unitPrice = item.originalPrice;
          let isWholesale = false;
          if (prod && prod.minWholesaleQty > 0 && newQty >= prod.minWholesaleQty && prod.wholesalePrice > 0) {
            unitPrice = prod.wholesalePrice;
            isWholesale = true;
          }

          return {
            ...item,
            qty: newQty,
            unitPrice,
            isWholesaleApplied: isWholesale,
            subtotal: newQty * unitPrice - item.discountAmount,
          };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscount);

  // Open Checkout
  const handleOpenPayment = () => {
    if (!activeShift) {
      setIsShiftModalOpen(true);
      return;
    }
    setTenderAmount(String(grandTotal));
    setIsPaymentModalOpen(true);
  };

  // Execute Checkout (Atomic backend transaction with idempotency token)
  const handleProcessCheckout = async (supervisorPinUsed?: string) => {
    const idempotencyToken = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const payload = {
      customerId: selectedCustomerId,
      items: cart.map((c) => ({
        productId: c.productId,
        qty: c.qty,
        unitPrice: c.unitPrice,
        discountAmount: c.discountAmount,
      })),
      paymentType,
      amountPaid: paymentType === 'tunai' ? Number(tenderAmount) : grandTotal,
      discountTotal: overallDiscount,
      idempotencyToken,
      supervisorPin: supervisorPinUsed || undefined,
    };

    const res = await apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.sale) {
      playSuccess();
      setCompletedSale(res.sale);
      setCart([]);
      setOverallDiscount(0);
      setIsPaymentModalOpen(false);
      // Refresh products to update live stock count in POS grid
      fetchData();
      refreshActiveShift();
    } else {
      if (res.requiresSupervisor) {
        setPinModal({
          isOpen: true,
          title: 'Otorisasi Supervisor Kasir',
          description: res.message || 'Tindakan checkout ini memerlukan otorisasi Supervisor PIN.',
          onSuccess: (pin) => {
            setPinModal((prev) => ({ ...prev, isOpen: false }));
            handleProcessCheckout(pin);
          },
        });
      } else {
        alert(res.message || 'Pembayaran gagal diproses.');
      }
    }
  };

  // Hold Cart
  const handleHoldCart = async () => {
    if (cart.length === 0) return;
    const res = await apiRequest('/sales/hold', {
      method: 'POST',
      body: JSON.stringify({
        items: cart,
        customerId: selectedCustomerId,
        notes: `Nota ditahan (${cart.length} item)`,
      }),
    });

    if (res.success) {
      setCart([]);
      alert(res.message || 'Transaksi berhasil ditahan.');
    }
  };

  // Fetch Held Carts
  const handleOpenRecall = async () => {
    const res = await apiRequest('/sales/hold/list');
    if (res.success) {
      setHeldCarts(res.heldCarts || []);
      setIsRecallOpen(true);
    }
  };

  const handleRecallOrder = async (held: any) => {
    setCart(held.items);
    if (held.customerId) setSelectedCustomerId(held.customerId);
    await apiRequest(`/sales/hold/${held.id}`, { method: 'DELETE' });
    setIsRecallOpen(false);
  };

  // Start Shift
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/shifts/start', {
      method: 'POST',
      body: JSON.stringify({ openingBalance: Number(shiftOpeningCash) }),
    });

    if (res.success) {
      await refreshActiveShift();
      setIsShiftModalOpen(false);
      alert('Shift kasir berhasil dibuka!');
    } else {
      alert(res.message || 'Gagal membuka shift.');
    }
  };

  // Filtered Products for Catalog Grid
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Fast Scanner */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Top Search & Barcode Input Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-2">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Barcode className="w-5 h-5 text-mandiri-navy" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan Barcode atau ketik Nama / SKU produk (Tekan Enter atau F2)..."
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-mandiri-navy focus:bg-white outline-none transition font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50 border-blue-200 text-mandiri-navy'
                : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}
            title={soundEnabled ? 'Suara Scanner Aktif' : 'Suara Scanner Muted'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Category Pills Slider */}
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-mandiri-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Search className="w-8 h-8 text-slate-300 mb-2" />
              <span>Tidak ada produk yang cocok dengan pencarian.</span>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const inCartItem = cart.find((c) => c.productId === prod.id);
              const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;
              const isOut = prod.stock <= 0;

              return (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  disabled={isOut}
                  className={`bg-white rounded-2xl p-3 border text-left flex flex-col justify-between transition-all duration-150 active:scale-[0.98] shadow-xs relative overflow-hidden group cursor-pointer ${
                    isOut
                      ? 'opacity-60 border-slate-200 cursor-not-allowed'
                      : inCartItem
                      ? 'border-mandiri-navy ring-2 ring-mandiri-navy/20 shadow-md'
                      : 'border-slate-200 hover:border-mandiri-navy/50 hover:shadow-md'
                  }`}
                >
                  {/* Badge wholesale tier */}
                  {prod.minWholesaleQty > 0 && prod.wholesalePrice > 0 && (
                    <span className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      Grosir {prod.minWholesaleQty}+
                    </span>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {prod.sku}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-mandiri-navy">
                        {formatRupiah(prod.sellingPrice)}
                      </div>
                      {prod.minWholesaleQty > 0 && (
                        <div className="text-[10px] text-purple-600 font-semibold">
                          Grosir: {formatRupiah(prod.wholesalePrice)}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {isOut ? (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                          Habis
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          Sisa {prod.stock}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          Stok: {prod.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {inCartItem && (
                    <div className="absolute bottom-2 right-2 bg-mandiri-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-xs">
                      {inCartItem.qty}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: High-Speed POS Cart Panel */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-full border-t lg:border-t-0 shadow-lg shrink-0">
        {/* Cart Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-mandiri-gold" />
            <span className="font-bold text-sm">Keranjang ({cart.length})</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={handleOpenRecall}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1"
              title="Lihat Pesanan Ditahan"
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Recall</span>
            </button>
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center gap-1"
              title="Tahan Pesanan Saat Ini"
            >
              <PauseCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Hold</span>
            </button>
          </div>
        </div>

        {/* Customer Selector */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-mandiri-navy"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.customerType.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10">
              <ShoppingCart className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="font-semibold text-slate-500">Keranjang Masih Kosong</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan barcode atau klik produk pada katalog.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex flex-col gap-1.5 text-xs transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-bold text-slate-800 line-clamp-1">{item.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{formatRupiah(item.unitPrice)}</span>
                      {item.isWholesaleApplied && (
                        <span className="bg-purple-100 text-purple-700 px-1 rounded font-bold">
                          Harga Grosir
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="px-2 py-1 hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-800 min-w-[28px] text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="px-2 py-1 hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-sm text-slate-900">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">{formatRupiah(subtotal)}</span>
          </div>

          {/* Quick Discount Input */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-rose-500" />
              <span>Diskon Nota (Rp)</span>
            </span>
            <input
              type="number"
              min="0"
              value={overallDiscount || ''}
              onChange={(e) => setOverallDiscount(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-28 text-right px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-mandiri-navy"
            />
          </div>

          <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">Total Belanja</span>
            <span className="font-black text-xl text-mandiri-navy">{formatRupiah(grandTotal)}</span>
          </div>

          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-mandiri-orange to-mandiri-orange-dark hover:brightness-105 active:scale-[0.99] text-white rounded-xl font-black text-sm shadow-md shadow-mandiri-orange/30 disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Bayar Sekarang (F8)</span>
            <span>•</span>
            <span>{formatRupiah(grandTotal)}</span>
          </button>
        </div>
      </div>

      {/* --- PAYMENT MODAL --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Proses Pembayaran</h3>
                <p className="text-xs text-slate-400">Total Tagihan: {formatRupiah(grandTotal)}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tunai', label: 'Tunai', icon: DollarSign },
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'transfer', label: 'Transfer', icon: CreditCard },
                    { id: 'debit', label: 'Debit EDC', icon: CreditCard },
                    { id: 'kredit', label: 'Kredit (Piutang)', icon: AlertCircle },
                  ].map((btn) => {
                    const Icon = btn.icon;
                    const isSelected = paymentType === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => {
                          setPaymentType(btn.id as any);
                          if (btn.id !== 'tunai') setTenderAmount(String(grandTotal));
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-mandiri-navy text-white border-mandiri-navy shadow-md ring-2 ring-mandiri-gold/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-mandiri-gold' : ''}`} />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Input & Quick Bills */}
              {paymentType === 'tunai' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      autoFocus
                      value={tenderAmount}
                      onChange={(e) => setTenderAmount(e.target.value)}
                      placeholder="Masukkan nominal uang kas"
                      className="w-full text-2xl font-black font-mono px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy text-slate-800"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTenderAmount(String(grandTotal))}
                      className="px-3 py-1.5 bg-mandiri-navy hover:bg-mandiri-navy-dark rounded-lg text-xs font-bold text-white cursor-pointer"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000, 500000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setTenderAmount(String(nominal))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        {formatRupiah(nominal)}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <span className="font-bold text-xs text-mandiri-navy">Kembalian:</span>
                    <span className="font-black text-xl text-mandiri-navy">
                      {formatRupiah(Math.max(0, Number(tenderAmount || 0) - grandTotal))}
                    </span>
                  </div>
                </div>
              ) : paymentType === 'qris' ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                  <div className="w-36 h-36 bg-white p-2 border border-slate-300 rounded-xl shadow-xs flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">QRIS Dinamis Siap Scan</span>
                    <p className="text-[11px] text-slate-500">
                      Total Pembayaran: {formatRupiah(grandTotal)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Metode: <strong className="uppercase">{paymentType}</strong>. Tagihan sebesar{' '}
                  <strong className="text-mandiri-navy">{formatRupiah(grandTotal)}</strong> akan dicatat
                  pada sistem keuangan.
                </div>
              )}

              <button
                type="button"
                onClick={() => handleProcessCheckout()}
                disabled={paymentType === 'tunai' && Number(tenderAmount) < grandTotal}
                className="w-full py-3.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl font-black text-sm shadow-md shadow-mandiri-navy/30 border-b-2 border-mandiri-gold disabled:opacity-40 transition cursor-pointer"
              >
                Selesaikan Transaksi & Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RECALL HELD CARTS MODAL --- */}
      {isRecallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Pesanan Ditahan (Hold Bills)</span>
              <button onClick={() => setIsRecallOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {heldCarts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada transaksi yang sedang ditahan.
                </div>
              ) : (
                heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{h.holdNumber}</div>
                      <div className="text-[10px] text-slate-500">
                        {h.items.length} item • {new Date(h.heldAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecallOrder(h)}
                      className="px-3 py-1.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Panggil
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SHIFT START PROMPT MODAL --- */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="bg-mandiri-navy text-white px-5 py-4 flex items-center justify-between border-b border-mandiri-gold/30">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Clock className="w-4 h-4 text-mandiri-gold" />
                <span>Buka Shift Kasir Baru</span>
              </div>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda belum memiliki shift aktif. Masukkan modal awal laci kasir untuk mulai bertransaksi.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Modal Awal Kas (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={shiftOpeningCash}
                  onChange={(e) => setShiftOpeningCash(e.target.value)}
                  className="w-full text-lg font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-mandiri-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Mulai Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- THERMAL RECEIPT DISPLAY MODAL --- */}
      {completedSale && (
        <ThermalReceipt
          sale={completedSale}
          settings={storeSettings}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* --- SUPERVISOR PIN MODAL --- */}
      <SupervisorPinModal
        isOpen={pinModal.isOpen}
        title={pinModal.title}
        description={pinModal.description}
        onSuccess={pinModal.onSuccess}
        onCancel={() => setPinModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
