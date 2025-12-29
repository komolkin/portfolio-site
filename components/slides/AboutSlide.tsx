export default function AboutSlide() {
  return (
    <div
      id="about"
      className="slide w-full h-screen flex items-center px-6 md:px-8 lg:px-10 relative"
    >
      <p className="text-3xl md:text-4xl lg:text-5xl font-normal text-foreground leading-[1.2] max-w-4xl">
        Ilya approaches aesthetics not just as a visual discipline but as an
        ethical category — a way design shapes contemporary culture, influences
        behavior, and defines how ideas are understood. His work is rooted in
        constant research and experimentation, searching for innovative ways to
        craft visual language and communication.
      </p>

      {/* Copyright */}
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 lg:bottom-10 lg:left-10">
        <span className="text-sm text-muted-foreground">© 2026</span>
      </div>
    </div>
  );
}
