import SplineSlide from "./SplineSlide";
import Slide from "./Slide";

export default function Slides() {
  return (
    <div className="slides-scroll h-full">
      <SplineSlide />
      <Slide>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Slide 1</p>
        </div>
      </Slide>
      <Slide>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Slide 2</p>
        </div>
      </Slide>
      <Slide>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Slide 3</p>
        </div>
      </Slide>
    </div>
  );
}
