import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="flex-1 flex items-center justify-center py-24">
        <div className="container px-4 mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Leaf className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Smallholder HUB
          </h1>
          <p className="mx-auto mt-4 max-w-[500px] text-lg text-muted-foreground">
            Management Information System
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg" className="font-semibold px-8 rounded-full">
                Login <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
