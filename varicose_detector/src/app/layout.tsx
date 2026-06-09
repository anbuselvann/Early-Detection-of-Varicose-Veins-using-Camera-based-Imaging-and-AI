import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VascuScan — Early Varicose Vein Detection',
  description: 'AI-powered early detection of varicose veins. Upload a leg image and receive an instant vascular health risk assessment.',
  keywords: ['varicose veins', 'early detection', 'vascular health', 'AI medical'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="noise">{children}</body>
    </html>
  );
}