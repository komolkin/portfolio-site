import { notFound } from "next/navigation";
import { parsePlaygroundPathSegment } from "@/components/playground/playground-route";

type Props = {
  params: { playgroundIndex: string };
};

export default function PlaygroundIndexPage({ params }: Props) {
  const n = parsePlaygroundPathSegment(params.playgroundIndex);
  if (n === null) notFound();
  return null;
}
