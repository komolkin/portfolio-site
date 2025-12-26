"use client";

export default function HeaderNav() {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="flex items-center gap-6">
      <button
        onClick={() => scrollTo("top")}
        className="text-sm text-foreground hover:text-muted-foreground transition-colors"
      >
        Ilya Komolkin
      </button>
      <button
        onClick={() => scrollTo("works")}
        className="text-sm text-foreground hover:text-muted-foreground transition-colors"
      >
        Works
      </button>
      <button
        onClick={() => scrollTo("about")}
        className="text-sm text-foreground hover:text-muted-foreground transition-colors"
      >
        About
      </button>
    </nav>
  );
}
