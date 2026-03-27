import './globals.css';
import ClientLayout from '@/components/ClientLayout/ClientLayout';

export const metadata = {
  title: 'For Amrita ♥',
  description: 'Made with all my love, just for you.',
  icons: [{ rel: 'icon', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">♥</text></svg>' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-cosmic overflow-x-hidden">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
