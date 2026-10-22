import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "প্রতারক চেক — টাকা পাঠানোর আগে নম্বর যাচাই করুন",
  description:
    "বিকাশ, নগদ, রকেট বা P2P-তে টাকা পাঠানোর আগে নম্বরটি যাচাই করুন। প্রতারণার শিকার হলে প্রমাণসহ রিপোর্ট করুন — অন্যদের বাঁচান।",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        <header className="site">
          <div className="wrap bar">
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
              <img src="/logo.png" alt="প্রতারক চেক লোগো" />
              <span className="brand">প্রতারক চেক</span>
            </a>
            <nav>
              <a href="/">যাচাই</a>
              <a href="/report">রিপোর্ট করুন</a>
              <a href="/objection">আপত্তি</a>
              <a href="/disclaimer">নীতিমালা</a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site">
          <div className="wrap">
            <p style={{ margin: "0 0 6px" }}>
              <strong style={{ color: "#fff" }}>প্রতারক চেক</strong> একটি জনস্বার্থমূলক উদ্যোগ। এখানে প্রকাশিত
              সব তথ্যই ব্যবহারকারীদের জমা দেওয়া <em>অভিযোগ</em>, যা প্রমাণ যাচাই করে প্রকাশ করা হয়।
              অভিযোগ থাকা মানেই অপরাধ প্রমাণিত হওয়া নয়।
            </p>
            <p style={{ margin: 0 }}>
              <a href="/disclaimer">নীতিমালা ও দায় অস্বীকার</a> · <a href="/objection">আপত্তি জানান</a> ·{" "}
              <a href="/report">প্রতারণার রিপোর্ট করুন</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
