import "./globals.css";

export const metadata = {
  title: "TalkToHuman",
  description: "Talk directly to a real human. No AI, no bots, no strangers.",
};

// Tells supporting mobile browsers to resize the page (not overlay it)
// when the on-screen keyboard opens, so the chat header + messages stay
// visible instead of scrolling out of view above the keyboard.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
