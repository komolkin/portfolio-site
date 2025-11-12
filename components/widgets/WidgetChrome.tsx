interface WidgetChromeProps {
  children: React.ReactNode;
  isDragging?: boolean;
}

export default function WidgetChrome({ children, isDragging }: WidgetChromeProps) {
  return (
    <div
      className={`
        bg-card/40 backdrop-blur-md border border-border rounded-lg shadow-lg
        transition-shadow duration-200
        select-none
        ${isDragging ? 'shadow-xl' : 'shadow-md'}
      `}
    >
      {children}
    </div>
  );
}

