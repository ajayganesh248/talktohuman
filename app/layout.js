import "./globals.css";

export const metadata = {
  title: "TalkToHuman",
  description: "Talk directly to a real human. No AI, no bots, no strangers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
