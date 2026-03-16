import AuthProvider from "@/components/AuthProvider";
import "./globals.css";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* <Navbar/> */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}