import WidgetChrome from './widgets/WidgetChrome';

interface SocialLinkProps {
  text: string;
  href?: string;
}

export default function SocialLink({ text, href }: SocialLinkProps) {
  const content = (
    <div className="px-4 py-2">
      <div className="text-xs text-white leading-[1.4]">
        {text}
      </div>
    </div>
  );

  if (href) {
    return (
      <WidgetChrome>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity block"
        >
          {content}
        </a>
      </WidgetChrome>
    );
  }

  return <WidgetChrome>{content}</WidgetChrome>;
}

