import { MejikuGame } from "@/components/mejiku-game";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-4 sm:py-8">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8">Mejiku</h1>
      <MejikuGame />
    </div>
  );
}
