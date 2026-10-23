import "./globals.css";
import type { Metadata } from "next";
import VisitPing from "./VisitPing";

export const metadata: Metadata = {
  title: "প্রতারক চেক — টাকা পাঠানোর আগে নম্বর যাচাই করুন",
  description:
    "বিকাশ, নগদ, রকেট বা P2P-তে টাকা পাঠানোর আগে নম্বরটি যাচাই করুন। প্রতারণার শিকার হলে প্রমাণসহ রিপোর্ট করুন — অন্যদের বাঁচান।",
  openGraph: {
    title: "প্রতারক চেক — টাকা পাঠানোর আগে নম্বর যাচাই করুন",
    description:
      "অপরিচিত নম্বরে টাকা পাঠানোর আগে দেখে নিন, এই নম্বরে কোনো প্রতারণার অভিযোগ আছে কিনা। সম্পূর্ণ ফ্রি।",
    type: "website",
    locale: "bn_BD",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" />
        <meta name="theme-color" content="#063f2e" />
      </head>
      <body>
        <VisitPing />
        <header className="site">
          <div className="wrap bar">
            <a href="/" className="brandlink">
              <img src="/logo.png" alt="প্রতারক চেক লোগো" />
              <span>
                <span className="brandname">প্রতারক চেক</span>
                <br />
                <span className="brandsub">টাকা পাঠানোর আগেই যাচাই</span>
              </span>
            </a>
            <nav>
              <a href="/">যাচাই</a>
              <a href="/report">রিপোর্ট</a>
              <a href="/stories">গল্প</a>
              <a href="/guide">কৌশল</a>
              <a href="/objection">আপত্তি</a>
              <a href="/disclaimer">নীতিমালা</a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site">
          <div className="wrap">
            <div className="cols">
              <div>
                <h4>🛡️ প্রতারক চেক</h4>
                <p style={{ margin: 0 }}>
                  বাংলাদেশের মানুষের জন্য জনস্বার্থমূলক উদ্যোগ — অপরিচিত নম্বরে টাকা
                  পাঠানোর আগে যাচাই করুন, প্রতারণা থেকে বাঁচুন, অন্যকে বাঁচান।
                </p>
              </div>
              <div>
                <h4>সেবা</h4>
                <ul>
                  <li><a href="/">নম্বর যাচাই</a></li>
                  <li><a href="/report">প্রতারণার রিপোর্ট</a></li>
                  <li><a href="/stories">প্রতারণার গল্প</a></li>
                  <li><a href="/guide">প্রতারকের কৌশল</a></li>
                  <li><a href="/objection">আপত্তি জানান</a></li>
                </ul>
              </div>
              <div>
                <h4>জরুরি</h4>
                <ul>
                  <li><a href="/disclaimer">নীতিমালা ও দায় অস্বীকার</a></li>
                  <li>প্রতারণার শিকার হলে: থানায় অভিযোগ করুন</li>
                  <li>জাতীয় জরুরি সেবা: <strong style={{ color: "#fff" }}>৯৯৯</strong></li>
                </ul>
              </div>
            </div>
            <div className="fine">
              এখানে প্রকাশিত সব তথ্য ব্যবহারকারীদের জমা দেওয়া <em>অভিযোগ</em>, যা প্রমাণ যাচাই করে প্রকাশ
              করা হয়। অভিযোগ থাকা মানেই অপরাধ প্রমাণিত হওয়া নয়। © {new Date().getFullYear()} প্রতারক চেক
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
