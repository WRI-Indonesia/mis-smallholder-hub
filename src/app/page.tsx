import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
        Welcome to Smallholder Hub
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
        Empowering smallholder farmers with data-driven insights, community support, and market access.
      </p>
      <div className="flex justify-center gap-4">
        <Button size="lg">Get Started</Button>
        <Button size="lg" variant="outline">Learn More</Button>
      </div>
    </div>
  );
}
