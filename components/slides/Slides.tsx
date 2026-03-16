import TopSlide from "./TopSlide";
import AboutSlide from "./AboutSlide";

export default function Slides() {
  return (
    <div className="slides-scroll h-full">
      <TopSlide />
      <AboutSlide />
    </div>
  );
}
