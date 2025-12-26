export default function AboutSlide() {
  return (
    <div
      id="about"
      className="slide w-full h-screen flex items-center px-8 md:px-12 lg:px-16 relative"
    >
      <p className="text-3xl md:text-4xl lg:text-5xl font-normal text-foreground leading-[1.2] max-w-4xl">
        Ilya approaches aesthetics not just as a visual discipline but as an
        ethical category — a way design shapes contemporary culture, influences
        behavior, and defines how ideas are understood. His work is rooted in
        constant research and experimentation, searching for innovative ways to
        craft visual language and communication.
      </p>

      {/* Copyright */}
      <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 lg:bottom-12 lg:left-16">
        <span className="text-xs text-muted-foreground">© 2025</span>
      </div>
    </div>
  );
}
