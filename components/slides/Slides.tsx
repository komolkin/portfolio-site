import { unstable_noStore as noStore } from "next/cache";
import TopSlide from "./TopSlide";
import AboutSlide from "./AboutSlide";
import PortfolioSlide from "./PortfolioSlide";
import SnippetsSlide from "./SnippetsSlide";
import { getPortfolioItems, getSnippets } from "@/lib/supabase";

export default async function Slides() {
  noStore();
  const [portfolioItems, snippets] = await Promise.all([
    getPortfolioItems(),
    getSnippets(),
  ]);

  return (
    <div className="slides-scroll h-full">
      <TopSlide />
      {portfolioItems.map((item, index) => (
        <PortfolioSlide key={item.id} item={item} index={index} />
      ))}
      <SnippetsSlide snippets={snippets} />
      <AboutSlide />
    </div>
  );
}
