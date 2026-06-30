import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Analyst",
};

export default function DataAnalystLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
