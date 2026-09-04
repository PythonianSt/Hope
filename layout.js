import './styles.css';

export const metadata = {
  title: 'Buckets of Hope for Your Loved',
  description: 'A gentle memory space for carrying love forward.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
