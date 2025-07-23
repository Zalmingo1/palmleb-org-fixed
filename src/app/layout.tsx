import './globals.css';
import type { Metadata } from 'next';
import { Merriweather, Playfair_Display, Cormorant_Garamond, Libre_Baskerville, Montserrat } from 'next/font/google';

const merriweather = Merriweather({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-merriweather',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant',
});

const baskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-baskerville',
});

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'PALMS - Freemasons Community',
  description: 'A private social platform for Freemasons',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${merriweather.variable} ${playfair.variable} ${cormorant.variable} ${baskerville.variable} ${montserrat.variable}`}>
      <body className="font-system">
        {children}
      </body>
    </html>
  );
} 