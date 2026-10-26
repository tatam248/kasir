import React from 'react';

interface FooterProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ variant = 'light', className = '' }) => {
  return (
    <footer
      className={`py-3 px-4 text-center text-xs tracking-wide shrink-0 transition-colors ${
        variant === 'dark'
          ? 'text-slate-400/90'
          : 'bg-white border-t border-slate-200 text-slate-500'
      } ${className}`}
    >
      <p className="font-normal select-none">
        @2026 Sistem KasirPro Buah Pikir WargaOpat Parungkuda. Seluruh Hak Cipta dilindungi Undang-Undang
      </p>
    </footer>
  );
};
