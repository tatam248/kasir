import React, { useState, useRef } from 'react';
import { Printer, Download, X, Copy, Check } from 'lucide-react';
import { Sale, StoreSettings } from '../../types/index.ts';
import { formatRupiah, formatDate } from '../../lib/api.ts';

interface ThermalReceiptProps {
  sale: Sale;
  settings?: StoreSettings | null;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ sale, settings, onClose }) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(settings?.receiptPaperSize || '58mm');
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const store = settings || {
    storeName: 'KasirPro Store',
    address: 'Alamat Toko Belum Ditetapkan',
    phone: '-',
    receiptFooter: 'Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan struk.',
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const win = window.open('', '', 'width=400,height=600');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${sale.invoiceNo}</title>
          <style>
            @page {
              margin: 0;
              size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === '58mm' ? '11px' : '13px'};
              line-height: 1.25;
              padding: 8px;
              color: #000;
              background: #fff;
              width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .table-items { width: 100%; border-collapse: collapse; }
            .table-items td { padding: 2px 0; vertical-align: top; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleCopyText = () => {
    const lines = [
      store.storeName,
      store.address,
      `Telp: ${store.phone}`,
      '--------------------------------',
      `No: ${sale.invoiceNo}`,
      `Tgl: ${formatDate(sale.saleDate)}`,
      `Kasir: ${sale.userName || '-'}`,
      `Pelanggan: ${sale.customerName || 'Umum'}`,
      '--------------------------------',
      ...(sale.items?.map((it) => `${it.productName}\n${it.qty} x ${it.unitPrice.toLocaleString('id-ID')} = ${it.subtotal.toLocaleString('id-ID')}`) || []),
      '--------------------------------',
      `Subtotal: Rp ${sale.subtotal.toLocaleString('id-ID')}`,
      sale.discountTotal > 0 ? `Diskon: -Rp ${sale.discountTotal.toLocaleString('id-ID')}` : '',
      `Total: Rp ${sale.grandTotal.toLocaleString('id-ID')}`,
      `Bayar (${sale.paymentType.toUpperCase()}): Rp ${sale.amountPaid.toLocaleString('id-ID')}`,
      `Kembalian: Rp ${sale.changeAmount.toLocaleString('id-ID')}`,
      '--------------------------------',
      store.receiptFooter || 'Terima kasih atas kunjungan Anda.',
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-mandiri-gold/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Printer className="w-5 h-5 text-mandiri-gold" />
            <span>Struk Penjualan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${paperWidth === '58mm' ? 'bg-mandiri-navy text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                58 mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${paperWidth === '80mm' ? 'bg-mandiri-navy text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                80 mm
              </button>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview Area */}
        <div className="p-6 bg-slate-100 flex justify-center max-h-[60vh] overflow-y-auto">
          <div
            ref={receiptRef}
            style={{ width: paperWidth === '58mm' ? '280px' : '360px' }}
            className="bg-white p-4 shadow-lg rounded-sm border border-slate-300 font-mono text-slate-900 leading-tight transition-all duration-200"
          >
            {/* Store Header */}
            <div className="text-center mb-3">
              <div className="font-bold text-base uppercase tracking-tight">{store.storeName}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{store.address}</div>
              <div className="text-[11px] text-slate-600">Telp: {store.phone}</div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Metadata */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Transaksi</span>
                <span className="font-bold">{sale.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{formatDate(sale.saleDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{sale.userName || 'Kasir'}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span>{sale.customerName || 'Umum'}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Items */}
            <div className="text-[11px] space-y-2">
              {sale.items && sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-slate-800">{item.productName}</div>
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>
                      {item.qty} x {item.unitPrice.toLocaleString('id-ID')}
                      {item.discountAmount > 0 && ` (Disc -${item.discountAmount.toLocaleString('id-ID')})`}
                    </span>
                    <span className="font-semibold text-slate-900">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Calculations */}
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(sale.subtotal)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Nota</span>
                  <span>-{formatRupiah(sale.discountTotal)}</span>
                </div>
              )}
              {sale.taxTotal > 0 && (
                <div className="flex justify-between">
                  <span>Pajak</span>
                  <span>{formatRupiah(sale.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                <span>TOTAL</span>
                <span>{formatRupiah(sale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Bayar ({sale.paymentType.toUpperCase()})</span>
                <span>{formatRupiah(sale.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Kembalian</span>
                <span>{formatRupiah(sale.changeAmount)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-3" />

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">
              {store.receiptFooter || 'Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli tidak dapat ditukar kembali.'}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-mandiri-navy" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-mandiri-navy hover:bg-mandiri-navy-dark text-white rounded-xl text-sm font-semibold shadow-md border-b-2 border-mandiri-gold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-mandiri-gold" />
              <span>Cetak Struk ({paperWidth})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
