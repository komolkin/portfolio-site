import TopSlide from "./TopSlide";
import PlaygroundSlide from "./PlaygroundSlide";

export default function Slides() {
  return (
    <div className="slides-scroll h-full">
      <TopSlide />
      <PlaygroundSlide />
    </div>
  );
}
